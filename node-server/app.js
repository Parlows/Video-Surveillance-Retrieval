
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
const qdrant = require('./routes/qdrant.js')
app.use('/query', qdrant);

const milvus = require('./routes/milvus.js')
app.use('/query', milvus)

// Add routes to send videos
const streaming = require('./routes/streaming.js')
app.use('/video', streaming)

// const test = require('./routes/milvus.js')
// app.use('/', test)

// Set up the server
app.listen(process.env.NODE_PORT, () => {
    console.log(`Server running in port ${process.env.NODE_PORT}`)
});

