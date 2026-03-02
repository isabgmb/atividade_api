const mysql = require("mysql2");

const connection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "db_api_2026",
    waitForConnections: true,
    connectionLimit: 10,
});

module.exports = connection.promise();