
// Add express
const express = require('express');

// Instantiate router object
const router = express.Router();

// Add .env params
const dotenv = require('dotenv');
dotenv.config();

// Add HTTP library to build requests
const http = require('http');

//const got = require('got');


// To query QDrant Database
router.get('/qdrant', (req, res) => {

    const textQuery = req.query.text; // Get text to query
    const encoderQuery = req.query.encoder; // Get encoder to build the embedding
    const datasetQuery = req.query.dataset; // Get the dataset to query the database

    // // Choose options depending on the encoder selected by client
    // let encoderName = ''
    // let collectionName = ''
    // // console.log(`Encoder sent by client: ${encoderQuery}`)
    // switch (String(encoderQuery)) {
    //     case 'CLIP Centroid':
    //         encoderName = 'clip';
    //         collectionName = 'ucfclipcentroid'
    //         break;
    //     case 'VCLIP Centroid':
    //         encoderName = 'vclip';
    //         collectionName = 'ucfvclipcentroid'
    //         break;
    //     case 'CLIP Frames':
    //         encoderName = 'clip';
    //         collectionName = 'ucfclipframes';
    //     default:
    //         res.status(404).send(`Encoder "${encoderQuery}" not found`)
    // }

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

    // Get embedding
    embUrl = `http://${process.env.EMB_ENGINE_HOST}:${process.env.EMB_ENGINE_PORT}` +
        `/text`;

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
    // Define callback for when the request is sent
    const embRequest = http.request(embOptions, embRes => {
        let embJSON = '';
        
        // Callback for when data is being recieved
        embRes.on('data', chunk => {
            embJSON += chunk.toString(); // Store response as string as it comes by
        });

        // Callback for when data has been recieved
        embRes.on('end', () => {
            try {
                // console.log("Sending embedding")
                let emb = embJSON
                // console.log(emb)
                    // Data to be sent in the POST request body
                let outputFields;
                if(collectionName.endsWith('centroid'))
                    outputFields = ['video', 'start_frame', 'end_frame'];
                else if(collectionName.endsWith('frames'))
                    outputFields = ['video', 'frame_n']
                const postData = JSON.stringify({
                    query: JSON.parse(emb)[0],
                    limit: 10,
                    with_payload: outputFields
                });
                
                // Options for the POST request
                const options = {
                    hostname: process.env.QDRANT_HOST,
                    port: process.env.QDRANT_PORT,
                    path: `/collections/${collectionName}/points/query`,
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                    }
                };
                
                const databaseReq = http.request(options, databaseRes => {
                    let databaseData = '';

                    // Collect data chunks as they arrive
                    databaseRes.on('data', (chunk) => {
                        databaseData += chunk;
                    });
                
                    // Process the complete response once all chunks are received
                    databaseRes.on('end', () => {
                    try {
                        const results = JSON.parse(databaseData).result;

                        let resultsArray = []
                        
                        // console.log(`Building response ${collectionName.endsWith('frames')}`)
                        if(collectionName.endsWith('centroid')) {
                            results.points.forEach(element => {
                                resultsArray.push({
                                    video: element.payload.video,
                                    start_frame: element.payload.start_frame,
                                    end_frame: element.payload.end_frame,
                                })
                            });
                        } else if(collectionName.endsWith('frames')) {
                            // console.log("Looping results")
                            try {
                                results.points.forEach(element => {

                                    let start_frame = (element.payload.frame_n < 75) ? 0 : (element.payload.frame_n - 75);
                                    let end_frame = element.payload.frame_n + 75; // If not valid, streaming route fix it
                                    // console.log(`Start: ${start_frame}`)
                                    // console.log(`End: ${end_frame}`)
                                    resultsArray.push({
                                        video: element.payload.video,
                                        start_frame: start_frame,
                                        end_frame: end_frame,
                                    })
                                });
                            } catch (error) {
                                console.log(error)
                            }
                        }
                        console.log("Response built")
                        const clientRes = {results: resultsArray}

                        res.json(clientRes);
                    } catch (error) {
                        res.status(500)
                    }
                    });
                });

                    // Handle errors in the QDrant request
                    databaseReq.on('error', (e) => {
                        res.status(500).json({ error: `QDrant request error: ${e.message}` });
                    });
            
                    // Write the data to the QDrant request body
                    databaseReq.write(postData);
                    databaseReq.end();
            } catch (err) {
                res.status(500);
            }
        });
    });

    embRequest.write(embData);
    embRequest.end();

});



// router.get('/oldqdrant', (req, res) => {

//     // Get text query from URL
//     const textQuery = req.query.text;
    
//     // If client did not insert one
//     if(!textQuery) {
//         return res.status(400);
//     }

//     // Get embedding
//     embUrl = `http://${process.env.EMB_ENGINE_HOST}:${process.env.EMB_ENGINE_PORT}` +
//         `/text?text=${textQuery}`

//     // Send GET request to Embedding Engine
//     // DEPRECATED: now the emb engine only accepts POST requests
//     http.get(embUrl, embRes => {
//             let emb = ''
            
//             // Callback for when a chunk of data is recieved
//             embRes.on('data', chunk => {
//                 emb += chunk;
//             });

//             // Callback for when all the data is recieved
//             embRes.on('end', () => {
//                 try {
//                     // console.log("Sending embedding")

//                     // Data to be sent in the POST request body
//                     const postData = JSON.stringify({
//                         vector: JSON.parse(emb),
//                         limit: 10,
//                         with_payload: ["start_frame", "end_frame", "video", "sentence"]
//                     });
                
//                     // Options for the POST request
//                     const options = {
//                         hostname: process.env.QDRANT_HOST,
//                         port: process.env.QDRANT_PORT,
//                         path: '/collections/ucfclip-centroid/points/query',
//                         method: 'POST',
//                         headers: {
//                         'Content-Type': 'application/json',
//                         'Content-Length': Buffer.byteLength(postData)
//                         }
//                     };
                
//                     const databaseReq = http.request(options, databaseRes => {
//                         let databaseData = '';

//                         // Collect data chunks as they arrive
//                         databaseRes.on('data', (chunk) => {
//                             databaseData += chunk;
//                         });
                    
//                         // Process the complete response once all chunks are received
//                         databaseRes.on('end', () => {
//                         try {
//                             const results = JSON.parse(databaseData);

//                             resultsArray = []
                            
//                             results.result.points.forEach(element => {
//                                 // console.log('Hola')
//                                 resultsArray.push({
//                                     video: element.payload.video,
//                                     start_frame: element.payload.start_frame,
//                                     end_frame: element.payload.end_frame,
//                                     sentence: element.payload.sentence
//                                 })
//                             });

//                             const clientRes = {results: resultsArray}

//                             res.json(clientRes);
//                         } catch (error) {
//                             res.status(500)
//                         }
//                         });
//                     });

//                     // Handle errors in the QDrant request
//                     databaseReq.on('error', (e) => {
//                         res.status(500).json({ error: `QDrant request error: ${e.message}` });
//                     });
            
//                     // Write the data to the QDrant request body
//                     databaseReq.write(postData);
//                     databaseReq.end();
//                 } catch (err) {
//                     res.status(500);
//                 }
//             });
//         }
//     );
// });

// // To query Milvus Database
// router.get('/milvus', (req, res) => {

//     const textQuery = req.query.text; // Get text to query
//     const encoderQuery = req.query.encoder; // Get encoder to build the embedding
//     const datasetQuery = req.query.dataset; // Get the dataset to query the database

//     // // Choose options depending on the encoder selected by client
//     // let encoderName = ''
//     // let collectionName = ''
//     // // console.log(`Encoder sent by client: ${encoderQuery}`)
//     // switch (String(encoderQuery)) {
//     //     case 'CLIP Centroid':
//     //         encoderName = 'clip';
//     //         collectionName = 'ucfclipcentroid'
//     //         break;
//     //     case 'VCLIP Centroid':
//     //         encoderName = 'vclip';
//     //         collectionName = 'ucfvclipcentroid'
//     //         break;
//     //     case 'CLIP Frames':
//     //         encoderName = 'clip';
//     //         collectionName = 'ucfclipframes';
//     //     default:
//     //         res.status(404).send(`Encoder "${encoderQuery}" not found`)
//     // }

//     // If URL is wrong
//     if(!textQuery || !encoderQuery) {
//         return res.status(400);
//     };
    
//     let encoderName = encoderQuery;
//     let collectionName = 'ucf'+encoderQuery+datasetQuery;
//     console.log(collectionName)

//     // Get embedding
//     embUrl = `http://${process.env.EMB_ENGINE_HOST}:${process.env.EMB_ENGINE_PORT}` +
//         `/text?text=${textQuery}`;

//     // POST request body
//     const embData = JSON.stringify({
//         encoder: encoderName,
//         data: textQuery
//     });

//     // POST request options
//     const embOptions = {
//         hostname: process.env.EMB_ENGINE_HOST,
//         port: process.env.EMB_ENGINE_PORT,
//         path: '/text',
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Content-Length': embData.length
//         }
//     };

//     // console.log('Sending req to embedding engine');
//     // Define callback for when the request is sent
//     const embRequest = http.request(embOptions, embRes => {
//         let embJSON = '';

//         // Check for errors
//         if (embRes.statusCode >= 400 && embRes.statusCode < 600) {
//             // Capture the error message from the Flask server's response
//             embRes.on('data', chunk => {
//                 embJSON += chunk.toString();
//             });

//             embRes.on('end', () => {
//                 return res.status(500).json({
//                     status: embRes.statusCode.toString(),
//                     message: embJSON
//                 });
//             });

//             return;
//         }
        
//         // Callback for when data is being recieved
//         embRes.on('data', chunk => {
//             embJSON += chunk.toString(); // Store response as string as it comes by
//         });

//         // Callback for when data has been recieved
//         embRes.on('end', () => {
//             try {
//                 // console.log("Sending embedding")
//                 let emb = embJSON
//                 console.log("Embedding recieved!")
//                 console.log(JSON.parse(emb))

//                 // Data to be sent in the POST request to Milvus
//                 console.log("output fileds")
//                 let outputFields;
//                 if(collectionName.endsWith('centroid'))
//                     outputFields = ['video', 'start_frame', 'end_frame'];
//                 else if(collectionName.endsWith('frames'))
//                     outputFields = ['video', 'frame_n']

//                 console.log("Constructing post data")
//                 const postData = JSON.stringify({
//                     collectionName: collectionName,
//                     outputFields: outputFields,
//                     limit: 10,
//                     offset: 0,
//                     data: JSON.parse(emb)
//                 });
            
//                 console.log("Constructing options")
//                 // Options for the POST request to Milvus
//                 const options = {
//                     hostname: process.env.MILVUS_HOST,
//                     port: process.env.MILVUS_PORT,
//                     path: '/v2/vectordb/entities/search',
//                     method: 'POST',
//                     headers: {
//                     'Content-Type': 'application/json',
//                     'Content-Length': Buffer.byteLength(postData),
//                     'Host': `${process.env.MILVUS_HOST}:${process.env.MILVUS_PORT}`
//                     }
//                 };
            
//                 // Define callback for when request is sent
//                 const databaseReq = http.request(options, databaseRes => {
//                     let databaseData = '';
                    
//                     // Collect data chunks as they arrive
//                     databaseRes.on('data', (chunk) => {
//                         databaseData += chunk;
//                     });
                
//                     // Process the complete response once all chunks are received
//                     databaseRes.on('end', () => {
//                     try {

//                         // console.log('Processing Milvus Response..')
//                         const results = JSON.parse(databaseData);
//                         // console.log(results);
//                         resultsArray = []
                        
//                         if(collectionName.endsWith('centroid')) {
//                             results.data.forEach(element => {
//                                 resultsArray.push({
//                                     video: element.video,
//                                     start_frame: element.start_frame,
//                                     end_frame: element.end_frame,
//                                 })
//                             });
//                         } else if(collectionName.endsWith('frames')) {
//                             results.data.forEach(element => {

//                                 let start_frame = (frame_n < 75) ? 0 : (element.frame_n - 75);
//                                 let end_frame = frame_n + 75; // If not valid, streaming route fix it

//                                 resultsArray.push({
//                                     video: element.video,
//                                     start_frame: start_frame,
//                                     end_frame: end_frame,
//                                 })
//                             });
//                         }

//                         const clientRes = {results: resultsArray}

//                         res.json(clientRes);
//                     } catch (error) {
//                         res.status(500)
//                     }
//                     });
//                 });

//                 // Handle errors in the QDrant request
//                 databaseReq.on('error', (e) => {
//                     res.status(500).json({ error: `QDrant request error: ${e.message}` });
//                 });

//                 databaseReq.on("error", (err) => {
//                     res.status(500).json({status: "500", message: "Error with database server request"});
//                 })
        
//                 // Write the data to the QDrant request body
//                 databaseReq.write(postData);
//                 databaseReq.end();
//             } catch (err) {
//                 res.status(500);
//             }
//         });
//     });

//     embRequest.on("error", (err) => {
//         console.log(err);
//         res.status(500).json({status: "500", message: "Error with embedding server request"});
//     })

//     embRequest.write(embData);
//     embRequest.end();
// });

/*
router.get('/experiment', async (req, res) => {
    return processQuery(res, req.query.textQuery, req.query.encoderQuery, req.query.databaseQuery);
});

async function processQuery(res, textQuery, encoder, database) {

    if(!textQuery) {
        return res.status(400).send('Please introduce a text query');
    } else if (!encoder) {
        return res.status(400).send('Please select an encoder');
    }

    // Set encoder options according to client request
    let encoderName = '';
    let collectionName = '';
    switch(encoder) {
        case 'CLIP Centroid':
            encoderName = 'clip';
            collectionName = 'ucfclipcentroid';
            break;
        case 'VCLIP Centroid':
            encoderName = 'vclip';
            collectionName = 'ucfvclipcentroid';
            break;
        default:
            return res.status(404).send(`Encoder ${encoder} Not Found`);
    }

    // Query the embedding engine

    // Build POST request data
    const embURL = `http://${process.env.EMB_ENGINE_HOST}:${process.env.EMB_ENGINE_PORT}/text`;
    const embPostBody = {
        json: {
            encoder: encoderName,
            data: textQuery
        }
    };

    // Send POST request and wait for answer
    const data = await got.post(embURL, embPostBody);
    console.log(data);
    return res.status(200)

    // Create request object and define callback
    const embReq = http.request(embPostBody, (embRes) => {

        let embJSON = ''

        // When data is being recieved
        embRes.on('data', (chunk) => {
            embJSON += chunk
        });

        // When data has already been recieved
        embRes.on('end', () => {



        });

    });
}

function queryDatabase(res, emb, database) {

    // 

}
    */

module.exports = router;
