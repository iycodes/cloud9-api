import nodemailer from "nodemailer";
let username;
let password;

export const getTransporter = () => {
  username = process.env.EMAIL;
  password = process.env.EMAIL_PASSWORD;
  console.log("email in env is ", username);
  const transporter_ = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 587,
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

export const sendMail = async (transporter, data) => {
  data.subject = `Verification Code from Cloud9`;
  //   data.name = "a new user";
  //   data.recepientEmail = "fanoroiyanu@gmail.com";
  //   data.code = 3782;
  data.recepientEmail = data.email;
  data.html = `
                 <h1> Email Confirmation </h1>
               <h2> hello ${data.name} </h2>
               <p>thank you for joining cloud9, Please confirm your email by clicking the link below </p>
               <p>   <a href="http://${data.host}/verify_email/${data.userId}/${data.token}" >  Click here </a>   </p>
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
