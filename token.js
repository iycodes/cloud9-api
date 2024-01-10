import { app } from "./server.js";

export const createToken = (user, expiry) => {
  const token = app.jwt.sign({ userId: user.id }, { expiresIn: expiry });
  return token;
};

/* validateAccessToken and validateRefreshToken will be used as a middleware for our fastify request,so it has
to take 3 paramaters which are req,res,next where next is returned as a function if we 
want to proceed after the middleware has done its job   */

export const validateRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    res.code(401).send("User not authenticated");
  }
  if (refreshToken) {
    try {
      app.jwt.verify(
        refreshToken,
        process.env.JWT_SECRET_KEY,
        async (err, info) => {
          if (err) {
            return res.code(403).send({ message: "Forbidden" });
          } else {
            req.decodedUserId = info.userId; // we manually created decodedUserInfo with the req paramater
            return next(); // this tells fastify to continue with our request
          }
        }
      );
    } catch (err) {
      console.log(err);
    }
  }
};
export const validateAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.code(401).send({ message: "client not authorized" });
  }

  const accessToken = authHeader.split(" ")[1];
  app.jwt.verify(accessToken, process.env.JWT_SECRET_KEY, (err, info) => {
    if (err) {
      return res.code(403).send({
        message: "forbidden",
      });
    } else {
      const decodedUserInfo = info.user;
      req.decodedInfo = decodedUserInfo;
      return next();
    }
  });
};
