from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import requests
import torch
import torch.nn as nn
#import torch.optim as optim
import torchvision
from torchvision import models, transforms
from torchvision.models import convnext_tiny, ConvNeXt_Tiny_Weights
#from torch.utils.data import DataLoader, random_split
#from transformers import AutoImageProcessor, AutoModelForImageClassification

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
MODEL_PATH = "best_convnext_food101_15.pth"
CALORIES_PATH = "calories.json"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# ======================
# 2. Загружаем чекпоинт
# ======================
checkpoint = torch.load(MODEL_PATH, map_location=device)
# Восстанавливаем веса модели
# model.load_state_dict(checkpoint["model_state_dict"])
# Извлекаем классы из модели
classes = checkpoint["classes"]

# ======================
# 4. Восстанавливаем модель
# ======================
num_classes = len(classes)
model = convnext_tiny(weights=ConvNeXt_Tiny_Weights.IMAGENET1K_V1)
model.classifier[2] = nn.Linear(model.classifier[2].in_features, num_classes)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()
model.to(device)

# ======================
# 5. Трансформации
# ======================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# --- OpenFoodFacts API ---
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

def fetch_from_off(product_name: str, top_k: int = 3):
    """Поиск продукта через OpenFoodFacts API"""
    product_name = product_name.replace("_", " ")
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
    inputs = transform(image).unsqueeze(0)  # batch dimension

    # предсказание
    with torch.no_grad():
        outputs = model(inputs)
        #logits = outputs.logits
        predicted_class_id = outputs.argmax(1).item()
        predicted_label = classes[predicted_class_id]

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
