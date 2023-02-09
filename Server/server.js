const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();



const pool= mysql.createPool({
    connectionLimit: 10,
    host: process.env.HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE ,
    user: process.env.USER,
    password: process.env.PASSWORD

});

module.exports = pool;
    
class DbService {
    static getDbServiceInstance() {
        return instance ? instance : new DbService();
    }

    async loginAuthorization() {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT * FROM login where user_name =? and password =?";
                connection.query(query, (err, results) => {
                    if(err) reject(new Error(err.message));
                    resolve(results);
                })
            });

            console.log(response);
            return response;
        } catch (error) {
            console.log(error);
            
        }
    }
}