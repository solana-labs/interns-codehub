const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Aa010408",
  database: "sys",
  // timeout: 1000000
});

// open the MySQL connection
db.connect()

module.exports = db;
