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

const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const store = new session.MemoryStore();

app.use(cookieParser("secretStringForCookies"));
app.use(
  session({
    secret: "secretStringForSession",
    // cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: false,
    store: store,
  })
);
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
app.use("/admin", admin);

//// chats

const server = http.createServer(app);

const socketio = require("socket.io");
const io = socketio(server);

let room = "";
let user = "";
let userId = "";
let accountType = "";
let expiry = "";
let type = "";

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
      message: consultMsg,
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

    const shortcode = process.env.SHORT_CODE2; ////// or req.session.consultation.businessNo
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
            message: consultMsg,
            consultationFee: req.session.consultationFee,
          });
        }
        console.log(response.body);
        console.log(response.body.CheckoutRequestID);

        req.session.consultation.CheckoutRequestID =
          response.body.CheckoutRequestID;

        if (err) throw err;

        const now = new Date();
        expiryTime = now.getTime() + 1440 * 60000; //// 1440 minutes

        const query2 =
          "INSERT INTO consultations_stk_push(`checkout_id`, `phone_no` ,`amount` , `timestamp` , `doctor_id`, `patient_id`, `consultation_expiry_time`) VALUES(?);";
        const values2 = [
          response.body.CheckoutRequestID,
          mobileNo,
          amount,
          timestamp,
          req.session.consultation.doctorId,
          req.session.userId,
          expiryTime,
        ];
        connection.query(query2, [values2], (err, data) => {
          if (err) throw err;
          console.log("consultation STK data inserted successfully");

          req.flash("consultationStkStatusMessage", "");
          res.render("consultation-stk-push", {
            message: req.flash("consultationStkStatusMessage"),
          });
        });
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

  const shortcode = process.env.SHORT_CODE2; ////// or req.session.consultation.businessNo
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
                    [expiryTime, req.session.roomId],
                    (err, data) => {
                      if (err) {
                        throw err;
                      } else {
                        console.log(
                          "consultation session updated successfully"
                        );
                      }
                    }
                  );
                } else {
                  const query2 =
                    "INSERT INTO consultation_sessions(`room_id`, `expiry_time`) VALUES(?)";
                  const values = [req.session.roomId, expiryTime];
                  connection.query(query2, [values], (err, data) => {
                    if (err) {
                      throw err;
                    } else {
                      console.log("consultation session inserted successfully");
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
                req.session.paymentDetails.CheckoutRequestID,
              ],
              (err, result) => {
                if (err) {
                  throw err;
                } else {
                  return res.redirect("/chats/chat");
                }
              }
            );
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
              req.session.paymentDetails.CheckoutRequestID,
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
        query = "SELECT * FROM chat_rooms WHERE patient_id = ?";
      } else {
        query = "SELECT * FROM chat_rooms WHERE doctor_id = ?";
      }

      connection.query(query, [req.session.userId], (err, results) => {
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
      });

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
            let userId = "";
            if (req.session.accountType == "patient") {
              query2 = "SELECT name FROM doctor_details WHERE user_id = ?";
              userId = rooms[i].doctor_id;
            } else {
              query2 = "SELECT name FROM patient_details WHERE user_id = ?";
              userId = rooms[i].patient_id;
            }
            connection.query(query2, [userId], (err, results) => {
              if (err) throw err;
              console.log(results);
              rooms[i].name = results[0].name;

              const query3 = "SELECT * FROM chats WHERE room_id = ?";
              connection.query(query3, [rooms[i].room_id], (err, messages) => {
                ////// get last message in the chat room   /// and sender name
                if (err) throw err;
                if (messages.length) {
                  rooms[i].message = messages[messages.length - 1].message;
                  rooms[i].date = messages[messages.length - 1].date;
                  rooms[i].time = messages[messages.length - 1].time;
                  if (
                    messages[messages.length - 1].sender_id ==
                    req.session.userId
                  ) {
                    rooms[i].sender = "You";
                  } else {
                    rooms[i].sender = results[0].name;
                  }
                } else {
                  rooms[i].message = "";
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
      res.render("chat-rooms", { rooms: rooms });
    });
  });
});

app.post("/chats/chat-rooms", (req, res) => {
  req.session.roomId = req.body.room_id;
  req.session.consultation.name = req.body.name;

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
              } else {
                /// paid
                req.session.consultation.businessNo = result[0].business_no;
                req.session.consultationFee = result[0].consultation_fee;
                freeConsultation = false;
              }
            }
          });
        }

        connection.release();
      });
    });

    checkConsultationType.then((freeConsultation) => {
      if (freeConsultation) {
        ///// to free consultation
        req.session.consultationType = "free";
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
                    if (now.getTime() > expiryTime) {
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
          if (sessionActive) {
            //// session still active
            return res.redirect("/chats/chat");
          } else {
            /// session expired
            if (req.session.accountType == patient) {
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
      user = result[0].name;
      userId = req.session.userId;
      room = req.session.roomId;
      accountType = req.session.accountType;
      expiry = req.session.expiryTime;
      type = req.session.consultationType;

      let exp = "";
      if (type == "paid") {
        if (sendMessageDisplay) {
          /// get date
        } else {
          exp = "expired";
        }
      }

      console.log(req.session);

      if (req.session.viewMode) {
        return res.render("chat", {
          sendMessageDisplay: false,
          name: req.session.consultation.name,
        });
      } else {
        return res.render("chat", {
          sendMessageDisplay: true,
          name: req.session.consultation.name,
        });
      }
    });

    connection.release();
  });
});

io.on("connection", (socket) => {
  let date = "";

  let d = new Date();
  let date2 =
    ("0" + d.getDate()).slice(-2) +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    d.getFullYear();

  console.log(`${user} joined the chart`);
  socket.emit("message", `${user} connected on Socket ${socket.id}`);
  socket.emit("message", `welcome to the chart ${user}`); // to the client

  socket.join(room);

  socket.broadcast.to(room).emit("message", `${user} joined the chart`); // all clients but user
  // io.emit(); //all clients

  let lastDate = "";
  const getLastDate = new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) throw err;
      const query =
        "SELECT * FROM chats WHERE room_id = ? ORDER BY date ASC, time ASC";
      connection.query(query, [room], (err, results) => {
        if (err) throw err;
        if (results.length) {
          lastDate = results[results.length - 1].date;
          resolve(lastDate);
        }
      });

      connection.release();
    });
  });

  getLastDate.then((lastDate) => {
    pool.getConnection((err, connection) => {
      if (err) throw err;
      const query = "SELECT * FROM chats WHERE room_id = ?";
      connection.query(query, [room], (err, results) => {
        if (err) throw err;
        if (results.length) {
          results.forEach((message) => {
            let query2 = "";
            if (accountType == "patient") {
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

              if (message.sender_id == userId) {
                socket.emit("retrieveSentChats", message.message, message.time);
              } else {
                socket.emit(
                  "retrieveReceivedChats",
                  message.message,
                  result[0].name,
                  message.time
                );
              }
            });
          });
        }
      });

      connection.release();
    });
  });

  socket.on("sentChatMessage", (msg, datee, time) => {
    if (type == "paid") {
      const now = new Date();
      if (now.getTime() < expiry) {
        if (lastDate == datee) {
        } else {
          socket.emit("message", "Today");
          socket.broadcast.to(room).emit("message", "Today");
        }
        lastDate = datee;

        pool.getConnection((err, connection) => {
          const query =
            "INSERT INTO chats(`room_id`,`sender_id`, `date`, `time`, `message`) VALUES(?)";
          const values = [room, userId, datee, time, msg];
          connection.query(query, [values], (err, data) => {
            if (err) throw err;
            console.log(data.insertId);
            console.log(userId);

            socket.emit("sentChatMessage", msg, time);
          });

          connection.release();
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
        socket.broadcast.to(room).emit("message", "Today");
      }
      lastDate = datee;

      pool.getConnection((err, connection) => {
        const query =
          "INSERT INTO chats(`room_id`,`sender_id`, `date`, `time`, `message`) VALUES(?)";
        const values = [room, userId, datee, time, msg];
        connection.query(query, [values], (err, data) => {
          if (err) throw err;
          console.log(data.insertId);
          console.log(`User Id: ${userId}`);

          console.log(req.session);

          socket.emit("sentChatMessage", msg, time);
        });

        connection.release();
      });
    }
  });

  socket.on("receivedChatMessage", (msg, datee, time) => {
    socket.broadcast.to(room).emit("receivedChatMessage", msg, user, time);
  });

  socket.on("disconnect", () => {
    io.to(room).emit("message", `${user} left the chart`);
  });
});

server.listen(5000, () => {
  console.log("server listening at port 5000");
});
