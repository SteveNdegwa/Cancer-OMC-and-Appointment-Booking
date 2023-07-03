const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

var PdfTable = require("voilab-pdf-table");
var PdfDocument = require("pdfkit");

const fs = require("fs");

let pdfName = "";

router.get("/", (req, res) => {
  const getUsersCount = new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const query =
          "SELECT COUNT(*) AS count FROM users WHERE account_type = ?";
        connection.query(query, ["patient"], (err, result1) => {
          if (err) {
            throw err;
          } else {
            let patientCount = result1[0].count;
            const query2 =
              "SELECT COUNT(*) AS count FROM users WHERE account_type = ?";
            connection.query(query2, ["doctor"], (err, result2) => {
              if (err) {
                throw err;
              } else {
                let doctorCount = result2[0].count;
                let usersCount = {
                  patientCount: patientCount,
                  doctorCount: doctorCount,
                  total: patientCount + doctorCount,
                };
                console.log(usersCount);
                resolve(usersCount);
              }
            });
          }
        });
      }
      connection.release();
    });
  });

  getUsersCount.then((usersCount) => {
    const getRevenue = new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query =
            "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM consultations_stk_push WHERE status = ?";
          connection.query(
            query,
            ["The service request is processed successfully."],
            (err, result1) => {
              if (err) {
                throw err;
              } else {
                let consultationsSum = result1[0].sum;
                let consultationsCount = result1[0].count;
                const query2 =
                  "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM appointments_stk_push WHERE status = ?";
                connection.query(
                  query2,
                  ["The service request is processed successfully."],
                  (err, result2) => {
                    if (err) {
                      throw err;
                    } else {
                      let appointmentsSum = result2[0].sum;
                      let appointmentsCount = result2[0].count;
                      let revenue = {
                        consultationsSum: consultationsSum,
                        consultationsCount: consultationsCount,
                        appointmentsSum: appointmentsSum,
                        appointmentsCount: appointmentsCount,
                        total: consultationsSum + appointmentsSum,
                        totalCount: consultationsCount + appointmentsCount,
                      };
                      console.log(revenue);
                      resolve(revenue);
                    }
                  }
                );
              }
            }
          );
        }
        connection.release();
      });
    });

    getRevenue.then((revenue) => {
      const getDoctorsData = new Promise((resolve, reject) => {
        let doctorsData = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query = "SELECT user_id, name FROM doctor_details";
            connection.query(query, (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    let doctor = {
                      userId: results[i].user_id,
                      name: results[i].name,
                      consultationsCount: 0,
                      consultationsRevenue: 0,
                      appointmentsCount: 0,
                      appointmentsRevenue: 0,
                      totalEngagements: 0,
                      totalRevenue: 0,
                    };
                    const query2 =
                      "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ?";
                    connection.query(
                      query2,
                      [
                        results[i].user_id,
                        "The service request is processed successfully.",
                      ],
                      (err, results2) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results2.length) {
                            doctor.consultationsCount = results2[0].count;
                            doctor.consultationsRevenue = results2[0].sum;

                            if (results2[0].count == null) {
                              doctor.consultationsCount = 0;
                            }
                            if (results2[0].sum == null) {
                              doctor.consultationsRevenue = 0;
                            }
                          }
                          const query3 =
                            "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ?";
                          connection.query(
                            query3,
                            [
                              results[i].user_id,
                              "The service request is processed successfully.",
                            ],
                            (err, results3) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results3.length) {
                                  doctor.appointmentsCount = results3[0].count;
                                  doctor.appointmentsRevenue = results3[0].sum;

                                  if (results3[0].count == null) {
                                    doctor.appointmentsCount = 0;
                                  }
                                  if (results3[0].sum == null) {
                                    doctor.appointmentsRevenue = 0;
                                  }
                                }
                                doctor.totalEngagements =
                                  doctor.consultationsCount +
                                  doctor.appointmentsCount;
                                doctor.totalRevenue =
                                  doctor.consultationsRevenue +
                                  doctor.appointmentsRevenue;

                                doctorsData.push(doctor);

                                if (i == results.length - 1) {
                                  console.log(doctorsData);
                                  resolve(doctorsData);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(doctorsData);
                }
              }
            });
          }

          connection.release();
        });
      });

      getDoctorsData.then((doctorsData) => {
        const getPatientsData = new Promise((resolve, reject) => {
          let patientsData = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query = "SELECT user_id, name FROM patient_details";
              connection.query(query, (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      let patient = {
                        userId: results[i].user_id,
                        name: results[i].name,
                        consultationsCount: 0,
                        consultationsRevenue: 0,
                        appointmentsCount: 0,
                        appointmentsRevenue: 0,
                        totalEngagements: 0,
                        totalRevenue: 0,
                      };
                      const query2 =
                        "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ?";
                      connection.query(
                        query2,
                        [
                          results[i].user_id,
                          "The service request is processed successfully.",
                        ],
                        (err, results2) => {
                          if (err) {
                            throw err;
                          } else {
                            if (results2.length) {
                              patient.consultationsCount = results2[0].count;
                              patient.consultationsRevenue = results2[0].sum;

                              if (results2[0].count == null) {
                                patient.consultationsCount = 0;
                              }
                              if (results2[0].sum == null) {
                                patient.consultationsRevenue = 0;
                              }
                            }
                            const query3 =
                              "SELECT COUNT(*) AS count ,SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ?";
                            connection.query(
                              query3,
                              [
                                results[i].user_id,
                                "The service request is processed successfully.",
                              ],
                              (err, results3) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (results3.length) {
                                    patient.appointmentsCount =
                                      results3[0].count;
                                    patient.appointmentsRevenue =
                                      results3[0].sum;

                                    if (results3[0].count == null) {
                                      patient.appointmentsCount = 0;
                                    }
                                    if (results3[0].sum == null) {
                                      patient.appointmentsRevenue = 0;
                                    }
                                  }
                                  patient.totalEngagements =
                                    patient.consultationsCount +
                                    patient.appointmentsCount;
                                  patient.totalRevenue =
                                    patient.consultationsRevenue +
                                    patient.appointmentsRevenue;

                                  patientsData.push(patient);

                                  if (i == results.length - 1) {
                                    console.log(patientsData);
                                    resolve(patientsData);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(patientsData);
                  }
                }
              });
            }

            connection.release();
          });
        });
        getPatientsData.then((patientsData) => {
          let doctorsConsultationsData = [...doctorsData].sort(
            (a, b) => b.consultationsCount - a.consultationsCount
          ); //// sort array but keep the original intact
          let doctorsAppointmentsData = [...doctorsData].sort(
            (a, b) => b.appointmentsCount - a.appointmentsCount
          );
          let doctorsRevenueData = [...doctorsData].sort(
            (a, b) => b.totalRevenue - a.totalRevenue
          );
          let doctorsEngagementsData = [...doctorsData].sort(
            (a, b) => b.totalEngagements - a.totalEngagements
          );
          patientsData.sort((a, b) => b.totalEngagements - a.totalEngagements);
          res.render("admin", {
            usersCount: usersCount,
            revenue: revenue,
            doctorsConsultationsData: doctorsConsultationsData,
            doctorsAppointmentsData: doctorsAppointmentsData,
            doctorsRevenueData: doctorsRevenueData,
            doctorsEngagementsData: doctorsEngagementsData,
            patientsData: patientsData,
          });
        });
      });
    });
  });
});

router.get("/view-unverified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;

    const query = "SELECT * FROM doctor_details WHERE verification_status = ?";
    connection.query(query, ["false"], (err, results) => {
      if (err) throw err;

      res.render("view-unverified-doctors", { doctors: results });
    });

    connection.release();
  });
});

router.post("/view-unverified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;

    const query =
      "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
    connection.query(query, ["true", req.body.doctor_id], (err, data) => {
      if (err) throw err;
      else {
        console.log(data);
        console.log("Verified Successfully");
        res.redirect("/admin/view-unverified-doctors");
      }
    });

    connection.release();
  });
});

router.get("/view-verified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;

    const query = "SELECT * FROM doctor_details WHERE verification_status = ?";
    connection.query(query, ["true"], (err, results) => {
      if (err) throw err;

      res.render("view-verified-doctors", { doctors: results });
    });

    connection.release();
  });
});

router.post("/view-verified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;

    const query =
      "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
    connection.query(query, ["false", req.body.doctor_id], (err, data) => {
      if (err) throw err;
      else {
        console.log(data);
        console.log("Unverified Successfully");
        res.redirect("/admin/view-verified-doctors");
      }
    });

    connection.release();
  });
});

router.get("/subscriptions", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query = "SELECT * FROM subscription_details";
      connection.query(query, (err, results) => {
        if (err) {
          throw err;
        } else {
          res.render("subscriptions", { details: results[0] });
        }
      });
    }
    connection.release();
  });
});

router.post("/subscriptions", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query =
        "UPDATE subscription_details SET business_no=?, days=?, amount=?";
      connection.query(
        query,
        [req.body.business_no, req.body.length, req.body.amount],
        (err, data) => {
          if (err) {
            throw err;
          } else {
            const query2 = "SELECT * FROM subscription_details";
            connection.query(query2, (err, results) => {
              if (err) {
                throw err;
              } else {
                res.render("subscriptions", { details: results[0] });
              }
            });
          }
        }
      );
    }
    connection.release();
  });
});

router.get("/view-subscriptions", (req, res) => {
  const getDetails = new Promise((resolve, reject) => {
    let details = [];
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const date = new Date();
        const query = "SELECT * FROM subscriptions WHERE expiry_date>= ?";
        connection.query(query, [date], (err, results) => {
          if (err) {
            throw err;
          } else {
            if (results.length) {
              for (let i = 0; i < results.length; i++) {
                const query2 =
                  "SELECT name FROM doctor_details WHERE user_id= ?";
                connection.query(
                  query2,
                  [results[i].doctor_id],
                  (err, name) => {
                    results[i].name = name[0].name;
                    details.push(results[i]);

                    if (i == results.length - 1) {
                      resolve(details);
                    }
                  }
                );
              }
            } else {
              resolve(details);
            }
          }
        });
      }
      connection.release();
    });
  });

  getDetails.then((details) => {
    const generatePdf = new Promise((resolve, reject) => {
      let d = new Date();
      let date =
        d.getFullYear() +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + d.getDate()).slice(-2);

      let time =
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

      var doc = new PdfDocument();
      table = new PdfTable(doc, {
        bottomMargin: 30,
      });

      pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
      doc.pipe(
        fs.createWriteStream(path.resolve(__dirname, `../pdfs/${pdfName}.pdf`))
      );

      doc.image(
        path.resolve(
          __dirname,
          "../public/icons/css-high-resolution-logo-black-on-white-background.png"
        ),
        30,
        20,
        { width: 130 }
      );

      doc.fontSize(13);
      doc.font("Times-Bold");
      doc.text("CANCER SUPPORT SYSTEM", 180, 30, {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("P.O BOX 56 - 01004,", {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("KANJUKU", {
        width: 315,
        align: "center",
      });

      doc.font("Times-Roman");
      doc.moveDown();
      doc.text(`${date}     ${time}`, {
        width: 315,
        align: "center",
      });

      doc.fontSize(11);
      doc.font("Times-Roman");
      doc.text(`NAME:            Administrator`, 75, 180);

      doc.text("", 0);
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();

      doc.font("Times-Bold");
      doc.fontSize(13);

      doc.text("SUBSCRIPTIONS REPORT", {
        underline: true,
        width: 595,
        align: "center",
      });

      doc.moveDown();

      table
        // add some plugins (here, a 'fit-to-width' for a column)
        .addPlugin(
          new (require("voilab-pdf-table/plugins/fitcolumn"))({
            column: "name",
          })
        )
        // set defaults to your columns
        .setColumnsDefaults({
          headerBorder: ["B"],
          // border: ["B"],
          padding: [10, 10, 0, 0],
        })
        // add table columns
        .addColumns([
          {
            id: "name",
            header: "Doctor's Name",
            align: "left",
          },
          {
            id: "days",
            header: "Subscription Days",
            width: 90,
          },
          {
            id: "amount",
            header: "Subscription Amount",
            width: 90,
          },
          {
            id: "expiry_date",
            header: "Subscription Expiry",
            width: 90,
          },
        ]);
      doc.moveDown();
      doc.font("Times-Roman");

      table.addBody(details);

      doc.text("", 0);

      doc.end();
      resolve();
    });
    generatePdf.then(() => {
      return res.render("view-subscriptions", {
        pdfName: `${pdfName}.pdf`,
        details: details,
      });
    });
  });
});

router.get("/view-patients", (req, res) => {
  const getDetails = new Promise((resolve, reject) => {
    let details = [];
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const query = "SELECT * FROM patient_details";
        connection.query(query, (err, results) => {
          if (err) {
            throw err;
          } else {
            if (results.length) {
              resolve(results);
            } else {
              resolve(details);
            }
          }
        });
      }
      connection.release();
    });
  });

  getDetails.then((details) => {
    const generatePdf = new Promise((resolve, reject) => {
      let d = new Date();
      let date =
        d.getFullYear() +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + d.getDate()).slice(-2);

      let time =
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

      var doc = new PdfDocument();
      table = new PdfTable(doc, {
        bottomMargin: 30,
      });

      pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
      doc.pipe(
        fs.createWriteStream(path.resolve(__dirname, `../pdfs/${pdfName}.pdf`))
      );

      doc.image(
        path.resolve(
          __dirname,
          "../public/icons/css-high-resolution-logo-black-on-white-background.png"
        ),
        30,
        20,
        { width: 130 }
      );

      doc.fontSize(13);
      doc.font("Times-Bold");
      doc.text("CANCER SUPPORT SYSTEM", 180, 30, {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("P.O BOX 56 - 01004,", {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("KANJUKU", {
        width: 315,
        align: "center",
      });

      doc.font("Times-Roman");
      doc.moveDown();
      doc.text(`${date}     ${time}`, {
        width: 315,
        align: "center",
      });

      doc.fontSize(11);
      doc.font("Times-Roman");
      doc.text(`NAME:            Administrator`, 75, 180);

      doc.text("", 0);
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();

      doc.font("Times-Bold");
      doc.fontSize(13);

      doc.text("PATIENTS REPORT", {
        underline: true,
        width: 595,
        align: "center",
      });

      doc.moveDown();

      table
        // add some plugins (here, a 'fit-to-width' for a column)
        .addPlugin(
          new (require("voilab-pdf-table/plugins/fitcolumn"))({
            column: "name",
          })
        )
        // set defaults to your columns
        .setColumnsDefaults({
          headerBorder: ["B"],
          // border: ["B"],
          padding: [10, 10, 0, 0],
        })
        // add table columns
        .addColumns([
          {
            id: "name",
            header: "Patient's Name",
            align: "left",
          },
          {
            id: "gender",
            header: "Gender",
            width: 70,
          },
          {
            id: "dob",
            header: "D.O.B",
            width: 70,
          },
          {
            id: "location",
            header: "Location",
            width: 70,
          },
          {
            id: "phone_no",
            header: "Phone Number",
            width: 70,
          },
        ]);
      doc.moveDown();
      doc.font("Times-Roman");

      table.addBody(details);

      doc.text("", 0);
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();
      doc.font("Times-Bold");
      doc.text("Number of patients: " + details.length, 75);

      doc.end();
      resolve();
    });
    generatePdf.then(() => {
      return res.render("view-patients", {
        pdfName: `${pdfName}.pdf`,
        details: details,
        searchValue: "",
      });
    });
  });
});

router.post("/view-patients", (req, res) => {
  const getDetails = new Promise((resolve, reject) => {
    let details = [];
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const query = "SELECT * FROM patient_details WHERE (name like ?) or (gender like ?) or (dob like ?) or (phone_no like ?) or (location like ?)";
        connection.query(query,
          [
          "%" + req.body.search + "%",
          "%" + req.body.search + "%",
          "%" + req.body.search + "%",
          "%" + req.body.search + "%",
          "%" + req.body.search + "%",
        ],
         (err, results) => {
          if (err) {
            throw err;
          } else {
            if (results.length) {
              resolve(results);
            } else {
              resolve(details);
            }
          }
        });
      }
      connection.release();
    });
  });

  getDetails.then((details) => {
    const generatePdf = new Promise((resolve, reject) => {
      let d = new Date();
      let date =
        d.getFullYear() +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + d.getDate()).slice(-2);

      let time =
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

      var doc = new PdfDocument();
      table = new PdfTable(doc, {
        bottomMargin: 30,
      });

      pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
      doc.pipe(
        fs.createWriteStream(path.resolve(__dirname, `../pdfs/${pdfName}.pdf`))
      );

      doc.image(
        path.resolve(
          __dirname,
          "../public/icons/css-high-resolution-logo-black-on-white-background.png"
        ),
        30,
        20,
        { width: 130 }
      );

      doc.fontSize(13);
      doc.font("Times-Bold");
      doc.text("CANCER SUPPORT SYSTEM", 180, 30, {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("P.O BOX 56 - 01004,", {
        width: 315,
        align: "center",
      });

      doc.moveDown();
      doc.text("KANJUKU", {
        width: 315,
        align: "center",
      });

      doc.font("Times-Roman");
      doc.moveDown();
      doc.text(`${date}     ${time}`, {
        width: 315,
        align: "center",
      });

      doc.fontSize(11);
      doc.font("Times-Roman");
      doc.text(`NAME:            Administrator`, 75, 180);

      doc.text("", 0);
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();

      doc.font("Times-Bold");
      doc.fontSize(13);

      doc.text(`PATIENTS'  '${req.body.search}'  SEARCH RESULTS REPORT`, {
        underline: true,
        width: 595,
        align: "center",
      });

      doc.moveDown();

      table
        // add some plugins (here, a 'fit-to-width' for a column)
        .addPlugin(
          new (require("voilab-pdf-table/plugins/fitcolumn"))({
            column: "name",
          })
        )
        // set defaults to your columns
        .setColumnsDefaults({
          headerBorder: ["B"],
          // border: ["B"],
          padding: [10, 10, 0, 0],
        })
        // add table columns
        .addColumns([
          {
            id: "name",
            header: "Patient's Name",
            align: "left",
          },
          {
            id: "gender",
            header: "Gender",
            width: 70,
          },
          {
            id: "dob",
            header: "D.O.B",
            width: 70,
          },
          {
            id: "location",
            header: "Location",
            width: 70,
          },
          {
            id: "phone_no",
            header: "Phone Number",
            width: 70,
          },
        ]);
      doc.moveDown();
      doc.font("Times-Roman");

      table.addBody(details);

      doc.text("", 0);
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();
      doc.font("Times-Bold");
      doc.text("Number of patients: " + details.length, 75);

      doc.end();
      resolve();
    });
    generatePdf.then(() => {
      return res.render("view-patients", {
        pdfName: `${pdfName}.pdf`,
        details: details,
        searchValue: req.body.search,
      });
    });
  });
});



router.get("/admin-profile", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query = "SELECT * FROM users WHERE user_name=?";
      connection.query(query, ["Administrator"], (err, results) => {
        if (err) {
          throw err;
        } else {
          res.render("admin-profile", { password: results[0].password });
        }
      });
    }
    connection.release();
  });
});

router.post("/admin-profile", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query = "UPDATE users SET password=? WHERE user_name=?";
      connection.query(
        query,
        [req.body.password, "Administrator"],
        (err, results) => {
          if (err) {
            throw err;
          } else {
            res.render("admin-profile", { password: req.body.password });
          }
        }
      );
    }
    connection.release();
  });
});

module.exports = router;
