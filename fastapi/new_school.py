import logging
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the translation map
translation_map = {'POS': 'positive', 'NEG': 'negative', 'NEU': 'neutral'}

# Define the request and response models
class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    label: str
    text: str
    score: float

# Create the FastAPI app
app = FastAPI()

sentiment_pipeline = None

@app.lifespan
async def lifespan(app: FastAPI):
    global sentiment_pipeline
    logger.info("App starting...")
    logger.info("Loading model...")
    sentiment_pipeline = pipeline(model="finiteautomata/bertweet-base-sentiment-analysis")
    logger.info("Model loaded.")
    try:
        yield
    finally:
        if sentiment_pipeline:
            del sentiment_pipeline

# Define the prediction endpoint
@app.post("/predict", response_model=list[SentimentResponse])
async def predict(request: SentimentRequest):
    if not sentiment_pipeline:
        raise RuntimeError("Model not loaded")

    result = sentiment_pipeline([request.text])
    response = [
        SentimentResponse(
            label=translation_map[r['label']],
            text=request.text,
            score=r['score'],
        )
        for r in result
    ]
    return response
