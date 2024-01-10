import nodemailer from "nodemailer";

const loadEnvironmentVariable = (keyname) => {
  const envVar = process.env[keyname];

  if (!envVar) {
    throw new Error(`Configuration must include ${keyname}`);
  }

  return envVar;
};

const transporter = nodemailer.createTransport({
  host: "in-v3.mailjet.com",
  port: 587,
  //   secure: true,

  auth: {
    user: process.env.MAILJET_API_KEY,
    pass: process.env.MAILJET_SECRET_KEY,
  },
});

export const sendConfirmationEmail = async (
  name,
  userId,
  email,
  confirmationToken,
  req,
  res
) => {
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const mailOPtions = {
    from: "iycodes@outlook.com",
    to: email,
    subject: "please verify your email",

    html: `
              <h1> Email Confirmation </h1>
              <h2> hello ${name} </h2>
              <p>thank you for joining cloud9, Please confirm your email by clicking the link below </p>
              <p>   <a href="http://${req?.headers?.host}/verify_email/${userId}/${confirmationToken}" >  Click here </a>   </p>
              `,
  };
  try {
    transporter.sendMail(mailOPtions, (error, info) => {
      if (info) {
        console.log(info);
      }
      if (error) {
        console.log(error);
      }
    });
  } catch (error) {
    // console.log(error);
  }
};
