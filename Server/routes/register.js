const express = require('express');
const router = express.Router();

const path = require('path');

const pool = require('../server.js')


router.use(express.static(path.resolve("./public")))


router.get('/patient', (req,res) => {
    if(req.session.authenticated){
        return res.render("patient-register", {patientMsg: req.flash('patientMsg'), name: "",dob: "", email: "", phone: "", location: ""})
    }else{
       return  res.redirect('/login'); 
    }
})

router.get('/patient/medical-details', (req,res) => {
    if(req.session.authenticated){
        return  res.render("patient-register-medical", {patientMedicalMsg: req.flash('patientMedicalMsg'), stage: "", lifestyleDiseases: ""})
    }else{
       return  res.redirect('/login'); 
    }

})

router.get('/doctor', (req,res) => {
    if(req.session.authenticated){
        return res.render("doctor-register", {doctorMsg: req.flash('doctorMsg'), name: "",dob: "", email: "", phone: ""})
    }else{
       return  res.redirect('/login'); 
    }
})

router.get('/doctor/professional-details', (req,res) => {
    if(req.session.authenticated){
        return res.render("doctor-register-professional", {doctorProfMsg: req.flash('doctorProfMsg'), licence: "",speciality: "", location: "", phone: "", email: "", fee:""})
    }else{
       return  res.redirect('/login'); 
    }
})


//     posts

router.post('/patient', (req,res) => {

    console.log(req.session.userId);

    console.log(req.body);

    if((req.body.email).endsWith("gmail.com")){
        console.log("good email")

        if(req.body.male == 'on' || req.body.female == 'on'){

            
            let gender = "";
            if(req.body.male == 'on'){
                gender = "male";
            }else if(req.body.female == 'on'){
                gender = "female";
            }

            pool.getConnection((err, connection)=>{
                const query  = "INSERT INTO patient_details(`user_id`, `name`, `gender`, `dob`, `email`, `phone_no`, `location`) VALUES(?)";
                const values = [req.session.userId, req.body.name, gender, req.body.dob, req.body.email, req.body.phone, req.body.location]
                connection.query(query,[values], (err,data)=>{
                    if(err) return console.log(err);

                    else{
                        console.log("patient personal data inserted");

                        res.redirect('/register/patient/medical-details')
                    }

                })
            })

        } else{
            console.log("Choose the gender");
            req.flash('patientMsg','Please Choose Your Gender')
            return res.render("patient-register", {patientMsg: req.flash('patientMsg'), name: req.body.name, dob: req.body.dob, email: req.body.email, phone: req.body.phone, location: req.body.location})
    
        }

    }else{
        console.log("Bad email");
        req.flash('patientMsg','Incorrect Email')

        return res.render("patient-register", {patientMsg: req.flash('patientMsg'), name: req.body.name, dob: req.body.dob, email: "", phone: req.body.phone, location: req.body.location})
    }
})



router.post('/patient/medical-details',(req,res)=>{
    if(req.body.cancer == 'select'){
        console.log("Please choose cancer type");
        req.flash('PatientMedicalMsg', 'Please Choose The Cancer Type');

        console.log(req.body);

        return res.render("patient-register-medical", {patientMedicalMsg: req.flash('patientMedicalMsg'), stage: req.body.stage, lifestyleDiseases: req.body.lifestyle})

    }else{
        pool.getConnection((err,connection)=>{
            if (err) console.log(err);

            const query = "UPDATE patient_details SET cancer_type = ?, cancer_stage = ?, lifestyle_diseases = ? WHERE user_id = ?";
        
            connection.query(query,[req.body.cancer, req.body.stage, req.body.lifestyle, req.session.userId],(err,data)=>{
                if (err) console.log(err);

                else{
                    console.log("Patient Medical details Inserted");

                    res.redirect('/');
                }
            })
        })
    }
})



router.post('/doctor', (req, res)=>{
    console.log(req.body);

    if((req.body.email).endsWith('@gmail.com')){

        if(req.body.male == 'on' || req.body.female == 'on'){

            let gender = "";
            if(req.body.male == 'on'){
                gender = "male";
            }else{
                gender = "female";
             }

            pool.getConnection((err, connection)=>{
                const query = "INSERT INTO doctor_details(`user_id`, `name`, `gender`, `dob`, `email`, `phone_no`, `verification_status`) VALUES(?)";
                const values = [req.session.userId, req.body.name, gender, req.body.dob, req.body.email, req.body.phone, "false"];

                connection.query(query,[values],(err,data)=>{
                    if(err) console.log(err);
                    else{
                        console.log('Doctor personal details inserted');

                        res.redirect('/register/doctor/professional-details')
                    }
                })
            })

        }else{
            console.log('Please select your gender');
            req.flash('doctorMsg','Please Select Your Gender')
            return res.render("doctor-register", {doctorMsg: req.flash('doctorMsg'), name: req.body.name, dob: req.body.dob, email: req.body.email, phone: req.body.phone})
        }

    }else{
        console.log('Invalid Email');
        req.flash('doctorMsg', 'Invalid Email')
        return res.render("doctor-register", {doctorMsg: req.flash('doctorMsg'), name: req.body.name, dob: req.body.dob, email: "", phone: req.body.phone})
    }
})

router.post('/doctor/professional-details', (req, res) =>{
    if((req.body.email).endsWith('@gmail.com')){

        pool.getConnection((err, connection)=>{
            const query = "UPDATE doctor_details SET licence_no = ?, cancer_speciality = ?, clinic_location = ?, clinic_phone_no = ?, clinic_email = ?, booking_fee = ? WHERE user_id = ?";

            connection.query(query, [req.body.licence, req.body.speciality, req.body.location, req.body.phone, req.body.email, req.body.fee, req.session.userId], (err, data) =>{
                if(err) console.log(err);

                else{
                    console.log("Doctor's professional details inserted");

                    return res.redirect('/appointments/customize-appointment-slots');
                }
            })
        })
    }else{
        console.log('Invalid email');
        req.flash('doctorProfMsg', 'Invalid Email');

        return res.render("doctor-register-professional", {doctorProfMsg: req.flash('doctorProfMsg'), licence: req.body.licence, speciality: req.body.speciality, location: req.body.location, phone: req.body.phone, email: "", fee: req.body.fee})
    }
})



module.exports = router;