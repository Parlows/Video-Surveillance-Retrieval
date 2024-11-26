
// Add express
const express = require('express');

// Add .env info
const dotenv = require('dotenv');
dotenv.config();

// Instantiate application
const app = express();

// Add static content
app.use(express.static('public'));

// Add routes to query database
const queryRouter = require('./routes/query.js')
app.use('/query', queryRouter);

// Add routes to send videos
const streaming = require('./routes/streaming.js')
app.use('/video', streaming)

// Set up the server
app.listen(process.env.NODE_PORT, () => {
    console.log('Server running in port 3000')
});

