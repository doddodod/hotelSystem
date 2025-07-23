# Hotel Booking System

This project is a simple hotel booking system that allows users to submit their booking details through a web form. The server processes the submitted data and returns it in JSON format.

## Project Structure

```
hotelSystem
├── index.js        # Sets up the HTTP server and handles requests
├── db.js           # Establishes a connection to a MySQL database
└── README.md       # Documentation for the project
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd hotelSystem
   ```

2. **Install dependencies**:
   Make sure you have Node.js installed. Then, run:
   ```
   npm install mysql
   ```

3. **Configure the database**:
   Update the `db.js` file with your MySQL database credentials.

4. **Run the server**:
   Start the server by running:
   ```
   node index.js
   ```
   The server will be running on `http://localhost:3000`.

## Usage

- Open your web browser and navigate to `http://localhost:3000`.
- Fill out the booking form with your details.
- Submit the form to see the JSON response with your booking information.

## License

This project is licensed under the MIT License.