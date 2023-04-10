const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");
const { log } = require("console");

let doctorId = 1;

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
    if (err)console.log(err);
    else {
      const save = new Promise((resolve, reject) => {
        days.forEach((day) => {
          const query =
            "SELECT * FROM appointment_slots WHERE doctor_id= ? AND day = ?";
          connection.query(query, [doctorId, day], (err, result) => {
            if (err) console.log(err);

            if(result.length){
                const query = "UPDATE appointment_slots SET slots=? WHERE doctor_id =? AND day =?";
                connection.query(query, [timeJson, doctorId, day],(err,data)=>{
                    if(err)console.log(err);
                    else{
                        console.log(`${day} updated successfully`);
                    }
                })
            }
            
            else{
                const query = "INSERT INTO appointment_slots(`doctor_id`, `day`, `slots`) VALUES(?)";
                const values = [doctorId, day ,timeJson];
                connection.query(query, [values],(err,data)=>{
                    if(err)console.log(err);
                    else{
                        console.log(`${day} inserted successfully`);
                    }
                })
            }
          });
        });
      });
    }
  });
});

module.exports = router;
