const express = require('express');
const router = express.Router();

const pool = require('../server.js');

const path = require('path');
const { time } = require('console');
const { resolve } = require('path');

router.use(express.static(path.resolve("./node_modules")));


//                       GET 


router.get('/', (req, res) => {

    if (req.session.authenticated) {


        pool.getConnection((err, connection) => {
            if (err) console.log(err);
            else {
                if (req.session.accountType == "patient") {
                    const query = "SELECT name, cancer_type FROM patient_details where user_id = ?";
                    connection.query(query, [req.session.userId], (err, results) => {
                        if (err) console.log(err);
                        else {
                            if (results.length) {

                                var string = JSON.stringify(results);
                                var json = JSON.parse(string);

                                var name = json[0].name;
                                var cancerType = json[0].cancer_type;

                                if (cancerType == "") {
                                    return res.redirect('/register/patient/medical-details')
                                } else {
                                    return res.render('index')
                                }

                            } else {
                                return res.redirect('/register/patient')
                            }
                        }
                    })



                } else if (req.session.accountType == "doctor") {

                    const query = "SELECT name, cancer_speciality FROM doctor_details where user_id = ?";
                    connection.query(query, [req.session.userId], (err, results) => {
                        if (err) console.log(err);
                        else {
                            if (results.length) {

                                var string = JSON.stringify(results);
                                var json = JSON.parse(string);

                                var name = json[0].name;
                                var cancerSpeciality = json[0].cancer_speciality;

                                if (cancerSpeciality == "") {
                                    return res.redirect('/register/doctor/professional-details')
                                }
                                else {
                                    return res.render('index')
                                }


                            } else {
                                return res.redirect('/register/doctor')
                            }
                        }
                    })

                }
            }

            connection.release();
        })



    } else {
        return res.redirect('/login');
    }

})


router.get('/doctors', (req, res) => {

    pool.getConnection((err, connection) => {
        if (err) console.log(err);
        else {
            const query = "SELECT user_id, name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details";
            connection.query(query, (err, results) => {
                if (err) console.log(err);
                else {
                    console.log(results);
                    return res.render("doctors", { details: results });
                }
            })
        }
        connection.release();
    })

})



// router.get('/book-appointment', (req, res) => {

//     pool.getConnection((err, connection) => {
//         const query = "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
//         connection.query(query, [doctorId], (err, results) => {
//             if (err) console.log(err);
//             else {
//                 console.log(results);

//                 var string = JSON.stringify(results);
//                 var details = JSON.parse(string);



//                 return res.render("book-appointment", { details: details });
//             }
//         })
//     })

// })



router.get('/appointment-booking', (req, res) => {

    // console.log(`patient: ${req.session.userId} , Doctor : ${req.session.doctorId}`);

    var doctorDetails;

    var doctorId = req.session.doctorId;

    pool.getConnection((err, connection) => {
        const query = "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
        connection.query(query, [doctorId], (err, results) => {
            if (err) console.log(err);
            else {
                console.log(results);

                var string = JSON.stringify(results);
                doctorDetails = JSON.parse(string);

            }
        })

        connection.release();

    })


    var allDetails1 = [];
    var allDetails2 = [];
    var allDetails3 = [];


    date = new Date();
    date.setDate(date.getDate())


    const week1 = new Promise((resolve, reject) => {
        dates1 = [];
        dates1.push(date.toISOString().slice(0, 10));

        for (i = 1; i <= 6; i++) {
            date.setDate(date.getDate() + 1);
            dates1.push(date.toISOString().slice(0, 10));
        }

        pool.getConnection((err, connection) => {
            for (let i = 0; i <= 6; i++) {
                allDetails1[i] = {
                    date: "",
                    time1: "",
                    time2: "",
                    time3: "",
                    time4: "",
                    time5: "",
                    time6: "",
                    time7: "",
                    time8: "",
                    time9: "",
                    time10: "",
                    time11: "",
                    time12: "",
                    time13: "",
                    time14: "",
                };
                let setDate = dates1[i];

                allDetails1[i].date = setDate;

                let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

                const date = new Date(setDate);
                const day = date.getDay();
                // Sunday - Saturday : 0 - 6
        
                allDetails1[i].day =  weekdays[day];

                const query = "SELECT appointment_id, time FROM appointments where doctor_id= ? and date = ?";
                connection.query(query, [req.session.doctorId, setDate], (err, results) => {
                    if (err) throw err;

                    if (results.length) {
                        var details = JSON.parse(JSON.stringify(results));

                        for (let j = 0; j < details.length; j++) {

                            // if ((details[j].time) == "8.00AM") {
                            //     allDetails1[i].time1 = "details[j].appointment_id";
                            // }

                            if ((details[j].time) == "8.00AM") {
                                allDetails1[i].time1 = "booked";
                            }
                            if ((details[j].time) == "8.30AM") {
                                allDetails1[i].time2 = "booked";
                            }
                            if ((details[j].time) == "9.00AM") {
                                allDetails1[i].time3 = "booked";
                            }
                            if ((details[j].time) == "9.30AM") {
                                allDetails1[i].time4 = "booked";
                            }
                            if ((details[j].time) == "10.00AM") {
                                allDetails1[i].time5 = "booked";
                            }
                            if ((details[j].time) == "10.30AM") {
                                allDetails1[i].time6 = "booked";
                            }
                            if ((details[j].time) == "11.00AM") {
                                allDetails1[i].time7 = "booked";
                            }
                            if ((details[j].time) == "11.30AM") {
                                allDetails1[i].time8 = "booked";
                            }
                            if ((details[j].time) == "12.00PM") {
                                allDetails1[i].time9 = "booked";
                            }
                            if ((details[j].time) == "12.30PM") {
                                allDetails1[i].time10 = "booked";
                            }
                            if ((details[j].time) == "2.00PM") {
                                allDetails1[i].time11 = "booked";
                            }
                            if ((details[j].time) == "2.30PM") {
                                allDetails1[i].time12 = "booked";
                            }
                            if ((details[j].time) == "3.00PM") {
                                allDetails1[i].time13 = "booked";
                            }
                            if ((details[j].time) == "3.30PM") {
                                allDetails1[i].time14 = "booked";
                            }

                        }
                    }
                    if (i == 6) {
                        resolve(allDetails1);
                    }
                })
            }

            connection.release();

        })
    })



    week1.then((details) => {
        allDetails1 = details;

        const week2 = new Promise((resolve, reject) => {
            dates2 = [];

            for (i = 1; i <= 7; i++) {
                date.setDate(date.getDate() + 1);
                dates2.push(date.toISOString().slice(0, 10));
            }

            pool.getConnection((err, connection) => {
                for (let i = 0; i <= 7; i++) {
                    allDetails2[i] = {
                        date: "",
                        time1: "",
                        time2: "",
                        time3: "",
                        time4: "",
                        time5: "",
                        time6: "",
                        time7: "",
                        time8: "",
                        time9: "",
                        time10: "",
                        time11: "",
                        time12: "",
                        time13: "",
                        time14: "",
                    };
                    let setDate = dates2[i];

                    allDetails2[i].date = setDate;

                    let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

                    const date = new Date(setDate);
                    const day = date.getDay();
                    // Sunday - Saturday : 0 - 6
            
                    allDetails2[i].day =  weekdays[day];
    

                    const query = "SELECT appointment_id, time FROM appointments where doctor_id = ? and date = ?";
                    connection.query(query, [req.session.doctorId, setDate], (err, results) => {
                        if (err) throw err;

                        if (results.length) {
                            var details = JSON.parse(JSON.stringify(results));

                            for (let j = 0; j < details.length; j++) {

                                if ((details[j].time) == "8.00AM") {
                                    allDetails2[i].time1 = "booked";
                                }
                                if ((details[j].time) == "8.30AM") {
                                    allDetails2[i].time2 = "booked";
                                }
                                if ((details[j].time) == "9.00AM") {
                                    allDetails2[i].time3 = "booked";
                                }
                                if ((details[j].time) == "9.30AM") {
                                    allDetails2[i].time4 = "booked";
                                }
                                if ((details[j].time) == "10.00AM") {
                                    allDetails2[i].time5 = "booked";
                                }
                                if ((details[j].time) == "10.30AM") {
                                    allDetails2[i].time6 = "booked";
                                }
                                if ((details[j].time) == "11.00AM") {
                                    allDetails2[i].time7 = "booked";
                                }
                                if ((details[j].time) == "11.30AM") {
                                    allDetails2[i].time8 = "booked";
                                }
                                if ((details[j].time) == "12.00PM") {
                                    allDetails2[i].time9 = "booked";
                                }
                                if ((details[j].time) == "12.30PM") {
                                    allDetails2[i].time10 = "booked";
                                }
                                if ((details[j].time) == "2.00PM") {
                                    allDetails2[i].time11 = "booked";
                                }
                                if ((details[j].time) == "2.30PM") {
                                    allDetails2[i].time12 = "booked";
                                }
                                if ((details[j].time) == "3.00PM") {
                                    allDetails2[i].time13 = "booked";
                                }
                                if ((details[j].time) == "3.30PM") {
                                    allDetails2[i].time14 = "booked";
                                }

                            }
                        }
                        if (i == 7) {
                            resolve(allDetails2);
                        }
                    })
                }

                connection.release();

            })
        })



        week2.then((details) => {
            allDetails2 = details;

            const week3 = new Promise((resolve, reject) => {
                dates3 = [];

                for (i = 1; i <= 7; i++) {
                    date.setDate(date.getDate() + 1);
                    dates3.push(date.toISOString().slice(0, 10));
                }

                pool.getConnection((err, connection) => {
                    for (let i = 0; i <= 7; i++) {
                        allDetails3[i] = {
                            date: "",
                            time1: "",
                            time2: "",
                            time3: "",
                            time4: "",
                            time5: "",
                            time6: "",
                            time7: "",
                            time8: "",
                            time9: "",
                            time10: "",
                            time11: "",
                            time12: "",
                            time13: "",
                            time14: "",
                        };
                        let setDate = dates3[i];

                        allDetails3[i].date = setDate;

                        let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

                        const date = new Date(setDate);
                        const day = date.getDay();
                        // Sunday - Saturday : 0 - 6
                
                        allDetails3[i].day =  weekdays[day];
        

                        const query = "SELECT appointment_id, time FROM appointments where doctor_id = ? and date = ?";
                        connection.query(query, [req.session.doctorId, setDate], (err, results) => {
                            if (err) throw err;

                            if (results.length) {
                                var details = JSON.parse(JSON.stringify(results));

                                for (let j = 0; j < details.length; j++) {

                                    if ((details[j].time) == "8.00AM") {
                                        allDetails3[i].time1 = "booked";
                                    }
                                    if ((details[j].time) == "8.30AM") {
                                        allDetails3[i].time2 = "booked";
                                    }
                                    if ((details[j].time) == "9.00AM") {
                                        allDetails3[i].time3 = "booked";
                                    }
                                    if ((details[j].time) == "9.30AM") {
                                        allDetails3[i].time4 = "booked";
                                    }
                                    if ((details[j].time) == "10.00AM") {
                                        allDetails3[i].time5 = "booked";
                                    }
                                    if ((details[j].time) == "10.30AM") {
                                        allDetails3[i].time6 = "booked";
                                    }
                                    if ((details[j].time) == "11.00AM") {
                                        allDetails3[i].time7 = "booked";
                                    }
                                    if ((details[j].time) == "11.30AM") {
                                        allDetails3[i].time8 = "booked";
                                    }
                                    if ((details[j].time) == "12.00PM") {
                                        allDetails3[i].time9 = "booked";
                                    }
                                    if ((details[j].time) == "12.30PM") {
                                        allDetails3[i].time10 = "booked";
                                    }
                                    if ((details[j].time) == "2.00PM") {
                                        allDetails3[i].time11 = "booked";
                                    }
                                    if ((details[j].time) == "2.30PM") {
                                        allDetails3[i].time12 = "booked";
                                    }
                                    if ((details[j].time) == "3.00PM") {
                                        allDetails3[i].time13 = "booked";
                                    }
                                    if ((details[j].time) == "3.30PM") {
                                        allDetails3[i].time14 = "booked";
                                    }

                                }
                            }
                            if (i == 7) {
                                resolve(allDetails3);
                            }
                        })
                    }

                    connection.release();

                })
            })



            week3.then((details) => {
                allDetails3 = details;

                return res.render("appointment-booking", { details1: allDetails1, details2: allDetails2, details3: allDetails3, doctorDetails: doctorDetails });
            })

        })
    })

})



////        POST



router.post('/search-doctors', (req, res) => {
    pool.getConnection((err, connection) => {
        const query = "SELECT * FROM doctor_details WHERE(user_id like ?) or (name like ?) or (gender like ?) or (licence_no like ?) or (cancer_speciality like ?) or (clinic_location like ?) or (clinic_phone_no like ?) or (clinic_email like ?)";
        console.log(req.body.search);
        connection.query(query, ['%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%', '%' + req.body.search + '%'], (err, results) => {
            if (err) console.log(err);
            else {
                console.log(results);

                return res.render("doctors", { details: results });
            }
        })
        connection.release();
    })
})



router.post('/doctors', (req, res) => {
    console.log(req.body);
    console.log(req.body.id);

    doctorId = req.body.id;

    req.session.doctorId = req.body.id;

    res.redirect('/appointment-booking');
})



router.post('/appointment-booking', (req, res) => {
    console.log(req.body);

    if (req.body.date == "" || req.body.time == "") {
        req.flash('appointmentBooking', "Please Choose time slot");
        res.redirect('/appointment-booking');
    } else {

        const date = new Date(req.body.date);
        const day = date.getDay();
        // Sunday - Saturday : 0 - 6

        if (day == 0 || day == 6) {
            req.flash("appointmentBooking", "Can't Book On Weekends");
            console.log("no weekend bookings");
            res.redirect('/appointment-booking');

        }

        else {

            pool.getConnection((err, connection) => {
                const query = "SELECT * FROM appointments WHERE doctor_id = ? and date = ? and time = ?";
                connection.query(query, [req.session.doctorId, req.body.date, req.body.time], (err, results) => {
                    if (err) throw err;
                    else {
                        if (results.length) {
                            req.flash("appointmentBooking", "The slot is already booked");
                            res.redirect('/appointment-booking');
                        } else {
                            const query2 = "INSERT INTO appointments(`doctor_id`, `patient_id`, `date`, `time`) VALUES(?)";
                            const values = [req.session.doctorId, req.session.userId, req.body.date, req.body.time];
                            connection.query(query2, [values], (err, data) => {
                                if (err) console.log(err);
                                else {
                                    console.log(`Appointment added with Appointment Id: ${data.insertId}`);
                                    res.redirect('/');
                                }
                            })
                        }
                    }

                })
            });

        }


    }
});




module.exports = router;