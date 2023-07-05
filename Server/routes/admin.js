const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

var PdfTable = require("voilab-pdf-table");
var PdfDocument = require("pdfkit");

const puppeteer = require("puppeteer");

const fs = require("fs");

const yearDate = new Date();
let year = yearDate.getFullYear();

let pdfName = "";

router.get("/", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

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
                                    doctor.appointmentsCount =
                                      results3[0].count;
                                    doctor.appointmentsRevenue =
                                      results3[0].sum;

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
            patientsData.sort(
              (a, b) => b.totalEngagements - a.totalEngagements
            );
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
  } else {
    return res.redirect("/login");
  }
});

let alertType = "";

router.get("/view-unverified-doctors", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";

    pool.getConnection((err, connection) => {
      if (err) throw err;

      const query =
        "SELECT * FROM doctor_details WHERE verification_status = ?";
      connection.query(query, ["false"], (err, results) => {
        if (err) throw err;

        res.render("view-unverified-doctors", {
          doctors: results,
          message: req.session.unverifiedDoctorsMsg,
          type: alertType,
        });
      });

      connection.release();
    });
  } else {
    return res.redirect("/login");
  }
});

router.post("/view-unverified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    } else {
      const query = "SELECT * FROM doctor_details WHERE user_id=?";
      connection.query(query, [req.body.doctor_id], (err, results) => {
        if (err) {
          throw err;
        } else {
          (async () => {
            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();
            await page.goto(
              "https://kmpdc.go.ke/Registers/MTreg/master_reg.php",
              { waitUntil: "load", timeout: 0 }
            );

            await page.type("#productdataTable_filter input", results[0].name);

            await page.select("#productdataTable_length select", "100");

            const grabDetails = await page.evaluate(() => {
              const tableRow = document.querySelectorAll(
                ".table.table-bordered.dataTable tr"
              );

              let array = [];
              tableRow.forEach((row) => {
                let doctor = {};
                let tds = row.querySelectorAll("td");

                let count = 0;
                tds.forEach((td) => {
                  if (count == 1) {
                    doctor.licenceNumber = td.innerText;
                  }
                  if (count == 2) {
                    doctor.name = td.innerText;
                  }
                  if (count == 3) {
                    doctor.qualifications = td.innerText;
                  }
                  if (count == 4) {
                    doctor.speciality = td.innerText;
                  }
                  if (count == 8) {
                    doctor.status = td.innerText;
                  }
                  count++;
                });

                array.push(doctor);
              });

              return array;
            });

            console.log(grabDetails);

            let doctorsList = grabDetails;

            // await browser.close();

            if (doctorsList.length) {
              let verified = false;

              doctorsList.forEach((doctor) => {
                if (doctor.status == "LICENCED") {
                  let licenceNo = doctor.licenceNumber.slice(0, -2);
                  if (results[0].licence_no.startsWith(licenceNo)) {
                    verified = true;
                  }
                }
              });

              if (verified == true) {
                const query2 =
                  "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
                connection.query(
                  query2,
                  ["true", req.body.doctor_id],
                  (err, data) => {
                    if (err) throw err;
                    else {
                      const query3 =
                        "UPDATE chat_rooms SET status = ? WHERE doctor_id =?";
                      connection.query(
                        query3,
                        ["active", req.body.doctor_id],
                        (err, data2) => {
                          if (err) throw err;
                          else {
                            console.log("Verified Successfully");
                            req.session.unverifiedDoctorsMsg =
                              "Doctor Verified Successfully";
                            alertType = "success";
                            return res.redirect(
                              "/admin/view-unverified-doctors"
                            );
                          }
                        }
                      );
                    }
                  }
                );
              } else {
                console.log("Doctor Not Verified");
                req.session.unverifiedDoctorsMsg = "Doctor Not Verifed";
                alertType = "danger";
                return res.redirect("/admin/view-unverified-doctors");
              }
            } else {
              console.log("Doctor Not Verified");
              req.session.unverifiedDoctorsMsg = "Doctor Not Verifed";
              alertType = "danger";
              return res.redirect("/admin/view-unverified-doctors");
            }
          })();
        }
      });
    }
    connection.release();
  });
});

router.get("/view-verified-doctors", (req, res) => {
  if (req.session.authenticated) {
    req.session.unverifiedDoctorsMsg = "";

    pool.getConnection((err, connection) => {
      if (err) throw err;

      const query =
        "SELECT * FROM doctor_details WHERE verification_status = ?";
      connection.query(query, ["true"], (err, results) => {
        if (err) throw err;

        res.render("view-verified-doctors", {
          doctors: results,
          message: req.session.verifiedDoctorsMsg,
          type: alertType,
        });
      });

      connection.release();
    });
  } else {
    return res.redirect("/login");
  }
});

router.post("/view-verified-doctors", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;

    const query =
      "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
    connection.query(query, ["false", req.body.doctor_id], (err, data) => {
      if (err) throw err;
      else {
        const query2 = "UPDATE chat_rooms SET status = ? WHERE doctor_id =?";
        connection.query(
          query2,
          ["inactive", req.body.doctor_id],
          (err, data2) => {
            if (err) throw err;
            else {
              console.log("Unverified Successfully");
              req.session.verifiedDoctorsMsg = "Doctor Unverified Successfully";
              alertType = "success";
              return res.redirect("/admin/view-verified-doctors");
            }
          }
        );
      }
    });

    connection.release();
  });
});

router.get("/subscriptions", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

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
  } else {
    return res.redirect("/login");
  }
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
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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
  } else {
    return res.redirect("/login");
  }
});

router.get("/view-patients", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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
              width: 80,
            },
            {
              id: "location",
              header: "Location",
              width: 80,
            },
            {
              id: "phone_no",
              header: "Phone Number",
              width: 80,
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
  } else {
    return res.redirect("/login");
  }
});

router.post("/view-patients", (req, res) => {
  const getDetails = new Promise((resolve, reject) => {
    let details = [];
    pool.getConnection((err, connection) => {
      if (err) {
        throw err;
      } else {
        const query =
          "SELECT * FROM patient_details WHERE (name like ?) or (gender like ?) or (dob like ?) or (phone_no like ?) or (location like ?)";
        connection.query(
          query,
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
          }
        );
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
            width: 80,
          },
          {
            id: "location",
            header: "Location",
            width: 80,
          },
          {
            id: "phone_no",
            header: "Phone Number",
            width: 80,
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
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

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
  } else {
    return res.redirect("/login");
  }
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

router.get("/view-consultation-payments", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * FROM consultations_stk_push WHERE status = ?";
          connection.query(
            query,
            ["The service request is processed successfully."],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`ALL CONSULTATION PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 70,
            },
            {
              id: "amount",
              header: "Amount",
              width: 70,
            },
            {
              id: "consultation_expiry_time",
              header: "Consultation Expiry",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-consultation-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "all",
          all: "selected",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  } else {
    return res.redirect("/login");
  }
});

router.post("/view-consultation-payments", (req, res) => {
  if (req.body.select == "all") {
    return res.redirect("/admin/view-consultation-payments");
  }

  if (req.body.select == "date") {
    if (req.body.date) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM consultations_stk_push WHERE status = ? AND date = ?";
            connection.query(
              query,
              ["The service request is processed successfully.", req.body.date],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`DATE:  '${req.body.date}'  CONSULTATION PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 70,
              },
              {
                id: "consultation_expiry_time",
                header: "Consultation Expiry",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-consultation-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "date",
            all: "",
            search: "",
            date: "selected",
            month: "",
            year: "",
            lastWeek: "",
            lastMonth: "",
            dateValue: req.body.date,
            monthValue: "",
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      return res.render("view-consultation-payments", {
        pdfName: `${pdfName}.pdf`,
        filterType: "date",
        all: "",
        search: "",
        date: "selected",
        month: "",
        year: "",
        lastWeek: "",
        lastMonth: "",
        dateValue: "",
        monthValue: "",
        yearValue: year,
        paymentsTotal: 0,
        details: [],
      });
    }
  }

  if (req.body.select == "month") {
    if (req.body.month) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM consultations_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + req.body.month + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(
            `MONTH:  '${req.body.month}'  CONSULTATION PAYMENTS REPORT`,
            {
              underline: true,
              width: 595,
              align: "center",
            }
          );

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 70,
              },
              {
                id: "consultation_expiry_time",
                header: "Consultation Expiry",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-consultation-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "month",
            all: "",
            search: "",
            date: "",
            month: "selected",
            year: "",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: req.body.month,
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      return res.render("view-consultation-payments", {
        pdfName: `${pdfName}.pdf`,
        filterType: "month",
        all: "",
        search: "",
        date: "",
        month: "selected",
        year: "",
        lastWeek: "",
        lastMonth: "",
        dateValue: "",
        monthValue: "",
        yearValue: year,
        paymentsTotal: 0,
        details: [],
      });
    }
  }

  if (req.body.select == "year") {
    if (req.body.year) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM consultations_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + req.body.year + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`YEAR:  '${req.body.year}'  CONSULTATION PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 70,
              },
              {
                id: "consultation_expiry_time",
                header: "Consultation Expiry",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-consultation-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "year",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "selected",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: "",
            yearValue: req.body.year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM consultations_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + year + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`YEAR:  '${year}'  CONSULTATION PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 70,
              },
              {
                id: "consultation_expiry_time",
                header: "Consultation Expiry",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-consultation-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "year",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "selected",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    }
  }

  if (req.body.select == "last-week") {
    let d = new Date();
    let y = new Date(d.getTime() - 1440 * 7 * 60000);

    let today =
      d.getFullYear() +
      "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + d.getDate()).slice(-2);
    let date2 =
      y.getFullYear() +
      "-" +
      ("0" + (y.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + y.getDate()).slice(-2);

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query =
            "SELECT * FROM consultations_stk_push WHERE status = ? AND date BETWEEN ? AND ?";
          connection.query(
            query,
            ["The service request is processed successfully.", date2, today],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`'${date2}'  TO  '${today}'  CONSULTATION PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 70,
            },
            {
              id: "amount",
              header: "Amount",
              width: 70,
            },
            {
              id: "consultation_expiry_time",
              header: "Consultation Expiry",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-consultation-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "lastWeek",
          all: "",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "selected",
          lastMonth: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  }

  if (req.body.select == "last-month") {
    let d = new Date();
    let y = new Date(d.getTime() - 1440 * 30 * 60000);

    let today =
      d.getFullYear() +
      "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + d.getDate()).slice(-2);
    let date2 =
      y.getFullYear() +
      "-" +
      ("0" + (y.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + y.getDate()).slice(-2);

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query =
            "SELECT * FROM consultations_stk_push WHERE status = ? AND date BETWEEN ? AND ?";
          connection.query(
            query,
            ["The service request is processed successfully.", date2, today],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`'${date2}'  TO  '${today}'  CONSULTATION PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 70,
            },
            {
              id: "amount",
              header: "Amount",
              width: 70,
            },
            {
              id: "consultation_expiry_time",
              header: "Consultation Expiry",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-consultation-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "lastMonth",
          all: "",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "selected",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  }
});

//////// appointments payments
router.get("/view-appointment-payments", (req, res) => {
  if (req.session.authenticated) {
    req.session.verifiedDoctorsMsg = "";
    req.session.unverifiedDoctorsMsg = "";

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query = "SELECT * FROM appointments_stk_push WHERE status = ?";
          connection.query(
            query,
            ["The service request is processed successfully."],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`ALL APPOINTMENTS PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 60,
            },
            {
              id: "amount",
              header: "Amount",
              width: 50,
            },
            {
              id: "appointment_date",
              header: "Appointment Date",
              width: 70,
            },
            {
              id: "appointment_time",
              header: "Appointment Time",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-appointment-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "all",
          all: "selected",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  } else {
    return res.redirect("/login");
  }
});

router.post("/view-appointment-payments", (req, res) => {
  if (req.body.select == "all") {
    return res.redirect("/admin/view-appointment-payments");
  }

  if (req.body.select == "date") {
    if (req.body.date) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments_stk_push WHERE status = ? AND date = ?";
            connection.query(
              query,
              ["The service request is processed successfully.", req.body.date],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`DATE:  '${req.body.date}'  APPOINTMENT PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 50,
              },
              {
                id: "appointment_date",
                header: "Appointment Date",
                width: 70,
              },
              {
                id: "appointment_time",
                header: "Appointment Time",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-appointment-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "date",
            all: "",
            search: "",
            date: "selected",
            month: "",
            year: "",
            lastWeek: "",
            lastMonth: "",
            dateValue: req.body.date,
            monthValue: "",
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      return res.render("view-appointment-payments", {
        pdfName: `${pdfName}.pdf`,
        filterType: "date",
        all: "",
        search: "",
        date: "selected",
        month: "",
        year: "",
        lastWeek: "",
        lastMonth: "",
        dateValue: "",
        monthValue: "",
        yearValue: year,
        paymentsTotal: 0,
        details: [],
      });
    }
  }

  if (req.body.select == "month") {
    if (req.body.month) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + req.body.month + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`MONTH:  '${req.body.month}'  APPOINTMENT PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 50,
              },
              {
                id: "appointment_date",
                header: "Appointment Date",
                width: 70,
              },
              {
                id: "appointment_time",
                header: "Appointment Time",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-appointment-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "month",
            all: "",
            search: "",
            date: "",
            month: "selected",
            year: "",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: req.body.month,
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      return res.render("view-appointment-payments", {
        pdfName: `${pdfName}.pdf`,
        filterType: "month",
        all: "",
        search: "",
        date: "",
        month: "selected",
        year: "",
        lastWeek: "",
        lastMonth: "",
        dateValue: "",
        monthValue: "",
        yearValue: year,
        paymentsTotal: 0,
        details: [],
      });
    }
  }

  if (req.body.select == "year") {
    if (req.body.year) {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + req.body.year + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`YEAR:  '${req.body.year}'  APPOINTMENT PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 50,
              },
              {
                id: "appointment_date",
                header: "Appointment Date",
                width: 70,
              },
              {
                id: "appointment_time",
                header: "Appointment Time",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-appointment-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "year",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "selected",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: "",
            yearValue: req.body.year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    } else {
      let paymentsTotal = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments_stk_push WHERE status = ? AND (date like ?)";
            connection.query(
              query,
              [
                "The service request is processed successfully.",
                "%" + year + "%",
              ],
              (err, results) => {
                if (err) {
                  throw err;
                } else {
                  if (results.length) {
                    for (let i = 0; i < results.length; i++) {
                      paymentsTotal = paymentsTotal + results[i].amount;

                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [results[i].patient_id],
                        (err, name1) => {
                          if (err) {
                            throw err;
                          } else {
                            results[i].patient_name = name1[0].name;

                            const query3 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query3,
                              [results[i].doctor_id],
                              (err, name2) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].doctor_name = name2[0].name;

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(details);
                                  }
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  } else {
                    resolve(details);
                  }
                }
              }
            );
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
            ("0" + d.getHours()).slice(-2) +
            ":" +
            ("0" + d.getMinutes()).slice(-2);

          var doc = new PdfDocument();
          table = new PdfTable(doc, {
            bottomMargin: 30,
          });

          pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
          doc.pipe(
            fs.createWriteStream(
              path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
            )
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

          doc.text(`YEAR:  '${year}'  APPOINTMENT PAYMENTS REPORT`, {
            underline: true,
            width: 595,
            align: "center",
          });

          doc.moveDown();

          table
            // add some plugins (here, a 'fit-to-width' for a column)
            .addPlugin(
              new (require("voilab-pdf-table/plugins/fitcolumn"))({
                column: "checkout_id",
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
                id: "checkout_id",
                header: "Checkout Id",
                align: "left",
              },
              {
                id: "patient_name",
                header: "Patient's Name",
                width: 70,
              },
              {
                id: "doctor_name",
                header: "Doctor's Name",
                width: 70,
              },
              {
                id: "date",
                header: "Date",
                width: 70,
              },
              {
                id: "amount",
                header: "Amount",
                width: 50,
              },
              {
                id: "appointment_date",
                header: "Appointment Date",
                width: 70,
              },
              {
                id: "appointment_time",
                header: "Appointment Time",
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
          doc.text("Number of payments: " + details.length, 75);
          doc.moveDown();
          doc.text("Total Payments: Kshs " + paymentsTotal, 75);
          doc.end();
          resolve();
        });
        generatePdf.then(() => {
          return res.render("view-appointment-payments", {
            pdfName: `${pdfName}.pdf`,
            filterType: "year",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "selected",
            lastWeek: "",
            lastMonth: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            paymentsTotal: paymentsTotal,
            details: details,
          });
        });
      });
    }
  }

  if (req.body.select == "last-week") {
    let d = new Date();
    let y = new Date(d.getTime() - 1440 * 7 * 60000);

    let today =
      d.getFullYear() +
      "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + d.getDate()).slice(-2);
    let date2 =
      y.getFullYear() +
      "-" +
      ("0" + (y.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + y.getDate()).slice(-2);

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query =
            "SELECT * FROM appointments_stk_push WHERE status = ? AND date BETWEEN ? AND ?";
          connection.query(
            query,
            ["The service request is processed successfully.", date2, today],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`'${date2}'  TO  '${today}'  APPOINTMENT PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 70,
            },
            {
              id: "amount",
              header: "Amount",
              width: 50,
            },
            {
              id: "appointment_date",
              header: "Appointment Date",
              width: 70,
            },
            {
              id: "appointment_time",
              header: "Appointment Time",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-appointment-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "lastWeek",
          all: "",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "selected",
          lastMonth: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  }

  if (req.body.select == "last-month") {
    let d = new Date();
    let y = new Date(d.getTime() - 1440 * 30 * 60000);

    let today =
      d.getFullYear() +
      "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + d.getDate()).slice(-2);
    let date2 =
      y.getFullYear() +
      "-" +
      ("0" + (y.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + y.getDate()).slice(-2);

    let paymentsTotal = 0;
    const getDetails = new Promise((resolve, reject) => {
      let details = [];
      pool.getConnection((err, connection) => {
        if (err) {
          throw err;
        } else {
          const query =
            "SELECT * FROM appointments_stk_push WHERE status = ? AND date BETWEEN ? AND ?";
          connection.query(
            query,
            ["The service request is processed successfully.", date2, today],
            (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    paymentsTotal = paymentsTotal + results[i].amount;

                    const query2 =
                      "SELECT name FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, name1) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].patient_name = name1[0].name;

                          const query3 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query3,
                            [results[i].doctor_id],
                            (err, name2) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].doctor_name = name2[0].name;

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(details);
                                }
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  resolve(details);
                }
              }
            }
          );
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
          ("0" + d.getHours()).slice(-2) +
          ":" +
          ("0" + d.getMinutes()).slice(-2);

        var doc = new PdfDocument();
        table = new PdfTable(doc, {
          bottomMargin: 30,
        });

        pdfName = Math.floor(Math.random() * (999999 - 100000) + 100000);
        doc.pipe(
          fs.createWriteStream(
            path.resolve(__dirname, `../pdfs/${pdfName}.pdf`)
          )
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

        doc.text(`'${date2}'  TO  '${today}'  APPOINTMENT PAYMENTS REPORT`, {
          underline: true,
          width: 595,
          align: "center",
        });

        doc.moveDown();

        table
          // add some plugins (here, a 'fit-to-width' for a column)
          .addPlugin(
            new (require("voilab-pdf-table/plugins/fitcolumn"))({
              column: "checkout_id",
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
              id: "checkout_id",
              header: "Checkout Id",
              align: "left",
            },
            {
              id: "patient_name",
              header: "Patient's Name",
              width: 70,
            },
            {
              id: "doctor_name",
              header: "Doctor's Name",
              width: 70,
            },
            {
              id: "date",
              header: "Date",
              width: 70,
            },
            {
              id: "amount",
              header: "Amount",
              width: 50,
            },
            {
              id: "appointment_date",
              header: "Appointment Date",
              width: 70,
            },
            {
              id: "appointment_time",
              header: "Appointment Time",
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
        doc.text("Number of payments: " + details.length, 75);
        doc.moveDown();
        doc.text("Total Payments: Kshs " + paymentsTotal, 75);
        doc.end();
        resolve();
      });
      generatePdf.then(() => {
        return res.render("view-appointment-payments", {
          pdfName: `${pdfName}.pdf`,
          filterType: "lastMonth",
          all: "",
          search: "",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "selected",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          paymentsTotal: paymentsTotal,
          details: details,
        });
      });
    });
  }
});

module.exports = router;
