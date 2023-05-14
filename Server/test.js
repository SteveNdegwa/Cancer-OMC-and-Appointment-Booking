const mysql = require('mysql');
const dotenv = require('dotenv');
const { json } = require('express');
dotenv.config();



const pool = mysql.createPool({
    host: process.env.HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD

});

pool.getConnection(function (err, connection) {
    if (err) throw err;
    else {
        console.log("Connection created with Mysql successfully");

        console.log('db ' + connection.state);

        //   var sql = "CREATE TABLE otp (user_id INT, otp VARCHAR(255), expiry_time VARCHAR(255))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        //   var sql = "CREATE TABLE consultation_sessions (room_id VARCHAR(255), expiry_time VARCHAR(255),  PRIMARY KEY (room_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 


        // var sql = "CREATE TABLE users (user_id INT NOT NULL AUTO_INCREMENT, user_name VARCHAR(255), email VARCHAR(255), password VARCHAR(255) , account_type VARCHAR(255), PRIMARY KEY (user_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        //  var sql = "CREATE TABLE doctor_payment_details (doctor_id INT, business_no VARCHAR(255), consultation_type VARCHAR(255), appointment_fee INT, consultation_fee INT, PRIMARY KEY (doctor_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        //   var sql = "CREATE TABLE chat_rooms (room_id VARCHAR(255), patient_id INT NOT NULL, doctor_id INT NOT NULL, summary TEXT, PRIMARY KEY (room_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        //   var sql = "CREATE TABLE chats (chat_id INT NOT NULL AUTO_INCREMENT, room_id VARCHAR(255),  sender_id INT NOT NULL, date VARCHAR(255), time VARCHAR(255), message VARCHAR(255), PRIMARY KEY (chat_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        // var sql = "DROP TABLE chat_rooms";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table deleted");
        // });


        // var sql = "CREATE TABLE doctor_details (user_id INT NOT NULL, name VARCHAR(255), gender VARCHAR(255) , dob VARCHAR(255), phone_no VARCHAR(255), licence_no VARCHAR(255), cancer_speciality VARCHAR(1000), clinic_location VARCHAR(255), clinic_phone_no VARCHAR(255), clinic_email VARCHAR(255), verification_status VARCHAR(255) ,PRIMARY KEY (user_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        // var sql = "CREATE TABLE patient_details (user_id INT NOT NULL, name VARCHAR(255), gender VARCHAR(255), dob VARCHAR(255), phone_no VARCHAR(255), location VARCHAR(255), cancer_type VARCHAR(255), cancer_stage VARCHAR(255), lifestyle_diseases VARCHAR(255), PRIMARY KEY (user_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // });

        // var sql = "CREATE TABLE appointments (appointment_id INT NOT NULL AUTO_INCREMENT, patient_id INT NOT NULL, doctor_id INT NOT NULL, date VARCHAR(255), time VARCHAR(255), PRIMARY KEY (appointment_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        // var sql = "DROP TABLE appointment_slots";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table deleted");
        // });

        // var sql = "CREATE TABLE appointment_slots (doctor_id INT, day VARCHAR(255), slots JSON)";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 


        // var sql = "INSERT INTO appointments (patient_id, doctor_id, date, time) VALUES(?)";
        // const values = [2, 4, "27-02-2022", "12.00"];
        // connection.query(sql,[values], function(err, result){
        //     if(err) throw err;
        //     console.log("Record Inserted");
        // });

        // var sql = "DROP TABLE stk_push";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table deleted");
        // });

        // var sql = "DELETE FROM patient_details";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("users deleted");
        // });



        // var sql = "INSERT INTO users (user_name, password) VALUES('steven ndegwa', 'winster19')";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Record Inserted");
        // });

        // var sql = "SELECT str_to_date('040710$','%m%d%y') FROM appointments";
        // connection.query(sql, function(err, result, fields){
        //     if(err) throw err;
        //     console.log(result);
        // });

        // const query = "SELECT name FROM patient_details WHERE user_id = ?";
        // connection.query(query,[1], (err,result)=>{
        //   if(err) throw err;
        //  console.log(result);
        //  console.log(result[0].name);
        // })


        // let weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        // const date = new Date('2023-04-12');
        // date.setHours("18","40");
        // console.log(date);
        // // const day = date.getDay();
        // // // Sunday - Saturday : 0 - 6

        // const nowDate = new Date();
        // console.log(nowDate);

        // if(nowDate.getTime() > date.getTime()){
        //     console.log("The day has already passed");
        // }else{
        //     console.log("The day is in the future");
        // }
        // console.log(weekdays[day]);

        // let time= "08:00";
        // console.log(time.slice(0,2));
        // console.log(time.slice(3,5));

        //  var sql = "CREATE TABLE appointments_stk_push (checkout_id VARCHAR(255), status VARCHAR(255), phone_no VARCHAR(255), amount INT NOT NULL, timestamp VARCHAR(255), appointment_id INT, doctor_id INT NOT NULL, patient_id INT NOT NULL, appointment_date VARCHAR(255), appointment_time VARCHAR(255), PRIMARY KEY (checkout_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 

        // var sql = "CREATE TABLE consultations_stk_push (checkout_id VARCHAR(255), status VARCHAR(255), phone_no VARCHAR(255), amount INT NOT NULL, timestamp VARCHAR(255), doctor_id INT NOT NULL, patient_id INT NOT NULL, consultation_expiry_time VARCHAR(255), PRIMARY KEY (checkout_id))";
        // connection.query(sql, function(err, result){
        //     if(err) throw err;
        //     console.log("Table Created");
        // }); 
    }
});