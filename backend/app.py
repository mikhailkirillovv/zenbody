# =========================================================
# FOOD RECOGNITION BACKEND — FULLY DETERMINISTIC
# ConvNeXt + CosFace EMA
# PRODUCTION STABLE VERSION
# =========================================================

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
import requests
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import numpy as np
import albumentations as A
from albumentations.pytorch import ToTensorV2
import random

# =========================================================
# ABSOLUTE DETERMINISM
# =========================================================

torch.manual_seed(0)
np.random.seed(0)
random.seed(0)

torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

# =========================================================
# CONFIG
# =========================================================

MODEL_PATH = "best_food_model.pth"

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

IMG_SIZE = 300
EMBED_DIM = 256
SCALE = 25.0

TOP_K = 5

USE_TTA = False   # ВАЖНО: отключено для стабильности

BACKBONE = "convnext_base.fb_in22k_ft_in1k"

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(title="Food Recognition API Stable")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# OPEN FOOD FACTS
# =========================================================

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

    try:

        r = requests.get(
            OFF_SEARCH_URL,
            params=params,
            timeout=5
        )

        if r.status_code != 200:
            return []

        return r.json().get("products", [])

    except Exception:
        return []

# =========================================================
# TRANSFORMS
# =========================================================

val_transform = A.Compose([

    A.Resize(IMG_SIZE, IMG_SIZE),

    A.CenterCrop(IMG_SIZE, IMG_SIZE),

    A.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),

    ToTensorV2(),

])

# =========================================================
# MODEL
# =========================================================

class FoodClassifier(nn.Module):

    def __init__(self, backbone_name, num_classes):

        super().__init__()

        self.backbone = timm.create_model(
            backbone_name,
            pretrained=False,
            num_classes=0
        )

        in_features = self.backbone.num_features

        self.fc = nn.Linear(
            in_features,
            EMBED_DIM
        )

        self.bn = nn.BatchNorm1d(
            EMBED_DIM,
            eps=1e-5,
            momentum=0.1
        )

        self.dropout = nn.Dropout(0.05)

        self.prelu = nn.PReLU()

        self.head = nn.Linear(
            EMBED_DIM,
            num_classes,
            bias=False
        )

    def forward(self, x):

        features = self.backbone(x)

        emb = self.fc(features)
        emb = self.bn(emb)
        emb = self.dropout(emb)
        emb = self.prelu(emb)

        cosine = F.linear(
            F.normalize(emb, eps=1e-5),
            F.normalize(self.head.weight, eps=1e-5)
        )

        logits = cosine * SCALE

        return logits


# =========================================================
# LOAD MODEL
# =========================================================

print("\n🚀 Loading model...\n")

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)

CLASSES = checkpoint["classes"]

model = FoodClassifier(
    BACKBONE,
    len(CLASSES)
)

model.load_state_dict(
    checkpoint["model"],
    strict=True
)

model.to(DEVICE)

model.eval()

# Зафиксировать BatchNorm полностью
for m in model.modules():

    if isinstance(m, nn.BatchNorm1d):
        m.eval()

    if isinstance(m, nn.BatchNorm2d):
        m.eval()

print("✅ Model loaded")
print("✅ Classes:", len(CLASSES))
print("✅ Device:", DEVICE)

# =========================================================
# PREDICT
# =========================================================

@torch.inference_mode()
def predict(image: Image.Image):

    image = ImageOps.exif_transpose(image)

    image_np = np.array(image)

    x = val_transform(
        image=image_np
    )["image"]

    x = x.unsqueeze(0).to(DEVICE)

    logits = model(x)

    probs = F.softmax(
        logits,
        dim=1
    )

    values, indices = probs.topk(TOP_K)

    results = []

    for j in range(TOP_K):

        idx = int(indices[0][j])

        results.append({

            "label": CLASSES[idx],

            "confidence": float(values[0][j])

        })

    return results


# =========================================================
# API
# =========================================================

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):

    image = Image.open(file.file).convert("RGB")

    predictions = predict(image)

    best_label = predictions[0]["label"]

    products = fetch_from_off(best_label)

    return {

        "predictions": predictions,

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


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {

        "status": "ok",

        "device": str(DEVICE),

        "classes": len(CLASSES),

        "deterministic": True

    }


# =========================================================
# RUN
# =========================================================

# uvicorn app:app --host 0.0.0.0 --port 8000