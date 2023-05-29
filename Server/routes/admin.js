const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

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
                        totalCount: consultationsCount+appointmentsCount,
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
          patientsData.sort((a,b)=> b.totalEngagements-a.totalEngagements);
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

module.exports = router;
