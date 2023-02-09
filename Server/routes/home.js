const express = require('express');
const router = express.Router();

const pool = require('../server.js');

const path = require('path')

router.use(express.static(path.resolve("./node_modules")));

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

                                if (cancerType == null) {
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

                                if (cancerSpeciality == null) {
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
    })

})


var doctorId = '';

router.get('/book-appointment', (req, res) => {

    pool.getConnection((err, connection) => {
        const query = "SELECT name, cancer_speciality, clinic_location, clinic_phone_no, clinic_email FROM doctor_details where user_id = ?";
        connection.query(query, [doctorId], (err, results) => {
            if (err) console.log(err);
            else {
                console.log(results);

                var string = JSON.stringify(results);
                var details = JSON.parse(string);



                return res.render("book-appointment", { details: details });
            }
        })
    })

})



router.get('/appointment-booking', (req, res) => {
    const details = [
        {
            date: '25-08-099',
            time1: "jj",
            time2: "jj",
            time3: "jj",
            time4: "jj",
            time5: "jj",
            time6: "jj",
            time7: "jj",
            time8: "jj",
            time9: "jj",
            time10: "jj",
            time11: "jj",
            time12: "jj",
            time13: "jj",
            time14: "jj"
        },
        {
            date: '27-08-099',
            time1: "jj",
            time2: "jj",
            time3: "jj",
            time4: "jj",
            time5: "jj",
            time6: "jj",
            time7: "jj",
            time8: "jj",
            time9: "jj",
            time10: "jj",
            time11: "jj",
            time12: "jj",
            time13: "jj",
            time14: "jj"
        },
          {
            date: '26-08-099',
            time1: "jj",
            time2: "jj",
            time3: "jj",
            time4: "jj",
            time5: "jj",
            time6: "jj",
            time7: "jj",
            time8: "jj",
            time9: "jj",
            time10: "jj",
            time11: "jj",
            time12: "jj",
            time13: "jj",
            time14: "jj"
        }
    ]

    details.push(
        {
            date: '78-08-099',
            time1: "jj",
            time2: "jj",
            time3: "jj",
            time4: "jj",
            time5: "jj",
            time6: "jj",
            time7: "jj",
            time8: "jj",
            time9: "jj",
            time10: "jj",
            time11: "j",
            time12: "jj",
            time13: "jj",
            time14: "jj"
        }

    )

    console.log(details.includes('78-08-099'));

    let date = new Date();
    date.setDate(date.getDate())
    date.toISOString().slice(0, 10)
    // add a day
    console.log(date.toISOString().slice(0, 10));

    return res.render("appointment-booking", { details: details });

})



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
    })
})



router.post('/doctors', (req, res) => {
    console.log(req.body);
    console.log(req.body.id);

    doctorId = req.body.id;

    // req.session.doctorId = req.body.id;
    res.redirect('/book-appointment');
})


router.post('/book-appointment', (req, res) => {
    if (req.body.time1 == 'on' || req.body.time2 == 'on' || req.body.time3 == 'on' || req.body.time4 == 'on' || req.body.time5 == 'on' || req.body.time6 == 'on' || req.body.time7 == 'on' || req.body.time8 == 'on' || req.body.time9 == 'on' || req.body.time10 == 'on' || req.body.time11 == 'on' || req.body.time12 == 'on') {

    } else {
        console.log("Please Choose Your Desired Time");
    }
})

//router.route('/').get() .post()




module.exports = router;