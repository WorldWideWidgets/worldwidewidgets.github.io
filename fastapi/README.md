# Old School Sentiment Analysis API

A simple FastAPI app for sentiment analysis using Hugging Face transformers. This stuff is in contra-distinction to the tiny models usage we have for phones in other parts of this repo. You have to download the files and run them manually, but they work really well... and fastapi and pure python, they're fast. This model is better, IMO than the tiny one I used for the phone example, but ... models come and go. Everything is replaceable.

## Requirements

* Python 3.8+
* torch (that is 'pip install torch' or pytorch for conda)
* FastAPI
* transformers
* uvicorn

## Installation

```bash
pip install fastapi transformers uvicorn
```

## Running the API

FastAPI made some adjustments in the latest couple releases. They have a fully cool dependency injection framework (this method depends on the result of some other function...) AND they got rid of the on_event('startup') and on_event('shutdown') events, etc, in favor ofthe idea of a lifespan. This works REALLY well for doing things like loading a gynormous 24GB model once when a service starts up. It's - IMO - a little bit more intuitive. 

```bash
uvicorn old_school:app --host 0.0.0.0 --port 8787 --reload
```
OR...

```bash
uvicorn old_school:app --host 0.0.0.0 --port 8989 --reload &
```
Or both, I suppose would work. It would just be odd looking at one terminal. Eh... whaddya gonna do.

### Old School App CURL test

```bash
curl -X POST 'http://localhost:8787/predict' -H 'Content-Type: application/json' -d '{"text": "I love world wide widgets - and godzola is AMAZING!"}'
```
### New School App CURL test

```bash
curl -X POST 'http://localhost:8989/predict' -H 'Content-Type: application/json' -d '{"text": "godzola is a scoundrel and he owe's me 20 bucks. "}'
```
### You Can't Stop Progress

They both look the same, and are called in the same manner (modulo the port in this case). You know what they say... you can't stop progress.

### `/predict`

* Method: `POST`
* Request Body: `{"text": "I love world wide widgets"}`
* Response: `[{"label":"positive","text":"I love world wide widgets","score":0.9927709698677063}]`
* Request Body: `{"text": "godzola is a scoundrel and he owes me 20 bucks"}`
* Response: `[{"label":"negative","text":"godzola is a scoundrel and he owes me 20 bucks","score":0.9775582551956177}]`

## Models

This API uses the `finiteautomata/bertweet-base-sentiment-analysis` model by default. You can change the model by modifying the `sentiment_pipeline` initialization in `main.py`.

## Caching

The model will be cached in the `~/.cache/huggingface/transformers` directory. You can manage your cached models using the `transformers-cli` or of course manually if you are so inclined.

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

## License

It's actually not worth anyone's time to license under any license. However... I'll claim the MIT License to limit my liability and suggest that if you make money you should give it all to charity. All of it. Don't keep like 7% for your time, that's a non-starter.
