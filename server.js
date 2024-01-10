import fastify from "fastify";
import dotenv from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
// import cloudinary from "cloudinary"
import jwt from "@fastify/jwt";
import {
  createToken,
  validateAccessToken,
  validateRefreshToken,
} from "./token.js";
import { sendConfirmationEmail } from "./config.js";
import bcrypt from "fastify-bcrypt";

import cookie from "@fastify/cookie";
//
export const app = fastify();
const prisma = new PrismaClient();
dotenv.config();

// Registering our middlewares
app.register(jwt, {
  secret: process.env.JWT_SECRET_KEY,
});
app.register(sensible);
app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
});
app.register(fastifySwagger);
app.register(bcrypt, {
  saltWorkFactor: 8,
});
app.register(cookie, {
  secret: process.env.JWT_SECRET_KEY,
});

// handle errors in out server
async function commitToDB(promise) {
  const [error, data] = await app.to(promise);
  if (error) {
    return app.httpErrors.internalServerError(error.message);
  }
  return data;
}
app.get("/", () => {
  return "api is active";
});

//Authentication decorator
app.decorate("authenticate", async (req, res) => {
  try {
    return await req.jwtVerify();
  } catch (err) {
    res.send(err);
  }
});

//Generate access token after user login
app.get("/generate_token/:userId", async (req, res) => {
  const accessToken = app.jwt.sign({ userId: req.params.userId });
  res.send({ accessToken });
});
// validate access token
app.get(
  "/validate_token",
  {
    onRequest: [app.authenticate],
  },
  async (req, res) => {
    return req.user;
  }
);

app.get(
  "/users",
  //  { onRequest: validateAccessToken },
  async (req, res) => {
    return await prisma.user.findMany({
      // select:{id:true}
    });
  }
);
app.get("/user/:id", { onRequest: validateAccessToken }, async (req, res) => {
  return await commitToDB(
    prisma.user.findFirst({
      where: {
        id: req.params.id,
      },
      include: {
        followedBy: true,
        following: true,
        // password: false,
      },
    })
  );
});
app.post("/signUp", async (req, res) => {
  const checker = await prisma.user.findFirst({
    where: {
      email: req.body.email,
    },
  });
  if (checker) {
    return res.send(app.httpErrors.badRequest("Email already exists"));
  } else {
    const token =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).toUpperCase().slice(2);

    try {
      app.bcrypt.hash(req.body.password, 10).then(async (hash) => {
        const user = await commitToDB(
          prisma.user.create({
            data: { ...req.body, password: hash },
          })
        );
        // create token and send verification email
        await commitToDB(
          prisma.user.update({
            where: {
              email: req.body.email,
            },
            data: {
              confirmationToken: token,
            },
          })
        );
        sendConfirmationEmail(req.body.name, user.id, token, req);
      });
    } catch (err) {
      res.send(err);
      console.log(err);
    }
  }
});

app.post("/:userId/send_verification_link", async (req, res) => {
  console.log("headers ==>>", req.headers);
  const token =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).toUpperCase().slice(2);
  const user = await commitToDB(
    prisma.user.update({
      where: {
        id: req.params.userId,
      },
      data: {
        confirmationToken: token,
      },
    })
  );
  const name = user.firstname;
  const userId = user.id;
  const email = user.email;

  try {
    await sendConfirmationEmail(name, userId, email, token, req);
    res.send(token);
  } catch (error) {
    res.send(error);
  }
});

app.get("/verify_email/:userId/:token", async (req, res) => {
  if (req.params.token == "") {
    res.send(app.httpErrors.badRequest("empty params"));
  } else {
    const user = await commitToDB(
      prisma.user.findFirst({
        where: {
          id: req.params.userId,
        },
        select: {
          confirmationToken: true,
        },
      })
    );
    if (user.confirmationToken == req.params.token) {
      await commitToDB(
        prisma.user.update({
          where: {
            id: req.params.userId,
          },
          data: {
            isEmailVerified: true,
            confirmationToken: "",
          },
        })
      );
      res.send("email verified");
    } else {
      await commitToDB(
        prisma.user.update({
          where: {
            email: req.params.userId,
          },
          data: {
            confirmationToken: "",
          },
        })
      );
      res.send(
        app.httpErrors.badRequest(
          "link expired, please generate a new verification link"
        )
      );
    }
  }
});

app.get("/:userId/isEmailVerified", async (req, res) => {
  const userId = req.params.userId;
  const user = await commitToDB(
    prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        isEmailVerified: true,
      },
    })
  );
  return user.isEmailVerified;
});
app.get(
  "/auth/refresh",
  { onRequest: validateRefreshToken },
  async (req, res) => {
    const userId = req.decodedUserId;
    // console.log(req);
    const user = await commitToDB(
      prisma.user.findFirst({
        where: {
          id: userId,
        },
      })
    );
    if (!user) {
      return res.code(404).send({
        message: "user not found",
      });
    }
    if (user) {
      try {
        console.log("creating new access token");
        const accessToken = createToken(user, "30s");
        if (accessToken) {
          console.log("sending access token");
          return res.code(200).send({
            accessToken,
          });
        } else {
          res.code(500).send("failed to create access token");
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
);
app.post("/login", async (req, res) => {
  // const accessToken = app.jwt.sign({ userId: req.params.userId });
  const { email, password } = req.body;
  console.log(`email is ${email} and password is ${password}`);
  const user = await commitToDB(
    prisma.user.findFirst({
      where: {
        email: email,
      },
      // select: {
      //   id: true,
      // },
    })
  );
  const hashedPassword = user.password;

  if (!user) {
    res.code(404).send({ message: "user does not exist" });
  } else {
    return app.bcrypt.compare(password, hashedPassword).then((match) => {
      if (match) {
        const accessToken = createToken(user, "30s");
        const refreshToken = createToken(user, "30d");
        res.cookie("refresh_token", refreshToken, {
          maxAge: 60 * 60 * 24 * 30, // multiplying by 1000 because its in milliseconds
          httpOnly: true,
          // secure: true,
        });
        return res.code(200).send({
          accessToken,
          userId: user.id,
        });
      } else {
        res.code(401).send("invalid credentials");
      }
    });
  }
});
app.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies["refresh_token"];
  if (!refreshToken) {
    res.code(204); // no content
  }
  await res.clearCookie("refresh_token", {
    httpOnly: true,
    //  secure: true
  });
  res.send({ message: "cookie cleared" });
});
app.delete("/delete_user/:userId", async (req, res) => {
  try {
    await commitToDB(
      prisma.user.delete({
        where: {
          email: req.params.userId,
        },
      })
    );
    res.send("user deleted succesfully");
  } catch (err) {
    res.send(err);
  }
});
app.get("/posts", async (request, response) => {
  const posts = await commitToDB(
    prisma.post.findMany({
      include: {
        likes: true,
        broadcasts: true,
      },
    })
  );

  return posts;
});

app.get("/posts/:id", async (req, res) => {
  return await commitToDB(
    prisma.post.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        broadcasts: true,
        likes: true,
        comments: false,
      },
    })
  );
});

app.get("/posts/userId/:id", async (req, res) => {
  return await commitToDB(
    prisma.post.findMany({
      where: {
        userId: req.params.id,
      },
    })
  );
});
app.post("/posts", async (req, res) => {
  return await commitToDB(
    prisma.post.create({
      data: req.body,
    })
  );
});

app.delete("/post/:id", async (req, res) => {
  return await commitToDB(
    prisma.post.delete({
      where: {
        id: req.params.id,
      },
    })
  );
});
app.get("/comments", async (req, res) => {
  return await commitToDB(prisma.comment.findMany({}));
});
app.get("/:postId/comments", async (req, res) => {
  return await commitToDB(
    prisma.comment.findMany({
      where: {
        postId: req.params.postId,
      },
      include: {
        broadcasts: true,
        likes: true,
        children: {
          include: {
            broadcasts: true,
            likes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  );
});

app.get("/comment/:commentId", async (req, res) => {
  return await commitToDB(
    prisma.comment.findFirst({
      where: {
        id: req.params.commentId,
      },
      include: {
        likes: true,
      },
    })
  );
});
app.get("/post/:postId/comment_count", async (req, res) => {
  const comments = await commitToDB(
    prisma.comment.findMany({
      where: {
        postId: req.params.postId,
      },
    })
  );
  return comments.length;
});

app.get("/comment/:commentId/comment_count", async (req, res) => {
  const childComments = await commitToDB(
    prisma.comment.findMany({
      where: {
        parentId: req.params.commentId,
      },
    })
  );
  return childComments.length;
});

app.post("/posts/:id/comments", async (req, res) => {
  // if(req.body.commentBody=="" || req.body.commentBody==null){
  //     return res.send(app.httpErrors.badRequest("Empty Comment.."))
  // } else{
  return await commitToDB(
    prisma.comment.create({
      data: {
        body: req.body.body,
        userId: req.body.userId,
        postId: req.params.id,
        displayName: req.body.displayName,
        parentId: req.body.parentId,
      },
    })
  );
  // }
});
app.delete("/comment/:id", async (req, res) => {
  return await commitToDB(
    prisma.comment.delete({
      where: { id: req.params.id },
    })
  );
});

app.get("/follows", async (req) => {
  return await commitToDB(prisma.follows.findMany({}));
});
app.post("/follows", async (req, res) => {
  const checker = await prisma.follows.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (checker) {
    return await commitToDB(
      prisma.follows.delete({
        where: {
          id: req.body.id,
        },
      })
    );
  }
  if (!checker) {
    return await commitToDB(
      prisma.follows.create({
        data: {
          ...req.body,
        },
      })
    );
  }
});

app.get("/likes", async (req, res) => {
  return await prisma.like.findMany({});
});

app.post("/likes", async (req, res) => {
  const checker = await prisma.like.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (checker) {
    await prisma.like.delete({
      where: {
        id: req.body.id,
      },
    });
  }
  if (!checker) {
    await prisma.like.create({
      data: req.body,
    });
  }
});

app.get("/broadcastPost", async (req, res) => {
  return await commitToDB(prisma.broadcastPost.findMany({}));
});

app.post("/broadcastPost", async (req, res) => {
  const checker = await prisma.broadcastPost.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (!checker) {
    await commitToDB(
      prisma.broadcastPost.create({
        data: {
          id: req.body.id,
          postId: req.body.ogPostId,
          userId: req.body.userId,
        },
      })
    );
    await commitToDB(
      prisma.post.create({
        data: {
          id: req.body.id,
          title: "BROADCAST",
          ogPostId: req.body.ogPostId,
          userId: req.body.userId,
          displayName: req.body.displayName,
        },
      })
    );
  }
  if (checker) {
    await commitToDB(
      prisma.broadcastPost.delete({
        where: { id: req.body.id },
      })
    );
    await commitToDB(
      prisma.post.delete({
        where: { id: req.body.id },
      })
    );
  }
});

app.get("/broadcastComment", async () => {
  return await commitToDB(prisma.broadcastComment.findMany({}));
});
app.post("/broadcast_comment", async (req, res) => {
  const checker = await prisma.broadcastComment.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (!checker) {
    await commitToDB(
      prisma.broadcastComment.create({
        data: {
          id: req.body.id,
          userId: req.body.userId,
          commentId: req.body.ogPostId,
        },
      })
    );

    await commitToDB(
      prisma.post.create({
        data: {
          id: req.body.id,
          title: "BC_COMMENT",
          ogPostId: req.body.ogPostId,
          userId: req.body.userId,
          displayName: req.body.displayName,
        },
      })
    );
  }
  if (checker) {
    await commitToDB(
      prisma.broadcastComment.delete({
        where: { id: req.body.id },
      })
    );
    await commitToDB(
      prisma.post.delete({
        where: { id: req.body.id },
      })
    );
  }
});

app.post("/like_comment", async (req, res) => {
  const checker = await prisma.likeComment.findFirst({
    where: {
      id: req.body.id,
    },
  });

  if (!checker) {
    return await commitToDB(
      prisma.likeComment.create({
        data: {
          id: req.body.id,
          userId: req.body.userId,
          commentId: req.body.commentId,
        },
      })
    );
  }

  if (checker) {
    return await commitToDB(
      prisma.likeComment.delete({
        where: {
          id: req.body.id,
        },
      })
    );
  }
});
//

// app.post("/uploadPhoto", () => {});

// const cloudinary = require("cloudinary").v2;
// // Return "https" URLs by setting secure: true
// cloudinary.config({
//   secure: true,
// });

// // Log the configuration
// console.log(cloudinary.config());

// for handling errors in our server
// status code 500 errors are  internal server errors

// app.listen({
//   port: process.env.PORT,
//   listenTextResolver: (address) => {
//     return `Sercer is listening at ${address} `;
//   },
// });

app.listen({ port: process.env.PORT, host: "0.0.0.0" }, (err, addr) => {
  console.log(`server is live at ${addr}`);
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
