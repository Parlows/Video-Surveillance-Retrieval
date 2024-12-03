from flask import Flask, request # type: ignore
import numpy as np # type: ignore
# import cv2

import base64
from PIL import Image
from io import BytesIO

possible_models = [
    'default',
    'random',
    'clip',
    'clip-centroid',
    'vclip'
]

from encoders import EncoderBuilder

app = Flask(__name__)

def check_request(req):
    return req['encoder'] and req['data']

# This route takes a text and responds with the embedding
@app.route('/text', methods=['POST'])
def get_text():

    if (not check_request(request.json)):
        return "Bad request", 400

    # Logging info
    print(f'Text encoding with: {request.json["encoder"]}')

    # Take the requested text
    text = request.json['data']

    try:
        # Build the selected model
        model = EncoderBuilder().build(request.json['encoder'])
        
        # Encode text
        emb = model.encode_text(text)
    except MemoryError:
        return "ERROR: CUDA out of memory", 500

    # Return succesful response
    return emb.tolist(), 200

# This route takes a b64-encoded image and responds with the embedding
@app.route('/image', methods=['POST'])
def get_image():

    if (not check_request(request.json)):
        return "Bad request", 400
    
    # Logging info
    print(f'Image encoding with: {request.json["encoder"]}')
    
    # Get and decode requested image
    img_b64 = request.json['data']
    # image_data = np.frombuffer(base64.b64decode(img_b64), dtype=np.uint8)
    # img = cv2.imdecode(image_data, flags=1)
    image_data = base64.b64decode(img_b64)
    img = Image.open(BytesIO(image_data))
    # img.save('/weights/img.png')
    img = np.array(img)
    # print(img)
    
    try:
        # Build the selected model
        model = EncoderBuilder().build(request.json['encoder'])
        
        # Encode image
        emb = model.encode_image(img)
    except MemoryError:
        return "CUDA out of memory", 500

    # Return succesful response
    return emb.tolist(), 200

if __name__ == '__main__':
    app.run()
