const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");
const { time } = require("console");

const emailValidator = require("deep-email-validator");

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
                if (results[0].cancer_type == null) {
                  return res.redirect("/register/patient/medical-details");
                } else {
                  getDoctorsData.then((results) => {
                    return res.render("index", { doctors: results });
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
                if (results[0].cancer_speciality == null) {
                  return res.redirect("/register/doctor/professional-details");
                } else {
                  getDoctorsData.then((results) => {
                    return res.render("index2");
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

    req.session.consultation = {
      doctorId: req.body.doctor_id,
      name: req.body.name,
      businessNo: "",
      CheckoutRequestID: "",
    };

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
                console.log(result[0].consultation_type);
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
                connection.query(query, [roomId], (err, result) => {
                  if (err) {
                    throw err;
                  } else {
                    if (result.length) {
                      let expiryTime = result[0].expiry_time;

                      const now = new Date();
                      if (now.getTime() > (new Date(expiryTime)).getTime()) {
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

 if(req.body.btnBook == ""){  /// book appointment
  req.session.bookingType = "new";
  res.redirect("/appointments/book-appointment");
 }
 
 else{  ///consult
  console.log("consult");

  req.session.consultation = {
    doctorId: req.body.doctor_id,
    name: req.body.name,
    businessNo: "",
    CheckoutRequestID: "",
  };

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
              console.log(result[0].consultation_type);
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
              connection.query(query, [roomId], (err, result) => {
                if (err) {
                  throw err;
                } else {
                  if (result.length) {
                    let expiryTime = result[0].expiry_time;

                    const now = new Date();
                    if (now.getTime() > (new Date(expiryTime)).getTime()) {
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
 }
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

router.get("/my-profile", (req, res) => {
  req.flash("myProfileMsg", "");
  if (req.session.authenticated) {
    if (req.session.accountType == "patient") {
      //patient
      const getDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query = "SELECT * FROM patient_details  WHERE user_id= ?";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) {
                throw err;
              } else {
                let details = results[0];
                resolve(details);
              }
            });
          }
          connection.release();
        });
      });
      getDetails.then((details) => {
        let male = "",
          female = "";
        if (details.gender == "male") {
          male = "checked";
        } else {
          female = "checked";
        }
        res.render("my-profile-patient", {
          details: details,
          male: male,
          female: female,
          message: req.flash("myProfileMsg"),
        });
      });
    } else {
      /// doctor

      const getDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query = "SELECT * FROM doctor_details  WHERE user_id= ?";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) {
                throw err;
              } else {
                let details = results[0];
                resolve(details);
              }
            });
          }
          connection.release();
        });
      });
      getDetails.then((details) => {
        let male = "",
          female = "";
        if (details.gender == "male") {
          male = "checked";
        } else {
          female = "checked";
        }
        res.render("my-profile-doctor", {
          details: details,
          male: male,
          female: female,
          message: req.flash("myProfileMsg"),
        });
      });
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/my-profile", (req, res) => {
  if (req.session.accountType == "patient") {
    console.log(req.body);
    const getDetails = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * FROM patient_details  WHERE user_id= ?";
          connection.query(query, [req.session.userId], (err, results) => {
            if (err) {
              throw err;
            } else {
              let details = results[0];
              resolve(details);
            }
          });
        }
        connection.release();
      });
    });
    getDetails.then((details) => {
      let male = "",
        female = "";
      if (details.gender == "male") {
        male = "checked";
      } else {
        female = "checked";
      }

      var reqExp = /[a-zA-Z]/; /// check also symbols

      if (reqExp.test(req.body.phone)) {
        //letters in phone
        req.flash("myProfileMsg", "Invalid Phone No.");
        return res.render("my-profile-patient", {
          details: details,
          male: male,
          female: female,
          message: req.flash("myProfileMsg"),
        });
      } else {
        pool.getConnection((err, connection) => {
          if (err) {
            req.flash("myProfileMsg", "Error Connecting To The Database");
            return res.render("my-profile-patient", {
              details: details,
              male: male,
              female: female,
              message: req.flash("myProfileMsg"),
            });
          } else {
            let gender = "";
            if (req.body.male == "on") {
              gender = "male";
            } else {
              gender = "female";
            }
            const query =
              "UPDATE patient_details SET name = ?, gender = ?, dob = ?, phone_no =?, location = ?, cancer_type = ?, cancer_stage = ?, lifestyle_diseases = ? WHERE user_id = ?";

            connection.query(
              query,
              [
                req.body.name,
                gender,
                req.body.dob,
                req.body.phone,
                req.body.location,
                req.body.cancer_type,
                req.body.cancer_stage,
                req.body.lifestyle_diseases,
                req.session.userId,
              ],
              (err, data) => {
                if (err) {
                  req.flash("myProfileMsg", "Error Saving The Details");
                  return res.render("my-profile-patient", {
                    details: details,
                    male: male,
                    female: female,
                    message: req.flash("myProfileMsg"),
                  });
                } else {
                  console.log("Patient details updated");

                  return res.redirect("/my-profile");
                }
              }
            );
          }
          connection.release();
        });
      }
    });
  } else {
    //// post doctor profile
    console.log(req.body);
    const getDetails = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * FROM doctor_details  WHERE user_id= ?";
          connection.query(query, [req.session.userId], (err, results) => {
            if (err) {
              throw err;
            } else {
              let details = results[0];
              resolve(details);
            }
          });
        }
        connection.release();
      });
    });
    getDetails.then((details) => {
      let male = "",
        female = "";
      if (details.gender == "male") {
        male = "checked";
      } else {
        female = "checked";
      }

      var reqExp = /[a-zA-Z]/; /// check also symbols

      if (
        reqExp.test(req.body.phone) ||
        reqExp.test(req.body.clinic_phone_no)
      ) {
        //letters in phone
        req.flash("myProfileMsg", "Invalid Phone No.");
        return res.render("my-profile-doctor", {
          details: details,
          male: male,
          female: female,
          message: req.flash("myProfileMsg"),
        });
      } else {
        const verifyEmail = new Promise((resolve, reject) => {
          /// verify email
          resolve(emailValidator.validate(req.body.clinic_email));
        });
        verifyEmail.then((data) => {
          if (data.valid) {
            pool.getConnection((err, connection) => {
              if (err) {
                req.flash("myProfileMsg", "Error Connecting To The Database");
                return res.render("my-profile-doctor", {
                  details: details,
                  male: male,
                  female: female,
                  message: req.flash("myProfileMsg"),
                });
              } else {
                let gender = "";
                if (req.body.male == "on") {
                  gender = "male";
                } else {
                  gender = "female";
                }
                const query =
                  "UPDATE doctor_details SET name = ?, gender = ?, dob = ?, phone_no =?, licence_no= ?, cancer_speciality = ?, clinic_location= ?, clinic_phone_no = ?, clinic_email= ? WHERE user_id = ?";

                connection.query(
                  query,
                  [
                    req.body.name,
                    gender,
                    req.body.dob,
                    req.body.phone,
                    req.body.licence_no,
                    req.body.cancer_speciality,
                    req.body.clinic_location,
                    req.body.clinic_phone_no,
                    req.body.clinic_email,
                    req.session.userId,
                  ],
                  (err, data) => {
                    if (err) {
                      req.flash("myProfileMsg", "Error Saving The Details");
                      return res.render("my-profile-doctor", {
                        details: details,
                        male: male,
                        female: female,
                        message: req.flash("myProfileMsg"),
                      });
                    } else {
                      console.log("Doctor details updated");

                      return res.redirect("/my-profile");
                    }
                  }
                );
              }
              connection.release();
            });
          } else {
            /// invalid email
            req.flash("myProfileMsg", "Invalid Email Address");
            return res.render("my-profile-doctor", {
              details: details,
              male: male,
              female: female,
              message: req.flash("myProfileMsg"),
            });
          }
        });
      }
    });
  }
});

module.exports = router;
