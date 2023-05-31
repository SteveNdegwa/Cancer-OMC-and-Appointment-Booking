const express = require("express");
const app = express();

const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const unirest = require("unirest");
const axios = require("axios");

const fs = require("fs");
const path = require("path");
const http = require("http");

const pool = require("./server.js");

const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const session = require("express-session")({
  secret: "secretStringForSession",
  // cookie: { maxAge: 60000 },
  resave: true,
  saveUninitialized: true,
  // store: new session.MemoryStore(),
});

var sharedsession = require("express-socket.io-session");

app.use(cookieParser("secretStringForCookies"));
app.use(session);
const server = http.createServer(app);

const socketio = require("socket.io");
const io = socketio(server);
io.use(sharedsession(session));

app.use(flash());

app.use(cors()); //send data between front and backend
app.use(express.json()); // to get access to data being sent through url eg name,password sent using http requests by java script
app.use(express.urlencoded({ extended: false })); //to get data being sent through url eg name,password sent through html forms

app.use(express.static(path.resolve("./public")));

app.set("view engine", "ejs");

//to routes

const home = require("./routes/home");
app.use("/", home);

const login = require("./routes/login");
app.use("/login", login);

const register = require("./routes/register");
app.use("/register", register);

const appointments = require("./routes/appointments");
app.use("/appointments", appointments);

const admin = require("./routes/admin");
const { log } = require("console");
app.use("/admin", admin);

//// chats

let token = "";

function access(req, res, next) {
  let request = unirest(
    "GET",
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  )
    .headers({
      Authorization: "Basic " + process.env.AUTHORIZATION_CODE,
    })
    .send()
    .end((response) => {
      if (response.error) throw new Error(response.error);
      console.log(response.raw_body);
      token = JSON.parse(response.raw_body).access_token;
      next();
    });
}

app.get("/chats/pay-consultation-fee", (req, res) => {
  if (req.session.authenticated) {
    req.flash("consultMsg", "");
    res.render("pay-consultation-fee.ejs", {
      message: req.flash("consultMsg"),
      consultationFee: req.session.consultationFee,
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/chats/pay-consultation-fee", (req, res) => {
  if (req.body.home == "") {
    // to homepage
    return res.redirect("/");
  } else if (req.body.view == "") {
    /// view mode
    req.session.viewMode = true;
    return res.redirect("/chats/chat");
  } else if (req.body.pay == "") {
    /// pay
    req.flash("consultationPaymentMessage", "");
    res.render("consultation-input-number", {
      message: req.flash("consultationPaymentMessage"),
    });
  }
});

let expiryTime = "";
let expiryDate = "";

app.post("/chats/consultation-input-number", access, (req, res) => {
  pool.getConnection((err, connection) => {
    let number = req.body.number.substring(1);
    let mobileNo = "254" + number;

    let amount = req.session.consultationFee;

    const date = new Date();
    const timestamp =
      date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const shortcode = process.env.SHORT_CODE; ////// or req.session.consultation.businessNo
    const passkey = process.env.PASS_KEY;

    const password = new Buffer.from(shortcode + passkey + timestamp).toString(
      "base64"
    );

    let request = unirest(
      "POST",
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    )
      .headers({
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      })
      .send(
        JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: mobileNo,
          PartyB: shortcode,
          PhoneNumber: mobileNo,
          CallBackURL: "https://02b6-197-237-171-106.ngrok-free.app/callback",
          AccountReference: "CSS",
          TransactionDesc: "Payment of Consultation",
        })
      )
      .end((response) => {
        if (response.error) {
          console.log(response.error);

          req.flash(
            "consultMsg",
            "Sorry. There is a problem generating the STK Push"
          );
          return res.render("pay-consultation-fee.ejs", {
            message: req.flash("consultMsg"),
            consultationFee: req.session.consultationFee,
          });
        } else {
          const saveStkPush = new Promise((resolve, reject) => {
            console.log(response.body);
            console.log(response.body.CheckoutRequestID);

            req.session.consultation.CheckoutRequestID =
              response.body.CheckoutRequestID;

            if (err) throw err;

            const now = new Date();
            expiryTime = now.getTime() + 1440 * 60000; //// 1440 minutes

            console.log(expiryTime);

            expiryDate = new Date(expiryTime);

            const query2 =
              "INSERT INTO consultations_stk_push(`checkout_id`, `phone_no` ,`amount` , `timestamp` , `doctor_id`, `patient_id`, `consultation_expiry_time`) VALUES(?);";
            const values2 = [
              response.body.CheckoutRequestID,
              mobileNo,
              amount,
              timestamp,
              req.session.consultation.doctorId,
              req.session.userId,
              expiryDate,
            ];
            connection.query(query2, [values2], (err, data) => {
              if (err) throw err;
              console.log("consultation STK data inserted successfully");

              // req.flash("consultationStkStatusMessage", "");
              // res.render("consultation-stk-push", {
              //   message: req.flash("consultationStkStatusMessage"),
              // });

              resolve();
            });
          });

          saveStkPush.then(() => {
            const checkStkPush = () => {
              const date = new Date();
              const timestamp =
                date.getFullYear() +
                ("0" + (date.getMonth() + 1)).slice(-2) +
                ("0" + date.getDate()).slice(-2) +
                ("0" + date.getHours()).slice(-2) +
                ("0" + date.getMinutes()).slice(-2) +
                ("0" + date.getSeconds()).slice(-2);

              const shortcode = process.env.SHORT_CODE; ////// or req.session.consultation.businessNo
              const passkey = process.env.PASS_KEY;

              const password = new Buffer.from(
                shortcode + passkey + timestamp
              ).toString("base64");

              let request = unirest(
                "POST",
                "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
              )
                .headers({
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + token,
                })
                .send(
                  JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID:
                      req.session.consultation.CheckoutRequestID,
                  })
                )
                .end((response) => {
                  if (response.error) {
                    // req.flash(
                    //   "consultationStkStatusMessage",
                    //   "Please complete the payment before proceeding"
                    // );
                    // return res.render("consultation-stk-push", {
                    //   message: req.flash("consultationStkStatusMessage"),
                    // });
                  } else {
                    clearInterval(interval);
                    console.log(response.body.ResultDesc);

                    if (
                      response.body.ResultDesc ==
                      "The service request is processed successfully."
                    ) {
                      /// if payment successful

                      const saveSessions = new Promise((resolve, reject) => {
                        pool.getConnection((err, connection) => {
                          if (err) throw err;

                          const query =
                            "SELECT * FROM consultation_sessions where room_id = ?";
                          connection.query(
                            query,
                            [req.session.roomId],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results.length) {
                                  const query2 =
                                    "UPDATE consultation_sessions SET expiry_time = ? where room_id = ?";
                                  connection.query(
                                    query2,
                                    [expiryDate, req.session.roomId],
                                    (err, data) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        resolve(
                                          console.log(
                                            "consultation session updated successfully"
                                          )
                                        );
                                      }
                                    }
                                  );
                                } else {
                                  const query2 =
                                    "INSERT INTO consultation_sessions(`room_id`, `expiry_time`) VALUES(?)";
                                  const values = [
                                    req.session.roomId,
                                    expiryDate,
                                  ];
                                  connection.query(
                                    query2,
                                    [values],
                                    (err, data) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        resolve(
                                          console.log(
                                            "consultation session inserted successfully"
                                          )
                                        );
                                      }
                                    }
                                  );
                                }
                              }
                            }
                          );
                          connection.release();
                        });
                      });

                      saveSessions.then(() => {
                        pool.getConnection((err, connection) => {
                          if (err) throw err;
                          const query =
                            "UPDATE consultations_stk_push SET status = ? WHERE checkout_id = ?";
                          connection.query(
                            query,
                            [
                              response.body.ResultDesc,
                              req.session.consultation.CheckoutRequestID,
                            ],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                req.session.expiryTime = expiryDate;
                                req.session.viewMode = false;
                                return res.redirect("/chats/chat");
                              }
                            }
                          );

                          connection.release();
                        });
                      });
                    } else {
                      /// if payment not successful

                      pool.getConnection((err, connection) => {
                        if (err) throw err;
                        const query =
                          "UPDATE consultations_stk_push SET status = ? WHERE checkout_id = ?";
                        connection.query(
                          query,
                          [
                            response.body.ResultDesc,
                            req.session.consultation.CheckoutRequestID,
                          ],
                          (err, result) => {
                            if (err) throw err;

                            req.flash(
                              "consultationPaymentMessage",
                              response.body.ResultDesc
                            );
                            return res.render("consultation-input-number", {
                              message: req.flash("consultationPaymentMessage"),
                            });
                          }
                        );
                      });
                    }
                  }
                });
            };
            let interval = setInterval(checkStkPush, 5000);
          });
        }
      });

    connection.release();
  });
});

app.post("/chats/consultation-stk-push", (req, res) => {
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.SHORT_CODE; ////// or req.session.consultation.businessNo
  const passkey = process.env.PASS_KEY;

  const password = new Buffer.from(shortcode + passkey + timestamp).toString(
    "base64"
  );

  let request = unirest(
    "POST",
    "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
  )
    .headers({
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    })
    .send(
      JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: req.session.consultation.CheckoutRequestID,
      })
    )
    .end((response) => {
      if (response.error) {
        req.flash(
          "consultationStkStatusMessage",
          "Please complete the payment before proceeding"
        );
        return res.render("consultation-stk-push", {
          message: req.flash("consultationStkStatusMessage"),
        });
      }
      console.log(response.body.ResultDesc);

      if (
        response.body.ResultDesc ==
        "The service request is processed successfully."
      ) {
        /// if payment successful

        const saveSessions = new Promise((resolve, reject) => {
          pool.getConnection((err, connection) => {
            if (err) throw err;

            const query =
              "SELECT * FROM consultation_sessions where room_id = ?";
            connection.query(query, [req.session.roomId], (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  const query2 =
                    "UPDATE consultation_sessions SET expiry_time = ? where room_id = ?";
                  connection.query(
                    query2,
                    [expiryDate, req.session.roomId],
                    (err, data) => {
                      if (err) {
                        throw err;
                      } else {
                        resolve(
                          console.log(
                            "consultation session updated successfully"
                          )
                        );
                      }
                    }
                  );
                } else {
                  const query2 =
                    "INSERT INTO consultation_sessions(`room_id`, `expiry_time`) VALUES(?)";
                  const values = [req.session.roomId, expiryDate];
                  connection.query(query2, [values], (err, data) => {
                    if (err) {
                      throw err;
                    } else {
                      resolve(
                        console.log(
                          "consultation session inserted successfully"
                        )
                      );
                    }
                  });
                }
              }
            });
            connection.release();
          });
        });

        saveSessions.then(() => {
          pool.getConnection((err, connection) => {
            if (err) throw err;
            const query =
              "UPDATE consultations_stk_push SET status = ? WHERE checkout_id = ?";
            connection.query(
              query,
              [
                response.body.ResultDesc,
                req.session.consultation.CheckoutRequestID,
              ],
              (err, result) => {
                if (err) {
                  throw err;
                } else {
                  req.session.expiryTime = expiryDate;
                  req.session.viewMode = false;
                  return res.redirect("/chats/chat");
                }
              }
            );

            connection.release();
          });
        });
      } else {
        /// if payment not successful

        pool.getConnection((err, connection) => {
          if (err) throw err;
          const query =
            "UPDATE consultations_stk_push SET status = ? WHERE checkout_id = ?";
          connection.query(
            query,
            [
              response.body.ResultDesc,
              req.session.consultation.CheckoutRequestID,
            ],
            (err, result) => {
              if (err) throw err;

              req.flash("consultationPaymentMessage", response.body.ResultDesc);
              return res.render("consultation-input-number", {
                message: req.flash("consultationPaymentMessage"),
              });
            }
          );
        });
      }
    });
});

app.get("/chats/chat-rooms", (req, res) => {
  let rooms = [];

  const getChatRooms = new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) throw err;
      let query = "";
      if (req.session.accountType == "patient") {
        query =
          "SELECT * FROM chat_rooms WHERE patient_id = ? AND status = ? ORDER BY last_active DESC";
      } else {
        query =
          "SELECT * FROM chat_rooms WHERE doctor_id = ? AND status = ? ORDER BY last_active DESC";
      }

      connection.query(
        query,
        [req.session.userId, "active"],
        (err, results) => {
          if (err) throw err;
          if (results.length) {
            results.forEach((result, index) => {
              rooms.push(result);
              if (index == results.length - 1) {
                console.log(rooms);
                resolve(rooms);
              }
            });
          } else {
            resolve(rooms);
          }
        }
      );

      connection.release();
    });
  });

  getChatRooms.then((rooms) => {
    const getNames = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) throw err;
        if (rooms.length) {
          for (let i = 0; i < rooms.length; i++) {
            let query2 = "";
            let userId2 = "";
            if (req.session.accountType == "patient") {
              query2 = "SELECT name FROM doctor_details WHERE user_id = ?";
              userId2 = rooms[i].doctor_id;
            } else {
              query2 = "SELECT name FROM patient_details WHERE user_id = ?";
              userId2 = rooms[i].patient_id;
            }
            connection.query(query2, [userId2], (err, results) => {
              if (err) throw err;
              console.log(results);
              rooms[i].name = results[0].name;

              const query3 = "SELECT * FROM chats WHERE room_id = ?";
              connection.query(query3, [rooms[i].room_id], (err, messages) => {
                ////// get last message in the chat room   /// and sender name
                if (err) throw err;
                console.log(rooms[i].name);
                if (messages.length) {
                  console.log(rooms[i].name);
                  rooms[i].message = messages[messages.length - 1].message;
                  rooms[i].time = messages[messages.length - 1].time;

                  let d = new Date();
                  let y = new Date(d.getTime() - 1440 * 60000);

                  let date =
                    ("0" + d.getDate()).slice(-2) +
                    "-" +
                    ("0" + (d.getMonth() + 1)).slice(-2) +
                    "-" +
                    d.getFullYear();

                  let yesterday =
                    ("0" + y.getDate()).slice(-2) +
                    "-" +
                    ("0" + (y.getMonth() + 1)).slice(-2) +
                    "-" +
                    y.getFullYear();

                  if (date == messages[messages.length - 1].date) {
                    rooms[i].date = "Today";
                  } else if(yesterday == messages[messages.length - 1].date){ 
                    rooms[i].date = "Yesterday";
                  }else{
                    rooms[i].date = messages[messages.length - 1].date;
                  }

                  if (
                    messages[messages.length - 1].sender_id ==
                    req.session.userId
                  ) {
                    rooms[i].sender = "You";
                  } else {
                    rooms[i].sender = results[0].name;
                  }

                  //// logic to check number of unviewed messages
                  let unviewedMessages = 0;
                  for (let j = 0; j < messages.length; j++) {
                    if (
                      messages[j].status == "unseen" &&
                      messages[j].sender_id != req.session.userId
                    ) {
                      unviewedMessages++;
                    }
                    if (j == messages.length - 1) {
                      rooms[i].unviewedMessages = unviewedMessages;
                    }
                  }
                } else {
                  rooms[i].message = null;
                  rooms[i].unviewedMessages = 0;
                }
                if (i == rooms.length - 1) {
                  resolve(rooms);
                }
              });
            });
          }
        } else {
          resolve(rooms);
        }
      });
    });

    getNames.then((rooms) => {
      console.log(req.session);
      console.log(rooms);
      res.render("chat-rooms", { rooms: rooms });
    });
  });
});

app.post("/chats/chat-rooms", (req, res) => {
  req.session.roomId = req.body.room_id;

  if (req.body.message == "") {
    //// message

    req.session.consultation = {
      doctorId: "",
      name: req.body.name,
      businessNo: "",
      CheckoutRequestID: "",
      userName: "",
    };

    const getDoctorId = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * FROM chat_rooms WHERE room_id=?";
          connection.query(query, [req.body.room_id], (err, results) => {
            if (err) {
              throw err;
            } else {
              req.session.consultation.doctorId = results[0].doctor_id;
              resolve(results[0].doctor_id);
            }
          });
        }
      });
    });

    getDoctorId.then((doctorId) => {
      const checkConsultationType = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            let freeConsultation;
            const query =
              "SELECT * FROM doctor_payment_details WHERE doctor_id = ?";
            connection.query(query, [doctorId], (err, result) => {
              if (err) {
                throw err;
              } else {
                if (result[0].consultation_type == "free") {
                  freeConsultation = true;
                  resolve(freeConsultation);
                } else {
                  /// paid
                  req.session.consultation.businessNo = result[0].business_no;
                  req.session.consultationFee = result[0].consultation_fee;
                  freeConsultation = false;
                  resolve(freeConsultation);
                }
              }
            });
          }

          connection.release();
        });
      });

      checkConsultationType.then((freeConsultation) => {
        if (freeConsultation == true) {
          ///// to free consultation
          req.session.consultationType = "free";
          req.session.viewMode = false;
          return res.redirect("/chats/chat");
        } else {
          //// to paid consultation

          req.session.consultationType = "paid";
          req.session.viewMode = false;

          const checkSessionStatus = new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT expiry_time FROM consultation_sessions where room_id = ?";
                connection.query(query, [req.body.room_id], (err, result) => {
                  if (err) {
                    throw err;
                  } else {
                    if (result.length) {
                      let expiryTime = result[0].expiry_time;

                      const now = new Date();
                      if (now.getTime() > new Date(expiryTime).getTime()) {
                        let sessionActive = false;
                        resolve(sessionActive);
                      } else {
                        let sessionActive = true;
                        req.session.expiryTime = expiryTime;
                        resolve(sessionActive);
                      }
                    } else {
                      /// no payment made --- redirect to payment page
                      let sessionActive = false;
                      resolve(sessionActive);
                    }
                  }
                });
              }

              connection.release();
            });
          });

          checkSessionStatus.then((sessionActive) => {
            if (sessionActive == true) {
              //// session still active
              return res.redirect("/chats/chat");
            } else {
              /// session expired
              if (req.session.accountType == "patient") {
                return res.redirect("/chats/pay-consultation-fee");
              } else {
                req.session.viewMode = true;
                return res.redirect("/chats/chat");
              }
            }
          });
        }
      });
    });
  } else {
    /// view profile
    res.redirect("/chats/view-profile");
  }
});

app.get("/chats/chat", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;
    let query = "";
    if (req.session.accountType == "patient") {
      query = "SELECT name FROM patient_details WHERE user_id = ?";
    } else {
      query = "SELECT name FROM doctor_details WHERE user_id = ?";
    }
    connection.query(query, [req.session.userId], (err, result) => {
      if (err) throw err;

      req.session.consultation.userName = result[0].name;
      let sendMessageDisplay = "";

      let exp = "";
      if (req.session.consultationType == "paid") {
        const expiryDate = new Date(req.session.expiryTime);
        console.log(expiryDate);

        const now = new Date();
        if (now.getTime() < expiryDate.getTime()) {
          const t =
            expiryDate.getFullYear() +
            "/" +
            ("0" + (expiryDate.getMonth() + 1)).slice(-2) +
            "/" +
            ("0" + expiryDate.getDate()).slice(-2) +
            "  " +
            ("0" + expiryDate.getHours()).slice(-2) +
            ":" +
            ("0" + expiryDate.getMinutes()).slice(-2) +
            ":" +
            ("0" + expiryDate.getSeconds()).slice(-2);

          exp = t;
        } else {
          exp = "expired";
        }
      }

      console.log(req.session);

      if (req.session.viewMode) {
        return res.render("chat", {
          sendMessageDisplay: false,
          name: req.session.consultation.name,
          accountType: req.session.accountType,
          consultationType: req.session.consultationType,
          exp: exp,
        });
      } else {
        return res.render("chat", {
          sendMessageDisplay: true,
          name: req.session.consultation.name,
          accountType: req.session.accountType,
          consultationType: req.session.consultationType,
          exp: exp,
        });
      }
    });

    connection.release();
  });
});

app.post("/chats/chat", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query =
        "SELECT expiry_time FROM consultation_sessions WHERE room_id = ?";
      connection.query(query, [req.session.roomId], (err, results) => {
        if (err) {
          throw err;
        } else {
          const now = new Date();
          expiryTime = now.getTime() + 1440 * 60000;

          console.log(expiryTime);

          const expiryDate = new Date(expiryTime);

          if (results.length) {
            const query2 =
              "UPDATE consultation_sessions set expiry_time=? WHERE room_id = ?";
            connection.query(
              query2,
              [expiryDate, req.session.roomId],
              (err, data) => {
                if (err) {
                  throw err;
                } else {
                  console.log("Session renewed successfully");
                  req.session.expiryTime = expiryDate;
                  req.session.viewMode = false;
                  return res.redirect("/chats/chat");
                }
              }
            );
          } else {
            const query2 =
              "INSERT INTO consultation_sessions(`expiry_time`, `room_id`) VALUES(?)";
            const values = [expiryDate, req.session.roomId];
            connection.query(query2, [values], (err, data) => {
              if (err) {
                throw err;
              } else {
                console.log("Session renewed successfully");
                req.session.expiryTime = expiryDate;
                req.session.viewMode = false;
                return res.redirect("/chats/chat");
              }
            });
          }
        }
      });
    }

    connection.release();
  });
});

app.get("/chats/view-profile", (req, res) => {
  if (req.session.accountType == "doctor") {
    const getPatientId = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT patient_id from chat_rooms WHERE room_id=?";
          connection.query(query, [req.session.roomId], (err, result) => {
            if (err) {
              throw err;
            } else {
              let patientId = result[0].patient_id;
              resolve(patientId);
            }
          });
        }

        connection.release();
      });
    });

    getPatientId.then((patientId) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * from patient_details WHERE user_id=?";
          connection.query(query, [patientId], (err, results) => {
            if (err) {
              throw err;
            } else {
              let details = results[0];
              return res.render("view-patient-profile", { details: details });
            }
          });
        }

        connection.release();
      });
    });
  } else {
    const getDoctorId = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT doctor_id from chat_rooms WHERE room_id=?";
          connection.query(query, [req.session.roomId], (err, result) => {
            if (err) {
              throw err;
            } else {
              let doctorId = result[0].doctor_id;
              resolve(doctorId);
            }
          });
        }

        connection.release();
      });
    });

    getDoctorId.then((doctorId) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * from doctor_details WHERE user_id=?";
          connection.query(query, [doctorId], (err, results) => {
            if (err) {
              throw err;
            } else {
              let details = results[0];
              return res.render("view-doctor-profile", { details: details });
            }
          });
        }

        connection.release();
      });
    });
  }
});

io.on("connection", (socket) => {
  console.log("Handshake session");
  console.log(socket.handshake.session);
  console.log(socket.handshake.session.userId);

  let date = "";

  let d = new Date();
  let date2 =
    ("0" + d.getDate()).slice(-2) +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    d.getFullYear();

  console.log(
    `${socket.handshake.session.consultation.userName} joined the chart`
  );
  socket.emit(
    "message",
    `${socket.handshake.session.consultation.userName} connected on Socket ${socket.id}`
  );
  socket.emit(
    "message",
    `welcome to the chart ${socket.handshake.session.consultation.userName}`
  ); // to the client

  socket.join(socket.handshake.session.roomId);

  socket.broadcast
    .to(socket.handshake.session.roomId)
    .emit(
      "message",
      `${socket.handshake.session.consultation.userName} joined the chart`
    ); // all clients but user
  // io.emit(); //all clients

  let lastDate = "";
  const getLastDate = new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) throw err;
      const query =
        "SELECT * FROM chats WHERE room_id = ? ORDER BY date ASC, time ASC";
      connection.query(
        query,
        [socket.handshake.session.roomId],
        (err, results) => {
          if (err) throw err;
          if (results.length) {
            lastDate = results[results.length - 1].date;
            resolve(lastDate);
          }
        }
      );

      connection.release();
    });
  });

  getLastDate.then((lastDate) => {
    let unseenMessages = false;
    pool.getConnection((err, connection) => {
      if (err) throw err;
      const query = "SELECT * FROM chats WHERE room_id = ?";
      connection.query(
        query,
        [socket.handshake.session.roomId],
        (err, results) => {
          if (err) throw err;
          if (results.length) {
            results.forEach((message) => {
              let query2 = "";
              if (socket.handshake.session.accountType == "patient") {
                query2 = "SELECT name FROM doctor_details WHERE user_id = ?";
              } else {
                query2 = "SELECT name FROM patient_details WHERE user_id = ?";
              }
              connection.query(query2, [message.sender_id], (err, result) => {
                if (err) throw err;

                if (!(message.date == date)) {
                  date = message.date;
                  if (message.date == date2) {
                    socket.emit("message", "Today");
                  } else {
                    //// get previous day -- yesterday
                    socket.emit("message", message.date);
                  }
                }

                if (message.sender_id == socket.handshake.session.userId) {
                  socket.emit(
                    "retrieveSentChats",
                    message.message,
                    message.time
                  );
                } else {
                  if (unseenMessages == false && message.status == "unseen") {
                    socket.emit("message", "Unviewed Messages");
                    unseenMessages = true;
                  }
                  socket.emit(
                    "retrieveReceivedChats",
                    message.message,
                    result[0].name,
                    message.time
                  );

                  if (message.status == "unseen") {
                    let query3 =
                      "UPDATE chats SET status = ? WHERE chat_id = ?";
                    connection.query(
                      query3,
                      ["seen", message.chat_id],
                      (err, data) => {
                        if (err) {
                          throw err;
                        } else {
                          console.log(
                            `Chat message(id): ${message.chat_id} updated to seen`
                          );
                        }
                      }
                    );
                  }
                }
              });
            });
          }
        }
      );

      connection.release();
    });
  });

  socket.on("sentChatMessage", (msg, datee, time) => {
    if (socket.handshake.session.consultationType == "paid") {
      const now = new Date();
      if (
        now.getTime() < new Date(socket.handshake.session.expiryTime).getTime()
      ) {
        if (lastDate == datee) {
        } else {
          socket.emit("message", "Today");
          socket.broadcast
            .to(socket.handshake.session.roomId)
            .emit("message", "Today");
        }
        lastDate = datee;

        const saveMessage = new Promise((resolve, reject) => {
          pool.getConnection((err, connection) => {
            const query =
              "INSERT INTO chats(`room_id`,`sender_id`, `date`, `time`, `message`,`status`) VALUES(?)";
            const values = [
              socket.handshake.session.roomId,
              socket.handshake.session.userId,
              datee,
              time,
              msg,
              "unseen",
            ];
            connection.query(query, [values], (err, data) => {
              if (err) throw err;

              console.log(
                `chat id : ${data.insertId}  User Id: ${socket.handshake.session.userId}`
              );

              let roomId = socket.handshake.session.roomId;
              let chatId = data.insertId;
              socket.emit("sentChatMessage", msg, time, chatId, roomId); //// chatId and roomId are for emitting back to other user in the room to change message to seen

              resolve(console.log("Chat message saved. Id: " + data.insertId));
            });

            connection.release();
          });
        });

        saveMessage.then(() => {
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              let status = "active";
              const now = new Date();
              const query =
                "UPDATE chat_rooms SET status = ?, last_active = ? WHERE room_id = ?";
              connection.query(
                query,
                [status, now, socket.handshake.session.roomId],
                (err, data) => {
                  if (err) {
                    throw err;
                  } else {
                    console.log("Chat room updated suceesfully");
                  }
                }
              );
            }
          });
        });
      } else {
        socket.emit(
          "message",
          "Session has expired. Pay the consultation fee to continue the consultation"
        );
      }
    } else {
      if (lastDate == datee) {
      } else {
        socket.emit("message", "Today");
        socket.broadcast
          .to(socket.handshake.session.roomId)
          .emit("message", "Today");
      }
      lastDate = datee;

      const saveMessage = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          const query =
            "INSERT INTO chats(`room_id`,`sender_id`, `date`, `time`, `message`,`status`) VALUES(?)";
          const values = [
            socket.handshake.session.roomId,
            socket.handshake.session.userId,
            datee,
            time,
            msg,
            "unseen",
          ];
          connection.query(query, [values], (err, data) => {
            if (err) throw err;

            console.log(
              `chat id : ${data.insertId}  User Id: ${socket.handshake.session.userId}`
            );

            let roomId = socket.handshake.session.roomId;
            let chatId = data.insertId;
            socket.emit("sentChatMessage", msg, time, chatId, roomId); //// chatId and roomId are for emitting back to other user in the room to change message to seen

            resolve(console.log("Chat message saved. Id: " + data.insertId));
          });

          connection.release();
        });
      });

      saveMessage.then(() => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            let status = "active";
            const now = new Date();
            const query =
              "UPDATE chat_rooms SET status = ?, last_active = ? WHERE room_id = ?";
            connection.query(
              query,
              [status, now, socket.handshake.session.roomId],
              (err, data) => {
                if (err) {
                  throw err;
                } else {
                  console.log("Chat room updated suceesfully");
                }
              }
            );
          }
        });
      });
    }
  });

  socket.on("receivedChatMessage", (msg, datee, time) => {
    socket.broadcast
      .to(socket.handshake.session.roomId)
      .emit(
        "receivedChatMessage",
        msg,
        socket.handshake.session.consultation.userName,
        time
      );
  });

  socket.on("seenReceivedMessage", (chatId) => {
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const query = "UPDATE chats SET status = ? WHERE chat_id = ?";
        connection.query(query, ["seen", chatId], (err, data) => {
          if (err) {
            throw err;
          } else {
            console.log(
              `${socket.handshake.session.userId} has viewed chat id: ${chatId}`
            );
          }
        });
      }

      connection.release();
    });
  });

  socket.on("disconnect", () => {
    io.to(socket.handshake.session.roomId).emit(
      "message",
      `${socket.handshake.session.consultation.userName} left the chart`
    );
  });
});

server.listen(5000, () => {
  console.log("server listening at port 5000");
});
