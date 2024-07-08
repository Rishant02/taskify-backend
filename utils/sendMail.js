const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const handlebarOptions = {
  viewEngine: {
    partialDir: path.resolve("../taskify-backend/views/"),
    defaultLayout: false,
  },
  viewPath: path.resolve("../taskify-backend/views/"),
};

const sendVerificationEmail = async (mailOptions) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.PASSWORD,
    },
  });
  transporter.use("compile", hbs(handlebarOptions));
  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err.message);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = sendVerificationEmail;
