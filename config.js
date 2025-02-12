import nodemailer from "nodemailer";

const loadENV = (keyname) => {
  const envVar = process.env[keyname];

  if (!envVar) {
    throw new Error(`Configuration must include ${keyname}`);
  }
  console.log("loaded env is", envVar);
  return envVar;
};
let username;
let password;
const getTransporter = () => {
  username = process.env.EMAIL;
  password = process.env.PASSWORD;
  const transporter_ = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 587,
    // tls: {
    //   ciphers: "SSLv3",
    //   rejectUnauthorized: false,
    // },
    // secure: true,
    requireTLS: true,
    auth: {
      user: username,
      pass: password,
    },
  });
  return transporter_;
};

const sendMail = async (transporter, data) => {
  data.subject = `Verification Code from Transport App`;
  //   data.name = "a new user";
  //   data.recepientEmail = "fanoroiyanu@gmail.com";
  //   data.code = 3782;
  data.html = `
              <h2>Hi There ${data.name} </h2>
              <p>your verification code is ${data.code} </p>
              `;

  // const mail =
  return await transporter.sendMail({
    from: username,
    to: data.recepientEmail,
    replyTo: username,
    subject: data.subject,
    html: data.html,
  });
};

// const transporter = getTransporter();

// export const sendConfirmationEmail = async (
//   name,
//   userId,
//   email,
//   confirmationToken,
//   req,
//   res
// ) => {
//   transporter.verify(function (error, success) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("Server is ready to take our messages");
//     }
//   });

//   const mailOPtions = {
//     from: process.env.EMAIL,
//     to: email,
//     subject: "please verify your email",

//     html: `
//               <h1> Email Confirmation </h1>
//               <h2> hello ${name} </h2>
//               <p>thank you for joining cloud9, Please confirm your email by clicking the link below </p>
//               <p>   <a href="http://${req?.headers?.host}/verify_email/${userId}/${confirmationToken}" >  Click here </a>   </p>
//               `,
//   };
//   transporter.sendMail(mailOPtions);
//   // try {
//   //   transporter.sendMail(mailOPtions, (error, info) => {
//   //     if (info) {
//   //       console.log(info);
//   //     }
//   //     if (error) {
//   //       console.log(error);
//   //     }
//   //   });
//   // } catch (error) {
//   //   // console.log(error);
//   // }
// };
