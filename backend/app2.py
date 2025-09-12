from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np
from skimage import color


app = FastAPI()


app.add_middleware(
CORSMiddleware,
allow_origins=["http://130.61.57.107:80", "http://130.61.57.107:8000", "*"],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)


# Простейшая БД калорий (примерные значения на порцию)
CALORIES_DB = {
'banana': 105,
'apple': 95,
'tomato': 22,
'salad': 33,
'bread_slice': 80,
'rice_plate': 250,
'steak': 679,
'fried_potatoes': 312,
'pizza_slice': 285,
'default_mixed_dish': 450
}




def mock_recognize_food(image: Image.Image):
"""
MOCK: распознает один-две категории на основе доминирующего цвета и размеров.
Это заглушка: замените на модель/облачный API.
Возвращает список объектов: {name, confidence, estimated_calories}
"""
# resize чтобы ускорить
img = image.convert('RGB')
img_small = img.resize((150,150))
arr = np.array(img_small) / 255.0 # 0..1


# Переведём в Lab и найдём средний цвет
lab = color.rgb2lab(arr)
avg_lab = lab.mean(axis=(0,1))
L,a,b = avg_lab


# Нечёткая эвристика
items = []
# если очень желтый (банан)
if a < 0 and b > 20: # больше желтизны
items.append(('banana', 0.78))
# если красный/помидор
if a > 20 and b > 5:
items.append(('tomato', 0.6))
# если средняя яркость темная и рыжая -> мясо/стейк
if L < 40 and a > 10:
items.append(('steak', 0.55))
# если картинка светлая и зелёная-ish -> салат
if a < 0 and b < 0:
items.append(('salad', 0.5))


# Если ничего не распознано — вернуть "миксовое блюдо"
if not items:
items = [('default_mixed_dish', 0.6)]


# Преобразуем в формат с калориями
result = []
total = 0
for name, conf in items:
cal = CALORIES_DB.get(name, CALORIES_DB['default_mixed_dish'])
result.append({'name': name, 'confidence': float(conf), 'estimated_calories': int(cal)})
total += cal


return {'items': result, 'total_calories': int(total)}




@app.post('/api/analyze')
async def analyze(image: UploadFile = File(...)):
try:
contents = await image.read()
img = Image.open(io.BytesIO(contents)).convert('RGB')
except Exception as e:
return JSONResponse(status_code=400, content={'error': 'Invalid image'})


res = mock_recognize_food(img)
return JSONResponse(content=res)




if __name__ == '__main__':
import uvicorn
uvicorn.run(app, host='130.61.57.107', port=8000)
