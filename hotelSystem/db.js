const mysql = require('mysql');

const connectToDatabase = () => {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'n3u3da!',
        database: 'hoteldb'
    });

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err.stack);
            return;
        }
        console.log('Connected to the database as id ' + connection.threadId);
    });

    return connection;
};

module.exports = connectToDatabase;