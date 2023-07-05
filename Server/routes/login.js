const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

const emailValidator = require("deep-email-validator");

var nodemailer = require("nodemailer");

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

      if (req.session.accountType == "administrator"){
        return res.redirect("/admin");
      } else {
        return res.redirect("/");
      }
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

router.get("/reset-password-or-username", (req, res) => {
  req.flash("resetEnterEmail", "");
  res.render("reset-enter-email", { message: req.flash("resetEnterEmail") });
});

router.post("/reset-enter-email", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      req.flash("resetEnterEmail", "Error Accessing The Database");
      return res.render("reset-enter-email", {
        message: req.flash("resetEnterEmail"),
      });
    } else {
      const query = "SELECT * FROM users WHERE email = ?";
      connection.query(query, [req.body.email], (err, results) => {
        if (err) {
          req.flash("resetEnterEmail", "Error Validating The Email Address");
          return res.render("reset-enter-email", {
            message: req.flash("resetEnterEmail"),
          });
        } else {
          if (results.length) {
            let OTP = Math.floor(Math.random() * (9999 - 1000) + 1000);
            console.log(OTP);

            const now = new Date();
            let expiryTime = now.getTime() + 10 * 60000;

            let expiryDate = new Date(expiryTime);

            req.session.resetEmail = req.body.email;
            req.session.resetUserId = results[0].user_id;
            req.session.resetOtp = OTP;
            req.session.resetExpiry = expiryDate;

            var transporter = nodemailer.createTransport({
              service: "gmail",
              port: 465,
              secure: true,
              auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_ADDRESS_PASSWORD,
              },
            });

            var mailOptions = {
              from: process.env.EMAIL_ADDRESS,
              to: req.body.email,
              subject: "Reset Username Or Passord OTP",
              text: `Please use this OTP : ${OTP}`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log(error);
                req.flash(
                  "resetEnterEmail",
                  "Error Sending The OTP To Your Email Address"
                );
                return res.render("reset-enter-email", {
                  message: req.flash("resetEnterEmail"),
                });
              } else {
                console.log("Email sent: " + info.response);
                req.flash("resetEnterOtp", "");
                return res.render("reset-enter-otp", {
                  message: req.flash("resetEnterOtp"),
                  messageType: "danger",
                });
              }
            });
          } else {
            req.flash("resetEnterEmail", "Invalid Email Address");
            return res.render("reset-enter-email", {
              message: req.flash("resetEnterEmail"),
            });
          }
        }
      });
    }
    connection.release();
  });
});

router.post("/reset-enter-otp", (req, res) => {
  if (req.body.resend == "") {
    //// resend otp

    let OTP = Math.floor(Math.random() * (9999 - 1000) + 1000);
    console.log(OTP);

    const now = new Date();
    let expiryTime = now.getTime() + 10 * 60000;

    let expiryDate = new Date(expiryTime);

    req.session.resetOtp = OTP;
    req.session.resetExpiry = expiryDate;

    var transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_ADDRESS_PASSWORD,
      },
    });

    var mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: req.session.resetEmail,
      subject: "Reset Username Or Passord OTP",
      text: `Please use this OTP : ${OTP}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        req.flash("resetEnterOtp", "Error Sending The OTP");
        return res.render("reset-enter-otp", {
          message: req.flash("resetEnterOtp"),
          messageType: "danger",
        });
      } else {
        console.log("Email sent: " + info.response);
        req.flash("resetEnterOtp", "OTP Sent Successfully");
        return res.render("reset-enter-otp", {
          message: req.flash("resetEnterOtp"),
          messageType: "success",
        });
      }
    });
  } else {
    /// check otp

    if (req.body.otp == req.session.resetOtp) {
      const now = new Date();
      const expiryDate = new Date(req.session.resetExpiry);

      if (now.getTime() > expiryDate.getTime()) {
        req.flash("resetEnterOtp", "The OTP has expired");
        return res.render("reset-enter-otp", {
          message: req.flash("resetEnterOtp"),
          messageType: "danger",
        });
      } else {
        console.log("OTP accepted");

        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query = "SELECT * FROM users WHERE user_id=?";
            connection.query(
              query,
              [req.session.resetUserId],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  req.flash("resetDetailsMessage", "");
                  return res.render("reset-login-details", {
                    message: req.flash("resetDetailsMessage"),
                    username: results[0].user_name,
                    email: results[0].email,
                    password: results[0].password,
                    confirm: results[0].password,
                  });
                }
              }
            );
          }
          connection.release();
        });
      }
    } else {
      req.flash("resetEnterOtp", "Invalid OTP");
      return res.render("reset-enter-otp", {
        message: req.flash("resetEnterOtp"),
        messageType: "danger",
      });
    }
  }
});

router.post("/reset-details", (req, res) => {
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
          const emailUsed = new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
              if (err) throw err;

              const query =
                "SELECT * FROM users WHERE email = ? AND user_id != ?";
              pool.query(
                query,
                [req.body.email, req.session.resetUserId],
                (err, results) => {
                  if (err) throw err;

                  if (results.length) {
                    let emailAlreadyUsed = true;
                    resolve(emailAlreadyUsed);
                  } else {
                    let emailAlreadyUsed = false;
                    resolve(emailAlreadyUsed);
                  }
                }
              );

              connection.release();
            });
          });

          emailUsed.then((emailAlreadyUsed) => {
            if (emailAlreadyUsed) {
              req.flash(
                "resetDetailsMessage",
                "Email Address Is Already In Use"
              );
              return res.render("reset-login-details", {
                message: req.flash("resetDetailsMessage"),
                username: req.body.username,
                email: "",
                password: req.body.password,
                confirm: req.body.confirm,
              });
            } else {
              const usernameTaken = new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                  if (err) throw err;

                  const query =
                    "SELECT * FROM users WHERE user_name =? AND user_id != ?";
                  pool.query(
                    query,
                    [req.body.username, req.session.resetUserId],
                    (err, results) => {
                      if (err) throw err;

                      if (results.length) {
                        let usernameUsed = true;
                        resolve(usernameUsed);
                      } else {
                        let usernameUsed = false;
                        resolve(usernameUsed);
                      }
                    }
                  );

                  connection.release();
                });
              });
              usernameTaken.then((usernameUsed) => {
                if (usernameUsed) {
                  console.log("Username already exists");
                  req.flash("resetDetailsMessage", "Username Already Exists");
                  return res.render("reset-login-details", {
                    message: req.flash("resetDetailsMessage"),
                    username: "",
                    email: req.body.email,
                    password: req.body.password,
                    confirm: req.body.confirm,
                  });
                } else {
                  ///save to database

                  const query =
                    "UPDATE users SET user_name = ?, email = ?, password = ? WHERE user_id = ?";

                  pool.query(
                    query,
                    [
                      req.body.username,
                      req.body.email,
                      req.body.password,
                      req.session.resetUserId,
                    ],
                    (err, data) => {
                      if (err) console.log(err);
                      else {
                        console.log("User details have been updated");

                        return res.redirect("/login");
                      }
                    }
                  );
                }
              });
            }
          });
        } else {
          console.log("Passwords don't match");
          req.flash("resetDetailsMessage", "Passwords don't match");
          return res.render("reset-login-details", {
            message: req.flash("resetDetailsMessage"),
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
      req.flash("resetDetailsMessage", "Invalid Email Address");
      return res.render("reset-login-details", {
        message: req.flash("resetDetailsMessage"),
        username: req.body.username,
        email: "",
        password: req.body.password,
        confirm: req.body.confirm,
      });
    }
  });
});

module.exports = router;
