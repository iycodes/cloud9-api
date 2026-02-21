export function createUserRepository(sql) {
  return {
    getAllUsers() {
      return sql.query('SELECT * FROM "users"');
    },

    getUserById(userId) {
      return sql.one('SELECT * FROM "users" WHERE id = $1', [userId]);
    },

    getUserByEmail(email) {
      return sql.one('SELECT * FROM "users" WHERE email = $1', [email]);
    },

    getUserByUsername(username) {
      return sql.one('SELECT * FROM "users" WHERE LOWER(username) = LOWER($1)', [
        username,
      ]);
    },

    getFollowersByUserId(userId) {
      return sql.query('SELECT * FROM "Follows" WHERE "followingId" = $1', [userId]);
    },

    getFollowingByUserId(userId) {
      return sql.query('SELECT * FROM "Follows" WHERE "followerId" = $1', [userId]);
    },

    getFollowRelationship(targetUserId, requesterUserId) {
      return sql.one(
        `
        SELECT
          EXISTS (
            SELECT 1
            FROM "Follows" f
            WHERE f."followerId" = $2
              AND f."followingId" = $1
          ) AS "requesterFollowsTarget",
          EXISTS (
            SELECT 1
            FROM "Follows" f
            WHERE f."followerId" = $1
              AND f."followingId" = $2
          ) AS "targetFollowsRequester"
      `,
        [targetUserId, requesterUserId],
      );
    },

    createUser({
      username,
      firstname,
      lastname,
      displayName,
      profileImageSrc,
      coverImageSrc,
      website,
      email,
      password,
      phone,
      gender,
      bio,
      region,
      birthday,
      verificationStatus,
      confirmationToken,
      verificationCodeSentAt,
    }) {
      return sql.one(
        `INSERT INTO "users" (
          username, firstname, lastname, "displayName", "profileImageSrc", "coverImageSrc", website,
          email, password, phone, gender, bio, region, birthday, "verificationStatus", "confirmationToken", "verificationCodeSentAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *`,
        [
          username ?? null,
          firstname,
          lastname,
          displayName ?? null,
          profileImageSrc ?? null,
          coverImageSrc ?? null,
          website ?? null,
          email,
          password,
          phone ?? null,
          gender,
          bio ?? null,
          region ?? null,
          birthday ?? null,
          verificationStatus ?? "basic",
          confirmationToken,
          verificationCodeSentAt ?? null,
        ],
      );
    },

    setConfirmationToken(userId, token, sentAt = null) {
      if (sentAt) {
        return sql.one(
          'UPDATE "users" SET "confirmationToken" = $1, "verificationCodeSentAt" = $2 WHERE id = $3 RETURNING *',
          [token, sentAt, userId],
        );
      }

      return sql.one(
        'UPDATE "users" SET "confirmationToken" = $1 WHERE id = $2 RETURNING *',
        [token, userId],
      );
    },

    getConfirmationToken(userId) {
      return sql.one('SELECT "confirmationToken" FROM "users" WHERE id = $1', [userId]);
    },

    markEmailVerified(userId) {
      return sql.one(
        'UPDATE "users" SET "isEmailVerified" = true, "confirmationToken" = $1 WHERE id = $2 RETURNING id',
        ["", userId],
      );
    },

    clearConfirmationToken(userId) {
      return sql.one(
        'UPDATE "users" SET "confirmationToken" = $1 WHERE id = $2 RETURNING id',
        ["", userId],
      );
    },

    getEmailVerified(userId) {
      return sql.one('SELECT "isEmailVerified" FROM "users" WHERE id = $1', [userId]);
    },

    deleteUserByEmail(email) {
      return sql.one('DELETE FROM "users" WHERE email = $1 RETURNING id', [email]);
    },

    updateUserById(userId, updateData) {
      const fields = Object.keys(updateData);
      const setClause = fields
        .map((field, idx) => `"${field}" = $${idx + 1}`)
        .join(", ");
      const values = fields.map((field) => updateData[field]);
      return sql.one(
        `UPDATE "users" SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, userId],
      );
    },

    updateUserImage(userId, imageField, imageUrl) {
      return sql.one(
        `UPDATE "users" SET "${imageField}" = $1 WHERE id = $2 RETURNING *`,
        [imageUrl, userId],
      );
    },
  };
}
