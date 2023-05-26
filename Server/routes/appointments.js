const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const unirest = require("unirest");
const axios = require("axios");

const path = require("path");

let nowDate = new Date();
let month = "";
if (nowDate.getMonth() + 1 < 10) {
  month = `0${nowDate.getMonth() + 1}`;
} else {
  month = nowDate.getMonth() + 1;
}
let today = `${nowDate.getFullYear()}-${month}-${nowDate.getDate()}`;

//// middleware function to get access token

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
      console.log(token);
      next();
    });
}

router.get("/customize-appointment-slots", (req, res) => {
  if (req.session.authenticated) {
    req.flash("appointmentSlotsMessage", "");
    res.render("appointment-slots", {
      message: req.flash("appointmentSlotsMessage"),
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/customize-appointment-slots", (req, res) => {
  if (req.session.authenticated) {
    let days = [];
    if (req.body.sunday == "on") {
      days.push("sunday");
    }
    if (req.body.monday == "on") {
      days.push("monday");
    }
    if (req.body.tuesday == "on") {
      days.push("tuesday");
    }
    if (req.body.wednesday == "on") {
      days.push("wednesday");
    }
    if (req.body.thursday == "on") {
      days.push("thursday");
    }
    if (req.body.friday == "on") {
      days.push("friday");
    }
    if (req.body.saturday == "on") {
      days.push("saturday");
    }

    let slotsNo = req.body.slots - 1;

    let time = [];

    for (let i = 1; i <= slotsNo; i++) {
      time.push(req.body["time" + i]);
    }

    let timeJson = JSON.stringify(time);

    if (days.length > 0) {
      pool.getConnection((err, connection) => {
        if (err) console.log(err);
        else {
          const save = new Promise((resolve, reject) => {
            days.forEach((day) => {
              const query =
                "SELECT * FROM appointment_slots WHERE doctor_id= ? AND day = ?";
              connection.query(
                query,
                [req.session.userId, day],
                (err, result) => {
                  if (err) console.log(err);

                  if (result.length) {
                    const query =
                      "UPDATE appointment_slots SET slots=? WHERE doctor_id =? AND day =?";
                    connection.query(
                      query,
                      [timeJson, req.session.userId, day],
                      (err, data) => {
                        if (err) console.log(err);
                        else {
                          console.log(`${day} updated successfully`);
                        }
                      }
                    );
                  } else {
                    const query =
                      "INSERT INTO appointment_slots(`doctor_id`, `day`, `slots`) VALUES(?)";
                    const values = [req.session.userId, day, timeJson];
                    connection.query(query, [values], (err, data) => {
                      if (err) console.log(err);
                      else {
                        console.log(`${day} inserted successfully`);
                      }
                    });
                  }
                }
              );
            });
          });
        }
        connection.release();
        return res.redirect("/");
      });
    } else {
      req.flash("appointmentSlotsMessage", "No Days Selected");
      res.render("appointment-slots", {
        message: req.flash("appointmentSlotsMessage"),
      });
    }
  } else {
    return res.redirect("/login");
  }
});

let appointmentSlots = [];
let details = [];
let chosenDate = "";

router.get("/book-appointment", (req, res) => {
  if (req.session.authenticated) {
    req.session.appointmentDetails = {
      doctorId: "",
      patientId: "",
      date: "",
      time: "",
      amount: "",
    };

    const getDoctorDetails = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        const query =
          "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
        connection.query(query, [req.session.doctorId], (err, results) => {
          if (err) console.log(err);
          else {
            console.log(results);

            var string = JSON.stringify(results);
            var details = JSON.parse(string);

            resolve(details);
          }
        });
        connection.release();
      });
    });

    getDoctorDetails.then((details) => {
      pool.getConnection((err, connection) => {
        const query =
          "SELECT appointment_fee FROM doctor_payment_details WHERE doctor_id = ?";
        connection.query(query, [req.session.doctorId], (err, results) => {
          if (err) {
            console.log(err);
          } else {
            req.session.appointmentDetails.amount = results[0].appointment_fee;

            if (results.length) {
              appointmentSlots = [];
              chosenDate = "";

              req.flash("bookingMessage", "");

              return res.render("book-appointment", {
                details: details,
                appointmentFee: results[0].appointment_fee,
                appointmentSlots: appointmentSlots,
                chosenDate: chosenDate,
                today: today,
                bookingMessage: req.flash("bookingMessage"),
              });
            } else {
              appointmentSlots = [];
              chosenDate = "";

              req.flash(
                "bookingMessage",
                "Cannot Book Appointment Due To Undefined Booking Fee"
              );

              return res.render("book-appointment", {
                details: details,
                appointmentFee: "Undefined",
                appointmentSlots: appointmentSlots,
                chosenDate: chosenDate,
                today: today,
                bookingMessage: req.flash("bookingMessage"),
              });
            }
          }
        });

        connection.release();
      });
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/book-appointment", (req, res) => {
  if (req.session.authenticated) {
    if (req.body.submitType == "date change") {
      /// reload after date change

      const getDetails = new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          const query =
            "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
          connection.query(query, [req.session.doctorId], (err, results) => {
            if (err) throw err;
            else {
              console.log(results);

              var string = JSON.stringify(results);
              details = JSON.parse(string);

              resolve(details);
            }
          });
          connection.release();
        });
      });

      getDetails.then((details) => {
        appointmentSlots = [];
        chosenDate = req.body.date;

        let date = new Date(req.body.date);

        let weekdays = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        let dayIndex = date.getDay();
        let day = weekdays[dayIndex];

        pool.getConnection((err, connection) => {
          const query =
            "SELECT slots FROM appointment_slots where doctor_id = ? AND day = ?";
          connection.query(
            query,
            [req.session.doctorId, day],
            (err, results) => {
              if (err) throw err;

              if (results.length) {
                console.log(results);
                console.log(results[0].slots);
                console.log(JSON.parse(results[0].slots));

                appointmentSlots = JSON.parse(results[0].slots);
              }

              return res.render("book-appointment", {
                details: details,
                appointmentFee: req.session.appointmentDetails.amount,
                appointmentSlots: appointmentSlots,
                chosenDate: chosenDate,
                today: today,
                bookingMessage: req.flash("bookingMessage"),
              });
            }
          );
          connection.release();
        });
      });
    } else {
      //// for saving appointments to the database  // check if more than two selected  //add

      let selectedTime = "";
      let selectedDate = req.body.date;

      appointmentSlots.forEach((slot) => {
        if (req.body[slot] == "on") {
          selectedTime = slot;
        }
      });

      if (selectedTime == "") {
        req.flash("bookingMessage", "Please Select A Time Slot");
        return res.render("book-appointment", {
          details: details,
          appointmentFee: req.session.appointmentDetails.amount,
          appointmentSlots: appointmentSlots,
          today: today,
          chosenDate: chosenDate,
          bookingMessage: req.flash("bookingMessage"),
        });
      } else {
        pool.getConnection((err, connection) => {
          if (err) throw err;
          else {
            const query =
              "SELECT * FROM appointments WHERE doctor_id = ? AND date = ? and time= ?";
            connection.query(
              query,
              [req.session.doctorId, selectedDate, selectedTime],
              (err, result) => {
                if (err) throw err;
                if (result.length) {
                  console.log("already booked");
                  req.flash(
                    "bookingMessage",
                    "Appointment Slot Already Booked"
                  );
                  return res.render("book-appointment", {
                    details: details,
                    appointmentFee: req.session.appointmentDetails.amount,
                    appointmentSlots: appointmentSlots,
                    chosenDate: chosenDate,
                    today: today,
                    bookingMessage: req.flash("bookingMessage"),
                  }); //ALREADY BOOKED
                } else {
                  const date = new Date(selectedDate);

                  date.setHours(
                    selectedTime.slice(0, 2),
                    selectedTime.slice(3, 5)
                  );

                  if (nowDate.getTime() > date.getTime()) {
                    req.flash(
                      "bookingMessage",
                      "Appointment Slot Has Already Expired"
                    );
                    return res.render("book-appointment", {
                      details: details,
                      appointmentFee: req.session.appointmentDetails.amount,
                      appointmentSlots: appointmentSlots,
                      chosenDate: chosenDate,
                      today: today,
                      bookingMessage: req.flash("bookingMessage"),
                    }); /// appointment slot passed
                  } else {
                    if (req.session.bookingType == "reschedule") {
                      //// making a new booking or rescheduling a booking

                      const query2 =
                        "UPDATE appointments SET date=? , time = ? WHERE appointment_id=?";
                      connection.query(
                        query2,
                        [selectedDate, selectedTime, req.session.appointmentId],
                        (err, data) => {
                          if (err) throw err;
                          else {
                            console.log("appointment rescheduled");
                            res.redirect("/");
                          }
                        }
                      );
                    } else {
                      (req.session.appointmentDetails.doctorId =
                        req.session.doctorId),
                        (req.session.appointmentDetails.patientId =
                          req.session.userId),
                        (req.session.appointmentDetails.date = selectedDate),
                        (req.session.appointmentDetails.time = selectedTime),
                        console.log(req.session.appointmentDetails);

                      req.flash("paymentStatusMessage", "");

                      res.render("input-number", {
                        message: req.flash("paymentStatusMessage"),
                      });
                    }
                  }
                }
              }
            );
          }
          connection.release();
        });
      }
      console.log(selectedTime);
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/input-number", access, async (req, res) => {
  let amount = req.session.appointmentDetails.amount;
  console.log("amount: " + amount);
  let number = req.body.number.substring(1);
  let mobileNo = "254" + number;

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.SHORT_CODE;
  const passkey = process.env.PASS_KEY;

  const password = new Buffer.from(shortcode + passkey + timestamp).toString(
    "base64"
  );

  await axios
    .post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: mobileNo,
        PartyB: shortcode,
        PhoneNumber: mobileNo,
        CallBackURL: "https://ba27-41-212-28-227.ngrok-free.app",
        AccountReference: "Cancer Support System",
        TransactionDesc: "Payment of Appointment",
      },
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    )
    .then((response) => {
      console.log(response);
      console.log(response.data);

      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          console.log(response.data.CheckoutRequestID);

          req.session.paymentDetails = {
            mobileNo: mobileNo,
            CheckoutRequestID: response.data.CheckoutRequestID,
          };

          console.log(req.session.paymentDetails);

          if (err) throw err;
          const query2 =
            "INSERT INTO appointments_stk_push(`checkout_id`, `phone_no` ,`amount` , `timestamp` , `doctor_id`, `patient_id`, `appointment_date`, `appointment_time`) VALUES(?);";
          const values2 = [
            response.data.CheckoutRequestID,
            mobileNo,
            amount,
            timestamp,
            req.session.appointmentDetails.doctorId,
            req.session.appointmentDetails.patientId,
            req.session.appointmentDetails.date,
            req.session.appointmentDetails.time,
          ];
          connection.query(query2, [values2], (err, data) => {
            if (err) throw err;
            console.log("STK data inserted successfully");

            req.flash("stkStatusMessage", "");
            return res.render("stk-push", {
              message: req.flash("stkStatusMessage"),
            });
          });
        }

        connection.release();
      });
    })
    .catch((err) => {
      console.log(err);
      req.flash("paymentStatusMessage", "Error Generating The STK Push");

      return res.render("input-number", {
        message: req.flash("paymentStatusMessage"),
      });
    });

  // let request = unirest(
  //   "POST",
  //   "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  // )
  //   .headers({
  //     "Content-Type": "application/json",
  //     Authorization: "Bearer " + token,
  //   })
  //   .send(
  //     JSON.stringify({
  //       BusinessShortCode: shortcode,
  //       Password: password,
  //       Timestamp: timestamp,
  //       TransactionType: "CustomerPayBillOnline",
  //       Amount: amount,
  //       PartyA: mobileNo,
  //       PartyB: shortcode,
  //       PhoneNumber: mobileNo,
  //       CallBackURL: "https://ba27-41-212-28-227.ngrok-free.app",
  //       AccountReference: "CSS",
  //       TransactionDesc: "Payment of Appointment",
  //     })
  //   )
  //   .end((response) => {
  //     if (response.error) {
  //       console.log(response.error);

  //       req.flash("paymentStatusMessage", "Error Generating The STK Push");

  //       return res.render("input-number", {
  //         message: req.flash("paymentStatusMessage"),
  //       });

  //     } else {
  //       console.log(response.body);
  //       console.log(response.body.CheckoutRequestID);

  //       req.session.paymentDetails = {
  //         mobileNo: mobileNo,
  //         CheckoutRequestID: response.body.CheckoutRequestID,
  //       };

  //       console.log(req.session.paymentDetails);

  //       if (err) throw err;
  //       const query2 =
  //         "INSERT INTO appointments_stk_push(`checkout_id`, `phone_no` ,`amount` , `timestamp` , `doctor_id`, `patient_id`, `appointment_date`, `appointment_time`) VALUES(?);";
  //       const values2 = [
  //         response.body.CheckoutRequestID,
  //         mobileNo,
  //         amount,
  //         timestamp,
  //         req.session.appointmentDetails.doctorId,
  //         req.session.appointmentDetails.patientId,
  //         req.session.appointmentDetails.date,
  //         req.session.appointmentDetails.time,
  //       ];
  //       connection.query(query2, [values2], (err, data) => {
  //         if (err) throw err;
  //         console.log("STK data inserted successfully");

  //         req.flash("stkStatusMessage", "");
  //         res.render("stk-push", { message: req.flash("stkStatusMessage") });
  //       });
  //     }
  //   });
});

router.post("/stk-push", (req, res) => {
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const shortcode = process.env.SHORT_CODE;
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
        CheckoutRequestID: req.session.paymentDetails.CheckoutRequestID,
      })
    )
    .end((response) => {
      if (response.error) {
        req.flash(
          "stkStatusMessage",
          "Please complete the payment before proceeding"
        );
        return res.render("stk-push", {
          message: req.flash("stkStatusMessage"),
        });
      }
      console.log(response.body.ResultDesc);

      if (
        response.body.ResultDesc ==
        "The service request is processed successfully."
      ) {
        /// if payment successful

        pool.getConnection((err, connection) => {
          if (err) throw err;
          const query2 =
            "INSERT INTO appointments(`doctor_id`,`patient_id`, `date`, `time`) VALUES(?)";
          const values2 = [
            req.session.appointmentDetails.doctorId,
            req.session.appointmentDetails.patientId,
            req.session.appointmentDetails.date,
            req.session.appointmentDetails.time,
          ];

          const saveAppointment = new Promise((resolve, reject) => {
            connection.query(query2, [values2], (err, data) => {
              if (err) throw err;
              else {
                console.log("appointment inserted");
                console.log(`appointment id is ${data.insertId}`);

                let appointmentId = data.insertId;
                resolve(appointmentId);
              }
            });
          });

          saveAppointment.then((appointmentId) => {
            const query3 =
              "UPDATE appointments_stk_push SET status = ? ,appointment_id = ? WHERE checkout_id = ?";
            connection.query(
              query3,
              [
                response.body.ResultDesc,
                appointmentId,
                req.session.paymentDetails.CheckoutRequestID,
              ],
              (err, result) => {
                if (err) throw err;
                res.redirect("/appointments/my-appointments");
              }
            );
          });

          connection.release();
        });
      } else {
        /// if payment not successful

        pool.getConnection((err, connection) => {
          if (err) throw err;
          const query =
            "UPDATE appointments_stk_push SET status = ? WHERE checkout_id = ?";
          connection.query(
            query,
            [
              response.body.ResultDesc,
              req.session.paymentDetails.CheckoutRequestID,
            ],
            (err, result) => {
              if (err) throw err;

              req.flash("paymentStatusMessage", response.body.ResultDesc);
              res.render("input-number", {
                message: req.flash("paymentStatusMessage"),
              });
            }
          );
        });
      }
    });
});

router.post("/callback", (req, res) => {
  ///// callback url
  const callback = req.body;
  console.log(callback.Body);
});

router.get("/my-appointments", (req, res) => {
  if (req.session.authenticated) {
    let userId = req.session.userId;
    const getAllDetails = new Promise((resolve, reject) => {
      const appointments = [];
      pool.getConnection((err, connection) => {
        if (err) throw err;

        const query =
          "SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC, time ASC";
        connection.query(query, [userId], (err, results) => {
          if (err) throw err;
          if (results.length) {
            const getData = new Promise((resolve, reject) => {
              for (let i = 0; i < results.length; i++) {
                const query2 =
                  "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
                connection.query(
                  query2,
                  [results[i].doctor_id],
                  (err, data) => {
                    if (err) throw err;
                    data[0].appointment_id = results[i].appointment_id;
                    data[0].doctor_id = results[i].doctor_id;
                    data[0].date = results[i].date;
                    data[0].time = results[i].time;

                    const date = new Date(results[i].date);
                    let time = results[i].time;
                    date.setHours(time.slice(0, 2), time.slice(3, 5));

                    const nowDate = new Date();

                    if (nowDate.getTime() > date.getTime()) {
                      data[0].status = "completed";
                    } else {
                      data[0].status = "scheduled";
                    }

                    appointments.push(data[0]);

                    if (i == results.length - 1) {
                      resolve(appointments);
                    }
                  }
                );
              }
            });

            getData.then((appointments) => {
              return res.render("my-appointments", {
                appointments: appointments,
              });
            });
          } else {
            return res.render("my-appointments", {
              appointments: appointments,
            });
          }
        });
        connection.release();
      });
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/my-appointments", (req, res) => {
  req.session.doctorId = req.body.doctorId;
  req.session.appointmentId = req.body.appointmentId;
  req.session.bookingType = "reschedule";
  res.redirect("/appointments/book-appointment");
});

router.get("/view-appointments", (req, res) => {
  ////// get all  appointments from current date
  if (req.session.authenticated) {
    let doctorId = req.session.userId;

    pool.getConnection((err, connection) => {
      if (err) throw err;
      else {
        const getDetails = new Promise((resolve, reject) => {
          let appointments = [];
          const query =
            "SELECT * FROM appointments WHERE doctor_id = ? AND date >= ? ORDER BY date ASC, time ASC";
          connection.query(query, [doctorId, today], (err, result) => {
            if (err) throw err;
            if (result.length) {
              for (let i = 0; i < result.length; i++) {
                const query2 =
                  "SELECT * FROM patient_details WHERE user_id = ?";
                connection.query(
                  query2,
                  [result[i].patient_id],
                  (err, data) => {
                    if (err) throw err;
                    result[i].name = data[0].name;
                    result[i].dob = data[0].dob;
                    result[i].gender = data[0].gender;
                    result[i].cancerType = data[0].cancer_type;
                    result[i].cancerStage = data[0].cancer_stage;
                    result[i].lifestyleDiseases = data[0].lifestyle_diseases;
                    result[i].phoneNo = data[0].phone_no;
                    result[i].email = data[0].email;
                    result[i].location = data[0].location;

                    const date = new Date(result[i].date);
                    let time = result[i].time;
                    date.setHours(time.slice(0, 2), time.slice(3, 5));

                    const nowDate = new Date();

                    if (nowDate.getTime() > date.getTime()) {
                      result[i].status = "completed";
                    } else {
                      result[i].status = "scheduled";
                    }

                    appointments.push(result[i]);

                    if (i == result.length - 1) {
                      resolve(appointments);
                    }
                  }
                );
              }
            } else {
              //// no appointments
              return res.render("view-appointments", {
                appointments: appointments,
              });
            }
          });
        });

        getDetails.then((appointments) => {
          console.log(appointments);
          return res.render("view-appointments", {
            appointments: appointments,
          });
        });
      }
      connection.release();
    });
  } else {
    res.redirect("/login");
  }
});

router.get("/view-all-appointments", (req, res) => {
  ////// get all past and future appointments
  if (req.session.authenticated) {
    let doctorId = req.session.userId;

    pool.getConnection((err, connection) => {
      if (err) throw err;
      else {
        const getDetails = new Promise((resolve, reject) => {
          let appointments = [];
          const query =
            "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date ASC, time ASC";
          connection.query(query, [doctorId, today], (err, result) => {
            if (err) throw err;
            if (result.length) {
              for (let i = 0; i < result.length; i++) {
                const query2 =
                  "SELECT * FROM patient_details WHERE user_id = ?";
                connection.query(
                  query2,
                  [result[i].patient_id],
                  (err, data) => {
                    if (err) throw err;
                    result[i].name = data[0].name;
                    result[i].dob = data[0].dob;
                    result[i].gender = data[0].gender;
                    result[i].cancerType = data[0].cancer_type;
                    result[i].cancerStage = data[0].cancer_stage;
                    result[i].lifestyleDiseases = data[0].lifestyle_diseases;
                    result[i].phoneNo = data[0].phone_no;
                    result[i].email = data[0].email;
                    result[i].location = data[0].location;

                    const date = new Date(result[i].date);
                    let time = result[i].time;
                    date.setHours(time.slice(0, 2), time.slice(3, 5));

                    const nowDate = new Date();

                    if (nowDate.getTime() > date.getTime()) {
                      result[i].status = "completed";
                    } else {
                      result[i].status = "scheduled";
                    }

                    appointments.push(result[i]);

                    if (i == result.length - 1) {
                      resolve(appointments);
                    }
                  }
                );
              }
            } else {
              //// no appointments
              return res.render("view-appointments", {
                appointments: appointments,
              });
            }
          });
        });

        getDetails.then((appointments) => {
          console.log(appointments);
          return res.render("view-appointments", {
            appointments: appointments,
          });
        });
      }
      connection.release();
    });
  } else {
    res.redirect("/login");
  }
});

module.exports = router;
