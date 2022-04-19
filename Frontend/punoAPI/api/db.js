require('dotenv').config()
const mysql = require('mysql2');

const db_config = {
    connectionLimit : 10,
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_pass,
    database: process.env.db_name,
};

const pool = mysql.createPool(db_config);
exports.pool = pool;
exports.query = function (query){
    try {
        return new Promise((resolve, reject) => {
            pool.query(query , function (err, result, fields) {
                if (err) reject(err);
                resolve(result);
            });
        })
    } catch (err) {
        console.log('in db_sql function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: '', errors: err});
    }
}
