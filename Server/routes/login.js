const express = require('express');
const router = express.Router();

const pool = require('../server.js')

const path = require('path');




router.get('/', (req,res) => {
    res.render("login", {message: req.flash('message')})

    req.session.destroy();
})

router.post('/', (req,res) =>{

        const query = "SELECT user_id, account_type FROM users where user_name =? and password =?";
        pool.query(query, [req.body.username , req.body.password], (err, result) => {
        if(err){
            return res.json(err)
        }
        else if(result.length) {
            // send id to tokens

            var string = JSON.stringify(result);
            var json =  JSON.parse(string);

            req.session.authenticated = true;

            req.session.userId = json[0].user_id;
            req.session.accountType = json[0].account_type;


            console.log(req.session);

            return res.redirect('/')
        }

        console.log(req.body);

        req.flash('message','Wrong Username or Password')
        res.render("login", {message: req.flash('message')})

        
    })
    
})

router.get('/create-account', (req,res) =>{
    res.render("create-account", {messageRegister: req.flash('messageRegister'), username: "", password: "", confirm: ""})
    
    req.session.destroy();
})

router.post('/create-account', (req,res) =>{
    console.log(req.body);
    if(req.body.password == req.body.confirm){
        console.log('Passwords match');

        if((req.body.doctor == 'on') || (req.body.patient == 'on')){

            const query = "SELECT * FROM users where user_name =?";
            pool.query(query,[req.body.username], (err, results) => {
                if(err) console.log(err);
                else{
                    if(results.length) {
                        console.log("Username already exists");
                        req.flash('messageRegister','Username Already Exists')
                        return  res.render("create-account", {messageRegister: req.flash('messageRegister'), username: "", password: "", confirm: ""})
                    }else{
                        //hash password
                        ///insert user to db

                        let accountType = "";

                        if(req.body.doctor == 'on'){
                            accountType = "doctor";
    
                        }else if(req.body.patient == 'on'){
                            accountType = "patient";
                        }

                        console.log(accountType);

                        const query = "INSERT INTO users (`user_name`, `password`, `account_type`) VALUES(?)";
                        const values = [req.body.username, req.body.password, accountType];
                        pool.query(query,[values], (err, data) => {
                        if(err) console.log(err);

                        else{
                            console.log("User has been created");
                            console.log(data.insertId); // insert this id to tokens
    
                            /// authenticate
    
                            req.session.authenticated = true;
                            
                            req.session.userId = data.insertId;
                            req.session.accountType = accountType;  

                            if(accountType == "doctor"){
                                return res.redirect('/register/doctor')
        
                            }else  if(accountType == "patient"){
                                return res.redirect('/register/patient')
                            }
                        }
        
                      })

                    }
                }
            })

        }else{
            console.log("Please choose either doctor or patient account");
            req.flash('messageRegister','Please choose either doctor or patient account')
            return  res.render("create-account", {messageRegister: req.flash('messageRegister'), username: req.body.username, password: req.body.password, confirm: req.body.confirm})
            // reload and send username and passwords to frontend
        }
        
    }
    else{
        console.log("Passwords don't match");
        req.flash('messageRegister',"Passwords don't match")
        return  res.render("create-account", {messageRegister: req.flash('messageRegister'), username: req.body.username, password: "", confirm: ""})
    }
})

router.get('/forgot-password', (req,res) =>{
    res.sendFile(path.resolve("../forgot-password.html"))
})

module.exports = router;