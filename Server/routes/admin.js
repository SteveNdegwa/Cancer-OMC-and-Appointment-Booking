const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");


router.get("/view-unverified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const query = "SELECT * FROM doctor_details WHERE verification_status = ?";
        connection.query(query,["unverified"],(err,results)=>{
            if(err) throw err;

            res.render("view-unverified-doctors",{doctors:results});
        })

        connection.release();
    })
})

router.post("/view-unverified-doctors",(req,res)=>{
    pool.getConnection((err,connection)=>{
        if(err) throw err;

        const status = null;

        const query = "UPDATE doctor_details SET verification_status =? WHERE user_id =?";
        connection.query(query,[status,req.body.doctor_id],(err,data)=>{
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


module.exports = router;