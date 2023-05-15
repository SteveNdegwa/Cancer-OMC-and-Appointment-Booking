const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");
const { time } = require("console");
const { resolve } = require("path");

router.use(express.static(path.resolve("./node_modules")));

router.get("/", (req, res) => {
  if (req.session.authenticated) {
    pool.getConnection((err, connection) => {
      if (err) console.log(err);
      else {
        /// get doctors details
        const getDoctorsData = new Promise((resolve, reject) => {
          const query = "SELECT * FROM doctor_details";
          connection.query(query, (err, results) => {
            if (err) throw err;
            resolve(results);
          });
        });

        ///// check if professional and medical details registered
        if (req.session.accountType == "patient") {
          const query =
            "SELECT name, cancer_type FROM patient_details where user_id = ?";
          connection.query(query, [req.session.userId], (err, results) => {
            if (err) console.log(err);
            else {
              if (results.length) {
                var string = JSON.stringify(results);
                var json = JSON.parse(string);

                var name = json[0].name;
                var cancerType = json[0].cancer_type;

                if (cancerType == "") {
                  return res.redirect("/register/patient/medical-details");
                } else {
                  getDoctorsData.then((results) => {
                    if (req.session.accountType == "patient") {
                      return res.render("index", { doctors: results });
                    } else {
                      return res.render("index2");
                    }
                  });
                }
              } else {
                return res.redirect("/register/patient");
              }
            }
          });
        } else if (req.session.accountType == "doctor") {
          const query =
            "SELECT name, cancer_speciality FROM doctor_details where user_id = ?";
          connection.query(query, [req.session.userId], (err, results) => {
            if (err) console.log(err);
            else {
              if (results.length) {
                var string = JSON.stringify(results);
                var json = JSON.parse(string);

                var name = json[0].name;
                var cancerSpeciality = json[0].cancer_speciality;

                if (cancerSpeciality == "") {
                  return res.redirect("/register/doctor/professional-details");
                } else {
                  getDoctorsData.then((results) => {
                    if (req.session.accountType == "patient") {
                      return res.render("index", { doctors: results });
                    } else {
                      return res.render("index2");
                    }
                  });
                }
              } else {
                return res.redirect("/register/doctor");
              }
            }
          });
        }
      }

      connection.release();
    });
  } else {
    return res.render("login-index");
  }
});

router.post("/", (req, res) => {
  if (req.body.consult == "") {
    /// consultations
    console.log("consult");

    const getRoomId = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) throw err;
        const query =
          "SELECT * FROM chat_rooms WHERE patient_id =? AND doctor_id =?";
        connection.query(
          query,
          [req.session.userId, req.body.doctor_id],
          (err, results) => {
            if (err) {
              throw err;
            } else {
              let roomId = "";

              if (results.length) {
                roomId = results[0].room_id;
                req.session.roomId = roomId;
                resolve(roomId);
              } else {
                const query2 =
                  "INSERT INTO chat_rooms(`room_id`, `patient_id`, `doctor_id`) VALUES(?)";
                const values = [
                  `room-${req.session.userId}-${req.body.doctor_id}`,
                  req.session.userId,
                  req.body.doctor_id,
                ];
                connection.query(query2, [values], (err, data) => {
                  if (err) throw err;
                  console.log("room created successfully ");

                  roomId = `room-${req.session.userId}-${req.body.doctor_id}`;
                  req.session.roomId = roomId;
                  resolve(roomId);
                });
              }
            }
          }
        );
      });
    });

    getRoomId.then((roomId) => {
      const checkConsultationType = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            let freeConsultation;
            const query =
              "SELECT * FROM doctor_payment_details WHERE doctor_id = ?";
            connection.query(query, [req.body.doctor_id], (err, result) => {
              if (err) {
                throw err;
              } else {
                if (result[0].consultation_type == "free") {
                  freeConsultation = true;
                } else {
                  /// paid
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
                connection.query((err, result) => {
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
              return res.redirect("/chats/pay-consultation-fee");
            }
          });
        }
      });
    });

    pool.getConnection((err, connection) => {
      if (err) throw err;
      const query =
        "SELECT * FROM chat_rooms WHERE patient_id =? AND doctor_id =?";
      connection.query(
        query,
        [req.session.userId, req.body.doctor_id],
        (err, results) => {
          if (err) throw err;
          if (results.length) {
            req.session.roomId = results[0].room_id;
            return res.redirect("/chats/chat");
          } else {
            const query2 =
              "INSERT INTO chat_rooms(`room_id`, `patient_id`, `doctor_id`) VALUES(?)";
            const values = [
              `room-${req.session.userId}-${req.body.doctor_id}`,
              req.session.userId,
              req.body.doctor_id,
            ];
            connection.query(query2, [values], (err, data) => {
              if (err) throw err;
              console.log("room created successfully ");

              req.session.roomId = `room-${req.session.userId}-${req.body.doctor_id}`;
              return res.redirect("/chats/chat");
            });
          }
        }
      );
    });
  } else if (req.body.book == "") {
    /// bookings
    req.session.doctorId = req.body.doctor_id;
    req.session.bookingType = "new";
    res.redirect("/appointments/book-appointment");
  }
});

router.get("/doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) console.log(err);
    else {
      const query =
        "SELECT user_id, name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details";
      connection.query(query, (err, results) => {
        if (err) console.log(err);
        else {
          console.log(results);
          return res.render("doctors", { details: results });
        }
      });
    }
    connection.release();
  });
});

router.post("/doctors", (req, res) => {
  req.session.doctorId = req.body.id;

  req.session.bookingType = "new";
  res.redirect("/appointments/book-appointment");
});

router.post("/search-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    const query =
      "SELECT * FROM doctor_details WHERE(user_id like ?) or (name like ?) or (gender like ?) or (licence_no like ?) or (cancer_speciality like ?) or (clinic_location like ?) or (clinic_phone_no like ?) or (clinic_email like ?)";
    console.log(req.body.search);
    connection.query(
      query,
      [
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
        "%" + req.body.search + "%",
      ],
      (err, results) => {
        if (err) console.log(err);
        else {
          console.log(results);

          return res.render("doctors", { details: results });
        }
      }
    );
    connection.release();
  });
});

module.exports = router;
