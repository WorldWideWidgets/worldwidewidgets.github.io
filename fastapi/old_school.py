import logging
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

# logging ... if
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

translation_map = {'POS': 'positive', 'NEG': 'negative', 'NEU': 'neutral'}

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    label: str
    text: str
    score: float

app = FastAPI()

sentiment_pipeline = None

@app.on_event("startup")
async def startup_event():
    global sentiment_pipeline
    logger.info("App starting...")
    logger.info("Loading model...")
    sentiment_pipeline = pipeline(model="finiteautomata/bertweet-base-sentiment-analysis")
    logger.info("Model loaded.")

@app.on_event("shutdown")
async def shutdown_event():
    global sentiment_pipeline
    if sentiment_pipeline:
        del sentiment_pipeline

@app.post("/predict", response_model=list[SentimentResponse])
async def predict(request: SentimentRequest):
    if not sentiment_pipeline:
        raise RuntimeError("Model not loaded")

    result = sentiment_pipeline(request.text)
    response = [
        SentimentResponse(
            label=translation_map[result[0]['label']],
            text=request.text,
            score=result[0]['score'],
        )
    ]
    return response

# prediction endpoint for more than one input
# @app.post("/predict", response_model=list[SentimentResponse])
# async def predict(request: SentimentRequest):
#     if not sentiment_pipeline:
#         raise RuntimeError("Model not loaded")

#     result = sentiment_pipeline([request.text])
#     response = [
#         SentimentResponse(
#             label=translation_map[r['label']],
#             text=request.text,
#             score=r['score'],
#         )
#         for r in result
#     ]
#     return response

