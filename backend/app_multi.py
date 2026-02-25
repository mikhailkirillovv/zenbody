from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import requests
import torch
from ultralytics import YOLO
import io

# ------------------------------
# FastAPI
# ------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Load YOLO model
# ------------------------------
MODEL_PATH = "best.pt"   # поменяй на свой путь

device = "cuda" if torch.cuda.is_available() else "cpu"
model = YOLO(MODEL_PATH)
model.to(device)

# ------------------------------
# OpenFoodFacts API
# ------------------------------
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"

def fetch_from_off(product_name: str, top_k: int = 3):
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


# ------------------------------
# API endpoint
# ------------------------------
@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    # читаем изображение
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")

    # YOLO inference
    results = model.predict(img, conf=0.25, verbose=False)

    detections = []

    for r in results:
        boxes = r.boxes

        for box in boxes:
            cls_id = int(box.cls[0])
            cls_name = model.names[cls_id]
            conf = float(box.conf[0])

            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = [float(i) for i in xyxy]

            # запрос OFF
            products = fetch_from_off(cls_name)

            detections.append({
                "class": cls_name,
                "confidence": conf,
                "bbox": [x1, y1, x2, y2],
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
            })

    return {
        "count": len(detections),
        "detections": detections
    }
