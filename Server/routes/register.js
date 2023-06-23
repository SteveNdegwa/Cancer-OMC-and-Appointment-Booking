const express = require("express");
const router = express.Router();

const path = require("path");

const pool = require("../server.js");

const emailValidator = require("deep-email-validator");

router.use(express.static(path.resolve("./public")));

router.get("/patient", (req, res) => {
  if (req.session.authenticated) {
    return res.render("patient-register", {
      patientMsg: req.flash("patientMsg"),
      name: "",
      dob: "",
      phone: "",
      location: "",
      male: "",
      female: "",
    });
  } else {
    return res.redirect("/login");
  }
});

router.get("/patient/medical-details", (req, res) => {
  if (req.session.authenticated) {
    return res.render("patient-register-medical", {
      patientMedicalMsg: req.flash("patientMedicalMsg"),
      cancer: "",
      stage: "",
      lifestyleDiseases: "",
    });
  } else {
    return res.redirect("/login");
  }
});

router.get("/doctor", (req, res) => {
  if (req.session.authenticated) {
    return res.render("doctor-register", {
      doctorMsg: req.flash("doctorMsg"),
      name: "",
      dob: "",
      phone: "",
      male: "",
      female: "",
    });
  } else {
    return res.redirect("/login");
  }
});

router.get("/doctor/professional-details", (req, res) => {
  if (req.session.authenticated) {
    return res.render("doctor-register-professional", {
      doctorProfMsg: req.flash("doctorProfMsg"),
      licence: "",
      speciality: "",
      location: "",
      phone: "",
      email: "",
    });
  } else {
    return res.redirect("/login");
  }
});

router.get("/doctor/payment-details", (req, res) => {
  if (req.session.authenticated) {
    req.flash("paymentDetailsMessage", "");
    res.render("doctor-payment-details", {
      message: req.flash("PaymentDetailsMessage"),
      businessNo: "",
      appointmentFee: "",
    });
  } else {
    return res.redirect("/login");
  }
});

/////////////////////     posts

router.post("/patient", (req, res) => {
  console.log(req.session.userId);

  console.log(req.body);

  if (req.body.male == "on" || req.body.female == "on") {
    let gender = "";
    if (req.body.male == "on") {
      gender = "male";
    } else if (req.body.female == "on") {
      gender = "female";
    }

    let male = "";
    let female = "";

    pool.getConnection((err, connection) => {
      if (err) {
        if (gender == "male") {
          male = "checked";
        } else {
          female = "checked";
        }
        req.flash("patientMsg", "Error Accessing The Database");
        return res.render("patient-register", {
          patientMsg: req.flash("patientMsg"),
          name: req.body.name,
          dob: req.body.dob,
          phone: req.body.phone,
          location: req.body.location,
          male: male,
          female: female,
        });
      } else {
        const query =
          "INSERT INTO patient_details(`user_id`, `name`, `gender`, `dob`, `phone_no`, `location`) VALUES(?)";
        const values = [
          req.session.userId,
          req.body.name,
          gender,
          req.body.dob,
          req.body.phone,
          req.body.location,
        ];
        connection.query(query, [values], (err, data) => {
          if (err) {
            req.flash("patientMsg", "Error Saving The Details");
            return res.render("patient-register", {
              patientMsg: req.flash("patientMsg"),
              name: req.body.name,
              dob: req.body.dob,
              phone: req.body.phone,
              location: req.body.location,
              male: male,
              female: female,
            });
          } else {
            console.log("patient personal data inserted");

            return res.redirect("/register/patient/medical-details");
          }
        });
      }

      connection.release();
    });
  } else {
    console.log("Choose the gender");
    req.flash("patientMsg", "Please Choose Your Gender");
    return res.render("patient-register", {
      patientMsg: req.flash("patientMsg"),
      name: req.body.name,
      dob: req.body.dob,
      phone: req.body.phone,
      location: req.body.location,
      male: "",
      female: "",
    });
  }
});

router.post("/patient/medical-details", (req, res) => {
    pool.getConnection((err, connection) => {
      if (err) {
        req.flash("PatientMedicalMsg", "Error Connecting To Database");
        return res.render("patient-register-medical", {
          patientMedicalMsg: req.flash("patientMedicalMsg"),
          cancer: req.body.cancer,
          stage: req.body.stage,
          lifestyleDiseases: req.body.lifestyle,
        });
      } else {
        const query =
          "UPDATE patient_details SET cancer_type = ?, cancer_stage = ?, lifestyle_diseases = ? WHERE user_id = ?";

        connection.query(
          query,
          [
            req.body.cancer,
            req.body.stage,
            req.body.lifestyle,
            req.session.userId,
          ],
          (err, data) => {
            if (err) {
              req.flash("PatientMedicalMsg", "Error Saving The Details");
              return res.render("patient-register-medical", {
                patientMedicalMsg: req.flash("patientMedicalMsg"),
                cancer: req.body.cancer,
                stage: req.body.stage,
                lifestyleDiseases: req.body.lifestyle,
              });
            } else {
              console.log("Patient Medical details Inserted");

              return res.redirect("/");
            }
          }
        );
      }

      connection.release();
    });
});

router.post("/doctor", (req, res) => {
  console.log(req.body);

  if (req.body.male == "on" || req.body.female == "on") {
    let gender = "";
    if (req.body.male == "on") {
      gender = "male";
    } else {
      gender = "female";
    }

    let male = "";
    let female = "";

    if (gender == "male") {
      male = "checked";
    } else {
      female = "checked";
    }

    pool.getConnection((err, connection) => {
      if (err) {
        req.flash("doctorMsg", "Error Connecting To The Database");
        return res.render("doctor-register", {
          doctorMsg: req.flash("doctorMsg"),
          name: req.body.name,
          dob: req.body.dob,
          phone: req.body.phone,
          male: male,
          female: female,
        });
      } else {
        let d = new Date();
        let y = new Date(d.getTime() - 1440 * 1 * 60000);

        let expiryDate =
          y.getFullYear() +
          "-" +
          ("0" + (y.getMonth() + 1)).slice(-2) +
          "-" +
          ("0" + y.getDate()).slice(-2);
       
        const query =
          "INSERT INTO doctor_details(`user_id`, `name`, `gender`, `dob`, `phone_no`, `verification_status`, `subscription_expiry`) VALUES(?)";
        const values = [
          req.session.userId,
          req.body.name,
          gender,
          req.body.dob,
          req.body.phone,
          "false",
          expiryDate,
        ];

        connection.query(query, [values], (err, data) => {
          if (err) {
            req.flash("doctorMsg", "Error Saving The Details");
            return res.render("doctor-register", {
              doctorMsg: req.flash("doctorMsg"),
              name: req.body.name,
              dob: req.body.dob,
              phone: req.body.phone,
              male: male,
              female: female,
            });
          } else {
            console.log("Doctor personal details inserted");

            res.redirect("/register/doctor/professional-details");
          }
        });
      }

      connection.release();
    });
  } else {
    console.log("Please select your gender");
    req.flash("doctorMsg", "Please Select Your Gender");
    return res.render("doctor-register", {
      doctorMsg: req.flash("doctorMsg"),
      name: req.body.name,
      dob: req.body.dob,
      phone: req.body.phone,
      male: "",
      female: "",
    });
  }
});

router.post("/doctor/professional-details", (req, res) => {
  const verifyEmail = new Promise((resolve, reject) => {
    /// verify email
    resolve(emailValidator.validate(req.body.email));
  });
  verifyEmail.then((data) => {
    if (data.valid) {
      pool.getConnection((err, connection) => {
        if (err) {
          req.flash("doctorProfMsg", "Error Accessing The Database");
          return res.render("doctor-register-professional", {
            doctorProfMsg: req.flash("doctorProfMsg"),
            licence: req.body.licence,
            speciality: req.body.speciality,
            location: req.body.location,
            phone: req.body.phone,
            email: req.body.email,
          });
        } else {
          const query =
            "UPDATE doctor_details SET licence_no = ?, cancer_speciality = ?, clinic_location = ?, clinic_phone_no = ?, clinic_email = ? WHERE user_id = ?";

          connection.query(
            query,
            [
              req.body.licence,
              req.body.speciality,
              req.body.location,
              req.body.phone,
              req.body.email,
              req.session.userId,
            ],
            (err, data) => {
              if (err) {
                req.flash("doctorProfMsg", "Error Saving The Details");
                return res.render("doctor-register-professional", {
                  doctorProfMsg: req.flash("doctorProfMsg"),
                  licence: req.body.licence,
                  speciality: req.body.speciality,
                  location: req.body.location,
                  phone: req.body.phone,
                  email: req.body.email,
                });
              } else {
                console.log("Doctor's professional details inserted");

                return res.redirect("/register/doctor/payment-details");
              }
            }
          );
        }

        connection.release();
      });
    } else {
      console.log("Invalid email");
      req.flash("doctorProfMsg", "Invalid Email");
      return res.render("doctor-register-professional", {
        doctorProfMsg: req.flash("doctorProfMsg"),
        licence: req.body.licence,
        speciality: req.body.speciality,
        location: req.body.location,
        phone: req.body.phone,
        email: "",
      });
    }
  });
});

router.post("/doctor/payment-details", (req, res) => {
  console.log(req.body);
  var reqExp = /[a-zA-Z]/; /// check also symbols
  if (
    reqExp.test(req.body.business_no) ||
    reqExp.test(req.body.appointment_fee) ||
    reqExp.test(req.body.consultation_fee)
  ) {
    /// letters found
    req.flash("paymentDetailsMessage", "Invalid Details");
    return res.render("doctor-payment-details", {
      message: req.flash("paymentDetailsMessage"),
    });
  } else {
    let consultationType = "";
    let consultationFee = "";
    if (req.body.paid_check == "on") {
      consultationType = "paid";
      consultationFee = req.body.consultation_fee;
    } else {
      consultationType = "free";
      consultationFee = 0;
    }

    if (consultationType == "paid" && req.body.consultation_fee == "") {
      req.flash("paymentDetailsMessage", "Please Enter The Consultation Fee");
      return res.render("doctor-payment-details", {
        message: req.flash("paymentDetailsMessage"),
        businessNo: req.body.business_no,
        appointmentFee: req.body.appointment_fee,
      });
    } else {
      pool.getConnection((err, connection) => {
        if (err) {
          req.flash("paymentDetailsMessage", "Error Accessing The Database");
          return res.render("doctor-payment-details", {
            message: req.flash("paymentDetailsMessage"),
            businessNo: "",
            appointmentFee: "",
          });
        } else {
          const query =
            "INSERT INTO doctor_payment_details(`doctor_id`, `business_no`, `consultation_type`, `appointment_fee`, `consultation_fee`) VALUES(?)";
          const values = [
            req.session.userId,
            req.body.business_no,
            consultationType,
            req.body.appointment_fee,
            consultationFee,
          ];
          connection.query(query, [values], (err, data) => {
            if (err) {
              req.flash("paymentDetailsMessage", "Error Saving The Details");
              return res.render("doctor-payment-details", {
                message: req.flash("paymentDetailsMessage"),
                businessNo: "",
                appointmentFee: "",
              });
            } else {
              console.log("payment details saved successfully");
              return res.redirect("/appointments/customize-appointment-slots");
            }
          });
        }

        connection.release();
      });
    }
  }
});

module.exports = router;
