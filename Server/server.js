const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();



const pool= mysql.createPool({
    connectionLimit: 100,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,
    host: process.env.HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE ,
    user: process.env.USER,
    password: process.env.PASSWORD

});

module.exports = pool;