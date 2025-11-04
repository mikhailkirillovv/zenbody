# Stage 1: Build React app
FROM node:22-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь фронтенд
COPY . .

# Собираем продакшн билд
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Копируем собранный билд в nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Открываем порт 80
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
