const http = require('http');
const url = require('url');
const connectToDatabase = require('./db'); // Import the database connection logic

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <body>
                    <form method="POST" action="/">
                        <label for="name">Name:</label><br>
                        <input type="text" id="name" name="name" required><br><br>
                        
                        <label for="email">Email:</label><br>
                        <input type="email" id="email" name="email" required><br><br>
                        
                        <label for="phone">Phone:</label><br>
                        <input type="tel" id="phone" name="phone" required><br><br>
                        
                        <label for="roomType">Room Type:</label><br>
                        <select id="roomType" name="roomType" required>
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="suite">Suite</option>
                            <option value="penthouse">Deluxe</option>
                        </select><br><br>
                        
                        <label for="checkIn">Check-in Date:</label><br>
                        <input type="date" id="checkIn" name="checkIn" required><br><br>
                        
                        <label for="checkOut">Check-out Date:</label><br>
                        <input type="date" id="checkOut" name="checkOut" required><br><br>
                        
                        <button type="submit">Submit</button>
                    </form>
                </body>
            </html>
        `);
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const parsedData = new URLSearchParams(body);
            const { name, email, phone, roomType, checkIn, checkOut } = parsedData;

            // Check room availability
            const connection = connectToDatabase();
            const checkRoomAvailabilityQuery = `
                SELECT * FROM rooms 
                WHERE room_type = ? 
                  AND status = 'available' 
                  AND NOT EXISTS (
                      SELECT 1 FROM bookings 
                      WHERE room_id = rooms.id 
                        AND (check_in_date BETWEEN ? AND ? OR check_out_date BETWEEN ? AND ?)
                  )
            `;

            connection.query(checkRoomAvailabilityQuery, [roomType, checkIn, checkOut, checkIn, checkOut], (err, results) => {
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
