from os.path import join as join_path
import torch

# For configuration parameters
from yacs.config import CfgNode as CN

# Usual CLIP
from transformers import CLIPModel, AutoProcessor

# Modified CLIP
from vclip import vclip

possible_models = [
    'default',
    'random',
    'clip',
    'clip-centroid',
    'vclip'
]

class EmbeddingModel:
    def __init__(self):
        raise NotImplementedError
    
    def load(self):
        """Loads the model in cuda memory.
        """
        raise NotImplementedError
    
    def unload(self):
        """Unloads the model from cuda memory.
        """
        raise NotImplementedError

    def encode_image(self):
        """Generates the embedding of an image.
        """
        raise NotImplementedError
    
    def encode_text(self):
        """Generates the embedding of a text.
        """
        return NotImplementedError

    def encode_video(self):
        """Generates the embedding of a video.
        """
        return NotImplementedError
    
    def get_params(self) -> dict:
        """Returns the params related with the encoder, to properly configure a database's
        collection.

        Returns
        -------
        dict
            The parameters as a dictionary
        """
        raise NotImplementedError
    
class EncoderBuilder:

    def build(self, encoder_name, *args, **kwargs) -> EmbeddingModel:
        """Returns the encoder's object corresponding to the specified name.

        Parameters
        ----------
        encoder_name : str
            The name of the encoder. Can be one of the specified in the \'vision_encoders.possible_models\' variable.

        Returns
        -------
        EmbeddingModel
            The encoder's object.

        Raises
        ------
        TypeError
            If the specified encoder is not implemented.
        MemoryError
            If CUDA is out of memory.
        """
        try:
            match encoder_name:
                case 'clip':
                    return CLIP(*args, **kwargs)
                case 'vclip':
                    return VCLIP(*args, **kwargs)
                case _:
                    raise TypeError(f'TypeError: Encoder {encoder_name} not found among implemented. Please, use one of the following: {possible_models}.')
        except torch.OutOfMemoryError:
            raise MemoryError("CUDA out of memory")

class CLIP(EmbeddingModel):

    def __init__(self, model_name:str='openai/clip-vit-large-patch14'):
        """Uses HuggingFace's CLIP model to obtain the embeddings of the clips.

        Parameters
        ----------
        model_name : str, optional
            The specific CLIP model from the HuggingFace repository. By default, openai/clip-vit-large-patch14
        """
        self.model_name = model_name
        self.load()

    def load(self):
        try:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            # Had to use this for memory issues
            #self.device = 'cpu'
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.processor = AutoProcessor.from_pretrained(self.model_name)
        except OSError as e:
            print(f'OSError: Model \'{self.model_name}\' not listed in HuggingFace repository. {e}')

    def encode_image(self, img):
        inputs = self.processor(images=img, return_tensors='pt').to(self.device)

        image_features = self.model.get_image_features(**inputs)

        return image_features.cpu().detach().numpy()

    def encode_text(self, text):
        inputs = self.processor(text=text, return_tensors='pt').to(self.device)

        text_features = self.model.get_text_features(**inputs)

        return text_features.cpu().detach().numpy()

    def get_encoder_params(self) -> dict:
        params = {
            'model_name': 'clip',
            'embedding_size': 768,
            'embedding_list': True
        }
        return params

VCLIP_WEIGHTS_PATH = '/weights'
class VCLIP(EmbeddingModel):
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
        
        self.model = self.model.float().cuda()
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
