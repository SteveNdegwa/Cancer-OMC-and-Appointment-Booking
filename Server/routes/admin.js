const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

router.get("/",(req,res)=>{
    res.render("admin");
})


router.get("/view-unverified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const query = "SELECT * FROM doctor_details WHERE verification_status = ?";
        connection.query(query,["false"],(err,results)=>{
            if(err) throw err;

            res.render("view-unverified-doctors",{doctors:results});
        })

        connection.release();
    })
})

router.post("/view-unverified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const query = "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
        connection.query(query,["true",req.body.doctor_id],(err,data)=>{
            if(err) throw err;
            else{
                console.log(data);
                console.log("Verified Successfully");
                res.redirect("/admin/view-unverified-doctors");
            }
        })

        connection.release();
    })
})


router.get("/view-verified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const query = "SELECT * FROM doctor_details WHERE verification_status = ?";
        connection.query(query,["true"],(err,results)=>{
            if(err) throw err;

            res.render("view-verified-doctors",{doctors:results});
        })

        connection.release();
    })
})

router.post("/view-verified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const query = "UPDATE doctor_details SET verification_status = ? WHERE user_id =?";
        connection.query(query,["false",req.body.doctor_id],(err,data)=>{
            if(err) throw err;
            else{
                console.log(data);
                console.log("Unverified Successfully");
                res.redirect("/admin/view-verified-doctors");
            }
        })

        connection.release();
    })
})


module.exports = router;