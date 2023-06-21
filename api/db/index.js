const mysql = require('mysql2');


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Global123503014589?',
    database: 'recipes_app'
});


exports.query = function(query) {
    return new Promise((resolve, reject) => {
        connection.connect();
        connection.query(query, function(error, results, fields) {
            if (error) {
                reject(error);
                return;
            }
            resolve([results, fields]);
        })
    });
}

exports.execute = function(query, data) {
    return new Promise((resolve, reject) => {
        connection.connect();
        connection.execute(query, data, function(error, results, fields) {
            if (error) {
                reject(error);
                return;
            }
            resolve([results, fields]);
        })
    });
}