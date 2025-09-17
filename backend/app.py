from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from transformers import AutoImageProcessor, SiglipForImageClassification
from transformers import AutoFeatureExtractor, AutoModelForImageClassification
import torch

# Загружаем готовую модель (Hugging Face)
#MODEL_NAME = "nisuga/food_type_classification_model"  # Vision Transformer

#extractor = AutoTokenizer.from_pretrained("MODEL_NAME")
#model = AutoModelForSequenceClassification.from_pretrained("MODEL_NAME")
extractor = AutoImageProcessor.from_pretrained("Kaludi/food-category-classification-v2.0")
model = AutoModelForImageClassification.from_pretrained("Kaludi/food-category-classification-v2.0")
#model = SiglipForImageClassification.from_pretrained(MODEL_NAME)
#extractor = AutoImageProcessor.from_pretrained(MODEL_NAME, use_auth_token="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")
#extractor = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
#model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)

app = FastAPI(
    title="Zenbody Backend",
    description="API для анализа еды с фото",
    version="1.0.0"
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Zenbody backend is running with ML!"}

@app.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        # Читаем изображение
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Преобразуем для модели
        inputs = extractor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predicted_class_id = logits.argmax(-1).item()
            predicted_label = model.config.id2label[predicted_class_id]

        # 🔥 Тут можно подключить словарь калорийности
        calories_dict = {
            "apple": 95,
            "banana": 105,
            "orange": 62,
            "pizza": 285,
            "cake": 350
        }
        calories = calories_dict.get(predicted_label.lower(), "unknown")

        return {
            "status": "success",
            "food": predicted_label,
            "calories": calories,
            "filename": file.filename
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
