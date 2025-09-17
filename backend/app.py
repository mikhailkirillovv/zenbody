from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from transformers import pipeline
import requests

# Инициализация FastAPI
app = FastAPI()

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face модель (берём готовый food classifier)
classifier = pipeline("image-classification", model="nateraw/food")

# OpenFoodFacts API
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

def fetch_from_off(product_name: str):
    """Поиск продукта через OpenFoodFacts"""
    params = {
        "search_terms": product_name,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": 3,
    }
    r = requests.get(OFF_SEARCH_URL, params=params)
    if r.status_code != 200:
        return []
    return r.json().get("products", [])

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """Загрузка фото, классификация через Hugging Face, поиск данных в OFF"""
    image = Image.open(file.file).convert("RGB")
    predictions = classifier(image, top_k=3)

    results = []
    for pred in predictions:
        name = pred["label"]
        score = round(pred["score"] * 100, 2)

        off_results = fetch_from_off(name)
        results.append({
            "predicted": name,
            "confidence": score,
            "openfoodfacts": [
                {
                    "name": p.get("product_name", "Без названия"),
                    "brand": p.get("brands", "Неизвестно"),
                    "energy": p.get("nutriments", {}).get("energy-kcal_100g"),
                    "proteins": p.get("nutriments", {}).get("proteins_100g"),
                    "carbs": p.get("nutriments", {}).get("carbohydrates_100g"),
                    "fats": p.get("nutriments", {}).get("fat_100g"),
                }
                for p in off_results
            ]
        })

    return {"results": results}
