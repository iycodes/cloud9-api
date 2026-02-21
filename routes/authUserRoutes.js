export function registerAuthUserRoutes({
  app,
  commitToDB,
  userRepo,
  isErrorResult,
  validateAccessToken,
  validateRefreshToken,
  createToken,
  getTransporter,
  sendMail,
  uploadToR2,
  randomUUID,
}) {
  const PUBLIC_MEDIA_BUCKET = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
  if (!PUBLIC_MEDIA_BUCKET) {
    throw new Error("R2_PUBLIC_BUCKET_NAME is required for profile and cover uploads.");
  }
  const MAX_USERNAME_LENGTH = 30;
  const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

  const normalizeUsername = (value) => {
    const raw = String(value ?? "")
      .trim()
      .replace(/^@+/, "")
      .replace(/\s+/g, "");
    if (!raw) return "";

    const normalized = raw.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "");
    return normalized || "";
  };

  const deriveUsername = (providedUsername, firstname, fallbackId = "") => {
    const fromProvided = normalizeUsername(providedUsername);
    if (fromProvided) return fromProvided;

    const fromFirstname = normalizeUsername(firstname);
    if (fromFirstname) return fromFirstname;

    const fallbackSuffix = String(fallbackId || randomUUID())
      .replace(/-/g, "")
      .slice(0, 8);
    return `user${fallbackSuffix || "1"}`;
  };

  const buildUsernameCandidate = (base, suffixNumber) => {
    const normalizedBase = normalizeUsername(base) || "user";
    const suffix = suffixNumber > 0 ? String(suffixNumber) : "";
    const headLength = Math.max(1, MAX_USERNAME_LENGTH - suffix.length);
    return `${normalizedBase.slice(0, headLength)}${suffix}`;
  };

  const resolveUniqueUsername = async (providedUsername, firstname) => {
    const base = deriveUsername(providedUsername, firstname);

    for (let suffix = 0; suffix < 10000; suffix += 1) {
      const candidate = buildUsernameCandidate(base, suffix);
      const existing = await commitToDB(userRepo.getUserByUsername(candidate));

      if (isErrorResult(existing)) {
        throw new Error(existing.message || "Failed to validate username.");
      }

      if (!existing) {
        return candidate;
      }
    }

    throw new Error("Could not allocate a unique username.");
  };

  app.get("/", () => {
    return "api is active";
  });

  app.get("/generate_token/:userId", async (req, res) => {
    const accessToken = app.jwt.sign({ userId: req.params.userId });
    res.send({ accessToken });
  });

  app.get(
    "/validate_token",
    {
      onRequest: [app.authenticate],
    },
    async (req) => {
      return req.user;
    },
  );

  app.get("/users", async () => {
    return await commitToDB(userRepo.getAllUsers());
  });

  app.get("/user/me", { onRequest: validateAccessToken }, async (req) => {
    return await commitToDB(userRepo.getUserById(req.authInfo));
  });

  app.get("/user/:id", async (req) => {
    const user = await commitToDB(userRepo.getUserById(req.params.id));
    if (!user || isErrorResult(user)) {
      return user;
    }

    const [followedBy, following] = await Promise.all([
      commitToDB(userRepo.getFollowersByUserId(req.params.id)),
      commitToDB(userRepo.getFollowingByUserId(req.params.id)),
    ]);

    return {
      ...user,
      followedBy: isErrorResult(followedBy) ? [] : followedBy,
      following: isErrorResult(following) ? [] : following,
    };
  });

  app.get("/seed", async (_, res) => {
    return res
      .code(501)
      .send({ message: "Prisma seed endpoint removed. Use SQL seed scripts." });
  });

  const generateVerificationCode = () =>
    String(Math.floor(100000 + Math.random() * 900000));

  const sendVerificationCodeEmail = async ({ user, code, req }) => {
    const payload = {
      name: user.firstname,
      host: req?.headers?.host,
      userId: user.id,
      email: user.email,
      code,
      token: code,
    };
    const transporter = getTransporter();
    await sendMail(transporter, payload);
  };

  const queueVerificationCodeEmail = ({ user, code, req }) => {
    setTimeout(async () => {
      try {
        console.log("Queueing verification email", {
          userId: user?.id,
          email: user?.email,
        });
        await sendVerificationCodeEmail({ user, code, req });
        console.log("Verification email sent", {
          userId: user?.id,
          email: user?.email,
        });
      } catch (error) {
        console.error("Verification email send failed", {
          userId: user?.id,
          email: user?.email,
          message: error?.message,
        });
      }
    }, 0);
  };

  const getResendAvailableInSeconds = (verificationCodeSentAt) => {
    if (!verificationCodeSentAt) return 0;
    const sentAtMs = new Date(verificationCodeSentAt).getTime();
    if (Number.isNaN(sentAtMs)) return 0;
    const remainingMs =
      sentAtMs + VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / 1000);
  };

  const buildResendMetadata = (baseTime = new Date()) => {
    const sentAt = new Date(baseTime);
    const resendAvailableAt = new Date(
      sentAt.getTime() + VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000,
    );
    return {
      resendAvailableInSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
      resendAvailableAt: resendAvailableAt.toISOString(),
    };
  };

  const issueVerificationCode = async ({ userId, req }) => {
    const existingUser = await commitToDB(userRepo.getUserById(userId));

    if (!existingUser || isErrorResult(existingUser)) {
      return existingUser ?? app.httpErrors.notFound("User not found");
    }

    if (existingUser.isEmailVerified === true) {
      return { message: "email already verified", userId: existingUser.id };
    }

    const remainingSeconds = getResendAvailableInSeconds(
      existingUser.verificationCodeSentAt,
    );
    if (remainingSeconds > 0) {
      return {
        rateLimited: true,
        message: `Please wait ${remainingSeconds}s before requesting another code.`,
        userId: existingUser.id,
        resendAvailableInSeconds: remainingSeconds,
        resendAvailableAt: new Date(
          Date.now() + remainingSeconds * 1000,
        ).toISOString(),
      };
    }

    const code = generateVerificationCode();
    const sentAt = new Date();
    const user = await commitToDB(
      userRepo.setConfirmationToken(userId, code, sentAt.toISOString()),
    );

    if (!user || isErrorResult(user)) {
      return user ?? app.httpErrors.notFound("User not found");
    }

    queueVerificationCodeEmail({ user, code, req });
    return {
      message: "verification code sent",
      userId: user.id,
      ...buildResendMetadata(sentAt),
    };
  };

  app.post("/signUp", async (req, res) => {
    const verificationCode = generateVerificationCode();

    if (req.body.profileImageSrc == null) {
      req.body.profileImageSrc =
        "https://www.pngrepo.com/png/170303/512/avatar.png";
    }

    try {
      const hash = await app.bcrypt.hash(req.body.password, 10);
      let user = null;
      let createError = null;
      const sentAt = new Date();

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const username = await resolveUniqueUsername(
          req.body.username,
          req.body.firstname,
        );

        try {
          user = await userRepo.createUser({
            username,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            displayName: req.body.displayName,
            profileImageSrc: req.body.profileImageSrc,
            coverImageSrc: req.body.coverImageSrc,
            website: req.body.website,
            email: req.body.email,
            password: hash,
            phone: req.body.phone,
            gender: req.body.gender,
            bio: req.body.bio,
            region: req.body.region,
            birthday: req.body.birthday,
            confirmationToken: verificationCode,
            verificationCodeSentAt: sentAt.toISOString(),
          });
          createError = null;
          break;
        } catch (error) {
          createError = error;
          const isUsernameConflict =
            error?.code === "23505" &&
            String(error?.constraint).toLowerCase().includes("username");
          if (!isUsernameConflict) {
            throw error;
          }
        }
      }

      if (!user) {
        throw createError || new Error("Could not create user.");
      }

      const accessToken = createToken(user, "1d");
      const refreshToken = createToken(user, "30d");
      queueVerificationCodeEmail({
        user,
        code: verificationCode,
        req,
      });

      res.cookie("refresh_token", refreshToken, {
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
      });

      return res.send({
        accessToken,
        userId: user.id,
        msg: "verification code sent succesfully",
        emailDelivery: "queued",
        ...buildResendMetadata(sentAt),
      });
    } catch (err) {
      if (err?.code === "23505") {
        if (String(err?.constraint).toLowerCase().includes("email")) {
          return res.code(409).send({ message: "Email already exists" });
        }
        if (String(err?.constraint).toLowerCase().includes("username")) {
          return res.code(409).send({ message: "Username already exists" });
        }
        if (String(err?.constraint).toLowerCase().includes("phone")) {
          return res.code(409).send({ message: "Phone number already exists" });
        }
        return res.code(409).send({ message: "Duplicate value conflict" });
      }
      return res.send(app.httpErrors.internalServerError(err.message));
    }
  });

  app.post("/test/send_verification_email", async (req, res) => {
    const transporter = getTransporter();
    try {
      req.body.name = "a name";
      req.body.host = req?.headers?.host;
      req.body.userId = "random Id";
      req.body.code = req.body.code ?? "123456";
      await sendMail(transporter, req.body);
      return res.send({ message: "Success: email was sent" });
    } catch (error) {
      return res.code(500).send("error sending mail");
    }
  });

  app.get("/send_verification_code/:userId", async (req, res) => {
    try {
      const result = await issueVerificationCode({
        userId: req.params.userId,
        req,
      });
      if (result?.rateLimited) {
        return res.code(429).send(result);
      }
      return res.send(result);
    } catch (error) {
      return res.send(error);
    }
  });

  // Backward-compatible alias of the old route name.
  app.get("/send_verification_link/:userId", async (req, res) => {
    try {
      const result = await issueVerificationCode({
        userId: req.params.userId,
        req,
      });
      if (result?.rateLimited) {
        return res.code(429).send(result);
      }
      return res.send(result);
    } catch (error) {
      return res.send(error);
    }
  });

  app.post("/verify_email_code", async (req, res) => {
    const { userId, code } = req.body ?? {};
    const normalizedCode = String(code ?? "").trim();
    if (!userId || !normalizedCode) {
      return res.code(400).send({ message: "userId and code are required." });
    }

    const user = await commitToDB(userRepo.getConfirmationToken(userId));
    if (!user || isErrorResult(user)) {
      return res.send(user ?? app.httpErrors.notFound("User not found"));
    }

    if (user.confirmationToken === normalizedCode) {
      await commitToDB(userRepo.markEmailVerified(userId));
      return res.send({ message: "email verified" });
    }

    return res.code(400).send({ message: "Invalid verification code." });
  });

  app.get("/verify_email/:userId/:token", async (req, res) => {
    if (req.params.token === "") {
      return res.send(app.httpErrors.badRequest("empty params"));
    }

    const user = await commitToDB(userRepo.getConfirmationToken(req.params.userId));

    if (!user || isErrorResult(user)) {
      return res.send(user ?? app.httpErrors.notFound("User not found"));
    }

    if (user.confirmationToken === req.params.token) {
      await commitToDB(userRepo.markEmailVerified(req.params.userId));
      return res.send("email verified");
    }

    return res.send(
      app.httpErrors.badRequest("Invalid verification code"),
    );
  });

  app.get("/:userId/isEmailVerified", async (req) => {
    const user = await commitToDB(userRepo.getEmailVerified(req.params.userId));
    return user?.isEmailVerified ?? false;
  });

  app.get(
    "/auth/refresh",
    { onRequest: validateRefreshToken },
    async (req, res) => {
      const user = await commitToDB(userRepo.getUserById(req.decodedUserId));
      if (!user || isErrorResult(user)) {
        return res.code(404).send({ message: "user not found" });
      }

      try {
        const accessToken = createToken(user, "30s");
        if (accessToken) {
          return res.code(200).send({
            accessToken,
            userId: user.id,
          });
        }
        return res.code(500).send("failed to create access token");
      } catch (err) {
        return res.code(500).send(err);
      }
    },
  );

  app.route({
    method: "POST",
    url: "/login",
    handler: async (req, res) => {
      const { email, password } = req.body;
      const user = await commitToDB(userRepo.getUserByEmail(email));

      if (!user || isErrorResult(user)) {
        return res.code(404).send({ message: "user does not exist" });
      }

      const hashedPassword = user.password;
      return app.bcrypt.compare(password, hashedPassword).then((match) => {
        if (match) {
          const accessToken = createToken(user, "1d");
          const refreshToken = createToken(user, "30d");
          res.cookie("refresh_token", refreshToken, {
            maxAge: 60 * 60 * 24 * 30,
            httpOnly: true,
          });
          return res.code(200).send({
            accessToken,
            userId: user.id,
          });
        }
        return res.code(401).send("invalid credentials");
      });
    },
  });

  app.post("/auth/logout", async (req, res) => {
    const refreshToken = req.cookies["refresh_token"];
    if (!refreshToken) {
      res.code(204);
    }
    await res.clearCookie("refresh_token", {
      httpOnly: true,
    });
    res.send({ message: "cookie cleared" });
  });

  app.delete("/delete_user/:userId", async (req, res) => {
    try {
      await commitToDB(userRepo.deleteUserByEmail(req.params.userId));
      res.send("user deleted succesfully");
    } catch (err) {
      res.send(err);
    }
  });

  app.patch("/user/:id", async (req, res) => {
    const allowedFields = [
      "firstname",
      "lastname",
      "displayName",
      "phone",
      "bio",
      "region",
      "birthday",
      "birthdayDate",
      "birthdayDisplayMode",
      "birthdayVisibility",
      "birthdayMonthDayVisibility",
      "birthdayDayVisibility",
      "birthdayYearVisibility",
      "likesVisibility",
      "bookmarksVisibility",
      "profileImageSrc",
      "coverImageSrc",
      "website",
    ];

    const updateData = {};
    if (req.body.username !== undefined) {
      const normalizedUsername = normalizeUsername(req.body.username);
      if (!normalizedUsername) {
        return res.code(400).send({ message: "username cannot be empty." });
      }

      const existingUser = await commitToDB(
        userRepo.getUserByUsername(normalizedUsername),
      );
      if (isErrorResult(existingUser)) {
        return res.code(existingUser.statusCode).send(existingUser);
      }

      if (existingUser && String(existingUser.id) !== String(req.params.id)) {
        return res.code(409).send({ message: "Username already exists" });
      }

      updateData.username = normalizedUsername;
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.code(400).send({ message: "No valid fields to update." });
    }

    try {
      const updatedUser = await commitToDB(
        userRepo.updateUserById(req.params.id, updateData),
      );
      if (isErrorResult(updatedUser)) {
        return res.code(updatedUser.statusCode).send(updatedUser);
      }
      return res.code(200).send(updatedUser);
    } catch (error) {
      if (error?.code === "23505") {
        if (String(error?.constraint).toLowerCase().includes("username")) {
          return res.code(409).send({ message: "Username already exists" });
        }
      }
      return res.code(500).send({ message: "Failed to update user." });
    }
  });

  app.post("/user/:id/upload-image", async (req, res) => {
    const { imageData, imageType = "profile", mimeType } = req.body || {};
    if (!imageData || typeof imageData !== "string") {
      return res.code(400).send({ message: "imageData is required." });
    }
    if (!["profile", "cover"].includes(imageType)) {
      return res
        .code(400)
        .send({ message: "imageType must be either profile or cover." });
    }

    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      return res
        .code(400)
        .send({ message: "imageData must be a valid base64 data URL." });
    }

    const detectedMimeType = mimeType || base64Match[1];
    if (!detectedMimeType.startsWith("image/")) {
      return res.code(400).send({ message: "Only image uploads are supported." });
    }

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const extension = extensionMap[detectedMimeType] || "bin";
    const base64Payload = base64Match[2];
    const buffer = Buffer.from(base64Payload, "base64");
    const maxFileSizeInBytes = 10 * 1024 * 1024;

    if (buffer.length > maxFileSizeInBytes) {
      return res.code(413).send({ message: "Image is larger than 10MB." });
    }

    try {
      const objectName = `users/${req.params.id}/${imageType}-${Date.now()}-${randomUUID()}.${extension}`;
      const uploadedUrl = await uploadToR2(
        buffer,
        objectName,
        detectedMimeType,
        PUBLIC_MEDIA_BUCKET,
      );
      const imageField =
        imageType === "cover" ? "coverImageSrc" : "profileImageSrc";

      const updatedUser = await commitToDB(
        userRepo.updateUserImage(req.params.id, imageField, uploadedUrl),
      );

      if (updatedUser?.statusCode >= 400) {
        return res.code(updatedUser.statusCode).send(updatedUser);
      }

      return res.code(200).send({
        message: "Image uploaded successfully.",
        imageType,
        imageUrl: uploadedUrl,
        userId: req.params.id,
      });
    } catch (error) {
      return res.code(500).send({ message: "Failed to upload image." });
    }
  });
}
