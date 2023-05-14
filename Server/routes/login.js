const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

const emailValidator = require("deep-email-validator");


// var nodemailer = require('nodemailer');

// var transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'youremail@gmail.com',
//     pass: 'yourpassword'
//   }
// });

// var mailOptions = {
//   from: 'youremail@gmail.com',
//   to: 'myfriend@yahoo.com',
//   subject: 'Sending Email using Node.js',
//   text: 'That was easy!'
// };

// transporter.sendMail(mailOptions, function(error, info){
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Email sent: ' + info.response);
//   }
// });

router.get("/", (req, res) => {
  res.render("login", { message: req.flash("message") });

  req.session.destroy();
});

router.post("/", (req, res) => {
  const query =
    "SELECT user_id, account_type FROM users where user_name =? and password =?";
  pool.query(query, [req.body.username, req.body.password], (err, result) => {
    if (err) {
      return res.json(err);
    } else if (result.length) {
      // send id to tokens

      var string = JSON.stringify(result);
      var json = JSON.parse(string);

      req.session.authenticated = true;

      req.session.userId = json[0].user_id;
      req.session.accountType = json[0].account_type;

      console.log(req.session);

      return res.redirect("/");
    }

    console.log(req.body);

    req.flash("message", "Wrong Username or Password");
    res.render("login", { message: req.flash("message") });
  });
});

router.get("/create-account", (req, res) => {
  res.render("create-account", {
    messageRegister: req.flash("messageRegister"),
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  req.session.destroy();
});

router.post("/create-account", (req, res) => {
  const verifyEmail = new Promise((resolve, reject) => {
    /// verify email
    resolve(emailValidator.validate(req.body.email));
  });
  verifyEmail.then((data) => {
    if (data.valid) {
      // valid email

      const verifyPassword = new Promise((resolve, reject) => {
        if (req.body.password == req.body.confirm) {
          let passwordValid = true;
          resolve(passwordValid);
        } else {
          let passwordValid = false;
          resolve(passwordValid);
        }
      });

      verifyPassword.then((passwordValid) => {
        if (passwordValid) {
          const verifySelection = new Promise((resolve, reject) => {
            if (req.body.doctor == "on" || req.body.patient == "on") {
              let selectionValidity = true;
              resolve(selectionValidity);
            } else {
              let selectionValidity = false;
              resolve(selectionValidity);
            }
          });

          verifySelection.then((selectionValidity) => {
            if (selectionValidity) {
              const emailUsed = new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                  if (err) throw err;

                  const query = "SELECT * FROM users where email =?";
                  pool.query(query, [req.body.email], (err, results) => {
                    if (err) throw err;

                    if (results.length) {
                      let emailAlreadyUsed = true;
                      resolve(emailAlreadyUsed);
                    } else {
                      let emailAlreadyUsed = false;
                      resolve(emailAlreadyUsed);
                    }
                  });

                  connection.release();
                });
              });

              emailUsed.then((emailAlreadyUsed) => {
                if (emailAlreadyUsed) {
                  req.flash(
                    "messageRegister",
                    "Email Address Is Already In Use"
                  );
                  return res.render("create-account", {
                    messageRegister: req.flash("messageRegister"),
                    username: req.body.username,
                    email: "",
                    password: req.body.password,
                    confirm: req.body.confirm,
                  });
                } else {
                  const usernameTaken = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) throw err;

                      const query = "SELECT * FROM users where user_name =?";
                      pool.query(query, [req.body.username], (err, results) => {
                        if (err) throw err;

                        if (results.length) {
                          let usernameUsed = true;
                          resolve(usernameUsed);
                        } else {
                          let usernameUsed = false;
                          resolve(usernameUsed);
                        }
                      });

                      connection.release();
                    });
                  });
                  usernameTaken.then((usernameUsed) => {
                    if (usernameUsed) {
                      console.log("Username already exists");
                      req.flash("messageRegister", "Username Already Exists");
                      return res.render("create-account", {
                        messageRegister: req.flash("messageRegister"),
                        username: "",
                        email: req.body.email,
                        password: req.body.password,
                        confirm: req.body.confirm,
                      });
                    } else {
                      ///save to database

                      let accountType = "";

                      if (req.body.doctor == "on") {
                        accountType = "doctor";
                      } else if (req.body.patient == "on") {
                        accountType = "patient";
                      }

                      console.log(accountType);

                      const query =
                        "INSERT INTO users (`user_name`,`email`, `password`, `account_type`) VALUES(?)";
                      const values = [
                        req.body.username,
                        req.body.email,
                        req.body.password,
                        accountType,
                      ];
                      pool.query(query, [values], (err, data) => {
                        if (err) console.log(err);
                        else {
                          console.log("User has been created");
                          console.log(data.insertId); // insert this id to tokens

                          /// authenticate

                          req.session.authenticated = true;

                          req.session.userId = data.insertId;
                          req.session.accountType = accountType;

                          if (accountType == "doctor") {
                            return res.redirect("/register/doctor");
                          } else if (accountType == "patient") {
                            return res.redirect("/register/patient");
                          }
                        }
                      });
                    }
                  });
                }
              });
            } else {
              req.flash(
                "messageRegister",
                "Please choose either doctor or patient account"
              );
              return res.render("create-account", {
                messageRegister: req.flash("messageRegister"),
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                confirm: req.body.confirm,
              });
            }
          });
        } else {
          console.log("Passwords don't match");
          req.flash("messageRegister", "Passwords don't match");
          return res.render("create-account", {
            messageRegister: req.flash("messageRegister"),
            username: req.body.username,
            email: req.body.email,
            password: "",
            confirm: "",
          });
        }
      });
    } else {
      /// invalid email

      console.log("Invalid Email");
      req.flash("messageRegister", "Invalid Email Address");
      return res.render("create-account", {
        messageRegister: req.flash("messageRegister"),
        username: req.body.username,
        email: "",
        password: req.body.password,
        confirm: req.body.confirm,
      });
    }
  });
});

router.get("/forgot-password", (req, res) => {
  res.sendFile(path.resolve("../forgot-password.html"));
});

module.exports = router;
