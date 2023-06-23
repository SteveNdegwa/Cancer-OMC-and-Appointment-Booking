const express = require("express");
const router = express.Router();

const pool = require("../server.js");

const path = require("path");

const unirest = require("unirest");
const axios = require("axios");

//// middleware function to get access token

let token = "";

function access(req, res, next) {
  let request = unirest(
    "GET",
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  )
    .headers({
      Authorization: "Basic " + process.env.AUTHORIZATION_CODE,
    })
    .send()
    .end((response) => {
      if (response.error) throw new Error(response.error);
      console.log(response.raw_body);
      token = JSON.parse(response.raw_body).access_token;
      console.log(token);
      next();
    });
}

router.get("/", (req, res) => {
  if (req.session.authenticated) {
    pool.getConnection((err,connection)=>{
        if(err){throw err;}
        else{
            const query = "SELECT * FROM subscription_details";
            connection.query(query,(err,results)=>{
                if(err){throw err;}
                else{
                    req.session.subscriptionAmount = results[0].amount;
                    req.session.subscriptionShortCode = results[0].business_no;
                    req.session.subscriptionDays = results[0].days;

                    return res.render("pay-subscription",{amount: results[0].amount, days: results[0].days});
                }
            })
        }
        connection.release();
    })
  } else {
    return res.redirect("/login");
  }
});

router.post("/", (req, res) => {
  if (req.body.cancel == "") {
    req.session.rejectedRenewal = true;
    return res.redirect("/");
  } else {
    return res.redirect("/subscription/pay-subscription");
  }
});

router.get("/pay-subscription", (req, res) => {
  if (req.session.authenticated) {
    req.flash("paymentStatusMessage", "");
    return res.render("subscription-input-number", {
      message: req.flash("paymentStatusMessage"),
    });
  } else {
    return res.redirect("/login");
  }
});

router.post("/pay-subscription", access, async (req, res) => {
    let amount = req.session.subscriptionAmount;

  let number = req.body.number.substring(1);
  let mobileNo = "254" + number;

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const passkey = req.session.subscriptionShortCode;

  const password = new Buffer.from(shortcode + passkey + timestamp).toString(
    "base64"
  );

  await axios
    .post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: mobileNo,
        PartyB: shortcode,
        PhoneNumber: mobileNo,
        CallBackURL: "https://ba27-41-212-28-227.ngrok-free.app",
        AccountReference: "Cancer Support System",
        TransactionDesc: "Payment of Appointment",
      },
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    )
    .then((response) => {
      console.log(response);
      console.log(response.data);

      let checkOutId = response.data.CheckoutRequestID;

      const checkStkPush = () => {
        const date = new Date();
        const timestamp =
          date.getFullYear() +
          ("0" + (date.getMonth() + 1)).slice(-2) +
          ("0" + date.getDate()).slice(-2) +
          ("0" + date.getHours()).slice(-2) +
          ("0" + date.getMinutes()).slice(-2) +
          ("0" + date.getSeconds()).slice(-2);

        const shortcode = process.env.SHORT_CODE;
        const passkey = process.env.PASS_KEY;

        const password = new Buffer.from(
          shortcode + passkey + timestamp
        ).toString("base64");

        let request = unirest(
          "POST",
          "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        )
          .headers({
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          })
          .send(
            JSON.stringify({
              BusinessShortCode: shortcode,
              Password: password,
              Timestamp: timestamp,
              CheckoutRequestID: checkOutId,
            })
          )
          .end((response) => {
            if (response.error) {
              req.flash("paymentStatusMessage", "An error occurred");
              return res.render("subscription-input-number", {
                message: req.flash("paymentStatusMessage"),
              });
            } else {
              clearInterval(interval);
              console.log(response.body.ResultDesc);

              if (
                response.body.ResultDesc ==
                "The service request is processed successfully."
              ) {
                /// if payment successful

                pool.getConnection((err, connection) => {
                  if (err) throw err;
                  else {
                    let d = new Date();
                    let expiryDate = new Date(d.getTime() + 1440 * req.session.subscriptionDays * 60000);

                    const query =
                      "UPDATE doctor_details SET subscription_expiry = ? WHERE user_id = ?";
                    connection.query(
                      query,
                      [expiryDate, req.session.userId],
                      (err, data) => {
                        if (err) {
                          throw err;
                        } else {
                          return res.redirect("/");
                        }
                      }
                    );
                  }

                  connection.release();
                });
              } else {
                /// if payment not successful

                if (err) throw err;
                req.flash("paymentStatusMessage", response.body.ResultDesc);
                return res.render("subscription-input-number", {
                  message: req.flash("paymentStatusMessage"),
                });
              }
            }
          });
      };
      let interval = setInterval(checkStkPush, 5000);
    })
    .catch((err) => {
      console.log(err);
      req.flash("paymentStatusMessage", "Error Generating The STK Push");

      return res.render("input-number", {
        message: req.flash("paymentStatusMessage"),
      });
    });
});

module.exports = router;
