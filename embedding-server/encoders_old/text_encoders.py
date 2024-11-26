
import numpy as np
from transformers import CLIPModel, AutoProcessor

class EmbeddingModel:
    def __init__(self):
        raise NotImplementedError

    def get_text_embedding(self):
        raise NotImplementedError
    
    def get_encoder_params(self) -> dict:
        raise NotImplementedError

class EncoderBuilder:

    def build(encoder_name, *args, **kwargs) -> EmbeddingModel:

        match encoder_name:
            case 'clip':
                return CLIPEncoder(*args, **kwargs)
            case _:
                raise TypeError(f'TypeError: Encoder {encoder_name} not found among implemented.')

class CLIPEncoder(EmbeddingModel):

    def __init__(self, model_name:str = 'openai/clip-vit-large-patch14'):
        try:
            self.model = CLIPModel.from_pretrained(model_name)
            self.processor = AutoProcessor.from_pretrained(model_name)
        except OSError as e:
            print(f'OSError: Model \'{model_name}\' not listed in HuggingFace repository. {e}')
        
    def get_text_embedding(self, text:str) -> np.ndarray:
        inputs = self.processor(text=text, return_tensors='pt')

        image_features = self.model.get_text_features(**inputs)

        return image_features.detach().numpy()

    def get_encoder_params(self) -> dict:
        return {}



