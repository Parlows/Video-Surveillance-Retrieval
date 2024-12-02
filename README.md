# Video Surveillance Retrieval

This project is a deployment of a Video Retrieval system, applied in the specific area of Video Surveillance.

The application deploys a web server that allows the client to write textual prompts. The system transforms those prompts into multimodal representations or embeddings through some deep learning models (CLIP and variations) to query a database that stores the embeddings of different events captured by the surveillance cameras. Thus, events which are semantically close to the prompt are returned to the client.

The application comprises three main components:

- **Vector Database**: this database holds a vector representation of the different events of the surveillance videos, alongside with some metadata to find the actual videos in the video database.
- **NodeJS server**: this server sends the static web data to the client and deploys a REST API to query the vector database and request the actual video events.
- **Embedding server**: this server is used by the NodeJS server to obtain the vector representations of the textual data, but can also encode visual data.

### Vector database

This project just deploys the database engine through Docker Compose. Two implementations are considered: Milvus and QDrant.

The data stored in these databases are vectors that were obtained from the encoding of relevant events of the surveillance videos using Deep Learning Multi-Modal Transformers (CLIP and VCLIP). These databases are queried using a vector encoding of a text prompt, so vectors of videos semantically similar to that text prompt are returned. The database also stores some metadata (the video source and the start and end frame of the event) so the actual clip can be retrieved.

### Node Server

This is a NodeJS server that performs two main tasks:

- Provides the static web content used by the client to make requests.
- Implements a REST API so the client can perform searches. It implements routes to query the vector database using a text prompt and routes to stream the video events which the vector database returned.

When the client sends a text prompt, this server forwards it to the embedding server and obtains the vector representation. Then, it queries the vector database using that vector. The vector database responds with the K most similar vectors, which represents the K events more semantically similar to the text prompt. The references of these K events are sent to the client.

The client uses those reference to request the streaming of the K videos. The NodeJS server crops the original surveillance videos to stream those events to the client.

### Embedding Server

Through a Flask Server, implements a REST API which recieves either a text or an image and returns the endoded embedding. 

## Info

This is the code used for my Master Thesis of the [MSc in Telecommunication Engineering](https://www.etsit.upm.es/de/studies/master-of-science-in-telecommunication-engineering.html).

The project has been developed in the [Signal Processing Applications Group](https://www.upm.es/recursosidi/en/map/en_signal-processing-applications-group-spag/) (GAPS/SPAG) at Universidad Politécnica de Madrid, under the supervision of José Luis Blanco Murillo and Juan Gutiérrez Navarro.
