const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");
const { time } = require("console");

const emailValidator = require("deep-email-validator");

router.use(express.static(path.resolve("./node_modules")));

router.get("/", (req, res) => {
  if (req.session.authenticated) {
    const getDoctorsData = new Promise((resolve, reject) => {
      let date1 = new Date();

      pool.getConnection((err, connection) => {
        if (err) console.log(err);
        else {
          const query =
            "SELECT * FROM doctor_details WHERE subscription_expiry >= ? AND verification_status = ?";
          connection.query(query, [date1, "true"], (err, results) => {
            if (err) throw err;
            resolve(results);
          });
        }
        connection.release();
      });
    });

    const getUnviewedMessages = new Promise((resolve, reject) => {
      let unviewedMessages = 0;
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          let query = "";
          if (req.session.accountType == "patient") {
            query =
              "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id = ?";
          } else {
            query =
              "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id = ?";
          }
          connection.query(query, [req.session.userId], (err, results) => {
            if (err) {
              throw err;
            } else {
              if (results.length) {
                for (let i = 0; i < results.length; i++) {
                  let otherUserId;
                  if (req.session.accountType == "patient") {
                    otherUserId = results[i].doctor_id;
                  } else {
                    otherUserId = results[i].patient_id;
                  }
                  const query2 =
                    "SELECT * FROM chats WHERE room_id = ? and sender_id = ?";
                  connection.query(
                    query2,
                    [results[i].room_id, otherUserId],
                    (err, chats) => {
                      if (err) {
                        throw err;
                      } else {
                        if (chats.length) {
                          for (let j = 0; j < chats.length; j++) {
                            if (chats[j].status == "unseen") {
                              unviewedMessages++;
                            }
                          }
                          if (i == results.length - 1) {
                            resolve(unviewedMessages);
                          }
                        } else {
                          resolve(unviewedMessages);
                        }
                      }
                    }
                  );
                }
              } else {
                resolve(unviewedMessages);
              }
            }
          });
        }
        connection.release();
      });
    });

    if (req.session.accountType == "doctor") {
      /// doctor
      let subscriptionExpiry = "";
      const checkDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT name, subscription_expiry, cancer_speciality FROM doctor_details where user_id = ?";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) console.log(err);
              else {
                if (results.length) {
                  subscriptionExpiry = results[0].subscription_expiry;

                  if (results[0].cancer_speciality == null) {
                    return res.redirect(
                      "/register/doctor/professional-details"
                    );
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_payment_details WHERE doctor_id = ?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results2) => {
                        if (err) {
                          console.log(err);
                        } else {
                          if (results2.length) {
                            resolve();
                          } else {
                            return res.redirect(
                              "/register/doctor/payment-details"
                            );
                          }
                        }
                      }
                    );
                  }
                } else {
                  return res.redirect("/register/doctor");
                }
              }
            });
          }

          connection.release();
        });
      });
      checkDetails.then(() => {
        getUnviewedMessages.then((unviewedMessages) => {
          if (req.session.rejectedRenewal == true) {
            return res.render("index2", {
              unviewedMessages: unviewedMessages,
            });
          } else {
            let date1 = new Date();

            let date2 = new Date(subscriptionExpiry);

            if (date1.getTime() > date2.getTime()) {
              return res.redirect("/subscription");
            } else {
              return res.render("index2", {
                unviewedMessages: unviewedMessages,
              });
            }
          }
        });
      });
    } else {
      /// patient

      const checkDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT name, cancer_type FROM patient_details where user_id = ?";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) console.log(err);
              else {
                if (results.length) {
                  if (results[0].cancer_type == null) {
                    return res.redirect("/register/patient/medical-details");
                  } else {
                    resolve();
                  }
                } else {
                  return res.redirect("/register/patient");
                }
              }
            });
          }

          connection.release();
        });
      });
      checkDetails.then(() => {
        getUnviewedMessages.then((unviewedMessages) => {
          getDoctorsData.then((results) => {
            return res.render("index", {
              doctors: results,
              unviewedMessages: unviewedMessages,
            });
          });
        });
      });
    }
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
                const now = new Date();
                let status = "inactive";
                const query2 =
                  "INSERT INTO chat_rooms(`room_id`, `patient_id`, `doctor_id`, `status`, `last_active`) VALUES(?)";
                const values = [
                  `room-${req.session.userId}-${req.body.doctor_id}`,
                  req.session.userId,
                  req.body.doctor_id,
                  status,
                  now,
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
  let date1 = new Date();

  pool.getConnection((err, connection) => {
    if (err) console.log(err);
    else {
      const query =
        "SELECT user_id, name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details WHERE subscription_expiry >= ? AND verification_status = ?";
      connection.query(query, [date1, "true"], (err, results) => {
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

  if (req.body.btnBook == "") {
    /// book appointment
    req.session.bookingType = "new";
    res.redirect("/appointments/book-appointment");
  } else {
    ///consult
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
                const now = new Date();
                let status = "inactive";
                const query2 =
                  "INSERT INTO chat_rooms(`room_id`, `patient_id`, `doctor_id`, `status`, `last_active`) VALUES(?)";
                const values = [
                  `room-${req.session.userId}-${req.body.doctor_id}`,
                  req.session.userId,
                  req.body.doctor_id,
                  status,
                  now,
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
                connection.query(query, [roomId], (err, result) => {
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
    let date1 = new Date();
    const query =
      "SELECT * FROM doctor_details WHERE  subscription_expiry >= ? AND verification_status = ? AND (user_id like ?) or (name like ?) or (gender like ?) or (licence_no like ?) or (cancer_speciality like ?) or (clinic_location like ?) or (clinic_phone_no like ?) or (clinic_email like ?)";
    console.log(req.body.search);
    connection.query(
      query,
      [
        date1,
        "true",
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
        const getPaymentDetails = new Promise((resolve, reject) => {
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM doctor_payment_details WHERE doctor_id = ?";
              connection.query(query, [req.session.userId], (err, results) => {
                if (err) {
                  throw err;
                } else {
                  details.businessNo = results[0].business_no;
                  details.consultationType = results[0].consultation_type;
                  details.appointmentFee = results[0].appointment_fee;
                  details.consultationFee = results[0].consultation_fee;

                  resolve(details);
                }
              });
            }

            connection.release();
          });
        });
        getPaymentDetails.then((details) => {
          //// check subscription
          let date1 = new Date();
          let date2 = new Date(details.subscription_expiry);
          if (date1.getTime() > date2.getTime()) {
            details.subscription = "inactive";
          } else {
            details.subscription = "active";
          }

          const expiryDate =
            date2.getFullYear() +
            "-" +
            ("0" + (date2.getMonth() + 1)).slice(-2) +
            "-" +
            ("0" + date2.getDate()).slice(-2);

          details.subscriptionDate = expiryDate;
          details.subscriptionTime =
            ("0" + date2.getHours()).slice(-2) +
            ":" +
            ("0" + date2.getMinutes()).slice(-2);

          // let d = new Date();
          // let y = new Date(d.getTime() - 1440 * 60000);
          // let t = new Date(d.getTime() + 1440 * 60000);

          // let todate =
          //   d.getFullYear() +
          //   "-" +
          //   ("0" + (d.getMonth() + 1)).slice(-2) +
          //   "-" +
          //   ("0" + d.getDate()).slice(-2);
          // let yesterday =
          //   y.getFullYear() +
          //   "-" +
          //   ("0" + (y.getMonth() + 1)).slice(-2) +
          //   "-" +
          //   ("0" + y.getDate()).slice(-2);
          // let tomorrow =
          //   t.getFullYear() +
          //   "-" +
          //   ("0" + (t.getMonth() + 1)).slice(-2) +
          //   "-" +
          //   ("0" + t.getDate()).slice(-2);

          // if (expiryDate == todate) {
          //   details.subscriptionDate = "Today";
          // } else if (expiryDate == yesterday) {
          //   details.subscriptionDate = "Yesterday";
          // } else if (expiryDate == tomorrow) {
          //   details.subscriptionDate = "Tomorrow";
          // }

          let male = "",
            female = "";
          if (details.gender == "male") {
            male = "checked";
          } else {
            female = "checked";
          }

          let paid = "";
          let free = "";
          if (details.consultationType == "free") {
            free = "checked";
          } else {
            paid = "checked";
          }
          res.render("my-profile-doctor", {
            details: details,
            male: male,
            female: female,
            free: free,
            paid: paid,
            message: req.flash("myProfileMsg"),
          });
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
      const getPaymentDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM doctor_payment_details WHERE doctor_id = ?";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) {
                throw err;
              } else {
                details.businessNo = results[0].business_no;
                details.consultationType = results[0].consultation_type;
                details.appointmentFee = results[0].appointment_fee;
                details.consultationFee = results[0].consultation_fee;

                resolve(details);
              }
            });
          }

          connection.release();
        });
      });
      getPaymentDetails.then((details) => {
        let male = "",
          female = "";
        if (details.gender == "male") {
          male = "checked";
        } else {
          female = "checked";
        }

        let paid = "";
        let free = "";
        if (details.consultationType == "free") {
          free = "checked";
        } else {
          paid = "checked";
        }

        var reqExp = /[a-zA-Z]/; /// check also symbols

        if (
          reqExp.test(req.body.phone) ||
          reqExp.test(req.body.clinic_phone_no) ||
          reqExp.test(req.body.business_no)
        ) {
          //letters in phone
          req.flash("myProfileMsg", "Invalid Phone No.");
          return res.render("my-profile-doctor", {
            details: details,
            male: male,
            female: female,
            free: free,
            paid: paid,
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
                    free: free,
                    paid: paid,
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
                          free: free,
                          paid: paid,
                          message: req.flash("myProfileMsg"),
                        });
                      } else {
                        let consultationFee = "";
                        let consultationType = "";
                        if (req.body.free == "on") {
                          consultationFee = 0;
                          consultationType = "free";
                        } else {
                          consultationFee = req.body.consultation_fee;
                          consultationType = "paid";
                        }
                        const query2 =
                          "UPDATE doctor_payment_details SET business_no = ?, consultation_type = ?, appointment_fee = ?, consultation_fee =? WHERE doctor_id = ?";

                        connection.query(
                          query2,
                          [
                            req.body.business_no,
                            consultationType,
                            req.body.appointment_fee,
                            consultationFee,
                            req.session.userId,
                          ],
                          (err, data) => {
                            if (err) {
                              req.flash(
                                "myProfileMsg",
                                "Error Saving The Details"
                              );
                              return res.render("my-profile-doctor", {
                                details: details,
                                male: male,
                                female: female,
                                free: free,
                                paid: paid,
                                message: req.flash("myProfileMsg"),
                              });
                            } else {
                              console.log("Doctor details updated");

                              return res.redirect("/my-profile");
                            }
                          }
                        );
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
                free: free,
                paid: paid,
                message: req.flash("myProfileMsg"),
              });
            }
          });
        }
      });
    });
  }
});

module.exports = router;
