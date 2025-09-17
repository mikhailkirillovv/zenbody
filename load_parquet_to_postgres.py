import pandas as pd
from sqlalchemy import create_engine
import pyarrow.dataset as ds
# -----------------------
# Настройки
# -----------------------
PARQUET_FILE = "food.parquet"  # путь к дампу
DATABASE_URL = "postgresql://postgres:Password2442@postgres:5432/zenbody"  # обнови свои данные
TABLE_NAME = "products"
CHUNK_SIZE = 100  # количество строк за раз для загрузки

print("post")
engine = create_engine(DATABASE_URL)
# -----------------------
# Шаг 1: Чтение Parquet
# -----------------------
print("Чтение Parquet...")
#df_start = pd.read_parquet(PARQUET_FILE)
#df = df_start.head(100)
dataset = ds.dataset(PARQUET_FILE, format="parquet")
table = dataset.take(range(CHUNK_SIZE))  # берём первые N_ROWS
df = table.to_pandas()
print(df)
# -----------------------
# Шаг 2: Фильтрация нужных колонок
# -----------------------
print("Фильтрация колонок...")
columns_needed = [
    "code",
    "product_name_en",
    "product_name_ru",
    "nutriments.energy-kcal_100g",
    "nutriments.fat_100g",
    "nutriments.carbohydrates_100g",
    "nutriments.proteins_100g"
]

# Некоторые строки могут не содержать всех колонок
df_filtered = df[[col for col in columns_needed if col in df.columns]].copy()

# Переименуем колонки для Postgres
df_filtered = df_filtered.rename(columns={
    "nutriments.energy-kcal_100g": "energy_100g",
    "nutriments.fat_100g": "fats_100g",
    "nutriments.carbohydrates_100g": "carbs_100g",
    "nutriments.proteins_100g": "proteins_100g"
})

# -----------------------
# Шаг 3: Подключение к Postgres
# -----------------------
print("Подключение к PostgreSQL...")
engine = create_engine(DATABASE_URL)

# -----------------------
# Шаг 4: Загрузка в Postgres
# -----------------------
print("Загрузка данных в PostgreSQL...")
df_filtered.to_sql(TABLE_NAME, engine, if_exists="replace", index=False, chunksize=CHUNK_SIZE)

print(f"Загрузка завершена! Таблица '{TABLE_NAME}' создана в базе данных.")
