const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");
const { log } = require("console");

let doctorId = 2;

router.get("/customize-appointment-slots", (req, res) => {
  res.render("appointment-slots");
});

router.post("/customize-appointment-slots", (req, res) => {
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

  pool.getConnection((err, connection) => {
    if (err) console.log(err);
    else {
      const save = new Promise((resolve, reject) => {
        days.forEach((day) => {
          const query =
            "SELECT * FROM appointment_slots WHERE doctor_id= ? AND day = ?";
          connection.query(query, [doctorId, day], (err, result) => {
            if (err) console.log(err);

            if (result.length) {
              const query =
                "UPDATE appointment_slots SET slots=? WHERE doctor_id =? AND day =?";
              connection.query(
                query,
                [timeJson, doctorId, day],
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
              const values = [doctorId, day, timeJson];
              connection.query(query, [values], (err, data) => {
                if (err) console.log(err);
                else {
                  console.log(`${day} inserted successfully`);
                }
              });
            }
          });
        });
      });
    }
  });
});



let appointmentSlots = [];
let chosenDate = "";

router.get("/book-appointment", (req, res) => {
  pool.getConnection((err, connection) => {
    const query =
      "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
    connection.query(query, [doctorId], (err, results) => {
      if (err) console.log(err);
      else {
        console.log(results);

        var string = JSON.stringify(results);
        var details = JSON.parse(string);

        appointmentSlots = [];
        chosenDate = ""

        return res.render("book-appointment", {
          details: details,
          appointmentSlots: appointmentSlots,
          chosenDate: chosenDate
        });
      }
    });
  });
});

router.post("/book-appointment", (req, res) => {

  let details = [];

  if(req.body.submitType == "date change"){  /// reload after date change
    
  const getDetails = new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      const query =
        "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
      connection.query(query, [doctorId], (err, results) => {
        if (err) throw err;
        else {
          console.log(results);

          var string = JSON.stringify(results);
          details = JSON.parse(string);

          resolve(details);

        }
      });
    });
  });

  getDetails.then((details) => {
    appointmentSlots = [];
    chosenDate = req.body.date;

    let date = new Date(req.body.date);

    let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dayIndex = date.getDay();
    let day =  weekdays[dayIndex];

    pool.getConnection((err, connection) => {
      const query =
        "SELECT slots FROM appointment_slots where doctor_id = ? AND day = ?";
      connection.query(query, [1, day], (err, results) => {
        if (err) throw err;

      if(results.length){
        console.log(results);
        console.log(results[0].slots);
        console.log(JSON.parse(results[0].slots));
        
        appointmentSlots = JSON.parse(results[0].slots);
      }

      return res.render("book-appointment", { details: details, appointmentSlots:appointmentSlots, chosenDate: chosenDate });
        
      });
    });

  });
  }



  else{ //// for saving appointments to the database  // check if more than two selected  //add 

    console.log(`Appointments(saving) :  ${appointmentSlots}`);
    appointmentSlots.forEach((slot)=>{
      console.log(slot);
    })
  }

});

module.exports = router;
