

from clip import clip
import torch

class CLIP():

    def __init__(self, model_name:str='openai/clip-vit-base-patch32'):
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
            self.model, self.processor = clip.load('ViT-B/32', device=self.device)
            # self.model = CLIPModel.from_pretrained(self.model_name)
            # self.model.to(self.device)
            # self.processor = AutoProcessor.from_pretrained(self.model_name)
        except OSError as e:
            print(f'OSError: Model \'{self.model_name}\' not listed in HuggingFace repository. {e}')

    def encode_image(self, img):
        inputs = self.processor(images=img, return_tensors='pt').to(self.device)

        image_features = self.model.get_image_features(**inputs)

        return image_features.cpu().detach().numpy()

    def encode_text(self, text):
        tokenized_text = clip.tokenize(text).to(self.device)
        # inputs = self.processor(text=text, return_tensors='pt').to(self.device)

        text_features = self.model.encode_text(tokenized_text)
        # print(f'Text features: {text_features}')

        return text_features.cpu().detach().numpy()

    def get_encoder_params(self) -> dict:
        params = {
            'model_name': 'clip',
            'embedding_size': 512,
            'embedding_list': True
        }
        return params

model = CLIP()

print(model.encode_text('test-text'))
