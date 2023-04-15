const express = require('express');
const router = express.Router();

const pool = require('../server.js');

const path = require('path');
const { time } = require('console');
const { resolve } = require('path');

router.use(express.static(path.resolve("./node_modules")));


router.get('/', (req, res) => {

    if (req.session.authenticated) {

        pool.getConnection((err, connection) => {
            if (err) console.log(err);
            else {
          /// get doctors details
          const getDoctorsData = new Promise((resolve, reject) => {
            const query = "SELECT * FROM doctor_details";
            connection.query(query,(err,results)=>{
                if(err) throw err;
                resolve(results);
            })
          })


                ///// check if professional and medical details registered 
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
                                    getDoctorsData.then((results)=>{
                                        return res.render('index',{doctors:results})
                                    })
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
                                    getDoctorsData.then((results)=>{
                                        return res.render('index',{doctors:results})
                                    })
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


router.post("/",(req,res)=>{
    if(req.body.consult == ""){
        console.log("consult");    /// consultations
        res.redirect("/");
    }
    
    else if(req.body.book == ""){
        req.session.doctorId = req.body.doctor_id;
        req.session.bookingType = "new";
        res.redirect('/appointments/book-appointment');
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


router.post('/doctors', (req, res) => {

    req.session.doctorId = req.body.id;

    req.session.bookingType = "new";
    res.redirect('/appointments/book-appointment');
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
        connection.release();
    })
})






module.exports = router;