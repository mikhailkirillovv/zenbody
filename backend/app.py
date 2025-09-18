from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import requests
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification

# --- Инициализация приложения ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # можно ограничить только фронтендом
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Загружаем ML модель ---
MODEL_NAME = "Kaludi/food-category-classification-v2.0"
processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)

# --- OpenFoodFacts API ---
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

def fetch_from_off(product_name: str, top_k: int = 3):
    """Поиск продукта через OpenFoodFacts API"""
    params = {
        "search_terms": product_name,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": top_k,
    }
    r = requests.get(OFF_SEARCH_URL, params=params)
    if r.status_code != 200:
        return []
    return r.json().get("products", [])

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """Загрузка фото -> ML модель -> поиск в OpenFoodFacts"""
    image = Image.open(file.file).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")

    # предсказание
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class_id = logits.argmax(-1).item()
        predicted_label = model.config.id2label[predicted_class_id]

    # поиск в OFF
    products = fetch_from_off(predicted_label)

    # формируем ответ
    return {
        "predicted_label": predicted_label,
        "products": [
            {
                "name": p.get("product_name", "Без названия"),
                "brand": p.get("brands", "Неизвестно"),
                "energy": p.get("nutriments", {}).get("energy-kcal_100g"),
                "proteins": p.get("nutriments", {}).get("proteins_100g"),
                "carbs": p.get("nutriments", {}).get("carbohydrates_100g"),
                "fats": p.get("nutriments", {}).get("fat_100g"),
            }
            for p in products
        ]
    }
