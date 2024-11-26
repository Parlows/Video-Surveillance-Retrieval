# For configuration parameters
from yacs.config import CfgNode as CN

# Modified CLIP
from vclip import vclip

import torch

from os.path import join as join_path

VCLIP_WEIGHTS_PATH = '/weights'
class VCLIP():
    def __init__(self):

        # Apply a default configuration
        _C = CN()
        _C.BASE = ['']
        _C.MODEL = CN()
        _C.MODEL.ARCH = 'ViT-B/32'
        _C.MODEL.WEIGHTS_DIR = VCLIP_WEIGHTS_PATH
        _C.MODEL.RESUME = join_path(VCLIP_WEIGHTS_PATH, '100batch_40frames_32.pth')
        _C.DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
        self.config = _C.clone()

        self.load()

    def load(self):
        backbone_name = self.config.MODEL.ARCH
        root = self.config.MODEL.WEIGHTS_DIR

        self.model, self.preprocess = vclip.load(name=backbone_name,
                                                 download_root=root,
                                                 jit=False,
                                                 device=self.config.DEVICE)
        
        self.model = self.model.float()
        checkpoint = torch.load(self.config.MODEL.RESUME, map_location='cpu')
        load_state_dict = checkpoint['model']
        self.model.load_state_dict(load_state_dict, strict=False)

        self.device = self.config.DEVICE
    
    def unload(self):
        pass

    def encode_image(self, img):
        # Send image to device
        image = self.preprocess(img).unsqueeze(0).to(self.device)

        # Get features
        image_features, attention_weights = self.model.encode_image(image)

        return image_features

    def encode_text(self, text):
        text = vclip.tokenize(text).to(self.device)
        text_features, _ = self.model.encode_text(text)
        return text_features

    def get_encoder_params(self) -> dict:
        params = {
            'model_name': 'clip',
            'embedding_size': 768,
            'embedding_list': True
        }
        return params

model = VCLIP()

print(model.encode_text('test-text'))
