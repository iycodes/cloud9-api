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
import bcrypt from "fastify-bcrypt";

import cookie from "@fastify/cookie";
import { seed } from "./prisma/seed.js";
import { getTransporter, sendMail } from "./mySMTP.js";
//
export const app = fastify();
const prismaClient = new PrismaClient();
dotenv.config();

// Registering our middlewares
app.register(jwt, {
  secret: process.env.JWT_SECRET_KEY,
});
app.register(sensible);
app.register(cors, {
  origin: [process.env.CLIENT_URL, "http://localhost:4173"],
  // origin: process.env.CLIENT_URL,
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
    return await prismaClient.user.findMany({
      // select:{id:true}
    });
  }
);
app.get("/user/me", { onRequest: validateAccessToken }, async (req, res) => {
  console.log("access token validated, user info is ", req.authInfo);
  return await prismaClient.user.findFirst({
    where: {
      id: req.authInfo,
    },
    // select:{id:true}
  });
});

app.get;
app.get(
  "/user/:id",
  //  { onRequest: validateAccessToken },
  async (req, res) => {
    return await commitToDB(
      prismaClient.user.findFirst({
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
  }
);
app.get("/seed", async () => {
  return await seed(prismaClient);
});
app.post("/signUp", async (req, res) => {
  const checker = await prismaClient.user.findFirst({
    where: {
      email: req.body.email,
    },
  });
  if (checker) {
    return res.send(app.httpErrors.badRequest("Email already exists"));
  } else {
    console.log("email doesn't exist creating account");
    const token =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).toUpperCase().slice(2);
    if (req.body.profileImageSrc == null) {
      req.body.profileImageSrc =
        "https://www.pngrepo.com/png/170303/512/avatar.png";
    }
    try {
      await app.bcrypt.hash(req.body.password, 10).then(async (hash) => {
        const user = await commitToDB(
          prismaClient.user.create({
            data: { ...req.body, password: hash },
          })
        );
        console.log("user created in db is", user);
        // create token and send verification email
        req.body.name = user.firstname;
        req.body.host = req?.headers?.host;
        req.body.userId = user.id;
        req.body.email = user.email;
        req.body.token = token;
        await commitToDB(
          prismaClient.user.update({
            where: {
              email: req.body.email,
            },
            data: {
              confirmationToken: token,
            },
          })
        );
        const accessToken = createToken(user, "1d");

        const transporter = getTransporter();
        // await sendConfirmationEmail(req.body.name, user.id, token, req);
        await sendMail(transporter, req.body);
        res.send({
          accessToken,
          userId: user.id,
          msg: "verification code sent succesfully",
        });
      });
    } catch (err) {
      console.log("error =>", err);
      return res.send(app.httpErrors.internalServerError(""));
    }
  }
});

app.post("/test/send_verification_email", async (req, res) => {
  console.log("send mail api called");
  const transporter = getTransporter();
  try {
    req.body.name = "a name";
    req.body.host = req?.headers?.host;
    req.body.userId = "random Id";
    await sendMail(transporter, req.body);
    console.log("body sent in request is ", req.body);
    return res.send({ message: "Success: email was sent" });
  } catch (error) {
    console.log(error);
    return res.code(500).send("error sending mail");
  }
});
app.get("/send_verification_link/:userId", async (req, res) => {
  console.log("send_verification_link api called");
  const token =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).toUpperCase().slice(2);
  const user = await commitToDB(
    prismaClient.user.update({
      where: {
        id: req.params.userId,
      },
      data: {
        confirmationToken: token,
      },
    })
  );
  if (user.isEmailVerified == true) {
    res.send({ msg: "email already verified" });
    return;
  }
  console.log("user is", user);
  const name = user.firstname;
  const userId = user.id;
  const email = user.email;
  req.body = {};
  req.body.name = user.firstname;
  req.body.host = req?.headers?.host;
  req.body.userId = user.id;
  req.body.email = user.email;
  req.body.token = token;

  try {
    const transporter = getTransporter();
    await sendMail(transporter, req.body);
    res.send(token);
  } catch (error) {
    res.send(error);
  }
});

app.get("/verify_email/:userId/:token", async (req, res) => {
  console.log("token in params is ", req.params.token);
  if (req.params.token == "") {
    res.send(app.httpErrors.badRequest("empty params"));
  } else {
    const user = await commitToDB(
      prismaClient.user.findFirst({
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
        prismaClient.user.update({
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
        prismaClient.user.update({
          where: {
            email: req.params.userId,
          },
          data: {
            confirmationToken: "",
          },
        })
      );
      res.send(
        app.httpErrors.badRequest("please generate a new verification link")
      );
    }
  }
});

app.get("/:userId/isEmailVerified", async (req, res) => {
  const userId = req.params.userId;
  console.log("IsEmailVerified api called userid is", userId);
  // await sleep(3);
  const user = await commitToDB(
    prismaClient.user.findFirst({
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
      prismaClient.user.findFirst({
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
// app.post("/login",  async (req, res) => {
//   // const accessToken = app.jwt.sign({ userId: req.params.userId });
//   const { email, password } = req.body;
//   console.log(`email is ${email} and password is ${password}`);
//   const user = await commitToDB(
//     prismaClient.user.findFirst({
//       where: {
//         email: email,
//       },
//       // select: {
//       //   id: true,
//       // },
//     })
//   );

//   if (!user) {
//     res.code(404).send({ message: "user does not exist" });
//   } else {
//     const hashedPassword = user.password;
//     console.log("user found is ", user);
//     return app.bcrypt.compare(password, hashedPassword).then((match) => {
//       if (match) {
//         const accessToken = createToken(user, "30s");
//         const refreshToken = createToken(user, "30d");
//         res.cookie("refresh_token", refreshToken, {
//           maxAge: 60 * 60 * 24 * 30, // multiplying by 1000 because its in milliseconds
//           httpOnly: true,
//           // secure: true,
//         });
//         return res.code(200).send({
//           accessToken,
//           userId: user.id,
//         });
//       } else {
//         res.code(401).send("invalid credentials");
//       }
//     });
//   }
// });

app.route({
  method: "POST",
  url: "/login",
  handler: async (req, res) => {
    // const accessToken = app.jwt.sign({ userId: req.params.userId });
    const { email, password } = req.body;
    console.log(`email is ${email} and password is ${password}`);
    const user = await commitToDB(
      prismaClient.user.findFirst({
        where: {
          email: email,
        },
        // select: {
        //   id: true,
        // },
      })
    );

    if (!user) {
      res.code(404).send({ message: "user does not exist" });
    } else {
      const hashedPassword = user.password;
      console.log("user found is ", user);
      return app.bcrypt.compare(password, hashedPassword).then((match) => {
        if (match) {
          const accessToken = createToken(user, "1d");
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
  },
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
      prismaClient.user.delete({
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
  const refreshToken = request.cookies["refresh_token"];
  console.log("httponly refreshToken is", refreshToken);
  const posts = await commitToDB(
    prismaClient.post.findMany({
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
    prismaClient.post.findUnique({
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
    prismaClient.post.findMany({
      where: {
        userId: req.params.id,
      },
    })
  );
});
app.post("/posts", async (req, res) => {
  // console.log("waiting 3 seconds");

  // await new Promise((resolve) =>
  //   setTimeout(() => {
  //     resolve();
  //   }, 3000)
  // );
  // console.log("waited 3 seconds");

  return await commitToDB(
    prismaClient.post.create({
      data: req.body,
    })
  );
});

app.delete("/post/:id", async (req, res) => {
  return await commitToDB(
    prismaClient.post.delete({
      where: {
        id: req.params.id,
      },
    })
  );
});
app.get("/comments", async (req, res) => {
  return await commitToDB(prismaClient.comment.findMany({}));
});
app.get("/:postId/comments", async (req, res) => {
  return await commitToDB(
    prismaClient.comment.findMany({
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
    prismaClient.comment.findFirst({
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
    prismaClient.comment.findMany({
      where: {
        postId: req.params.postId,
      },
    })
  );
  return comments.length;
});

app.get("/comment/:commentId/comment_count", async (req, res) => {
  const childComments = await commitToDB(
    prismaClient.comment.findMany({
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
    prismaClient.comment.create({
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
    prismaClient.comment.delete({
      where: { id: req.params.id },
    })
  );
});

app.get("/follows", async (req) => {
  return await commitToDB(prismaClient.follows.findMany({}));
});
app.post("/follows", async (req, res) => {
  const checker = await prismaClient.follows.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (checker) {
    return await commitToDB(
      prismaClient.follows.delete({
        where: {
          id: req.body.id,
        },
      })
    );
  }
  if (!checker) {
    return await commitToDB(
      prismaClient.follows.create({
        data: {
          ...req.body,
        },
      })
    );
  }
});

app.get("/likes", async (req, res) => {
  return await prismaClient.like.findMany({});
});

app.post("/likes", async (req, res) => {
  const checker = await prismaClient.like.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (checker) {
    await prismaClient.like.delete({
      where: {
        id: req.body.id,
      },
    });
  }
  if (!checker) {
    await prismaClient.like.create({
      data: req.body,
    });
  }
});

app.get("/broadcastPost", async (req, res) => {
  return await commitToDB(prismaClient.broadcastPost.findMany({}));
});

app.post("/broadcastPost", async (req, res) => {
  const checker = await prismaClient.broadcastPost.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (!checker) {
    await commitToDB(
      prismaClient.broadcastPost.create({
        data: {
          id: req.body.id,
          postId: req.body.ogPostId,
          userId: req.body.userId,
        },
      })
    );
    await commitToDB(
      prismaClient.post.create({
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
      prismaClient.broadcastPost.delete({
        where: { id: req.body.id },
      })
    );
    await commitToDB(
      prismaClient.post.delete({
        where: { id: req.body.id },
      })
    );
  }
});

app.get("/broadcastComment", async () => {
  return await commitToDB(prismaClient.broadcastComment.findMany({}));
});
app.post("/broadcast_comment", async (req, res) => {
  const checker = await prismaClient.broadcastComment.findFirst({
    where: {
      id: req.body.id,
    },
  });
  if (!checker) {
    await commitToDB(
      prismaClient.broadcastComment.create({
        data: {
          id: req.body.id,
          userId: req.body.userId,
          commentId: req.body.ogPostId,
        },
      })
    );

    await commitToDB(
      prismaClient.post.create({
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
      prismaClient.broadcastComment.delete({
        where: { id: req.body.id },
      })
    );
    await commitToDB(
      prismaClient.post.delete({
        where: { id: req.body.id },
      })
    );
  }
});

app.post("/like_comment", async (req, res) => {
  const checker = await prismaClient.likeComment.findFirst({
    where: {
      id: req.body.id,
    },
  });

  if (!checker) {
    return await commitToDB(
      prismaClient.likeComment.create({
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
      prismaClient.likeComment.delete({
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

async function sleep(duration) {
  return await new Promise((resolve) =>
    setTimeout(() => {
      resolve();
      console.log("waited", duration, "seconds");
    }, duration * 1000)
  );
}
