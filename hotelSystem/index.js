const http = require('http');
const url = require('url');
const connectToDatabase = require('./db'); // Import the database connection logic

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hotel Booking System</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f9;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }
                    .container {
                        background: #ffffff;
                        padding: 20px 30px;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        max-width: 400px;
                        width: 100%;
                    }
                    h1 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 20px;
                    }
                    label {
                        font-weight: bold;
                        color: #555;
                        display: block;
                        margin-bottom: 5px;
                    }
                    input, select, button {
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    button {
                        background-color: #007bff;
                        color: white;
                        border: none;
                        cursor: pointer;
                        font-weight: bold;
                    }
                    button:hover {
                        background-color: #0056b3;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 12px;
                        color: #777;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Hotel Booking</h1>
                    <form method="POST" action="/">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name" placeholder="Enter your full name" required>
                        
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" placeholder="Enter your email address" required>
                        
                        <label for="phone">Phone:</label>
                        <input type="tel" id="phone" name="phone" placeholder="Enter your phone number" required>
                        
                        <label for="roomType">Room Type:</label>
                        <select id="roomType" name="roomType" required>
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="suite">Suite</option>
                            <option value="penthouse">Deluxe</option>
                        </select>
                        
                        <label for="checkIn">Check-in Date:</label>
                        <input type="date" id="checkIn" name="checkIn" required>
                        
                        <label for="checkOut">Check-out Date:</label>
                        <input type="date" id="checkOut" name="checkOut" required>
                        
                        <button type="submit">Book Now</button>
                    </form>
                    <div class="footer">
                        &copy; 2025 Hotel Booking System. All rights reserved.
                    </div>
                </div>
            </body>
            </html>
        `);
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Append chunks to body
        });

        req.on('end', () => {
            // Log the raw body to verify the received data
            console.log('Raw body:', body);

            // Parse the form data from the raw body
            const parsedData = new URLSearchParams(body);

            // Ensure that the form fields are correctly parsed
            console.log('Parsed Data:', parsedData);

            // Extract fields from parsed data
            const name = parsedData.get('name');
            const email = parsedData.get('email');
            const phone = parsedData.get('phone');
            const roomType = parsedData.get('roomType');
            const checkIn = parsedData.get('checkIn');
            const checkOut = parsedData.get('checkOut');

            console.log('Received booking request:', { name, email, phone, roomType, checkIn, checkOut });

            // Check room availability with parameterized query
            const connection = connectToDatabase();
            const checkRoomAvailabilityQuery = `
                SELECT * FROM rooms 
                WHERE room_type = ? 
                  AND status = 'available' 
                  AND NOT EXISTS (
                      SELECT 1 
                      FROM bookings 
                      WHERE room_id = rooms.id 
                      AND (
                          (check_in_date <= ? AND check_out_date >= ?)
                      )
                  )
            `;

            // Execute the query with the actual values
            connection.query(checkRoomAvailabilityQuery, [roomType, checkIn, checkIn, checkOut, checkOut], (err, results) => {
                if (err) {
                    console.error('Error checking room availability:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Server error');
                    return;
                }

                if (results.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('No available rooms for the selected dates');
                    return;
                }

                // Room is available, proceed with the booking process
                const roomId = results[0].id;
                const totalAmount = results[0].price; // Assuming the price of the room is stored in the 'rooms' table

                // Insert customer into the customers table
                const insertCustomerQuery = `
                    INSERT INTO customers (name, email, phone) 
                    VALUES (?, ?, ?)
                `;
                connection.query(insertCustomerQuery, [name, email, phone], (err, customerResult) => {
                    if (err) {
                        console.error('Error inserting customer:', err);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server error');
                        return;
                    }

                    const customerId = customerResult.insertId;

                    // Insert the booking into the bookings table
                    const insertBookingQuery = `
                        INSERT INTO bookings (customer_id, room_id, check_in_date, check_out_date, total_amount, status)
                        VALUES (?, ?, ?, ?, ?, 'confirmed')
                    `;
                    connection.query(insertBookingQuery, [customerId, roomId, checkIn, checkOut, totalAmount], (err, bookingResult) => {
                        if (err) {
                            console.error('Error inserting booking:', err);
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end('Server error');
                            return;
                        }

                        // Update room status to 'booked'
                        const updateRoomStatusQuery = `UPDATE rooms SET status = 'booked' WHERE id = ?`;
                        connection.query(updateRoomStatusQuery, [roomId], (err) => {
                            if (err) {
                                console.error('Error updating room status:', err);
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                res.end('Server error');
                                return;
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                message: 'Booking successful!',
                                bookingId: bookingResult.insertId,
                                customerId,
                                roomId,
                                totalAmount
                            }));
                        });
                    });
                });
            });
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
    }
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
