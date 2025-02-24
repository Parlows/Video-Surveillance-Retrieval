// Add express
const express = require('express');
const http = require('http');


// Instantiate router object
const router = express.Router();

const { MilvusClient, DataType } = require('@zilliz/milvus2-sdk-node'); // Ensure the SDK is installed

// Add .env params
const dotenv = require('dotenv');
dotenv.config();

// To log execution times
const fs = require('fs');
const path = require('path');

function log_times(time, category) {
    const logFile = path.join('/logs', category+'_times.log');

    fs.appendFile(logFile, `${time}\n`, (err) => {
        if (err) console.log('Error with logging', err);
    })
}

router.get('/milvus', (req, res) => {

    const textQuery = req.query.text; // Get text to query
    const encoderQuery = req.query.encoder; // Get encoder to build the embedding
    const datasetQuery = req.query.dataset; // Get the dataset to query the database

    // If URL is wrong
    if(!textQuery || !encoderQuery) {
        return res.status(400);
    };
    
    let encoderName = encoderQuery;
    let collectionName;
    if (datasetQuery == 'centroid') {
        collectionName = 'uca'+encoderQuery+datasetQuery;
    } else {
        collectionName = 'ucf'+encoderQuery+datasetQuery;
    }
    console.log(collectionName)
    console.log(textQuery)

    // Get embedding
    embUrl = `http://${process.env.EMB_ENGINE_HOST}:${process.env.EMB_ENGINE_PORT}` +
        `/text?text=${textQuery}`;

    // POST request body
    const embData = JSON.stringify({
        encoder: encoderName,
        data: textQuery
    });

    // POST request options
    const embOptions = {
        hostname: process.env.EMB_ENGINE_HOST,
        port: process.env.EMB_ENGINE_PORT,
        path: '/text',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': embData.length
        }
    };

    // console.log('Sending req to embedding engine');

    // Uncomment to log times
    // const startEmb = Date.now();

    // Define callback for when the request is sent
    const embRequest = http.request(embOptions, embRes => {
        let embJSON = '';

        // Check for errors
        if (embRes.statusCode >= 400 && embRes.statusCode < 600) {
            // Capture the error message from the Flask server's response
            embRes.on('data', chunk => {
                embJSON += chunk.toString();
            });

            embRes.on('end', () => {
                return res.status(500).json({
                    status: embRes.statusCode.toString(),
                    message: embJSON
                });
            });

            return;
        }
        
        // Callback for when data is being recieved
        embRes.on('data', chunk => {
            embJSON += chunk.toString(); // Store response as string as it comes by
        });

        // Callback for when data has been recieved
        embRes.on('end', async () => {
            try {

                // Uncomment to log times
                const endEmb = Date.now();
                log_times(endEmb-startEmb, 'emb');

                // console.log("Sending embedding")
                let emb = JSON.parse(embJSON)
                console.log("Embedding recieved!")

                // Data to be sent in the POST request to Milvus
                let outputFields;
                if(collectionName.endsWith('centroid'))
                    outputFields = ['video', 'start_frame', 'end_frame'];
                else if(collectionName.endsWith('frames'))
                    outputFields = ['video', 'frame_n']

                // Uncomment to log times
                // const startQuer = Date.now();

                const address = `http://${process.env.MILVUS_HOST}:${process.env.MILVUS_PORT}`;
                const token = "root:Milvus";
            
                console.log('Connecting to Milvus...')
                const client = new MilvusClient({address, token});

                console.log("Loading collection")
                await client.loadCollection({collection_name:collectionName})

                // console.log(emb)

                console.log("Querying Milvus...")
                let databaseData = await client.search({
                    collection_name: collectionName,
                    data: emb,
                    limit: 10, // The number of results to return
                    output_fields: outputFields
                });

                // console.log('Processing Milvus Response..')
                // console.log(collectionName)
                // console.log(databaseData)
                // const results = JSON.parse(databaseData);
                // console.log(results);
                resultsArray = []
                

                // Uncomment to log times
                // const endQuer = Date.now();
                //log_times(endQuer-startQuer, 'query_milvus')
                
                console.log('Database queried')
                // console.log(databaseData)
                if(collectionName.endsWith('centroid')) {
                    databaseData.results.forEach(element => {
                        resultsArray.push({
                            video: element.video,
                            start_frame: element.start_frame,
                            end_frame: element.end_frame,
                        })
                    });
                } else if(collectionName.endsWith('frames')) {
                    // console.log(databaseData.results)
                    databaseData.results.forEach(element => {
                        // console.log("Looping")
                        // console.log(element)
                        let start_frame = (element.frame_n < 75) ? 0 : (element.frame_n - 75);
                        let end_frame = element.frame_n + 75; // If not valid, streaming route fix it

                        resultsArray.push({
                            video: element.video,
                            start_frame: start_frame,
                            end_frame: end_frame,
                        })
                    });
                }
                
                console.log("Building results")
                const clientRes = {results: resultsArray}

                res.json(clientRes);


            } catch (err) {
                res.status(500);
            }
        });
    });

    embRequest.on("error", (err) => {
        console.log(err);
        res.status(500).json({status: "500", message: "Error with embedding server request"});
    })

    embRequest.write(embData);
    embRequest.end();
});

module.exports = router;