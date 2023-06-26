const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

const yearDate = new Date();
let year = yearDate.getFullYear();

var PdfTable = require("voilab-pdf-table");
var PdfDocument = require("pdfkit");

const fs = require("fs");

let pdfName = "";

router.get("/", (req, res) => {
  return res.render("records-menu");
});

router.get("/appointment-records", (req, res) => {
  if (req.session.authenticated) {
    if (req.session.accountType == "patient") {
      //// patient account
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC, time ASC";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].doctor_id],
                      (err, data) => {
                        if (err) {
                          throw err;
                        } else {
                          results[i].name = data[0].name;
                          results[i].cancer_speciality =
                            data[0].cancer_speciality;
                          results[i].clinic_location = data[0].clinic_location;
                          results[i].clinic_email = data[0].clinic_email;
                          results[i].clinic_phone_no = data[0].clinic_phone_no;

                          const date = new Date(results[i].date);
                          let time = results[i].time;
                          date.setHours(time.slice(0, 2), time.slice(3, 5));

                          const nowDate = new Date();

                          if (nowDate.getTime() > date.getTime()) {
                            results[i].status = "completed";
                          } else {
                            results[i].status = "scheduled";
                          }

                          let d = new Date();
                          let y = new Date(d.getTime() - 1440 * 60000);
                          let t = new Date(d.getTime() + 1440 * 60000);

                          let todate =
                            d.getFullYear() +
                            "-" +
                            ("0" + (d.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + d.getDate()).slice(-2);
                          let yesterday =
                            y.getFullYear() +
                            "-" +
                            ("0" + (y.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + y.getDate()).slice(-2);
                          let tomorrow =
                            t.getFullYear() +
                            "-" +
                            ("0" + (t.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + t.getDate()).slice(-2);

                          if (results[i].date == todate) {
                            results[i].date = "Today";
                          } else if (results[i].date == yesterday) {
                            results[i].date = "Yesterday";
                          } else if (results[i].date == tomorrow) {
                            results[i].date = "Tomorrow";
                          }

                          details.push(results[i]);

                          if (i == results.length - 1) {
                            console.log(details);
                            resolve(details);
                          }
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
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query = "SELECT email FROM users WHERE user_id=?";
              connection.query(query, [req.session.userId], (err, email) => {
                if (err) {
                  throw err;
                } else {
                  const query2 =
                    "SELECT * FROM patient_details WHERE user_id=?";
                  connection.query(
                    query2,
                    [req.session.userId],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
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

                        pdfName = Math.floor(
                          Math.random() * (999999 - 100000) + 100000
                        );
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
                        doc.text(
                          `NAME:            ${results[0].name}`,
                          75,
                          180
                        );

                        doc.moveDown();
                        doc.text(`EMAIL:           ${email[0].email}`);

                        doc.moveDown();
                        doc.text(`PHONE NO:    ${results[0].phone_no}`);

                        doc.moveDown();
                        doc.text(`LOCATION:    ${results[0].location}`);

                        doc.text("", 0);
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();

                        doc.font("Times-Bold");
                        doc.fontSize(13);

                        doc.text("ALL APPOINTMENTS REPORT", {
                          underline: true,
                          width: 595,
                          align: "center",
                        });

                        doc.moveDown();

                        table
                          // add some plugins (here, a 'fit-to-width' for a column)
                          .addPlugin(
                            new (require("voilab-pdf-table/plugins/fitcolumn"))(
                              {
                                column: "name",
                              }
                            )
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
                              id: "date",
                              header: "Date",
                              width: 100,
                            },
                            {
                              id: "time",
                              header: "Time",
                              width: 100,
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
                        doc.text(
                          "Number of appointments: " + details.length,
                          75
                        );

                        doc.end();
                        resolve();
                      }
                    }
                  );
                }
              });
            }
            connection.release();
          });
        });
        generatePdf.then(() => {
          return res.render("appointment-records", {
            pdfName: `${pdfName}.pdf`,
            accountType: req.session.accountType,
            filterType: "all",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "",
            lastWeek: "",
            nextWeek: "",
            lastMonth: "",
            nextMonth: "",
            searchValue: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            details: details,
          });
        });
      });
    } else {
      /// doctor account
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date ASC, time ASC";
            connection.query(query, [req.session.userId], (err, results) => {
              if (err) {
                throw err;
              } else {
                if (results.length) {
                  for (let i = 0; i < results.length; i++) {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id = ?";
                    connection.query(
                      query2,
                      [results[i].patient_id],
                      (err, data) => {
                        if (err) {
                          throw err;
                        } else {
                          data[0].appointment_id = results[i].appointment_id;
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

                          let d = new Date();
                          let y = new Date(d.getTime() - 1440 * 60000);
                          let t = new Date(d.getTime() + 1440 * 60000);

                          let todate =
                            d.getFullYear() +
                            "-" +
                            ("0" + (d.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + d.getDate()).slice(-2);
                          let yesterday =
                            y.getFullYear() +
                            "-" +
                            ("0" + (y.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + y.getDate()).slice(-2);
                          let tomorrow =
                            t.getFullYear() +
                            "-" +
                            ("0" + (t.getMonth() + 1)).slice(-2) +
                            "-" +
                            ("0" + t.getDate()).slice(-2);

                          if (data[0].date == todate) {
                            data[0].date = "Today";
                          } else if (data[0].date == yesterday) {
                            data[0].date = "Yesterday";
                          } else if (data[0].date == tomorrow) {
                            data[0].date = "Tomorrow";
                          }

                          details.push(data[0]);

                          if (i == results.length - 1) {
                            console.log(details);
                            resolve(details);
                          }
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
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query = "SELECT email FROM users WHERE user_id=?";
              connection.query(query, [req.session.userId], (err, email) => {
                if (err) {
                  throw err;
                } else {
                  const query2 = "SELECT * FROM doctor_details WHERE user_id=?";
                  connection.query(
                    query2,
                    [req.session.userId],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
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

                        pdfName = Math.floor(
                          Math.random() * (999999 - 100000) + 100000
                        );
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
                        doc.text(
                          `NAME:            ${results[0].name}`,
                          75,
                          180
                        );

                        doc.moveDown();
                        doc.text(`EMAIL:           ${email[0].email}`);

                        doc.moveDown();
                        doc.text(`PHONE NO:    ${results[0].phone_no}`);

                        doc.moveDown();
                        doc.text(`LOCATION:    ${results[0].clinic_location}`);

                        doc.text("", 0);
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();

                        doc.font("Times-Bold");
                        doc.fontSize(13);

                        doc.text("ALL APPOINTMENTS REPORT", {
                          underline: true,
                          width: 595,
                          align: "center",
                        });

                        doc.moveDown();

                        table
                          // add some plugins (here, a 'fit-to-width' for a column)
                          .addPlugin(
                            new (require("voilab-pdf-table/plugins/fitcolumn"))(
                              {
                                column: "name",
                              }
                            )
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
                              id: "date",
                              header: "Date",
                              width: 100,
                            },
                            {
                              id: "time",
                              header: "Time",
                              width: 100,
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
                        doc.text(
                          "Number of appointments: " + details.length,
                          75
                        );

                        doc.end();
                        resolve();
                      }
                    }
                  );
                }
              });
            }
            connection.release();
          });
        });
        generatePdf.then(() => {
          return res.render("appointment-records", {
            pdfName: `${pdfName}.pdf`,
            accountType: req.session.accountType,
            filterType: "all",
            all: "",
            search: "",
            date: "",
            month: "",
            year: "",
            lastWeek: "",
            nextWeek: "",
            lastMonth: "",
            nextMonth: "",
            searchValue: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            details: details,
          });
        });
      });
    }
  } else {
    return res.redirect("/login");
  }
});

router.post("/filter-appointment-records", (req, res) => {
  if (req.body.select == "all") {
    return res.redirect("/records/appointment-records");
  }

  ///// text search
  else if (req.body.select == "search") {
    console.log(req.body);
    if (req.body.search) {
      if (req.session.authenticated) {
        if (req.session.accountType == "patient") {
          ////patient account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM doctor_details WHERE (name like ?) or (gender like ?) or (licence_no like ?) or (cancer_speciality like ?) or (clinic_location like ?) or (clinic_phone_no like ?) or (clinic_email like ?)";
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
                  ],
                  (err, doctors) => {
                    if (err) {
                      throw err;
                    } else {
                      if (doctors.length) {
                        for (let i = 0; i < doctors.length; i++) {
                          const query2 =
                            "SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY date ASC, time ASC";
                          connection.query(
                            query2,
                            [req.session.userId, doctors[i].user_id],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results.length) {
                                  for (let j = 0; j < results.length; j++) {
                                    results[j].name = doctors[i].name;
                                    results[j].cancer_speciality =
                                      doctors[i].cancer_speciality;
                                    results[j].clinic_location =
                                      doctors[i].clinic_location;
                                    results[j].clinic_email =
                                      doctors[i].clinic_email;
                                    results[j].clinic_phone_no =
                                      doctors[i].clinic_phone_no;

                                    const date = new Date(results[j].date);
                                    let time = results[j].time;
                                    date.setHours(
                                      time.slice(0, 2),
                                      time.slice(3, 5)
                                    );

                                    const nowDate = new Date();

                                    if (nowDate.getTime() > date.getTime()) {
                                      results[j].status = "completed";
                                    } else {
                                      results[j].status = "scheduled";
                                    }

                                    let d = new Date();
                                    let y = new Date(
                                      d.getTime() - 1440 * 60000
                                    );
                                    let t = new Date(
                                      d.getTime() + 1440 * 60000
                                    );

                                    let todate =
                                      d.getFullYear() +
                                      "-" +
                                      ("0" + (d.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + d.getDate()).slice(-2);
                                    let yesterday =
                                      y.getFullYear() +
                                      "-" +
                                      ("0" + (y.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + y.getDate()).slice(-2);
                                    let tomorrow =
                                      t.getFullYear() +
                                      "-" +
                                      ("0" + (t.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + t.getDate()).slice(-2);

                                    if (results[j].date == todate) {
                                      results[j].date = "Today";
                                    } else if (results[j].date == yesterday) {
                                      results[j].date = "Yesterday";
                                    } else if (results[j].date == tomorrow) {
                                      results[j].date = "Tomorrow";
                                    }

                                    details.push(results[j]);

                                    if (j == results.length - 1) {
                                      console.log(details);
                                      resolve(details);
                                    }
                                  }
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `APPOINTMENTS'  '${req.body.search}'  SEARCH RESULTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "search",
                all: "",
                search: "selected",
                date: "",
                month: "",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: req.body.search,
                dateValue: "",
                monthValue: "",
                yearValue: year,
                details: details,
              });
            });
          });
        } else {
          ///// doctor account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM patient_details WHERE (name like ?) or (gender like ?) or (location like ?) or (cancer_type like ?) or (cancer_stage like ?) or (lifestyle_diseases like ?) or (phone_no like ?)";
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
                  ],
                  (err, patients) => {
                    if (err) {
                      throw err;
                    } else {
                      if (patients.length) {
                        for (let i = 0; i < patients.length; i++) {
                          const query2 =
                            "SELECT * FROM appointments WHERE doctor_id = ? AND patient_id = ? ORDER BY date ASC, time ASC";
                          connection.query(
                            query2,
                            [req.session.userId, patients[i].user_id],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results.length) {
                                  for (let j = 0; j < results.length; j++) {
                                    results[j].name = patients[i].name;
                                    results[j].gender = patients[i].gender;
                                    results[j].dob = patients[i].dob;
                                    results[j].cancer_type =
                                      patients[i].cancer_type;
                                    results[j].cancer_stage =
                                      patients[i].cancer_stage;
                                    results[j].lifestyle_diseases =
                                      patients[i].lifestyle_diseases;
                                    results[j].phone_no = patients[i].phone_no;
                                    results[j].location = patients[i].location;

                                    const date = new Date(results[j].date);
                                    let time = results[j].time;
                                    date.setHours(
                                      time.slice(0, 2),
                                      time.slice(3, 5)
                                    );

                                    const nowDate = new Date();

                                    if (nowDate.getTime() > date.getTime()) {
                                      results[j].status = "completed";
                                    } else {
                                      results[j].status = "scheduled";
                                    }

                                    let d = new Date();
                                    let y = new Date(
                                      d.getTime() - 1440 * 60000
                                    );
                                    let t = new Date(
                                      d.getTime() + 1440 * 60000
                                    );

                                    let todate =
                                      d.getFullYear() +
                                      "-" +
                                      ("0" + (d.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + d.getDate()).slice(-2);
                                    let yesterday =
                                      y.getFullYear() +
                                      "-" +
                                      ("0" + (y.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + y.getDate()).slice(-2);
                                    let tomorrow =
                                      t.getFullYear() +
                                      "-" +
                                      ("0" + (t.getMonth() + 1)).slice(-2) +
                                      "-" +
                                      ("0" + t.getDate()).slice(-2);

                                    if (results[j].date == todate) {
                                      results[j].date = "Today";
                                    } else if (results[j].date == yesterday) {
                                      results[j].date = "Yesterday";
                                    } else if (results[j].date == tomorrow) {
                                      results[j].date = "Tomorrow";
                                    }

                                    details.push(results[j]);

                                    if (j == results.length - 1) {
                                      console.log(details);
                                      resolve(details);
                                    }
                                  }
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(
                                `LOCATION:    ${results[0].clinic_location}`
                              );

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `APPOINTMENTS'  '${req.body.search}'  SEARCH RESULTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "search",
                all: "",
                search: "selected",
                date: "",
                month: "",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: req.body.search,
                dateValue: "",
                monthValue: "",
                yearValue: year,
                details: details,
              });
            });
          });
        }
      } else {
        return res.redirect("/login");
      }
    } else {
      if (req.session.authenticated) {
        return res.render("appointment-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "search",
          all: "",
          search: "selected",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          nextWeek: "",
          lastMonth: "",
          nextMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          details: {},
        });
      } else {
        return res.redirect("/login");
      }
    }
  }

  ///// date search
  else if (req.body.select == "date") {
    console.log(req.body);
    if (req.body.date) {
      if (req.session.authenticated) {
        if (req.session.accountType == "patient") {
          //// patient account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE patient_id = ? and date = ? ORDER BY time ASC";
                connection.query(
                  query,
                  [req.session.userId, req.body.date],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = data[0].name;
                                results[i].cancer_speciality =
                                  data[0].cancer_speciality;
                                results[i].clinic_location =
                                  data[0].clinic_location;
                                results[i].clinic_email = data[0].clinic_email;
                                results[i].clinic_phone_no =
                                  data[0].clinic_phone_no;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  results[i].status = "completed";
                                } else {
                                  results[i].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (results[i].date == todate) {
                                  results[i].date = "Today";
                                } else if (results[i].date == yesterday) {
                                  results[i].date = "Yesterday";
                                } else if (results[i].date == tomorrow) {
                                  results[i].date = "Tomorrow";
                                }

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `DATE: ${req.body.date} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "date",
                all: "",
                search: "",
                date: "selected",
                month: "",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: req.body.date,
                monthValue: "",
                yearValue: year,
                details: details,
              });
            });
          });
        } else {
          /// doctor account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE doctor_id = ? and date = ? ORDER BY time ASC";
                connection.query(
                  query,
                  [req.session.userId, req.body.date],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                data[0].appointment_id =
                                  results[i].appointment_id;
                                data[0].date = results[i].date;
                                data[0].time = results[i].time;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  data[0].status = "completed";
                                } else {
                                  data[0].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (data[0].date == todate) {
                                  data[0].date = "Today";
                                } else if (data[0].date == yesterday) {
                                  data[0].date = "Yesterday";
                                } else if (data[0].date == tomorrow) {
                                  data[0].date = "Tomorrow";
                                }

                                details.push(data[0]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(
                                `LOCATION:    ${results[0].clinic_location}`
                              );

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `DATE: ${req.body.date} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "date",
                all: "",
                search: "",
                date: "selected",
                month: "",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: req.body.date,
                monthValue: "",
                yearValue: year,
                details: details,
              });
            });
          });
        }
      } else {
        return res.redirect("/login");
      }
    } else {
      if (req.session.authenticated) {
        return res.render("appointment-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "date",
          all: "",
          search: "",
          date: "selected",
          month: "",
          year: "",
          lastWeek: "",
          nextWeek: "",
          lastMonth: "",
          nextMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          details: {},
        });
      } else {
        return res.redirect("/login");
      }
    }
  }

  //////// month search
  else if (req.body.select == "month") {
    console.log(req.body);
    if (req.body.month) {
      if (req.session.authenticated) {
        if (req.session.accountType == "patient") {
          //// patient account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE patient_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                connection.query(
                  query,
                  [req.session.userId, "%" + req.body.month + "%"],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = data[0].name;
                                results[i].cancer_speciality =
                                  data[0].cancer_speciality;
                                results[i].clinic_location =
                                  data[0].clinic_location;
                                results[i].clinic_email = data[0].clinic_email;
                                results[i].clinic_phone_no =
                                  data[0].clinic_phone_no;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  results[i].status = "completed";
                                } else {
                                  results[i].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (results[i].date == todate) {
                                  results[i].date = "Today";
                                } else if (results[i].date == yesterday) {
                                  results[i].date = "Yesterday";
                                } else if (results[i].date == tomorrow) {
                                  results[i].date = "Tomorrow";
                                }

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `MONTH: ${req.body.month} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "month",
                all: "",
                search: "",
                date: "",
                month: "selected",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: req.body.month,
                yearValue: year,
                details: details,
              });
            });
          });
        } else {
          /// doctor account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE doctor_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                connection.query(
                  query,
                  [req.session.userId, "%" + req.body.month + "%"],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                data[0].appointment_id =
                                  results[i].appointment_id;
                                data[0].date = results[i].date;
                                data[0].time = results[i].time;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  data[0].status = "completed";
                                } else {
                                  data[0].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (data[0].date == todate) {
                                  data[0].date = "Today";
                                } else if (data[0].date == yesterday) {
                                  data[0].date = "Yesterday";
                                } else if (data[0].date == tomorrow) {
                                  data[0].date = "Tomorrow";
                                }

                                details.push(data[0]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(
                                `LOCATION:    ${results[0].clinic_location}`
                              );

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `MONTH: ${req.body.month} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "month",
                all: "",
                search: "",
                date: "",
                month: "selected",
                year: "",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: req.body.month,
                yearValue: year,
                details: details,
              });
            });
          });
        }
      } else {
        return res.redirect("/login");
      }
    } else {
      if (req.session.authenticated) {
        return res.render("appointment-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "month",
          all: "",
          search: "",
          date: "",
          month: "selected",
          year: "",
          lastWeek: "",
          nextWeek: "",
          lastMonth: "",
          nextMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          details: {},
        });
      } else {
        return res.redirect("/login");
      }
    }
  }

  /////  year search
  else if (req.body.select == "year") {
    if (req.body.year) {
      if (req.session.authenticated) {
        if (req.session.accountType == "patient") {
          //// patient account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE patient_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                connection.query(
                  query,
                  [req.session.userId, "%" + req.body.year + "%"],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = data[0].name;
                                results[i].cancer_speciality =
                                  data[0].cancer_speciality;
                                results[i].clinic_location =
                                  data[0].clinic_location;
                                results[i].clinic_email = data[0].clinic_email;
                                results[i].clinic_phone_no =
                                  data[0].clinic_phone_no;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  results[i].status = "completed";
                                } else {
                                  results[i].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (results[i].date == todate) {
                                  results[i].date = "Today";
                                } else if (results[i].date == yesterday) {
                                  results[i].date = "Yesterday";
                                } else if (results[i].date == tomorrow) {
                                  results[i].date = "Tomorrow";
                                }

                                details.push(results[i]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR: ${req.body.year} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: req.body.year,
                details: details,
              });
            });
          });
        } else {
          /// doctor account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments WHERE doctor_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                connection.query(
                  query,
                  [req.session.userId, "%" + req.body.year + "%"],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT * FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, data) => {
                              if (err) {
                                throw err;
                              } else {
                                data[0].appointment_id =
                                  results[i].appointment_id;
                                data[0].date = results[i].date;
                                data[0].time = results[i].time;

                                const date = new Date(results[i].date);
                                let time = results[i].time;
                                date.setHours(
                                  time.slice(0, 2),
                                  time.slice(3, 5)
                                );

                                const nowDate = new Date();

                                if (nowDate.getTime() > date.getTime()) {
                                  data[0].status = "completed";
                                } else {
                                  data[0].status = "scheduled";
                                }

                                let d = new Date();
                                let y = new Date(d.getTime() - 1440 * 60000);
                                let t = new Date(d.getTime() + 1440 * 60000);

                                let todate =
                                  d.getFullYear() +
                                  "-" +
                                  ("0" + (d.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + d.getDate()).slice(-2);
                                let yesterday =
                                  y.getFullYear() +
                                  "-" +
                                  ("0" + (y.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + y.getDate()).slice(-2);
                                let tomorrow =
                                  t.getFullYear() +
                                  "-" +
                                  ("0" + (t.getMonth() + 1)).slice(-2) +
                                  "-" +
                                  ("0" + t.getDate()).slice(-2);

                                if (data[0].date == todate) {
                                  data[0].date = "Today";
                                } else if (data[0].date == yesterday) {
                                  data[0].date = "Yesterday";
                                } else if (data[0].date == tomorrow) {
                                  data[0].date = "Tomorrow";
                                }

                                details.push(data[0]);

                                if (i == results.length - 1) {
                                  console.log(details);
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(
                                `LOCATION:    ${results[0].clinic_location}`
                              );

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR: ${req.body.year} APPOINTMENTS  REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "date",
                                    header: "Date",
                                    width: 100,
                                  },
                                  {
                                    id: "time",
                                    header: "Time",
                                    width: 100,
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
                              doc.text(
                                "Number of appointments: " + details.length,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("appointment-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                nextWeek: "",
                lastMonth: "",
                nextMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: req.body.year,
                details: details,
              });
            });
          });
        }
      } else {
        return res.redirect("/login");
      }
    } else {
      if (req.session.authenticated) {
        if (req.session.authenticated) {
          if (req.session.accountType == "patient") {
            //// patient account
            const getDetails = new Promise((resolve, reject) => {
              let details = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments WHERE patient_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                  connection.query(
                    query,
                    [req.session.userId, "%" + year + "%"],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT * FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, data) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = data[0].name;
                                  results[i].cancer_speciality =
                                    data[0].cancer_speciality;
                                  results[i].clinic_location =
                                    data[0].clinic_location;
                                  results[i].clinic_email =
                                    data[0].clinic_email;
                                  results[i].clinic_phone_no =
                                    data[0].clinic_phone_no;

                                  const date = new Date(results[i].date);
                                  let time = results[i].time;
                                  date.setHours(
                                    time.slice(0, 2),
                                    time.slice(3, 5)
                                  );

                                  const nowDate = new Date();

                                  if (nowDate.getTime() > date.getTime()) {
                                    results[i].status = "completed";
                                  } else {
                                    results[i].status = "scheduled";
                                  }

                                  let d = new Date();
                                  let y = new Date(d.getTime() - 1440 * 60000);
                                  let t = new Date(d.getTime() + 1440 * 60000);

                                  let todate =
                                    d.getFullYear() +
                                    "-" +
                                    ("0" + (d.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + d.getDate()).slice(-2);
                                  let yesterday =
                                    y.getFullYear() +
                                    "-" +
                                    ("0" + (y.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + y.getDate()).slice(-2);
                                  let tomorrow =
                                    t.getFullYear() +
                                    "-" +
                                    ("0" + (t.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + t.getDate()).slice(-2);

                                  if (results[i].date == todate) {
                                    results[i].date = "Today";
                                  } else if (results[i].date == yesterday) {
                                    results[i].date = "Yesterday";
                                  } else if (results[i].date == tomorrow) {
                                    results[i].date = "Tomorrow";
                                  }

                                  details.push(results[i]);

                                  if (i == results.length - 1) {
                                    console.log(details);
                                    resolve(details);
                                  }
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
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT email FROM users WHERE user_id=?";
                    connection.query(
                      query,
                      [req.session.userId],
                      (err, email) => {
                        if (err) {
                          throw err;
                        } else {
                          const query2 =
                            "SELECT * FROM patient_details WHERE user_id=?";
                          connection.query(
                            query2,
                            [req.session.userId],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
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

                                doc.pipe(
                                  fs.createWriteStream(
                                    path.resolve(
                                      __dirname,
                                      "../pdfs/example.pdf"
                                    )
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
                                doc.text(
                                  `NAME:            ${results[0].name}`,
                                  75,
                                  180
                                );

                                doc.moveDown();
                                doc.text(`EMAIL:           ${email[0].email}`);

                                doc.moveDown();
                                doc.text(`PHONE NO:    ${results[0].phone_no}`);

                                doc.moveDown();
                                doc.text(`LOCATION:    ${results[0].location}`);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();

                                doc.font("Times-Bold");
                                doc.fontSize(13);

                                doc.text(`YEAR: ${year} APPOINTMENTS  REPORT`, {
                                  underline: true,
                                  width: 595,
                                  align: "center",
                                });

                                doc.moveDown();

                                table
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      id: "date",
                                      header: "Date",
                                      width: 100,
                                    },
                                    {
                                      id: "time",
                                      header: "Time",
                                      width: 100,
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
                                doc.text(
                                  "Number of appointments: " + details.length,
                                  75
                                );

                                doc.end();
                                resolve();
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
              generatePdf.then(() => {
                return res.render("appointment-records", {
                  pdfName: `${pdfName}.pdf`,
                  accountType: req.session.accountType,
                  filterType: "year",
                  all: "",
                  search: "",
                  date: "",
                  month: "",
                  year: "selected",
                  lastWeek: "",
                  nextWeek: "",
                  lastMonth: "",
                  nextMonth: "",
                  searchValue: "",
                  dateValue: "",
                  monthValue: "",
                  yearValue: year,
                  details: details,
                });
              });
            });
          } else {
            /// doctor account
            const getDetails = new Promise((resolve, reject) => {
              let details = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments WHERE doctor_id = ? AND (date like ?) ORDER BY date ASC, time ASC";
                  connection.query(
                    query,
                    [req.session.userId, "%" + year + "%"],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT * FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, data) => {
                                if (err) {
                                  throw err;
                                } else {
                                  data[0].appointment_id =
                                    results[i].appointment_id;
                                  data[0].date = results[i].date;
                                  data[0].time = results[i].time;

                                  const date = new Date(results[i].date);
                                  let time = results[i].time;
                                  date.setHours(
                                    time.slice(0, 2),
                                    time.slice(3, 5)
                                  );

                                  const nowDate = new Date();

                                  if (nowDate.getTime() > date.getTime()) {
                                    data[0].status = "completed";
                                  } else {
                                    data[0].status = "scheduled";
                                  }

                                  let d = new Date();
                                  let y = new Date(d.getTime() - 1440 * 60000);
                                  let t = new Date(d.getTime() + 1440 * 60000);

                                  let todate =
                                    d.getFullYear() +
                                    "-" +
                                    ("0" + (d.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + d.getDate()).slice(-2);
                                  let yesterday =
                                    y.getFullYear() +
                                    "-" +
                                    ("0" + (y.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + y.getDate()).slice(-2);
                                  let tomorrow =
                                    t.getFullYear() +
                                    "-" +
                                    ("0" + (t.getMonth() + 1)).slice(-2) +
                                    "-" +
                                    ("0" + t.getDate()).slice(-2);

                                  if (data[0].date == todate) {
                                    data[0].date = "Today";
                                  } else if (data[0].date == yesterday) {
                                    data[0].date = "Yesterday";
                                  } else if (data[0].date == tomorrow) {
                                    data[0].date = "Tomorrow";
                                  }

                                  details.push(data[0]);

                                  if (i == results.length - 1) {
                                    console.log(details);
                                    resolve(details);
                                  }
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
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT email FROM users WHERE user_id=?";
                    connection.query(
                      query,
                      [req.session.userId],
                      (err, email) => {
                        if (err) {
                          throw err;
                        } else {
                          const query2 =
                            "SELECT * FROM doctor_details WHERE user_id=?";
                          connection.query(
                            query2,
                            [req.session.userId],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
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

                                doc.pipe(
                                  fs.createWriteStream(
                                    path.resolve(
                                      __dirname,
                                      "../pdfs/example.pdf"
                                    )
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
                                doc.text(
                                  `NAME:            ${results[0].name}`,
                                  75,
                                  180
                                );

                                doc.moveDown();
                                doc.text(`EMAIL:           ${email[0].email}`);

                                doc.moveDown();
                                doc.text(`PHONE NO:    ${results[0].phone_no}`);

                                doc.moveDown();
                                doc.text(
                                  `LOCATION:    ${results[0].clinic_location}`
                                );

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();

                                doc.font("Times-Bold");
                                doc.fontSize(13);

                                doc.text(`YEAR: ${year} APPOINTMENTS  REPORT`, {
                                  underline: true,
                                  width: 595,
                                  align: "center",
                                });

                                doc.moveDown();

                                table
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      id: "date",
                                      header: "Date",
                                      width: 100,
                                    },
                                    {
                                      id: "time",
                                      header: "Time",
                                      width: 100,
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
                                doc.text(
                                  "Number of appointments: " + details.length,
                                  75
                                );

                                doc.end();
                                resolve();
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
              generatePdf.then(() => {
                return res.render("appointment-records", {
                  pdfName: `${pdfName}.pdf`,
                  accountType: req.session.accountType,
                  filterType: "year",
                  all: "",
                  search: "",
                  date: "",
                  month: "",
                  year: "selected",
                  lastWeek: "",
                  nextWeek: "",
                  lastMonth: "",
                  nextMonth: "",
                  searchValue: "",
                  dateValue: "",
                  monthValue: "",
                  yearValue: year,
                  details: details,
                });
              });
            });
          }
        } else {
          return res.redirect("/login");
        }
      } else {
        return res.redirect("/login");
      }
    }
  }

  ///////last week search
  else if (req.body.select == "last-week") {
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

    if (req.session.authenticated) {
      if (req.session.accountType == "patient") {
        //// patient account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE patient_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, date2, today],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].doctor_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = data[0].name;
                              results[i].cancer_speciality =
                                data[0].cancer_speciality;
                              results[i].clinic_location =
                                data[0].clinic_location;
                              results[i].clinic_email = data[0].clinic_email;
                              results[i].clinic_phone_no =
                                data[0].clinic_phone_no;

                              const date = new Date(results[i].date);
                              let time = results[i].time;
                              date.setHours(time.slice(0, 2), time.slice(3, 5));

                              const nowDate = new Date();

                              if (nowDate.getTime() > date.getTime()) {
                                results[i].status = "completed";
                              } else {
                                results[i].status = "scheduled";
                              }

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (results[i].date == todate) {
                                results[i].date = "Today";
                              } else if (results[i].date == yesterday) {
                                results[i].date = "Yesterday";
                              } else if (results[i].date == tomorrow) {
                                results[i].date = "Tomorrow";
                              }

                              details.push(results[i]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "selected",
              nextWeek: "",
              lastMonth: "",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      } else {
        /// doctor account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE doctor_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, date2, today],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].patient_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              data[0].appointment_id =
                                results[i].appointment_id;
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

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (data[0].date == todate) {
                                data[0].date = "Today";
                              } else if (data[0].date == yesterday) {
                                data[0].date = "Yesterday";
                              } else if (data[0].date == tomorrow) {
                                data[0].date = "Tomorrow";
                              }

                              details.push(data[0]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(
                            `LOCATION:    ${results[0].clinic_location}`
                          );

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "selected",
              nextWeek: "",
              lastMonth: "",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      }
    } else {
      return res.redirect("/login");
    }
  }

  ////// next week search
  else if (req.body.select == "next-week") {
    let d = new Date();
    let y = new Date(d.getTime() + 1440 * 7 * 60000);

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

    if (req.session.authenticated) {
      if (req.session.accountType == "patient") {
        //// patient account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE patient_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, today, date2],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].doctor_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = data[0].name;
                              results[i].cancer_speciality =
                                data[0].cancer_speciality;
                              results[i].clinic_location =
                                data[0].clinic_location;
                              results[i].clinic_email = data[0].clinic_email;
                              results[i].clinic_phone_no =
                                data[0].clinic_phone_no;

                              const date = new Date(results[i].date);
                              let time = results[i].time;
                              date.setHours(time.slice(0, 2), time.slice(3, 5));

                              const nowDate = new Date();

                              if (nowDate.getTime() > date.getTime()) {
                                results[i].status = "completed";
                              } else {
                                results[i].status = "scheduled";
                              }

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (results[i].date == todate) {
                                results[i].date = "Today";
                              } else if (results[i].date == yesterday) {
                                results[i].date = "Yesterday";
                              } else if (results[i].date == tomorrow) {
                                results[i].date = "Tomorrow";
                              }

                              details.push(results[i]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${today}'  TO  '${date2}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "nextWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "selected",
              lastMonth: "",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      } else {
        /// doctor account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE doctor_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, today, date2],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].patient_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              data[0].appointment_id =
                                results[i].appointment_id;
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

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (data[0].date == todate) {
                                data[0].date = "Today";
                              } else if (data[0].date == yesterday) {
                                data[0].date = "Yesterday";
                              } else if (data[0].date == tomorrow) {
                                data[0].date = "Tomorrow";
                              }

                              details.push(data[0]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(
                            `LOCATION:    ${results[0].clinic_location}`
                          );

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${today}'  TO  '${date2}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "nextWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "selected",
              lastMonth: "",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      }
    } else {
      return res.redirect("/login");
    }
  }

  ////// last month search
  else if (req.body.select == "last-month") {
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

    if (req.session.authenticated) {
      if (req.session.accountType == "patient") {
        //// patient account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE patient_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, date2, today],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].doctor_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = data[0].name;
                              results[i].cancer_speciality =
                                data[0].cancer_speciality;
                              results[i].clinic_location =
                                data[0].clinic_location;
                              results[i].clinic_email = data[0].clinic_email;
                              results[i].clinic_phone_no =
                                data[0].clinic_phone_no;

                              const date = new Date(results[i].date);
                              let time = results[i].time;
                              date.setHours(time.slice(0, 2), time.slice(3, 5));

                              const nowDate = new Date();

                              if (nowDate.getTime() > date.getTime()) {
                                results[i].status = "completed";
                              } else {
                                results[i].status = "scheduled";
                              }

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (results[i].date == todate) {
                                results[i].date = "Today";
                              } else if (results[i].date == yesterday) {
                                results[i].date = "Yesterday";
                              } else if (results[i].date == tomorrow) {
                                results[i].date = "Tomorrow";
                              }

                              details.push(results[i]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "",
              lastMonth: "selected",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      } else {
        /// doctor account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE doctor_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, date2, today],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].patient_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              data[0].appointment_id =
                                results[i].appointment_id;
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

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (data[0].date == todate) {
                                data[0].date = "Today";
                              } else if (data[0].date == yesterday) {
                                data[0].date = "Yesterday";
                              } else if (data[0].date == tomorrow) {
                                data[0].date = "Tomorrow";
                              }

                              details.push(data[0]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(
                            `LOCATION:    ${results[0].clinic_location}`
                          );

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "",
              lastMonth: "selected",
              nextMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      }
    } else {
      return res.redirect("/login");
    }
  }

  ////// next month search
  else if (req.body.select == "next-month") {
    let d = new Date();
    let y = new Date(d.getTime() + 1440 * 30 * 60000);

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

    if (req.session.authenticated) {
      if (req.session.accountType == "patient") {
        //// patient account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE patient_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, today, date2],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].doctor_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = data[0].name;
                              results[i].cancer_speciality =
                                data[0].cancer_speciality;
                              results[i].clinic_location =
                                data[0].clinic_location;
                              results[i].clinic_email = data[0].clinic_email;
                              results[i].clinic_phone_no =
                                data[0].clinic_phone_no;

                              const date = new Date(results[i].date);
                              let time = results[i].time;
                              date.setHours(time.slice(0, 2), time.slice(3, 5));

                              const nowDate = new Date();

                              if (nowDate.getTime() > date.getTime()) {
                                results[i].status = "completed";
                              } else {
                                results[i].status = "scheduled";
                              }

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (results[i].date == todate) {
                                results[i].date = "Today";
                              } else if (results[i].date == yesterday) {
                                results[i].date = "Yesterday";
                              } else if (results[i].date == tomorrow) {
                                results[i].date = "Tomorrow";
                              }

                              details.push(results[i]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${today}'  TO  '${date2}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "nextMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "",
              lastMonth: "",
              nextMonth: "selected",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      } else {
        /// doctor account
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM appointments WHERE doctor_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC, time ASC";
              connection.query(
                query,
                [req.session.userId, today, date2],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].patient_id],
                          (err, data) => {
                            if (err) {
                              throw err;
                            } else {
                              data[0].appointment_id =
                                results[i].appointment_id;
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

                              let d = new Date();
                              let y = new Date(d.getTime() - 1440 * 60000);
                              let t = new Date(d.getTime() + 1440 * 60000);

                              let todate =
                                d.getFullYear() +
                                "-" +
                                ("0" + (d.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + d.getDate()).slice(-2);
                              let yesterday =
                                y.getFullYear() +
                                "-" +
                                ("0" + (y.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + y.getDate()).slice(-2);
                              let tomorrow =
                                t.getFullYear() +
                                "-" +
                                ("0" + (t.getMonth() + 1)).slice(-2) +
                                "-" +
                                ("0" + t.getDate()).slice(-2);

                              if (data[0].date == todate) {
                                data[0].date = "Today";
                              } else if (data[0].date == yesterday) {
                                data[0].date = "Yesterday";
                              } else if (data[0].date == tomorrow) {
                                data[0].date = "Tomorrow";
                              }

                              details.push(data[0]);

                              if (i == results.length - 1) {
                                console.log(details);
                                resolve(details);
                              }
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(
                            `LOCATION:    ${results[0].clinic_location}`
                          );

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${today}'  TO  '${date2}'  APPOINTMENTS  REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "date",
                                header: "Date",
                                width: 100,
                              },
                              {
                                id: "time",
                                header: "Time",
                                width: 100,
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
                          doc.text(
                            "Number of appointments: " + details.length,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("appointment-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "nextMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              nextWeek: "",
              lastMonth: "",
              nextMonth: "selected",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              details: details,
            });
          });
        });
      }
    } else {
      return res.redirect("/login");
    }
  }
});

router.get("/consultation-records", (req, res) => {
  if (req.session.authenticated) {
    if (req.session.accountType == "patient") {
      ///patient account
      let totalMessages = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
            connection.query(
              query,
              [req.session.userId, "active"],
              (err, chatRooms) => {
                if (err) {
                  throw err;
                } else {
                  if (chatRooms.length) {
                    for (let i = 0; i < chatRooms.length; i++) {
                      const query2 =
                        "SELECT name FROM doctor_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [chatRooms[i].doctor_id],
                        (err, result) => {
                          if (err) {
                            throw err;
                          } else {
                            chatRooms[i].name = result[0].name;
                            const query3 =
                              "SELECT COUNT(*) AS count FROM chats WHERE room_id = ?";
                            connection.query(
                              query3,
                              [chatRooms[i].room_id],
                              (err, chats) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (chats.length) {
                                    chatRooms[i].messages = chats[0].count;
                                  } else {
                                    chatRooms[i].messages = 0;
                                  }

                                  const query4 =
                                    "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =?";
                                  connection.query(
                                    query4,
                                    [
                                      "The service request is processed successfully.",
                                      req.session.userId,
                                      chatRooms[i].doctor_id,
                                    ],
                                    (err, results) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results.length) {
                                          chatRooms[i].paidConsults =
                                            results[0].count;
                                        } else {
                                          chatRooms[i].paidConsults = 0;
                                        }

                                        totalMessages =
                                          totalMessages + chatRooms[i].messages;
                                        details.push(chatRooms[i]);

                                        if (i == chatRooms.length - 1) {
                                          details.sort(
                                            (a, b) => b.messages - a.messages
                                          );
                                          resolve(details);
                                        }
                                      }
                                    }
                                  );
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
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query = "SELECT email FROM users WHERE user_id=?";
              connection.query(query, [req.session.userId], (err, email) => {
                if (err) {
                  throw err;
                } else {
                  const query2 =
                    "SELECT * FROM patient_details WHERE user_id=?";
                  connection.query(
                    query2,
                    [req.session.userId],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
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

                        pdfName = Math.floor(
                          Math.random() * (999999 - 100000) + 100000
                        );
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
                        doc.text(
                          `NAME:            ${results[0].name}`,
                          75,
                          180
                        );

                        doc.moveDown();
                        doc.text(`EMAIL:           ${email[0].email}`);

                        doc.moveDown();
                        doc.text(`PHONE NO:    ${results[0].phone_no}`);

                        doc.moveDown();
                        doc.text(`LOCATION:    ${results[0].location}`);

                        doc.text("", 0);
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();

                        doc.font("Times-Bold");
                        doc.fontSize(13);

                        doc.text("ALL CONSULTATIONS REPORT", {
                          underline: true,
                          width: 595,
                          align: "center",
                        });

                        doc.moveDown();

                        table
                          // add some plugins (here, a 'fit-to-width' for a column)
                          .addPlugin(
                            new (require("voilab-pdf-table/plugins/fitcolumn"))(
                              {
                                column: "name",
                              }
                            )
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
                              id: "paidConsults",
                              header: "Paid Consultations",
                              width: 130,
                            },
                            {
                              id: "messages",
                              header: "Messages",
                              width: 130,
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
                        doc.text(
                          "Total Number of Messages: " + totalMessages,
                          75
                        );

                        doc.end();
                        resolve();
                      }
                    }
                  );
                }
              });
            }
            connection.release();
          });
        });
        generatePdf.then(() => {
          return res.render("consultation-records", {
            pdfName: `${pdfName}.pdf`,
            accountType: req.session.accountType,
            filterType: "all",
            all: "selected",
            search: "",
            date: "",
            month: "",
            year: "",
            lastWeek: "",
            lastMonth: "",
            searchValue: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            totalMessages: totalMessages,
            details: details,
          });
        });
      });
    } else {
      //// doctor account
      let totalMessages = 0;
      const getDetails = new Promise((resolve, reject) => {
        let details = [];
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
            connection.query(
              query,
              [req.session.userId, "active"],
              (err, chatRooms) => {
                if (err) {
                  throw err;
                } else {
                  if (chatRooms.length) {
                    for (let i = 0; i < chatRooms.length; i++) {
                      const query2 =
                        "SELECT name FROM patient_details WHERE user_id = ?";
                      connection.query(
                        query2,
                        [chatRooms[i].patient_id],
                        (err, result) => {
                          if (err) {
                            throw err;
                          } else {
                            chatRooms[i].name = result[0].name;
                            const query3 =
                              "SELECT COUNT(*) AS count FROM chats WHERE room_id = ?";
                            connection.query(
                              query3,
                              [chatRooms[i].room_id],
                              (err, chats) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (chats.length) {
                                    chatRooms[i].messages = chats[0].count;
                                  } else {
                                    chatRooms[i].messages = 0;
                                  }

                                  const query4 =
                                    "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =?";
                                  connection.query(
                                    query4,
                                    [
                                      "The service request is processed successfully.",
                                      chatRooms[i].patient_id,
                                      req.session.userId,
                                    ],
                                    (err, results) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results.length) {
                                          chatRooms[i].paidConsults =
                                            results[0].count;
                                        } else {
                                          chatRooms[i].paidConsults = 0;
                                        }

                                        details.push(chatRooms[i]);
                                        totalMessages =
                                          totalMessages + chatRooms[i].messages;

                                        if (i == chatRooms.length - 1) {
                                          details.sort(
                                            (a, b) => b.messages - a.messages
                                          );
                                          resolve(details);
                                        }
                                      }
                                    }
                                  );
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
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query = "SELECT email FROM users WHERE user_id=?";
              connection.query(query, [req.session.userId], (err, email) => {
                if (err) {
                  throw err;
                } else {
                  const query2 = "SELECT * FROM doctor_details WHERE user_id=?";
                  connection.query(
                    query2,
                    [req.session.userId],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
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

                        pdfName = Math.floor(
                          Math.random() * (999999 - 100000) + 100000
                        );
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
                        doc.text(
                          `NAME:            ${results[0].name}`,
                          75,
                          180
                        );

                        doc.moveDown();
                        doc.text(`EMAIL:           ${email[0].email}`);

                        doc.moveDown();
                        doc.text(`PHONE NO:    ${results[0].phone_no}`);

                        doc.moveDown();
                        doc.text(`LOCATION:    ${results[0].location}`);

                        doc.text("", 0);
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();
                        doc.moveDown();

                        doc.font("Times-Bold");
                        doc.fontSize(13);

                        doc.text("ALL CONSULTATIONS REPORT", {
                          underline: true,
                          width: 595,
                          align: "center",
                        });

                        doc.moveDown();

                        table
                          // add some plugins (here, a 'fit-to-width' for a column)
                          .addPlugin(
                            new (require("voilab-pdf-table/plugins/fitcolumn"))(
                              {
                                column: "name",
                              }
                            )
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
                              id: "paidConsults",
                              header: "Paid Consultations",
                              width: 130,
                            },
                            {
                              id: "messages",
                              header: "Messages",
                              width: 130,
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
                        doc.text(
                          "Total Number of Messages: " + totalMessages,
                          75
                        );

                        doc.end();
                        resolve();
                      }
                    }
                  );
                }
              });
            }
            connection.release();
          });
        });
        generatePdf.then(() => {
          return res.render("consultation-records", {
            pdfName: `${pdfName}.pdf`,
            accountType: req.session.accountType,
            filterType: "all",
            all: "selected",
            search: "",
            date: "",
            month: "",
            year: "",
            lastWeek: "",
            lastMonth: "",
            searchValue: "",
            dateValue: "",
            monthValue: "",
            yearValue: year,
            totalMessages: totalMessages,
            details: details,
          });
        });
      });
    }
  } else {
    return res.redirect("/login");
  }
});

router.post("/filter-consultation-records", (req, res) => {
  if (req.session.authenticated) {
    let totalMessages = 0;

    ///////// all
    if (req.body.select == "all") {
      return res.redirect("/records/consultation-records");
    }

    //////// search
    else if (req.body.select == "search") {
      if (req.body.search) {
        if (req.session.accountType == "patient") {
          /// patient account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT user_id, name FROM doctor_details WHERE (name like ?) or (gender like ?) or (licence_no like ?) or (cancer_speciality like ?) or (clinic_location like ?) or (clinic_phone_no like ?) or (clinic_email like ?)";
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
                  ],
                  (err, users) => {
                    if (err) {
                      throw err;
                    } else {
                      if (users.length) {
                        for (let i = 0; i < users.length; i++) {
                          const query =
                            "SELECT room_id FROM chat_rooms WHERE patient_id= ? AND doctor_id = ? AND status = ?";
                          connection.query(
                            query,
                            [req.session.userId, users[i].user_id, "active"],
                            (err, chatRoom) => {
                              if (err) {
                                throw err;
                              } else {
                                if (chatRoom.length) {
                                  const query2 =
                                    "SELECT COUNT(*) AS count FROM chats WHERE room_id = ?";
                                  connection.query(
                                    query2,
                                    [chatRoom[0].room_id],
                                    (err, chats) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (chats.length) {
                                          users[i].messages = chats[0].count;
                                        } else {
                                          users[i].messages = 0;
                                        }

                                        const query3 =
                                          "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =?";
                                        connection.query(
                                          query3,
                                          [
                                            "The service request is processed successfully.",
                                            req.session.userId,
                                            users[i].user_id,
                                          ],
                                          (err, results) => {
                                            if (err) {
                                              throw err;
                                            } else {
                                              if (results.length) {
                                                users[i].paidConsults =
                                                  results[0].count;
                                              } else {
                                                users[i].paidConsults = 0;
                                              }

                                              totalMessages =
                                                totalMessages +
                                                users[i].messages;
                                              details.push(users[i]);

                                              if (i == users.length - 1) {
                                                details.sort(
                                                  (a, b) =>
                                                    b.messages - a.messages
                                                );
                                                resolve(details);
                                              }
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                } else {
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `CONSULTATIONS'  '${req.body.search}'  RESULTS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "search",
                all: "",
                search: "selected",
                date: "",
                month: "",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: req.body.search,
                dateValue: "",
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        } else {
          ///////doctor account
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM patient_details WHERE (name like ?) or (gender like ?) or (location like ?) or (cancer_type like ?) or (cancer_stage like ?) or (lifestyle_diseases like ?) or (phone_no like ?)";
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
                  ],
                  (err, users) => {
                    if (err) {
                      throw err;
                    } else {
                      if (users.length) {
                        for (let i = 0; i < users.length; i++) {
                          const query =
                            "SELECT room_id FROM chat_rooms WHERE doctor_id= ? AND patient_id = ? AND status = ?";
                          connection.query(
                            query,
                            [req.session.userId, users[i].user_id, "active"],
                            (err, chatRoom) => {
                              if (err) {
                                throw err;
                              } else {
                                if (chatRoom.length) {
                                  const query2 =
                                    "SELECT COUNT(*) AS count FROM chats WHERE room_id = ?";
                                  connection.query(
                                    query2,
                                    [chatRoom[0].room_id],
                                    (err, chats) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (chats.length) {
                                          users[i].messages = chats[0].count;
                                        } else {
                                          users[i].messages = 0;
                                        }

                                        const query3 =
                                          "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND doctor_id =?  AND patient_id =?";
                                        connection.query(
                                          query3,
                                          [
                                            "The service request is processed successfully.",
                                            req.session.userId,
                                            users[i].user_id,
                                          ],
                                          (err, results) => {
                                            if (err) {
                                              throw err;
                                            } else {
                                              if (results.length) {
                                                users[i].paidConsults =
                                                  results[0].count;
                                              } else {
                                                users[i].paidConsults = 0;
                                              }

                                              totalMessages =
                                                totalMessages +
                                                users[i].messages;
                                              details.push(users[i]);

                                              if (i == users.length - 1) {
                                                details.sort(
                                                  (a, b) =>
                                                    b.messages - a.messages
                                                );
                                                resolve(details);
                                              }
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                } else {
                                  resolve(details);
                                }
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `CONSULTATIONS'  '${req.body.search}'  RESULTS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "search",
                all: "",
                search: "selected",
                date: "",
                month: "",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: req.body.search,
                dateValue: "",
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        }
      } else {
        return res.render("consultation-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "search",
          all: "",
          search: "selected",
          date: "",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          totalMessages: totalMessages,
          details: {},
        });
      }
    }

    /////////////// date
    else if (req.body.select == "date") {
      if (req.body.date) {
        if (req.session.accountType == "patient") {
          ///patient account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date = ?";
                                connection.query(
                                  query3,
                                  [chatRooms[i].room_id, req.body.date],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND date = ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          req.session.userId,
                                          chatRooms[i].doctor_id,
                                          req.body.date,
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;
                                            details.push(chatRooms[i]);

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `DATE:  '${req.body.date}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "date",
                all: "",
                search: "",
                date: "selected",
                month: "",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: req.body.date,
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        } else {
          //// doctor account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date = ?";
                                connection.query(
                                  query3,
                                  [chatRooms[i].room_id, req.body.date],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND date = ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          chatRooms[i].patient_id,
                                          req.session.userId,
                                          req.body.date,
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            details.push(chatRooms[i]);
                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `DATE:  '${req.body.date}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "date",
                all: "",
                search: "",
                date: "selected",
                month: "",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: req.body.date,
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        }
      } else {
        return res.render("consultation-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "date",
          all: "",
          search: "",
          date: "selected",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          totalMessages: totalMessages,
          details: {},
        });
      }
    }

    /////////////// month
    else if (req.body.select == "month") {
      if (req.body.month) {
        if (req.session.accountType == "patient") {
          ///patient account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [
                                    chatRooms[i].room_id,
                                    "%" + req.body.month + "%",
                                  ],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND (date like ?)";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          req.session.userId,
                                          chatRooms[i].doctor_id,
                                          "%" + req.body.month + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;
                                            details.push(chatRooms[i]);

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `MONTH:  '${req.body.month}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "month",
                all: "",
                search: "",
                date: "",
                month: "selected",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: req.body.month,
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        } else {
          //// doctor account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [
                                    chatRooms[i].room_id,
                                    "%" + req.body.month + "%",
                                  ],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND (date like ?)";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          chatRooms[i].patient_id,
                                          req.session.userId,
                                          "%" + req.body.month + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            details.push(chatRooms[i]);
                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `MONTH:  '${req.body.month}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "month",
                all: "",
                search: "",
                date: "",
                month: "selected",
                year: "",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: req.body.month,
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        }
      } else {
        return res.render("consultation-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "month",
          all: "",
          search: "",
          date: "",
          month: "selected",
          year: "",
          lastWeek: "",
          lastMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          totalMessages: totalMessages,
          details: {},
        });
      }
    }

    /////////////// year
    else if (req.body.select == "year") {
      if (req.body.year) {
        if (req.session.accountType == "patient") {
          ///patient account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [
                                    chatRooms[i].room_id,
                                    "%" + req.body.year + "%",
                                  ],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND date like ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          req.session.userId,
                                          chatRooms[i].doctor_id,
                                          "%" + req.body.year + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;
                                            details.push(chatRooms[i]);

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR:  '${req.body.year}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: req.body.year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        } else {
          //// doctor account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [
                                    chatRooms[i].room_id,
                                    "%" + req.body.year + "%",
                                  ],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND date like ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          chatRooms[i].patient_id,
                                          req.session.userId,
                                          "%" + req.body.year + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            details.push(chatRooms[i]);
                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR:  '${req.body.year}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: req.body.year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        }
      } else {
        if (req.session.accountType == "patient") {
          ///patient account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [chatRooms[i].room_id, "%" + year + "%"],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND date like ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          req.session.userId,
                                          chatRooms[i].doctor_id,
                                          "%" + year + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;
                                            details.push(chatRooms[i]);

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM patient_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR:  '${year}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        } else {
          //// doctor account
          let totalMessages = 0;
          const getDetails = new Promise((resolve, reject) => {
            let details = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
                connection.query(
                  query,
                  [req.session.userId, "active"],
                  (err, chatRooms) => {
                    if (err) {
                      throw err;
                    } else {
                      if (chatRooms.length) {
                        for (let i = 0; i < chatRooms.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [chatRooms[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                chatRooms[i].name = result[0].name;
                                const query3 =
                                  "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND (date like ?)";
                                connection.query(
                                  query3,
                                  [chatRooms[i].room_id, "%" + year + "%"],
                                  (err, chats) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (chats.length) {
                                        chatRooms[i].messages = chats[0].count;
                                      } else {
                                        chatRooms[i].messages = 0;
                                      }

                                      const query4 =
                                        "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND date like ?";
                                      connection.query(
                                        query4,
                                        [
                                          "The service request is processed successfully.",
                                          chatRooms[i].patient_id,
                                          req.session.userId,
                                          "%" + year + "%",
                                        ],
                                        (err, results) => {
                                          if (err) {
                                            throw err;
                                          } else {
                                            if (results.length) {
                                              chatRooms[i].paidConsults =
                                                results[0].count;
                                            } else {
                                              chatRooms[i].paidConsults = 0;
                                            }

                                            details.push(chatRooms[i]);
                                            totalMessages =
                                              totalMessages +
                                              chatRooms[i].messages;

                                            if (i == chatRooms.length - 1) {
                                              details.sort(
                                                (a, b) =>
                                                  b.messages - a.messages
                                              );
                                              resolve(details);
                                            }
                                          }
                                        }
                                      );
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
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT email FROM users WHERE user_id=?";
                  connection.query(
                    query,
                    [req.session.userId],
                    (err, email) => {
                      if (err) {
                        throw err;
                      } else {
                        const query2 =
                          "SELECT * FROM doctor_details WHERE user_id=?";
                        connection.query(
                          query2,
                          [req.session.userId],
                          (err, results) => {
                            if (err) {
                              throw err;
                            } else {
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

                              pdfName = Math.floor(
                                Math.random() * (999999 - 100000) + 100000
                              );
                              doc.pipe(
                                fs.createWriteStream(
                                  path.resolve(
                                    __dirname,
                                    `../pdfs/${pdfName}.pdf`
                                  )
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
                              doc.text(
                                `NAME:            ${results[0].name}`,
                                75,
                                180
                              );

                              doc.moveDown();
                              doc.text(`EMAIL:           ${email[0].email}`);

                              doc.moveDown();
                              doc.text(`PHONE NO:    ${results[0].phone_no}`);

                              doc.moveDown();
                              doc.text(`LOCATION:    ${results[0].location}`);

                              doc.text("", 0);
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();
                              doc.moveDown();

                              doc.font("Times-Bold");
                              doc.fontSize(13);

                              doc.text(
                                `YEAR:  '${year}'  CONSULTATIONS REPORT`,
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
                                  new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                    {
                                      column: "name",
                                    }
                                  )
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
                                    id: "paidConsults",
                                    header: "Paid Consultations",
                                    width: 130,
                                  },
                                  {
                                    id: "messages",
                                    header: "Messages",
                                    width: 130,
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
                              doc.text(
                                "Total Number of Messages: " + totalMessages,
                                75
                              );

                              doc.end();
                              resolve();
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
            generatePdf.then(() => {
              return res.render("consultation-records", {
                pdfName: `${pdfName}.pdf`,
                accountType: req.session.accountType,
                filterType: "year",
                all: "",
                search: "",
                date: "",
                month: "",
                year: "selected",
                lastWeek: "",
                lastMonth: "",
                searchValue: "",
                dateValue: "",
                monthValue: "",
                yearValue: year,
                totalMessages: totalMessages,
                details: details,
              });
            });
          });
        }
      }
    }

    /////////////// last week
    else if (req.body.select == "last-week") {
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
      if (req.session.accountType == "patient") {
        ///patient account
        let totalMessages = 0;
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
              connection.query(
                query,
                [req.session.userId, "active"],
                (err, chatRooms) => {
                  if (err) {
                    throw err;
                  } else {
                    if (chatRooms.length) {
                      for (let i = 0; i < chatRooms.length; i++) {
                        const query2 =
                          "SELECT name FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [chatRooms[i].doctor_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              chatRooms[i].name = result[0].name;
                              const query3 =
                                "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date BETWEEN ? AND ?";
                              connection.query(
                                query3,
                                [chatRooms[i].room_id, date2, today],
                                (err, chats) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (chats.length) {
                                      chatRooms[i].messages = chats[0].count;
                                    } else {
                                      chatRooms[i].messages = 0;
                                    }

                                    const query4 =
                                      "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND date BETWEEN ? AND ?";
                                    connection.query(
                                      query4,
                                      [
                                        "The service request is processed successfully.",
                                        req.session.userId,
                                        chatRooms[i].doctor_id,
                                        date2,
                                        today,
                                      ],
                                      (err, results) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results.length) {
                                            chatRooms[i].paidConsults =
                                              results[0].count;
                                          } else {
                                            chatRooms[i].paidConsults = 0;
                                          }

                                          totalMessages =
                                            totalMessages +
                                            chatRooms[i].messages;
                                          details.push(chatRooms[i]);

                                          if (i == chatRooms.length - 1) {
                                            details.sort(
                                              (a, b) => b.messages - a.messages
                                            );
                                            resolve(details);
                                          }
                                        }
                                      }
                                    );
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  CONSULTATIONS REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "paidConsults",
                                header: "Paid Consultations",
                                width: 130,
                              },
                              {
                                id: "messages",
                                header: "Messages",
                                width: 130,
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
                          doc.text(
                            "Total Number of Messages: " + totalMessages,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("consultation-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "selected",
              lastMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              totalMessages: totalMessages,
              details: details,
            });
          });
        });
      } else {
        //// doctor account
        let totalMessages = 0;
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
              connection.query(
                query,
                [req.session.userId, "active"],
                (err, chatRooms) => {
                  if (err) {
                    throw err;
                  } else {
                    if (chatRooms.length) {
                      for (let i = 0; i < chatRooms.length; i++) {
                        const query2 =
                          "SELECT name FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [chatRooms[i].patient_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              chatRooms[i].name = result[0].name;
                              const query3 =
                                "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date BETWEEN ? AND ?";
                              connection.query(
                                query3,
                                [chatRooms[i].room_id, date2, today],
                                (err, chats) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (chats.length) {
                                      chatRooms[i].messages = chats[0].count;
                                    } else {
                                      chatRooms[i].messages = 0;
                                    }

                                    const query4 =
                                      "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND date BETWEEN ? AND ?";
                                    connection.query(
                                      query4,
                                      [
                                        "The service request is processed successfully.",
                                        chatRooms[i].patient_id,
                                        req.session.userId,
                                        date2,
                                        today,
                                      ],
                                      (err, results) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results.length) {
                                            chatRooms[i].paidConsults =
                                              results[0].count;
                                          } else {
                                            chatRooms[i].paidConsults = 0;
                                          }

                                          details.push(chatRooms[i]);
                                          totalMessages =
                                            totalMessages +
                                            chatRooms[i].messages;

                                          if (i == chatRooms.length - 1) {
                                            details.sort(
                                              (a, b) => b.messages - a.messages
                                            );
                                            resolve(details);
                                          }
                                        }
                                      }
                                    );
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  CONSULTATIONS REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "paidConsults",
                                header: "Paid Consultations",
                                width: 130,
                              },
                              {
                                id: "messages",
                                header: "Messages",
                                width: 130,
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
                          doc.text(
                            "Total Number of Messages: " + totalMessages,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("consultation-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastWeek",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "selected",
              lastMonth: "",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              totalMessages: totalMessages,
              details: details,
            });
          });
        });
      }
    }

    /////////////// last month
    else if (req.body.select == "last-month") {
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
      if (req.session.accountType == "patient") {
        ///patient account
        let totalMessages = 0;
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT room_id, doctor_id FROM chat_rooms WHERE patient_id= ? AND status = ?";
              connection.query(
                query,
                [req.session.userId, "active"],
                (err, chatRooms) => {
                  if (err) {
                    throw err;
                  } else {
                    if (chatRooms.length) {
                      for (let i = 0; i < chatRooms.length; i++) {
                        const query2 =
                          "SELECT name FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [chatRooms[i].doctor_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              chatRooms[i].name = result[0].name;
                              const query3 =
                                "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date BETWEEN ? AND ?";
                              connection.query(
                                query3,
                                [chatRooms[i].room_id, date2, today],
                                (err, chats) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (chats.length) {
                                      chatRooms[i].messages = chats[0].count;
                                    } else {
                                      chatRooms[i].messages = 0;
                                    }

                                    const query4 =
                                      "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =?  AND doctor_id =? AND date BETWEEN ? AND ?";
                                    connection.query(
                                      query4,
                                      [
                                        "The service request is processed successfully.",
                                        req.session.userId,
                                        chatRooms[i].doctor_id,
                                        date2,
                                        today,
                                      ],
                                      (err, results) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results.length) {
                                            chatRooms[i].paidConsults =
                                              results[0].count;
                                          } else {
                                            chatRooms[i].paidConsults = 0;
                                          }

                                          totalMessages =
                                            totalMessages +
                                            chatRooms[i].messages;
                                          details.push(chatRooms[i]);

                                          if (i == chatRooms.length - 1) {
                                            details.sort(
                                              (a, b) => b.messages - a.messages
                                            );
                                            resolve(details);
                                          }
                                        }
                                      }
                                    );
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM patient_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  CONSULTATIONS REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "paidConsults",
                                header: "Paid Consultations",
                                width: 130,
                              },
                              {
                                id: "messages",
                                header: "Messages",
                                width: 130,
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
                          doc.text(
                            "Total Number of Messages: " + totalMessages,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("consultation-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              lastMonth: "selected",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              totalMessages: totalMessages,
              details: details,
            });
          });
        });
      } else {
        //// doctor account
        let totalMessages = 0;
        const getDetails = new Promise((resolve, reject) => {
          let details = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT room_id, patient_id FROM chat_rooms WHERE doctor_id= ? AND status = ?";
              connection.query(
                query,
                [req.session.userId, "active"],
                (err, chatRooms) => {
                  if (err) {
                    throw err;
                  } else {
                    if (chatRooms.length) {
                      for (let i = 0; i < chatRooms.length; i++) {
                        const query2 =
                          "SELECT name FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [chatRooms[i].patient_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              chatRooms[i].name = result[0].name;
                              const query3 =
                                "SELECT COUNT(*) AS count FROM chats WHERE room_id = ? AND date BETWEEN ? AND ?";
                              connection.query(
                                query3,
                                [chatRooms[i].room_id, date2, today],
                                (err, chats) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (chats.length) {
                                      chatRooms[i].messages = chats[0].count;
                                    } else {
                                      chatRooms[i].messages = 0;
                                    }

                                    const query4 =
                                      "SELECT COUNT(*) AS count FROM consultations_stk_push WHERE status = ? AND patient_id =? AND doctor_id =? AND date BETWEEN ? AND ?";
                                    connection.query(
                                      query4,
                                      [
                                        "The service request is processed successfully.",
                                        chatRooms[i].patient_id,
                                        req.session.userId,
                                        date2,
                                        today,
                                      ],
                                      (err, results) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results.length) {
                                            chatRooms[i].paidConsults =
                                              results[0].count;
                                          } else {
                                            chatRooms[i].paidConsults = 0;
                                          }

                                          details.push(chatRooms[i]);
                                          totalMessages =
                                            totalMessages +
                                            chatRooms[i].messages;

                                          if (i == chatRooms.length - 1) {
                                            details.sort(
                                              (a, b) => b.messages - a.messages
                                            );
                                            resolve(details);
                                          }
                                        }
                                      }
                                    );
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
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query = "SELECT email FROM users WHERE user_id=?";
                connection.query(query, [req.session.userId], (err, email) => {
                  if (err) {
                    throw err;
                  } else {
                    const query2 =
                      "SELECT * FROM doctor_details WHERE user_id=?";
                    connection.query(
                      query2,
                      [req.session.userId],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
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

                          pdfName = Math.floor(
                            Math.random() * (999999 - 100000) + 100000
                          );
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
                          doc.text(
                            `NAME:            ${results[0].name}`,
                            75,
                            180
                          );

                          doc.moveDown();
                          doc.text(`EMAIL:           ${email[0].email}`);

                          doc.moveDown();
                          doc.text(`PHONE NO:    ${results[0].phone_no}`);

                          doc.moveDown();
                          doc.text(`LOCATION:    ${results[0].location}`);

                          doc.text("", 0);
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();
                          doc.moveDown();

                          doc.font("Times-Bold");
                          doc.fontSize(13);

                          doc.text(
                            `'${date2}'  TO  '${today}'  CONSULTATIONS REPORT`,
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
                              new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                {
                                  column: "name",
                                }
                              )
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
                                id: "paidConsults",
                                header: "Paid Consultations",
                                width: 130,
                              },
                              {
                                id: "messages",
                                header: "Messages",
                                width: 130,
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
                          doc.text(
                            "Total Number of Messages: " + totalMessages,
                            75
                          );

                          doc.end();
                          resolve();
                        }
                      }
                    );
                  }
                });
              }
              connection.release();
            });
          });
          generatePdf.then(() => {
            return res.render("consultation-records", {
              pdfName: `${pdfName}.pdf`,
              accountType: req.session.accountType,
              filterType: "lastMonth",
              all: "",
              search: "",
              date: "",
              month: "",
              year: "",
              lastWeek: "",
              lastMonth: "selected",
              searchValue: "",
              dateValue: "",
              monthValue: "",
              yearValue: year,
              totalMessages: totalMessages,
              details: details,
            });
          });
        });
      }
    }
  } else {
    return res.redirect("/login");
  }
});

router.get("/payment-records", (req, res) => {
  if (req.session.authenticated) {
    if (req.session.accountType == "patient") {
      ///// patient account

      const getSummary = new Promise((resolve, reject) => {
        let summary = {
          consultationCount: 0,
          consultationTotal: 0,
          appointmentCount: 0,
          appointmentTotal: 0,
        };
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ?";
            connection.query(
              query,
              [
                req.session.userId,
                "The service request is processed successfully.",
              ],
              (err, results1) => {
                if (err) {
                  throw err;
                } else {
                  if (results1.length) {
                    summary.consultationCount = results1[0].count;
                    summary.consultationTotal = results1[0].sum;

                    const query2 =
                      "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ?";
                    connection.query(
                      query2,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                      ],
                      (err, results2) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results2.length) {
                            summary.appointmentCount = results2[0].count;
                            summary.appointmentTotal = results2[0].sum;
                            resolve(summary);
                          } else {
                            resolve(summary);
                          }
                        }
                      }
                    );
                  } else {
                    resolve(summary);
                  }
                }
              }
            );
          }
          connection.release();
        });
      });
      getSummary.then((summary) => {
        const getConsultationDetails = new Promise((resolve, reject) => {
          let consultationDetails = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                ],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT name FROM doctor_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].doctor_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = result[0].name;
                              consultationDetails.push(results[i]);

                              if (i == results.length - 1) {
                                resolve(consultationDetails);
                              }
                            }
                          }
                        );
                      }
                    } else {
                      resolve(consultationDetails);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getConsultationDetails.then((consultationDetails) => {
          const getAppointmentDetails = new Promise((resolve, reject) => {
            let appointmentDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                appointmentDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(appointmentDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(appointmentDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getAppointmentDetails.then((appointmentDetails) => {
            const getUserDetails = new Promise((resolve, reject) => {
              let userDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT * FROM doctor_details";
                  connection.query(query, (err, users) => {
                    if (err) {
                      throw err;
                    } else {
                      if (users.length) {
                        for (let i = 0; i < users.length; i++) {
                          const query2 =
                            "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =?";
                          connection.query(
                            query2,
                            [
                              users[i].user_id,
                              req.session.userId,
                              "The service request is processed successfully.",
                            ],
                            (err, results1) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results1.length) {
                                  users[i].consultationCount =
                                    results1[0].count;
                                  users[i].consultationFees = results1[0].sum;
                                  if (users[i].consultationFees == null) {
                                    users[i].consultationFees = 0;
                                  }
                                } else {
                                  users[i].consultationCount = 0;
                                  users[i].consultationFees = 0;
                                }

                                const query3 =
                                  "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ?";
                                connection.query(
                                  query3,
                                  [
                                    users[i].user_id,
                                    req.session.userId,
                                    "The service request is processed successfully.",
                                  ],
                                  (err, results2) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (results2.length) {
                                        users[i].appointmentCount =
                                          results2[0].count;
                                        users[i].appointmentFees =
                                          results2[0].sum;
                                        if (users[i].appointmentFees == null) {
                                          users[i].appointmentFees = 0;
                                        }
                                      } else {
                                        users[i].appointmentCount = 0;
                                        users[i].appointmentFees = 0;
                                      }

                                      users[i].totalFees =
                                        users[i].consultationFees +
                                        users[i].appointmentFees;
                                      userDetails.push(users[i]);

                                      if (i == users.length - 1) {
                                        resolve(userDetails);
                                      }
                                    }
                                  }
                                );
                              }
                            }
                          );
                        }
                      } else {
                        resolve(userDetails);
                      }
                    }
                  });
                }
                connection.release();
              });
            });
            getUserDetails.then((userDetails) => {
              const generatePdf = new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT email FROM users WHERE user_id=?";
                    connection.query(
                      query,
                      [req.session.userId],
                      (err, email) => {
                        if (err) {
                          throw err;
                        } else {
                          const query2 =
                            "SELECT * FROM patient_details WHERE user_id=?";
                          connection.query(
                            query2,
                            [req.session.userId],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
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
                                table2 = new PdfTable(doc, {
                                  bottomMargin: 30,
                                });
                                table3 = new PdfTable(doc, {
                                  bottomMargin: 30,
                                });

                                pdfName = Math.floor(
                                  Math.random() * (999999 - 100000) + 100000
                                );
                                doc.pipe(
                                  fs.createWriteStream(
                                    path.resolve(
                                      __dirname,
                                      `../pdfs/${pdfName}.pdf`
                                    )
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
                                doc.text(
                                  `NAME:            ${results[0].name}`,
                                  75,
                                  180
                                );

                                doc.moveDown();
                                doc.text(`EMAIL:           ${email[0].email}`);

                                doc.moveDown();
                                doc.text(`PHONE NO:    ${results[0].phone_no}`);

                                doc.moveDown();
                                doc.text(`LOCATION:    ${results[0].location}`);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();

                                doc.font("Times-Bold");
                                doc.fontSize(13);

                                doc.text(`FULL PAYMENTS REPORT`, {
                                  underline: true,
                                  width: 595,
                                  align: "center",
                                });

                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.text("CONSULTATIONS PAYMENTS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "date",
                                      header: "Date",
                                      width: 100,
                                    },
                                    {
                                      id: "amount",
                                      header: "Amount (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "consultation_expiry_time",
                                      header: "Consultation Expiry",
                                      width: 130,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table.addBody(consultationDetails);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.font("Times-Bold");
                                doc.text(
                                  "No. Of Consultations: " +
                                    summary.consultationCount,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  "Total Consultations Payments: Kshs " +
                                    summary.consultationTotal,
                                  75
                                );

                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.moveDown();
                                doc.text("APPOINTMENTS PAYMENTS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table2
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "date",
                                      header: "Date",
                                      width: 80,
                                    },
                                    {
                                      id: "amount",
                                      header: "Amount (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "appointment_date",
                                      header: "Appointment Date",
                                      width: 100,
                                    },
                                    {
                                      id: "appointment_time",
                                      header: "Appointment Time",
                                      width: 100,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table2.addBody(appointmentDetails);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.font("Times-Bold");
                                doc.text(
                                  "No. Of Appointments: " +
                                    summary.appointmentCount,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  "Total Appointments Payments: Kshs " +
                                    summary.appointmentTotal,
                                  75
                                );

                                doc.moveDown();
                                doc.moveDown();
                                doc.text(
                                  `Total Engagements: ${
                                    summary.appointmentCount +
                                    summary.consultationCount
                                  }`,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  `Total Payments: Kshs ${
                                    summary.appointmentTotal +
                                    summary.consultationTotal
                                  }`,
                                  75
                                );

                                doc.moveDown();
                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.text("PAYMENTS RANKINGS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table3
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "consultationCount",
                                      header: "Consultations",
                                      width: 75,
                                    },
                                    {
                                      id: "consultationFees",
                                      header: "Consultations Payments (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "appointmentCount",
                                      header: "Appointments",
                                      width: 75,
                                    },
                                    {
                                      id: "appointmentFees",
                                      header: "Appointments Payments (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "totalFees",
                                      header: "Total Payments (Kshs)",
                                      width: 70,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table3.addBody(userDetails);

                                doc.text("", 0);
                                doc.moveDown();

                                doc.end();
                                resolve();
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
              generatePdf.then(() => {
                userDetails.sort((a, b) => b.totalFees - a.totalFees);
                return res.render("payment-records", {
                  pdfName: `${pdfName}.pdf`,
                  accountType: req.session.accountType,
                  filterType: "all",
                  all: "selected",
                  search: "",
                  date: "",
                  month: "",
                  year: "",
                  lastWeek: "",
                  lastMonth: "",
                  searchValue: "",
                  dateValue: "",
                  monthValue: "",
                  yearValue: year,
                  summary: summary,
                  consultationDetails: consultationDetails,
                  appointmentDetails: appointmentDetails,
                  userDetails: userDetails,
                });
              });
            });
          });
        });
      });
    } else {
      //// doctor account

      const getSummary = new Promise((resolve, reject) => {
        let summary = {
          consultationCount: 0,
          consultationTotal: 0,
          appointmentCount: 0,
          appointmentTotal: 0,
        };
        pool.getConnection((err, connection) => {
          if (err) {
            throw err;
          } else {
            const query =
              "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ?";
            connection.query(
              query,
              [
                req.session.userId,
                "The service request is processed successfully.",
              ],
              (err, results1) => {
                if (err) {
                  throw err;
                } else {
                  if (results1.length) {
                    summary.consultationCount = results1[0].count;
                    summary.consultationTotal = results1[0].sum;

                    const query2 =
                      "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ?";
                    connection.query(
                      query2,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                      ],
                      (err, results2) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results2.length) {
                            summary.appointmentCount = results2[0].count;
                            summary.appointmentTotal = results2[0].sum;
                            resolve(summary);
                          } else {
                            resolve(summary);
                          }
                        }
                      }
                    );
                  } else {
                    resolve(summary);
                  }
                }
              }
            );
          }
          connection.release();
        });
      });
      getSummary.then((summary) => {
        const getConsultationDetails = new Promise((resolve, reject) => {
          let consultationDetails = [];
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                ],
                (err, results) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results.length) {
                      for (let i = 0; i < results.length; i++) {
                        const query2 =
                          "SELECT name FROM patient_details WHERE user_id = ?";
                        connection.query(
                          query2,
                          [results[i].patient_id],
                          (err, result) => {
                            if (err) {
                              throw err;
                            } else {
                              results[i].name = result[0].name;
                              consultationDetails.push(results[i]);

                              if (i == results.length - 1) {
                                resolve(consultationDetails);
                              }
                            }
                          }
                        );
                      }
                    } else {
                      resolve(consultationDetails);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getConsultationDetails.then((consultationDetails) => {
          const getAppointmentDetails = new Promise((resolve, reject) => {
            let appointmentDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                appointmentDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(appointmentDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(appointmentDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getAppointmentDetails.then((appointmentDetails) => {
            const getUserDetails = new Promise((resolve, reject) => {
              let userDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query = "SELECT user_id, name FROM patient_details";
                  connection.query(query, (err, users) => {
                    if (err) {
                      throw err;
                    } else {
                      if (users.length) {
                        for (let i = 0; i < users.length; i++) {
                          const query2 =
                            "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ?";
                          connection.query(
                            query2,
                            [
                              users[i].user_id,
                              req.session.userId,
                              "The service request is processed successfully.",
                            ],
                            (err, results1) => {
                              if (err) {
                                throw err;
                              } else {
                                if (results1.length) {
                                  users[i].consultationCount =
                                    results1[i].count;
                                  users[i].consultationFees = results1[i].sum;
                                  if (users[i].consultationFees == null) {
                                    users[i].consultationFees = 0;
                                  }
                                } else {
                                  users[i].consultationCount = 0;
                                  users[i].consultationFees = 0;
                                }

                                const query3 =
                                  "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ?";
                                connection.query(
                                  query3,
                                  [
                                    users[i].user_id,
                                    req.session.userId,
                                    "The service request is processed successfully.",
                                  ],
                                  (err, results2) => {
                                    if (err) {
                                      throw err;
                                    } else {
                                      if (results2.length) {
                                        users[i].appointmentCount =
                                          results2[i].count;
                                        users[i].appointmentFees =
                                          results2[i].sum;
                                        if (users[i].appointmentFees == null) {
                                          users[i].appointmentFees = 0;
                                        }
                                      } else {
                                        users[i].appointmentCount = 0;
                                        users[i].appointmentFees = 0;
                                      }

                                      users[i].totalFees =
                                        users[i].consultationFees +
                                        users[i].appointmentFees;
                                      userDetails.push(users[i]);

                                      if (i == users.length - 1) {
                                        resolve(userDetails);
                                      }
                                    }
                                  }
                                );
                              }
                            }
                          );
                        }
                      } else {
                        resolve(userDetails);
                      }
                    }
                  });
                }
                connection.release();
              });
            });
            getUserDetails.then((userDetails) => {
              const generatePdf = new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT email FROM users WHERE user_id=?";
                    connection.query(
                      query,
                      [req.session.userId],
                      (err, email) => {
                        if (err) {
                          throw err;
                        } else {
                          const query2 =
                            "SELECT * FROM doctor_details WHERE user_id=?";
                          connection.query(
                            query2,
                            [req.session.userId],
                            (err, results) => {
                              if (err) {
                                throw err;
                              } else {
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
                                table2 = new PdfTable(doc, {
                                  bottomMargin: 30,
                                });
                                table3 = new PdfTable(doc, {
                                  bottomMargin: 30,
                                });

                                pdfName = Math.floor(
                                  Math.random() * (999999 - 100000) + 100000
                                );
                                doc.pipe(
                                  fs.createWriteStream(
                                    path.resolve(
                                      __dirname,
                                      `../pdfs/${pdfName}.pdf`
                                    )
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
                                doc.text(
                                  `NAME:            ${results[0].name}`,
                                  75,
                                  180
                                );

                                doc.moveDown();
                                doc.text(`EMAIL:           ${email[0].email}`);

                                doc.moveDown();
                                doc.text(`PHONE NO:    ${results[0].phone_no}`);

                                doc.moveDown();
                                doc.text(`LOCATION:    ${results[0].location}`);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();

                                doc.font("Times-Bold");
                                doc.fontSize(13);

                                doc.text(`FULL PAYMENTS REPORT`, {
                                  underline: true,
                                  width: 595,
                                  align: "center",
                                });

                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.text("CONSULTATIONS PAYMENTS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "date",
                                      header: "Date",
                                      width: 100,
                                    },
                                    {
                                      id: "amount",
                                      header: "Amount (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "consultation_expiry_time",
                                      header: "Consultation Expiry",
                                      width: 130,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table.addBody(consultationDetails);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.font("Times-Bold");
                                doc.text(
                                  "No. Of Consultations: " +
                                    summary.consultationCount,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  "Total Consultations Payments: Kshs " +
                                    summary.consultationTotal,
                                  75
                                );

                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.moveDown();
                                doc.text("APPOINTMENTS PAYMENTS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table2
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "date",
                                      header: "Date",
                                      width: 80,
                                    },
                                    {
                                      id: "amount",
                                      header: "Amount (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "appointment_date",
                                      header: "Appointment Date",
                                      width: 100,
                                    },
                                    {
                                      id: "appointment_time",
                                      header: "Appointment Time",
                                      width: 100,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table2.addBody(appointmentDetails);

                                doc.text("", 0);
                                doc.moveDown();
                                doc.moveDown();
                                doc.moveDown();
                                doc.font("Times-Bold");
                                doc.text(
                                  "No. Of Appointments: " +
                                    summary.appointmentCount,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  "Total Appointments Payments: Kshs " +
                                    summary.appointmentTotal,
                                  75
                                );

                                doc.moveDown();
                                doc.moveDown();

                                doc.text(
                                  `Total Engagements: ${
                                    summary.appointmentCount +
                                    summary.consultationCount
                                  }`,
                                  75
                                );
                                doc.moveDown();
                                doc.text(
                                  `Total Payments: Kshs ${
                                    summary.appointmentTotal +
                                    summary.consultationTotal
                                  }`,
                                  75
                                );

                                doc.moveDown();
                                doc.moveDown();
                                doc.text("", 75);
                                doc.moveDown();
                                doc.text("PAYMENTS RANKINGS", {
                                  underline: true,
                                });
                                doc.text("", 0);
                                doc.moveDown();

                                table3
                                  // add some plugins (here, a 'fit-to-width' for a column)
                                  .addPlugin(
                                    new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                      {
                                        column: "name",
                                      }
                                    )
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
                                      header: "Name",
                                      align: "left",
                                    },
                                    {
                                      id: "consultationCount",
                                      header: "Consultations",
                                      width: 75,
                                    },
                                    {
                                      id: "consultationFees",
                                      header: "Consultations Payments (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "appointmentCount",
                                      header: "Appointments",
                                      width: 75,
                                    },
                                    {
                                      id: "appointmentFees",
                                      header: "Appointments Payments (Kshs)",
                                      width: 80,
                                    },
                                    {
                                      id: "totalFees",
                                      header: "Total Payments (Kshs)",
                                      width: 70,
                                    },
                                  ]);
                                doc.moveDown();
                                doc.font("Times-Roman");

                                table3.addBody(userDetails);

                                doc.text("", 0);
                                doc.moveDown();

                                doc.end();
                                resolve();
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
              generatePdf.then(() => {
                userDetails.sort((a, b) => b.totalFees - a.totalFees);
                return res.render("payment-records", {
                  pdfName: `${pdfName}.pdf`,
                  accountType: req.session.accountType,
                  filterType: "all",
                  all: "selected",
                  search: "",
                  date: "",
                  month: "",
                  year: "",
                  lastWeek: "",
                  lastMonth: "",
                  searchValue: "",
                  dateValue: "",
                  monthValue: "",
                  yearValue: year,
                  summary: summary,
                  consultationDetails: consultationDetails,
                  appointmentDetails: appointmentDetails,
                  userDetails: userDetails,
                });
              });
            });
          });
        });
      });
    }
  } else {
    return res.redirect("/login");
  }
});

router.post("/filter-payment-records", (req, res) => {
  if (req.session.authenticated) {
    let emptySummary = {
      consultationCount: 0,
      consultationTotal: 0,
      appointmentCount: 0,
      appointmentTotal: 0,
    };
    /////////all
    if (req.body.select == "all") {
      return res.redirect("/records/payment-records");
    }

    ///////// date
    else if (req.body.select == "date") {
      if (req.body.date) {
        if (req.session.accountType == "patient") {
          ///// patient account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date = ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    req.body.date,
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date = ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            req.body.date,
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date = ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      req.body.date,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date=?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        req.body.date,
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM doctor_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].doctor_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT * FROM doctor_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date=?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  req.body.date,
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[0].count;
                                      users[i].consultationFees =
                                        results1[0].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date=?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        req.body.date,
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[0].count;
                                            users[i].appointmentFees =
                                              results2[0].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM patient_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `DATE:  '${req.body.date}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "date",
                      all: "",
                      search: "",
                      date: "selected",
                      month: "",
                      year: "",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: req.body.date,
                      monthValue: "",
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        } else {
          //// doctor account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date = ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    req.body.date,
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date=?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            req.body.date,
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date = ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      req.body.date,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date=?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        req.body.date,
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM patient_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].patient_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT user_id, name FROM patient_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date =?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  req.body.date,
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[i].count;
                                      users[i].consultationFees =
                                        results1[i].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date =?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        req.body.date,
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[i].count;
                                            users[i].appointmentFees =
                                              results2[i].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM doctor_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `DATE:  '${req.body.date}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "date",
                      all: "",
                      search: "",
                      date: "selected",
                      month: "",
                      year: "",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: req.body.date,
                      monthValue: "",
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        }
      } else {
        return res.render("payment-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "date",
          all: "",
          search: "",
          date: "selected",
          month: "",
          year: "",
          lastWeek: "",
          lastMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          summary: emptySummary,
          consultationDetails: [],
          appointmentDetails: [],
          userDetails: [],
        });
      }
    }

    ///////// month
    else if (req.body.select == "month") {
      if (req.body.month) {
        if (req.session.accountType == "patient") {
          ///// patient account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + req.body.month + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + req.body.month + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + req.body.month + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + req.body.month + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM doctor_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].doctor_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT * FROM doctor_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + req.body.month + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[0].count;
                                      users[i].consultationFees =
                                        results1[0].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + req.body.month + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[0].count;
                                            users[i].appointmentFees =
                                              results2[0].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM patient_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `MONTH:  '${req.body.month}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "month",
                      all: "",
                      search: "",
                      date: "",
                      month: "selected",
                      year: "",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: req.body.month,
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        } else {
          //// doctor account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + req.body.month + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + req.body.month + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + req.body.month + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + req.body.month + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM patient_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].patient_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT user_id, name FROM patient_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + req.body.month + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[i].count;
                                      users[i].consultationFees =
                                        results1[i].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + req.body.month + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[i].count;
                                            users[i].appointmentFees =
                                              results2[i].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM doctor_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `MONTH:  '${req.body.month}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "month",
                      all: "",
                      search: "",
                      date: "",
                      month: "selected",
                      year: "",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: req.body.month,
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        }
      } else {
        return res.render("payment-records", {
          pdfName: `${pdfName}.pdf`,
          accountType: req.session.accountType,
          filterType: "month",
          all: "",
          search: "",
          date: "",
          month: "selected",
          year: "",
          lastWeek: "",
          lastMonth: "",
          searchValue: "",
          dateValue: "",
          monthValue: "",
          yearValue: year,
          summary: emptySummary,
          consultationDetails: [],
          appointmentDetails: [],
          userDetails: [],
        });
      }
    }

    /////////////// year
    else if (req.body.select == "year") {
      if (req.body.year) {
        if (req.session.accountType == "patient") {
          ///// patient account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + req.body.year + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + req.body.year + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + req.body.year + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + req.body.year + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM doctor_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].doctor_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT * FROM doctor_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + req.body.year + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[0].count;
                                      users[i].consultationFees =
                                        results1[0].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + req.body.year + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[0].count;
                                            users[i].appointmentFees =
                                              results2[0].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM patient_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `YEAR:  '${req.body.year}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "year",
                      all: "",
                      search: "",
                      date: "",
                      month: "",
                      year: "selected",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: "",
                      yearValue: req.body.year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        } else {
          //// doctor account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + req.body.year + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + req.body.year + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + req.body.year + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + req.body.year + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM patient_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].patient_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT user_id, name FROM patient_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + req.body.year + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[i].count;
                                      users[i].consultationFees =
                                        results1[i].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + req.body.year + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[i].count;
                                            users[i].appointmentFees =
                                              results2[i].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM doctor_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `YEAR:  '${req.body.year}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "year",
                      all: "",
                      search: "",
                      date: "",
                      month: "",
                      year: "selected",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: "",
                      yearValue: req.body.year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        }
      } else {
        if (req.session.accountType == "patient") {
          ///// patient account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + year + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + year + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + year + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + year + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM doctor_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].doctor_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT * FROM doctor_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + year + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[0].count;
                                      users[i].consultationFees =
                                        results1[0].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + year + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[0].count;
                                            users[i].appointmentFees =
                                              results2[0].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM patient_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `YEAR:  '${year}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "year",
                      all: "",
                      search: "",
                      date: "",
                      month: "",
                      year: "selected",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: "",
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        } else {
          //// doctor account

          const getSummary = new Promise((resolve, reject) => {
            let summary = {
              consultationCount: 0,
              consultationTotal: 0,
              appointmentCount: 0,
              appointmentTotal: 0,
            };
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    "%" + year + "%",
                  ],
                  (err, results1) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results1.length) {
                        summary.consultationCount = results1[0].count;
                        summary.consultationTotal = results1[0].sum;

                        const query2 =
                          "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                        connection.query(
                          query2,
                          [
                            req.session.userId,
                            "The service request is processed successfully.",
                            "%" + year + "%",
                          ],
                          (err, results2) => {
                            if (err) {
                              throw err;
                            } else {
                              if (results2.length) {
                                summary.appointmentCount = results2[0].count;
                                summary.appointmentTotal = results2[0].sum;
                                resolve(summary);
                              } else {
                                resolve(summary);
                              }
                            }
                          }
                        );
                      } else {
                        resolve(summary);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getSummary.then((summary) => {
            const getConsultationDetails = new Promise((resolve, reject) => {
              let consultationDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      "%" + year + "%",
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  consultationDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(consultationDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(consultationDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getConsultationDetails.then((consultationDetails) => {
              const getAppointmentDetails = new Promise((resolve, reject) => {
                let appointmentDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query =
                      "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date like ?";
                    connection.query(
                      query,
                      [
                        req.session.userId,
                        "The service request is processed successfully.",
                        "%" + year + "%",
                      ],
                      (err, results) => {
                        if (err) {
                          throw err;
                        } else {
                          if (results.length) {
                            for (let i = 0; i < results.length; i++) {
                              const query2 =
                                "SELECT name FROM patient_details WHERE user_id = ?";
                              connection.query(
                                query2,
                                [results[i].patient_id],
                                (err, result) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    results[i].name = result[0].name;
                                    appointmentDetails.push(results[i]);

                                    if (i == results.length - 1) {
                                      resolve(appointmentDetails);
                                    }
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(appointmentDetails);
                          }
                        }
                      }
                    );
                  }
                  connection.release();
                });
              });
              getAppointmentDetails.then((appointmentDetails) => {
                const getUserDetails = new Promise((resolve, reject) => {
                  let userDetails = [];
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT user_id, name FROM patient_details";
                      connection.query(query, (err, users) => {
                        if (err) {
                          throw err;
                        } else {
                          if (users.length) {
                            for (let i = 0; i < users.length; i++) {
                              const query2 =
                                "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                              connection.query(
                                query2,
                                [
                                  users[i].user_id,
                                  req.session.userId,
                                  "The service request is processed successfully.",
                                  "%" + year + "%",
                                ],
                                (err, results1) => {
                                  if (err) {
                                    throw err;
                                  } else {
                                    if (results1.length) {
                                      users[i].consultationCount =
                                        results1[i].count;
                                      users[i].consultationFees =
                                        results1[i].sum;
                                      if (users[i].consultationFees == null) {
                                        users[i].consultationFees = 0;
                                      }
                                    } else {
                                      users[i].consultationCount = 0;
                                      users[i].consultationFees = 0;
                                    }

                                    const query3 =
                                      "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date like ?";
                                    connection.query(
                                      query3,
                                      [
                                        users[i].user_id,
                                        req.session.userId,
                                        "The service request is processed successfully.",
                                        "%" + year + "%",
                                      ],
                                      (err, results2) => {
                                        if (err) {
                                          throw err;
                                        } else {
                                          if (results2.length) {
                                            users[i].appointmentCount =
                                              results2[i].count;
                                            users[i].appointmentFees =
                                              results2[i].sum;
                                            if (
                                              users[i].appointmentFees == null
                                            ) {
                                              users[i].appointmentFees = 0;
                                            }
                                          } else {
                                            users[i].appointmentCount = 0;
                                            users[i].appointmentFees = 0;
                                          }

                                          users[i].totalFees =
                                            users[i].consultationFees +
                                            users[i].appointmentFees;
                                          userDetails.push(users[i]);

                                          if (i == users.length - 1) {
                                            resolve(userDetails);
                                          }
                                        }
                                      }
                                    );
                                  }
                                }
                              );
                            }
                          } else {
                            resolve(userDetails);
                          }
                        }
                      });
                    }
                    connection.release();
                  });
                });
                getUserDetails.then((userDetails) => {
                  const generatePdf = new Promise((resolve, reject) => {
                    pool.getConnection((err, connection) => {
                      if (err) {
                        throw err;
                      } else {
                        const query = "SELECT email FROM users WHERE user_id=?";
                        connection.query(
                          query,
                          [req.session.userId],
                          (err, email) => {
                            if (err) {
                              throw err;
                            } else {
                              const query2 =
                                "SELECT * FROM doctor_details WHERE user_id=?";
                              connection.query(
                                query2,
                                [req.session.userId],
                                (err, results) => {
                                  if (err) {
                                    throw err;
                                  } else {
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
                                    table2 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });
                                    table3 = new PdfTable(doc, {
                                      bottomMargin: 30,
                                    });

                                    pdfName = Math.floor(
                                      Math.random() * (999999 - 100000) + 100000
                                    );
                                    doc.pipe(
                                      fs.createWriteStream(
                                        path.resolve(
                                          __dirname,
                                          `../pdfs/${pdfName}.pdf`
                                        )
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
                                    doc.text(
                                      `NAME:            ${results[0].name}`,
                                      75,
                                      180
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `EMAIL:           ${email[0].email}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `PHONE NO:    ${results[0].phone_no}`
                                    );

                                    doc.moveDown();
                                    doc.text(
                                      `LOCATION:    ${results[0].location}`
                                    );

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();

                                    doc.font("Times-Bold");
                                    doc.fontSize(13);

                                    doc.text(
                                      `YEAR:  '${year}'  PAYMENTS REPORT`,
                                      {
                                        ////// header
                                        underline: true,
                                        width: 595,
                                        align: "center",
                                      }
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("CONSULTATIONS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 100,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "consultation_expiry_time",
                                          header: "Consultation Expiry",
                                          width: 130,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table.addBody(consultationDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Consultations: " +
                                        summary.consultationCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Consultations Payments: Kshs " +
                                        summary.consultationTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("APPOINTMENTS PAYMENTS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table2
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "date",
                                          header: "Date",
                                          width: 80,
                                        },
                                        {
                                          id: "amount",
                                          header: "Amount (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointment_date",
                                          header: "Appointment Date",
                                          width: 100,
                                        },
                                        {
                                          id: "appointment_time",
                                          header: "Appointment Time",
                                          width: 100,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table2.addBody(appointmentDetails);

                                    doc.text("", 0);
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.font("Times-Bold");
                                    doc.text(
                                      "No. Of Appointments: " +
                                        summary.appointmentCount,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      "Total Appointments Payments: Kshs " +
                                        summary.appointmentTotal,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text(
                                      `Total Engagements: ${
                                        summary.appointmentCount +
                                        summary.consultationCount
                                      }`,
                                      75
                                    );
                                    doc.moveDown();
                                    doc.text(
                                      `Total Payments: Kshs ${
                                        summary.appointmentTotal +
                                        summary.consultationTotal
                                      }`,
                                      75
                                    );

                                    doc.moveDown();
                                    doc.moveDown();
                                    doc.text("", 75);
                                    doc.moveDown();
                                    doc.text("PAYMENTS RANKINGS", {
                                      underline: true,
                                    });
                                    doc.text("", 0);
                                    doc.moveDown();

                                    table3
                                      // add some plugins (here, a 'fit-to-width' for a column)
                                      .addPlugin(
                                        new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                          {
                                            column: "name",
                                          }
                                        )
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
                                          header: "Name",
                                          align: "left",
                                        },
                                        {
                                          id: "consultationCount",
                                          header: "Consultations",
                                          width: 75,
                                        },
                                        {
                                          id: "consultationFees",
                                          header:
                                            "Consultations Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "appointmentCount",
                                          header: "Appointments",
                                          width: 75,
                                        },
                                        {
                                          id: "appointmentFees",
                                          header:
                                            "Appointments Payments (Kshs)",
                                          width: 80,
                                        },
                                        {
                                          id: "totalFees",
                                          header: "Total Payments (Kshs)",
                                          width: 70,
                                        },
                                      ]);
                                    doc.moveDown();
                                    doc.font("Times-Roman");

                                    table3.addBody(userDetails);

                                    doc.text("", 0);
                                    doc.moveDown();

                                    doc.end();
                                    resolve();
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
                  generatePdf.then(() => {
                    userDetails.sort((a, b) => b.totalFees - a.totalFees);
                    return res.render("payment-records", {
                      pdfName: `${pdfName}.pdf`,
                      accountType: req.session.accountType,
                      filterType: "year",
                      all: "",
                      search: "",
                      date: "",
                      month: "",
                      year: "selected",
                      lastWeek: "",
                      lastMonth: "",
                      searchValue: "",
                      dateValue: "",
                      monthValue: "",
                      yearValue: year,
                      summary: summary,
                      consultationDetails: consultationDetails,
                      appointmentDetails: appointmentDetails,
                      userDetails: userDetails,
                    });
                  });
                });
              });
            });
          });
        }
      }
    }

    /////// last week
    else if (req.body.select == "last-week") {
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

      if (req.session.accountType == "patient") {
        ///// patient account

        const getSummary = new Promise((resolve, reject) => {
          let summary = {
            consultationCount: 0,
            consultationTotal: 0,
            appointmentCount: 0,
            appointmentTotal: 0,
          };
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                  date2,
                  today,
                ],
                (err, results1) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results1.length) {
                      summary.consultationCount = results1[0].count;
                      summary.consultationTotal = results1[0].sum;

                      const query2 =
                        "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
                      connection.query(
                        query2,
                        [
                          req.session.userId,
                          "The service request is processed successfully.",
                          date2,
                          today,
                        ],
                        (err, results2) => {
                          if (err) {
                            throw err;
                          } else {
                            if (results2.length) {
                              summary.appointmentCount = results2[0].count;
                              summary.appointmentTotal = results2[0].sum;
                              resolve(summary);
                            } else {
                              resolve(summary);
                            }
                          }
                        }
                      );
                    } else {
                      resolve(summary);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getSummary.then((summary) => {
          const getConsultationDetails = new Promise((resolve, reject) => {
            let consultationDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    date2,
                    today,
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                consultationDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(consultationDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(consultationDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getConsultationDetails.then((consultationDetails) => {
            const getAppointmentDetails = new Promise((resolve, reject) => {
              let appointmentDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date BETWEEN ? AND ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      date2,
                      today,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  appointmentDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(appointmentDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(appointmentDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getAppointmentDetails.then((appointmentDetails) => {
              const getUserDetails = new Promise((resolve, reject) => {
                let userDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT * FROM doctor_details";
                    connection.query(query, (err, users) => {
                      if (err) {
                        throw err;
                      } else {
                        if (users.length) {
                          for (let i = 0; i < users.length; i++) {
                            const query2 =
                              "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date BETWEEN ? AND ?";
                            connection.query(
                              query2,
                              [
                                users[i].user_id,
                                req.session.userId,
                                "The service request is processed successfully.",
                                date2,
                                today,
                              ],
                              (err, results1) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (results1.length) {
                                    users[i].consultationCount =
                                      results1[0].count;
                                    users[i].consultationFees = results1[0].sum;
                                    if (users[i].consultationFees == null) {
                                      users[i].consultationFees = 0;
                                    }
                                  } else {
                                    users[i].consultationCount = 0;
                                    users[i].consultationFees = 0;
                                  }

                                  const query3 =
                                    "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date BETWEEN ? AND ?";
                                  connection.query(
                                    query3,
                                    [
                                      users[i].user_id,
                                      req.session.userId,
                                      "The service request is processed successfully.",
                                      date2,
                                      today,
                                    ],
                                    (err, results2) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results2.length) {
                                          users[i].appointmentCount =
                                            results2[0].count;
                                          users[i].appointmentFees =
                                            results2[0].sum;
                                          if (
                                            users[i].appointmentFees == null
                                          ) {
                                            users[i].appointmentFees = 0;
                                          }
                                        } else {
                                          users[i].appointmentCount = 0;
                                          users[i].appointmentFees = 0;
                                        }

                                        users[i].totalFees =
                                          users[i].consultationFees +
                                          users[i].appointmentFees;
                                        userDetails.push(users[i]);

                                        if (i == users.length - 1) {
                                          resolve(userDetails);
                                        }
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          }
                        } else {
                          resolve(userDetails);
                        }
                      }
                    });
                  }
                  connection.release();
                });
              });
              getUserDetails.then((userDetails) => {
                const generatePdf = new Promise((resolve, reject) => {
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT email FROM users WHERE user_id=?";
                      connection.query(
                        query,
                        [req.session.userId],
                        (err, email) => {
                          if (err) {
                            throw err;
                          } else {
                            const query2 =
                              "SELECT * FROM patient_details WHERE user_id=?";
                            connection.query(
                              query2,
                              [req.session.userId],
                              (err, results) => {
                                if (err) {
                                  throw err;
                                } else {
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
                                  table2 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });
                                  table3 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });

                                  pdfName = Math.floor(
                                    Math.random() * (999999 - 100000) + 100000
                                  );
                                  doc.pipe(
                                    fs.createWriteStream(
                                      path.resolve(
                                        __dirname,
                                        `../pdfs/${pdfName}.pdf`
                                      )
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
                                  doc.text(
                                    `NAME:            ${results[0].name}`,
                                    75,
                                    180
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `EMAIL:           ${email[0].email}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `PHONE NO:    ${results[0].phone_no}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `LOCATION:    ${results[0].location}`
                                  );

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();

                                  doc.font("Times-Bold");
                                  doc.fontSize(13);

                                  doc.text(
                                    `'${date2}'  TO  '${today}'  PAYMENTS REPORT`,
                                    {
                                      ////// header
                                      underline: true,
                                      width: 595,
                                      align: "center",
                                    }
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("CONSULTATIONS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 100,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "consultation_expiry_time",
                                        header: "Consultation Expiry",
                                        width: 130,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table.addBody(consultationDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Consultations: " +
                                      summary.consultationCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Consultations Payments: Kshs " +
                                      summary.consultationTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("APPOINTMENTS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table2
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 80,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointment_date",
                                        header: "Appointment Date",
                                        width: 100,
                                      },
                                      {
                                        id: "appointment_time",
                                        header: "Appointment Time",
                                        width: 100,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table2.addBody(appointmentDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Appointments: " +
                                      summary.appointmentCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Appointments Payments: Kshs " +
                                      summary.appointmentTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text(
                                    `Total Engagements: ${
                                      summary.appointmentCount +
                                      summary.consultationCount
                                    }`,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    `Total Payments: Kshs ${
                                      summary.appointmentTotal +
                                      summary.consultationTotal
                                    }`,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("PAYMENTS RANKINGS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table3
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "consultationCount",
                                        header: "Consultations",
                                        width: 75,
                                      },
                                      {
                                        id: "consultationFees",
                                        header: "Consultations Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointmentCount",
                                        header: "Appointments",
                                        width: 75,
                                      },
                                      {
                                        id: "appointmentFees",
                                        header: "Appointments Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "totalFees",
                                        header: "Total Payments (Kshs)",
                                        width: 70,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table3.addBody(userDetails);

                                  doc.text("", 0);
                                  doc.moveDown();

                                  doc.end();
                                  resolve();
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
                generatePdf.then(() => {
                  userDetails.sort((a, b) => b.totalFees - a.totalFees);
                  return res.render("payment-records", {
                    pdfName: `${pdfName}.pdf`,
                    accountType: req.session.accountType,
                    filterType: "lastWeek",
                    all: "",
                    search: "",
                    date: "",
                    month: "",
                    year: "",
                    lastWeek: "selected",
                    lastMonth: "",
                    searchValue: "",
                    dateValue: "",
                    monthValue: "",
                    yearValue: "",
                    summary: summary,
                    consultationDetails: consultationDetails,
                    appointmentDetails: appointmentDetails,
                    userDetails: userDetails,
                  });
                });
              });
            });
          });
        });
      } else {
        //// doctor account

        const getSummary = new Promise((resolve, reject) => {
          let summary = {
            consultationCount: 0,
            consultationTotal: 0,
            appointmentCount: 0,
            appointmentTotal: 0,
          };
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                  date2,
                  today,
                ],
                (err, results1) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results1.length) {
                      summary.consultationCount = results1[0].count;
                      summary.consultationTotal = results1[0].sum;

                      const query2 =
                        "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                      connection.query(
                        query2,
                        [
                          req.session.userId,
                          "The service request is processed successfully.",
                          date2,
                          today,
                        ],
                        (err, results2) => {
                          if (err) {
                            throw err;
                          } else {
                            if (results2.length) {
                              summary.appointmentCount = results2[0].count;
                              summary.appointmentTotal = results2[0].sum;
                              resolve(summary);
                            } else {
                              resolve(summary);
                            }
                          }
                        }
                      );
                    } else {
                      resolve(summary);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getSummary.then((summary) => {
          const getConsultationDetails = new Promise((resolve, reject) => {
            let consultationDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    date2,
                    today,
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                consultationDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(consultationDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(consultationDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getConsultationDetails.then((consultationDetails) => {
            const getAppointmentDetails = new Promise((resolve, reject) => {
              let appointmentDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      date2,
                      today,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  appointmentDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(appointmentDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(appointmentDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getAppointmentDetails.then((appointmentDetails) => {
              const getUserDetails = new Promise((resolve, reject) => {
                let userDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT user_id, name FROM patient_details";
                    connection.query(query, (err, users) => {
                      if (err) {
                        throw err;
                      } else {
                        if (users.length) {
                          for (let i = 0; i < users.length; i++) {
                            const query2 =
                              "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                            connection.query(
                              query2,
                              [
                                users[i].user_id,
                                req.session.userId,
                                "The service request is processed successfully.",
                                date2,
                                today,
                              ],
                              (err, results1) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (results1.length) {
                                    users[i].consultationCount =
                                      results1[i].count;
                                    users[i].consultationFees = results1[i].sum;
                                    if (users[i].consultationFees == null) {
                                      users[i].consultationFees = 0;
                                    }
                                  } else {
                                    users[i].consultationCount = 0;
                                    users[i].consultationFees = 0;
                                  }

                                  const query3 =
                                    "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                                  connection.query(
                                    query3,
                                    [
                                      users[i].user_id,
                                      req.session.userId,
                                      "The service request is processed successfully.",
                                      date2,
                                      today,
                                    ],
                                    (err, results2) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results2.length) {
                                          users[i].appointmentCount =
                                            results2[i].count;
                                          users[i].appointmentFees =
                                            results2[i].sum;
                                          if (
                                            users[i].appointmentFees == null
                                          ) {
                                            users[i].appointmentFees = 0;
                                          }
                                        } else {
                                          users[i].appointmentCount = 0;
                                          users[i].appointmentFees = 0;
                                        }

                                        users[i].totalFees =
                                          users[i].consultationFees +
                                          users[i].appointmentFees;
                                        userDetails.push(users[i]);

                                        if (i == users.length - 1) {
                                          resolve(userDetails);
                                        }
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          }
                        } else {
                          resolve(userDetails);
                        }
                      }
                    });
                  }
                  connection.release();
                });
              });
              getUserDetails.then((userDetails) => {
                const generatePdf = new Promise((resolve, reject) => {
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT email FROM users WHERE user_id=?";
                      connection.query(
                        query,
                        [req.session.userId],
                        (err, email) => {
                          if (err) {
                            throw err;
                          } else {
                            const query2 =
                              "SELECT * FROM doctor_details WHERE user_id=?";
                            connection.query(
                              query2,
                              [req.session.userId],
                              (err, results) => {
                                if (err) {
                                  throw err;
                                } else {
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
                                  table2 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });
                                  table3 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });

                                  pdfName = Math.floor(
                                    Math.random() * (999999 - 100000) + 100000
                                  );
                                  doc.pipe(
                                    fs.createWriteStream(
                                      path.resolve(
                                        __dirname,
                                        `../pdfs/${pdfName}.pdf`
                                      )
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
                                  doc.text(
                                    `NAME:            ${results[0].name}`,
                                    75,
                                    180
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `EMAIL:           ${email[0].email}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `PHONE NO:    ${results[0].phone_no}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `LOCATION:    ${results[0].location}`
                                  );

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();

                                  doc.font("Times-Bold");
                                  doc.fontSize(13);

                                  doc.text(
                                    `'${date2}'  TO  '${today}'  PAYMENTS REPORT`,
                                    {
                                      ////// header
                                      underline: true,
                                      width: 595,
                                      align: "center",
                                    }
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("CONSULTATIONS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 100,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "consultation_expiry_time",
                                        header: "Consultation Expiry",
                                        width: 130,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table.addBody(consultationDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Consultations: " +
                                      summary.consultationCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Consultations Payments: Kshs " +
                                      summary.consultationTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("APPOINTMENTS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table2
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 80,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointment_date",
                                        header: "Appointment Date",
                                        width: 100,
                                      },
                                      {
                                        id: "appointment_time",
                                        header: "Appointment Time",
                                        width: 100,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table2.addBody(appointmentDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Appointments: " +
                                      summary.appointmentCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Appointments Payments: Kshs " +
                                      summary.appointmentTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text(
                                    `Total Engagements: ${
                                      summary.appointmentCount +
                                      summary.consultationCount
                                    }`,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    `Total Payments: Kshs ${
                                      summary.appointmentTotal +
                                      summary.consultationTotal
                                    }`,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("PAYMENTS RANKINGS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table3
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "consultationCount",
                                        header: "Consultations",
                                        width: 75,
                                      },
                                      {
                                        id: "consultationFees",
                                        header: "Consultations Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointmentCount",
                                        header: "Appointments",
                                        width: 75,
                                      },
                                      {
                                        id: "appointmentFees",
                                        header: "Appointments Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "totalFees",
                                        header: "Total Payments (Kshs)",
                                        width: 70,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table3.addBody(userDetails);

                                  doc.text("", 0);
                                  doc.moveDown();

                                  doc.end();
                                  resolve();
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
                generatePdf.then(() => {
                  userDetails.sort((a, b) => b.totalFees - a.totalFees);
                  return res.render("payment-records", {
                    pdfName: `${pdfName}.pdf`,
                    accountType: req.session.accountType,
                    filterType: "lastWeek",
                    all: "",
                    search: "",
                    date: "",
                    month: "",
                    year: "",
                    lastWeek: "selected",
                    lastMonth: "",
                    searchValue: "",
                    dateValue: "",
                    monthValue: "",
                    yearValue: year,
                    summary: summary,
                    consultationDetails: consultationDetails,
                    appointmentDetails: appointmentDetails,
                    userDetails: userDetails,
                  });
                });
              });
            });
          });
        });
      }
    }

    /////// last month
    else if (req.body.select == "last-month") {
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

      if (req.session.accountType == "patient") {
        ///// patient account

        const getSummary = new Promise((resolve, reject) => {
          let summary = {
            consultationCount: 0,
            consultationTotal: 0,
            appointmentCount: 0,
            appointmentTotal: 0,
          };
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                  date2,
                  today,
                ],
                (err, results1) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results1.length) {
                      summary.consultationCount = results1[0].count;
                      summary.consultationTotal = results1[0].sum;

                      const query2 =
                        "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
                      connection.query(
                        query2,
                        [
                          req.session.userId,
                          "The service request is processed successfully.",
                          date2,
                          today,
                        ],
                        (err, results2) => {
                          if (err) {
                            throw err;
                          } else {
                            if (results2.length) {
                              summary.appointmentCount = results2[0].count;
                              summary.appointmentTotal = results2[0].sum;
                              resolve(summary);
                            } else {
                              resolve(summary);
                            }
                          }
                        }
                      );
                    } else {
                      resolve(summary);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getSummary.then((summary) => {
          const getConsultationDetails = new Promise((resolve, reject) => {
            let consultationDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM consultations_stk_push WHERE patient_id = ? and status = ? and date BETWEEN ? AND ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    date2,
                    today,
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM doctor_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].doctor_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                consultationDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(consultationDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(consultationDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getConsultationDetails.then((consultationDetails) => {
            const getAppointmentDetails = new Promise((resolve, reject) => {
              let appointmentDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments_stk_push WHERE patient_id = ? AND status = ? and date BETWEEN ? AND ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      date2,
                      today,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM doctor_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].doctor_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  appointmentDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(appointmentDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(appointmentDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getAppointmentDetails.then((appointmentDetails) => {
              const getUserDetails = new Promise((resolve, reject) => {
                let userDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT * FROM doctor_details";
                    connection.query(query, (err, users) => {
                      if (err) {
                        throw err;
                      } else {
                        if (users.length) {
                          for (let i = 0; i < users.length; i++) {
                            const query2 =
                              "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? AND patient_id = ? AND status =? and date BETWEEN ? AND ?";
                            connection.query(
                              query2,
                              [
                                users[i].user_id,
                                req.session.userId,
                                "The service request is processed successfully.",
                                date2,
                                today,
                              ],
                              (err, results1) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (results1.length) {
                                    users[i].consultationCount =
                                      results1[0].count;
                                    users[i].consultationFees = results1[0].sum;
                                    if (users[i].consultationFees == null) {
                                      users[i].consultationFees = 0;
                                    }
                                  } else {
                                    users[i].consultationCount = 0;
                                    users[i].consultationFees = 0;
                                  }

                                  const query3 =
                                    "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? AND patient_id = ? and status = ? and date BETWEEN ? AND ?";
                                  connection.query(
                                    query3,
                                    [
                                      users[i].user_id,
                                      req.session.userId,
                                      "The service request is processed successfully.",
                                      date2,
                                      today,
                                    ],
                                    (err, results2) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results2.length) {
                                          users[i].appointmentCount =
                                            results2[0].count;
                                          users[i].appointmentFees =
                                            results2[0].sum;
                                          if (
                                            users[i].appointmentFees == null
                                          ) {
                                            users[i].appointmentFees = 0;
                                          }
                                        } else {
                                          users[i].appointmentCount = 0;
                                          users[i].appointmentFees = 0;
                                        }

                                        users[i].totalFees =
                                          users[i].consultationFees +
                                          users[i].appointmentFees;
                                        userDetails.push(users[i]);

                                        if (i == users.length - 1) {
                                          resolve(userDetails);
                                        }
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          }
                        } else {
                          resolve(userDetails);
                        }
                      }
                    });
                  }
                  connection.release();
                });
              });
              getUserDetails.then((userDetails) => {
                const generatePdf = new Promise((resolve, reject) => {
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT email FROM users WHERE user_id=?";
                      connection.query(
                        query,
                        [req.session.userId],
                        (err, email) => {
                          if (err) {
                            throw err;
                          } else {
                            const query2 =
                              "SELECT * FROM patient_details WHERE user_id=?";
                            connection.query(
                              query2,
                              [req.session.userId],
                              (err, results) => {
                                if (err) {
                                  throw err;
                                } else {
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
                                  table2 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });
                                  table3 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });

                                  pdfName = Math.floor(
                                    Math.random() * (999999 - 100000) + 100000
                                  );
                                  doc.pipe(
                                    fs.createWriteStream(
                                      path.resolve(
                                        __dirname,
                                        `../pdfs/${pdfName}.pdf`
                                      )
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
                                  doc.text(
                                    `NAME:            ${results[0].name}`,
                                    75,
                                    180
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `EMAIL:           ${email[0].email}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `PHONE NO:    ${results[0].phone_no}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `LOCATION:    ${results[0].location}`
                                  );

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();

                                  doc.font("Times-Bold");
                                  doc.fontSize(13);

                                  doc.text(
                                    `'${date2}'  TO  '${today}'  PAYMENTS REPORT`,
                                    {
                                      ////// header
                                      underline: true,
                                      width: 595,
                                      align: "center",
                                    }
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("CONSULTATIONS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 100,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "consultation_expiry_time",
                                        header: "Consultation Expiry",
                                        width: 130,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table.addBody(consultationDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Consultations: " +
                                      summary.consultationCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Consultations Payments: Kshs " +
                                      summary.consultationTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("APPOINTMENTS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table2
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 80,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointment_date",
                                        header: "Appointment Date",
                                        width: 100,
                                      },
                                      {
                                        id: "appointment_time",
                                        header: "Appointment Time",
                                        width: 100,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table2.addBody(appointmentDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Appointments: " +
                                      summary.appointmentCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Appointments Payments: Kshs " +
                                      summary.appointmentTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text(
                                    `Total Engagements: ${
                                      summary.appointmentCount +
                                      summary.consultationCount
                                    }`,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    `Total Payments: Kshs ${
                                      summary.appointmentTotal +
                                      summary.consultationTotal
                                    }`,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("PAYMENTS RANKINGS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table3
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "consultationCount",
                                        header: "Consultations",
                                        width: 75,
                                      },
                                      {
                                        id: "consultationFees",
                                        header: "Consultations Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointmentCount",
                                        header: "Appointments",
                                        width: 75,
                                      },
                                      {
                                        id: "appointmentFees",
                                        header: "Appointments Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "totalFees",
                                        header: "Total Payments (Kshs)",
                                        width: 70,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table3.addBody(userDetails);

                                  doc.text("", 0);
                                  doc.moveDown();

                                  doc.end();
                                  resolve();
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
                generatePdf.then(() => {
                  userDetails.sort((a, b) => b.totalFees - a.totalFees);
                  return res.render("payment-records", {
                    pdfName: `${pdfName}.pdf`,
                    accountType: req.session.accountType,
                    filterType: "lastMonth",
                    all: "",
                    search: "",
                    date: "",
                    month: "",
                    year: "",
                    lastWeek: "",
                    lastMonth: "selected",
                    searchValue: "",
                    dateValue: "",
                    monthValue: "",
                    yearValue: year,
                    summary: summary,
                    consultationDetails: consultationDetails,
                    appointmentDetails: appointmentDetails,
                    userDetails: userDetails,
                  });
                });
              });
            });
          });
        });
      } else {
        //// doctor account

        const getSummary = new Promise((resolve, reject) => {
          let summary = {
            consultationCount: 0,
            consultationTotal: 0,
            appointmentCount: 0,
            appointmentTotal: 0,
          };
          pool.getConnection((err, connection) => {
            if (err) {
              throw err;
            } else {
              const query =
                "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
              connection.query(
                query,
                [
                  req.session.userId,
                  "The service request is processed successfully.",
                  date2,
                  today,
                ],
                (err, results1) => {
                  if (err) {
                    throw err;
                  } else {
                    if (results1.length) {
                      summary.consultationCount = results1[0].count;
                      summary.consultationTotal = results1[0].sum;

                      const query2 =
                        "SELECT COUNT(*) AS count, SUM(amount) AS sum FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                      connection.query(
                        query2,
                        [
                          req.session.userId,
                          "The service request is processed successfully.",
                          date2,
                          today,
                        ],
                        (err, results2) => {
                          if (err) {
                            throw err;
                          } else {
                            if (results2.length) {
                              summary.appointmentCount = results2[0].count;
                              summary.appointmentTotal = results2[0].sum;
                              resolve(summary);
                            } else {
                              resolve(summary);
                            }
                          }
                        }
                      );
                    } else {
                      resolve(summary);
                    }
                  }
                }
              );
            }
            connection.release();
          });
        });
        getSummary.then((summary) => {
          const getConsultationDetails = new Promise((resolve, reject) => {
            let consultationDetails = [];
            pool.getConnection((err, connection) => {
              if (err) {
                throw err;
              } else {
                const query =
                  "SELECT * FROM consultations_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                connection.query(
                  query,
                  [
                    req.session.userId,
                    "The service request is processed successfully.",
                    date2,
                    today,
                  ],
                  (err, results) => {
                    if (err) {
                      throw err;
                    } else {
                      if (results.length) {
                        for (let i = 0; i < results.length; i++) {
                          const query2 =
                            "SELECT name FROM patient_details WHERE user_id = ?";
                          connection.query(
                            query2,
                            [results[i].patient_id],
                            (err, result) => {
                              if (err) {
                                throw err;
                              } else {
                                results[i].name = result[0].name;
                                consultationDetails.push(results[i]);

                                if (i == results.length - 1) {
                                  resolve(consultationDetails);
                                }
                              }
                            }
                          );
                        }
                      } else {
                        resolve(consultationDetails);
                      }
                    }
                  }
                );
              }
              connection.release();
            });
          });
          getConsultationDetails.then((consultationDetails) => {
            const getAppointmentDetails = new Promise((resolve, reject) => {
              let appointmentDetails = [];
              pool.getConnection((err, connection) => {
                if (err) {
                  throw err;
                } else {
                  const query =
                    "SELECT * FROM appointments_stk_push WHERE doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                  connection.query(
                    query,
                    [
                      req.session.userId,
                      "The service request is processed successfully.",
                      date2,
                      today,
                    ],
                    (err, results) => {
                      if (err) {
                        throw err;
                      } else {
                        if (results.length) {
                          for (let i = 0; i < results.length; i++) {
                            const query2 =
                              "SELECT name FROM patient_details WHERE user_id = ?";
                            connection.query(
                              query2,
                              [results[i].patient_id],
                              (err, result) => {
                                if (err) {
                                  throw err;
                                } else {
                                  results[i].name = result[0].name;
                                  appointmentDetails.push(results[i]);

                                  if (i == results.length - 1) {
                                    resolve(appointmentDetails);
                                  }
                                }
                              }
                            );
                          }
                        } else {
                          resolve(appointmentDetails);
                        }
                      }
                    }
                  );
                }
                connection.release();
              });
            });
            getAppointmentDetails.then((appointmentDetails) => {
              const getUserDetails = new Promise((resolve, reject) => {
                let userDetails = [];
                pool.getConnection((err, connection) => {
                  if (err) {
                    throw err;
                  } else {
                    const query = "SELECT user_id, name FROM patient_details";
                    connection.query(query, (err, users) => {
                      if (err) {
                        throw err;
                      } else {
                        if (users.length) {
                          for (let i = 0; i < users.length; i++) {
                            const query2 =
                              "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM consultations_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                            connection.query(
                              query2,
                              [
                                users[i].user_id,
                                req.session.userId,
                                "The service request is processed successfully.",
                                date2,
                                today,
                              ],
                              (err, results1) => {
                                if (err) {
                                  throw err;
                                } else {
                                  if (results1.length) {
                                    users[i].consultationCount =
                                      results1[i].count;
                                    users[i].consultationFees = results1[i].sum;
                                    if (users[i].consultationFees == null) {
                                      users[i].consultationFees = 0;
                                    }
                                  } else {
                                    users[i].consultationCount = 0;
                                    users[i].consultationFees = 0;
                                  }

                                  const query3 =
                                    "SELECT COUNT(*) AS count , SUM(amount) AS sum FROM appointments_stk_push WHERE patient_id = ? AND doctor_id = ? and status = ? and date BETWEEN ? AND ?";
                                  connection.query(
                                    query3,
                                    [
                                      users[i].user_id,
                                      req.session.userId,
                                      "The service request is processed successfully.",
                                      date2,
                                      today,
                                    ],
                                    (err, results2) => {
                                      if (err) {
                                        throw err;
                                      } else {
                                        if (results2.length) {
                                          users[i].appointmentCount =
                                            results2[i].count;
                                          users[i].appointmentFees =
                                            results2[i].sum;
                                          if (
                                            users[i].appointmentFees == null
                                          ) {
                                            users[i].appointmentFees = 0;
                                          }
                                        } else {
                                          users[i].appointmentCount = 0;
                                          users[i].appointmentFees = 0;
                                        }

                                        users[i].totalFees =
                                          users[i].consultationFees +
                                          users[i].appointmentFees;
                                        userDetails.push(users[i]);

                                        if (i == users.length - 1) {
                                          resolve(userDetails);
                                        }
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          }
                        } else {
                          resolve(userDetails);
                        }
                      }
                    });
                  }
                  connection.release();
                });
              });
              getUserDetails.then((userDetails) => {
                const generatePdf = new Promise((resolve, reject) => {
                  pool.getConnection((err, connection) => {
                    if (err) {
                      throw err;
                    } else {
                      const query = "SELECT email FROM users WHERE user_id=?";
                      connection.query(
                        query,
                        [req.session.userId],
                        (err, email) => {
                          if (err) {
                            throw err;
                          } else {
                            const query2 =
                              "SELECT * FROM doctor_details WHERE user_id=?";
                            connection.query(
                              query2,
                              [req.session.userId],
                              (err, results) => {
                                if (err) {
                                  throw err;
                                } else {
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
                                  table2 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });
                                  table3 = new PdfTable(doc, {
                                    bottomMargin: 30,
                                  });

                                  pdfName = Math.floor(
                                    Math.random() * (999999 - 100000) + 100000
                                  );
                                  doc.pipe(
                                    fs.createWriteStream(
                                      path.resolve(
                                        __dirname,
                                        `../pdfs/${pdfName}.pdf`
                                      )
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
                                  doc.text(
                                    `NAME:            ${results[0].name}`,
                                    75,
                                    180
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `EMAIL:           ${email[0].email}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `PHONE NO:    ${results[0].phone_no}`
                                  );

                                  doc.moveDown();
                                  doc.text(
                                    `LOCATION:    ${results[0].location}`
                                  );

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();

                                  doc.font("Times-Bold");
                                  doc.fontSize(13);

                                  doc.text(
                                    `'${date2}'  TO  '${today}'  PAYMENTS REPORT`,
                                    {
                                      ////// header
                                      underline: true,
                                      width: 595,
                                      align: "center",
                                    }
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("CONSULTATIONS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 100,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "consultation_expiry_time",
                                        header: "Consultation Expiry",
                                        width: 130,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table.addBody(consultationDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Consultations: " +
                                      summary.consultationCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Consultations Payments: Kshs " +
                                      summary.consultationTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("APPOINTMENTS PAYMENTS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table2
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "date",
                                        header: "Date",
                                        width: 80,
                                      },
                                      {
                                        id: "amount",
                                        header: "Amount (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointment_date",
                                        header: "Appointment Date",
                                        width: 100,
                                      },
                                      {
                                        id: "appointment_time",
                                        header: "Appointment Time",
                                        width: 100,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table2.addBody(appointmentDetails);

                                  doc.text("", 0);
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.font("Times-Bold");
                                  doc.text(
                                    "No. Of Appointments: " +
                                      summary.appointmentCount,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    "Total Appointments Payments: Kshs " +
                                      summary.appointmentTotal,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text(
                                    `Total Engagements: ${
                                      summary.appointmentCount +
                                      summary.consultationCount
                                    }`,
                                    75
                                  );
                                  doc.moveDown();
                                  doc.text(
                                    `Total Payments: Kshs ${
                                      summary.appointmentTotal +
                                      summary.consultationTotal
                                    }`,
                                    75
                                  );

                                  doc.moveDown();
                                  doc.moveDown();
                                  doc.text("", 75);
                                  doc.moveDown();
                                  doc.text("PAYMENTS RANKINGS", {
                                    underline: true,
                                  });
                                  doc.text("", 0);
                                  doc.moveDown();

                                  table3
                                    // add some plugins (here, a 'fit-to-width' for a column)
                                    .addPlugin(
                                      new (require("voilab-pdf-table/plugins/fitcolumn"))(
                                        {
                                          column: "name",
                                        }
                                      )
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
                                        header: "Name",
                                        align: "left",
                                      },
                                      {
                                        id: "consultationCount",
                                        header: "Consultations",
                                        width: 75,
                                      },
                                      {
                                        id: "consultationFees",
                                        header: "Consultations Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "appointmentCount",
                                        header: "Appointments",
                                        width: 75,
                                      },
                                      {
                                        id: "appointmentFees",
                                        header: "Appointments Payments (Kshs)",
                                        width: 80,
                                      },
                                      {
                                        id: "totalFees",
                                        header: "Total Payments (Kshs)",
                                        width: 70,
                                      },
                                    ]);
                                  doc.moveDown();
                                  doc.font("Times-Roman");

                                  table3.addBody(userDetails);

                                  doc.text("", 0);
                                  doc.moveDown();

                                  doc.end();
                                  resolve();
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
                generatePdf.then(() => {
                  userDetails.sort((a, b) => b.totalFees - a.totalFees);
                  return res.render("payment-records", {
                    pdfName: `${pdfName}.pdf`,
                    accountType: req.session.accountType,
                    filterType: "lastMonth",
                    all: "",
                    search: "",
                    date: "",
                    month: "",
                    year: "",
                    lastWeek: "",
                    lastMonth: "selected",
                    searchValue: "",
                    dateValue: "",
                    monthValue: "",
                    yearValue: year,
                    summary: summary,
                    consultationDetails: consultationDetails,
                    appointmentDetails: appointmentDetails,
                    userDetails: userDetails,
                  });
                });
              });
            });
          });
        });
      }
    }
  } else {
    return res.redirect("/login");
  }
});

module.exports = router;
