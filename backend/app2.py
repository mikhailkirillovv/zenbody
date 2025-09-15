from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

app = FastAPI(
    title="Zenbody Backend",
    description="API для подсчёта калорий из фотографий",
    version="1.0.0"
)

# --- Настройка CORS (чтобы фронт мог обращаться к бэку) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или ["http://localhost:8080"] если хочешь ограничить
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Тестовый роут ---
@app.get("/")
async def root():
    return {"message": "Zenbody backend is running!"}

# --- Заглушка: подсчёт калорий из фото ---
@app.post("/analyze")
async def analyze_food(file: UploadFile = File(...)):
    # Читаем файл
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # Тут должна быть ML-модель или интеграция с API
    # Пока сделаем заглушку
    recognized_food = "apple"
    calories = 95

    return {
        "food": recognized_food,
        "calories": calories,
        "filename": file.filename,
        "size": image.size
    }

