// src/App.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

// MUI core & icons
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Switch,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Tooltip,
  Skeleton,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import HistoryIcon from "@mui/icons-material/History";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";

// framer-motion for animations
import { motion, AnimatePresence } from "framer-motion";

// react-dropzone for drag & drop
import { useDropzone } from "react-dropzone";

/* ===========================
   Конфигурация
   =========================== */

// URL бэкенда для анализа (оставь как есть, если это твой бэк)
const API_URL = "http://130.61.57.107:8000/analyze-image";

// Ключи хранения в localStorage
const LS_THEME_KEY = "zenbody:theme_dark";
const LS_HISTORY_KEY = "zenbody:history_v1";

/* ===========================
   Утилиты
   =========================== */

// Сохраняем историю в localStorage (JSON)
function saveHistory(arr) {
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Не удалось сохранить историю:", e);
  }
}

// Загружаем историю из localStorage
function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Не удалось загрузить историю:", e);
    return [];
  }
}

/* ===========================
   Главный компонент приложения
   =========================== */

export default function App() {
  /* ---------- Theme (Light / Dark) ---------- */
  // Инициализируем значение тёмной темы из localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(LS_THEME_KEY) === "1";
    } catch {
      return false;
    }
  });

  // MUI тема — используем зелёный акцент (fitness/zen)
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: { main: "#16a34a" }, // ярко-зелёный акцент
        },
        typography: {
          fontFamily: '"Inter", "Roboto", sans-serif',
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
        },
      }),
    [darkMode]
  );

  // При изменении темы — сохраняем в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_THEME_KEY, darkMode ? "1" : "0");
    } catch {}
  }, [darkMode]);

  /* ---------- File / Preview / Drag & Drop ---------- */
  // Состояния для загружаемого файла и preview URL
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Когда file меняется — создаём object URL (и чистим при смене)
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // react-dropzone: конфигурация и обработчики
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] }, // принимаем все изображения
    maxFiles: 1,
  });

  /* ---------- Result / Loading / Error / History ---------- */
  // Результат от сервера (ожидаем структуру результата: { predicted_label, products: [...] })
  const [result, setResult] = useState(null);

  // Загрузка / ошибка
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sidebar drawer (history)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // История анализов (локально)
  const [history, setHistory] = useState(() => loadHistory());

  // Выбранная запись истории (или текущий результат)
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);

  // Добавить результат в историю и сохранить
  const pushHistory = (entry) => {
    // entry: { ts, fileName, result }
    const next = [entry, ...history].slice(0, 50); // храним максимум 50 последних
    setHistory(next);
    saveHistory(next);
  };

  /* ---------- Анализ: отправка файла на бэкенд ---------- */
  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedHistoryIndex(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ошибка сервера: ${res.status} ${text}`);
      }
      const data = await res.json();

      // Принято сохранять в result именно то, что приходит
      setResult(data);

      // Сохраняем в историю
      const entry = {
        ts: Date.now(),
        fileName: file.name,
        result: data,
      };
      pushHistory(entry);
    } catch (e) {
      console.error(e);
      setError(e.message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Утилиты для безопасного чтения полей ответа ---------- */
  const safe = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const k of keys) if (obj[k] !== undefined) return obj[k];
    return undefined;
  };

  /* ---------- Sidebar (history) выбор записи ---------- */
  const openHistoryEntry = (idx) => {
    // если idx === null — показываем текущий result
    setSelectedHistoryIndex(idx);
    // если idx указывает на запись — заменить preview на thumbnail если есть
    if (idx !== null) {
      const rec = history[idx];
      // если запись содержит имя файла — не меняем текущий file, но можно показать его имя
      // также можно показать result по записи
      setResult(rec.result);
      setDrawerOpen(false);
    }
  };

  /* ---------- Удалить историю (очистить) ---------- */
  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  /* ---------- Вычисляем отображаемый продукт (первый найденный) ---------- */
  const chosenProduct = result?.products?.length ? result.products[0] : null;

  /* ---------- Рендер — возвращаем компоненты UI ---------- */
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline подключает MUI-стили глобально (background, normalize и т.д.) */}
      <CssBaseline />

      {/* Верхняя панель приложения (AppBar) */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Левая часть хедера — логотип и название */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Небольшой логотип в виде аватара */}
            <Avatar sx={{ bgcolor: "background.paper" }}>
              <RestaurantIcon color="success" />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" fontWeight={800}>
                Zenbody
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Food Analyzer — Zen + Fitness
              </Typography>
            </Box>
          </Box>

          {/* Правая часть хедера — кнопки: история, тема */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Кнопка открытия истории (Drawer справа) */}
            <Tooltip title="История анализов">
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>

            {/* Переключатель темы (иконка + Switch) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Brightness7Icon />
              <Switch
                checked={darkMode}
                onChange={() => setDarkMode((s) => !s)}
                color="default"
                inputProps={{ "aria-label": "toggle dark mode" }}
              />
              <Brightness4Icon />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Основной контейнер */}
      <Box component="main" sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        {/* Зона Drag & Drop + кнопки */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
          }}
        >
          {/* Интерактивная зона дропа */}
          <Box
            {...getRootProps()}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 2,
              borderRadius: 1,
              border: (theme) =>
                `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
              cursor: "pointer",
              bgcolor: "background.default",
            }}
          >
            {/* Внутренний текст и иконка */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CloudUploadIcon color="action" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Перетащите изображение сюда
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  JPG / PNG / WebP — либо нажмите «Выбрать файл»
                </Typography>
              </Box>
            </Box>

            {/* Кнопка выбора файла — input управляется dropzone */}
            <Box>
              <input {...getInputProps()} />
              <Button
                variant="contained"
                color="success"
                startIcon={<CloudUploadIcon />}
                onClick={() => {
                  // Программно кликнуть input нельзя напрямую через react-dropzone API,
                  // но getInputProps уже встроил input. Мы не используем реф здесь.
                }}
              >
                Выбрать файл
              </Button>
            </Box>
          </Box>

          {/* Под кнопками — действия: Анализировать, Сброс, Повтор */}
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              disabled={!file || loading}
              onClick={analyze}
              startIcon={<LocalFireDepartmentIcon />}
            >
              {loading ? "Анализ..." : "Анализировать"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setResult(null);
                setError(null);
              }}
            >
              Сброс
            </Button>

            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              onClick={() => {
                if (file) analyze();
              }}
              disabled={!file || loading}
            >
              Повторить
            </Button>

            {/* Показываем имя выбранного файла */}
            <Box sx={{ ml: "auto", alignSelf: "center" }}>
              <Typography variant="caption" color="text.secondary">
                {file ? file.name : "Файл не выбран"}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Главное содержимое — 2 колонки (лево: превью, право: данные) */}
        <Grid container spacing={3}>
          {/* ЛЕВО: preview изображения и skeleton */}
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 2 }}>
              {/* Плавное появление / исчезновение превью — framer-motion */}
              <CardContent>
                <AnimatePresence mode="wait">
                  {/* loading skeleton */}
                  {loading && (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Skeleton variant="rectangular" width="100%" height={320} />
                    </motion.div>
                  )}

                  {/* preview image */}
                  {!loading && previewUrl && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <CardMedia
                        component="img"
                        image={previewUrl}
                        alt="Preview"
                        sx={{ maxHeight: 320, objectFit: "contain", borderRadius: 1 }}
                      />
                    </motion.div>
                  )}

                  {/* placeholder */}
                  {!loading && !previewUrl && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Box
                        sx={{
                          height: 320,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "background.paper",
                          borderRadius: 1,
                        }}
                      >
                        <Typography color="text.secondary">Превью будет здесь</Typography>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Под превью — краткая статистика или подсказки */}
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Подсказки
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Загружайте четкие фотографии продукта. Если OpenFoodFacts не найдёт продукт — будет предпринят поиск в USDA (если настроено).
                </Typography>
              </Paper>
            </Box>
          </Grid>

          {/* ПРАВО: подробная информация о продукте */}
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, borderRadius: 2 }}>
              <CardContent>
                {/* Заголовок: имя предсказания или сообщение */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {result?.predicted_label ?? (loading ? "Анализ..." : "Здесь будет результат")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Модель распознавания — Zenbody
                    </Typography>
                  </Box>

                  {/* Показываем кол-во найденных вариантов (если есть) */}
                  <Box>
                    <Typography variant="subtitle2" color="success.main">
                      {result?.products?.length ? `${result.products.length} вариант(ов)` : "0"}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Ошибка (если есть) */}
                {error && (
                  <Box sx={{ mb: 2 }}>
                    <Typography color="error">{error}</Typography>
                  </Box>
                )}

                {/* Если загрузка — показываем skeleton placeholders */}
                {loading && (
                  <Box sx={{ display: "grid", gap: 1 }}>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="rectangular" height={60} />
                    <Skeleton variant="rectangular" height={60} />
                  </Box>
                )}

                {/* Если есть результат — отображаем карточки с нутриентами */}
                {!loading && result?.products?.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {/* Перебираем найденные продукты — вверху самый релевантный */}
                    {result.products.map((p, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                      >
                        <Paper sx={{ p: 2, borderRadius: 2 }}>
                          <Grid container spacing={2} alignItems="center">
                            {/* Название и бренд */}
                            <Grid item xs={12} md={8}>
                              <Typography variant="subtitle1" fontWeight={800}>
                                {p.name ?? p.product_name ?? "Без имени"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Бренд: {p.brand ?? "—"}
                              </Typography>
                            </Grid>

                            {/* Крупная метрика — калории */}
                            <Grid item xs={12} md={4} sx={{ textAlign: { xs: "left", md: "right" } }}>
                              <Typography variant="h5" fontWeight={900} color="success.main">
                                {p.energy ?? p["energy-kcal_100g"] ?? "—"} kcal
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                на 100 g
                              </Typography>
                            </Grid>

                            {/* Nutrient cards: белки / жиры / углеводы */}
                            <Grid item xs={12}>
                              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                                <NutrientCard icon={<FitnessCenterIcon />} label="Белки" value={p.proteins ?? p["proteins_100g"]} unit="g" />
                                <NutrientCard icon={<OilBarrelIcon />} label="Жиры" value={p.fats ?? p["fat_100g"]} unit="g" />
                                <NutrientCard icon={<RestaurantIcon />} label="Углеводы" value={p.carbs ?? p["carbohydrates_100g"]} unit="g" />
                              </Box>
                            </Grid>

                            {/* Доп. строки: сахар, клетчатка, соль — если есть */}
                            <Grid item xs={12}>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                <SmallStat label="Сахар" value={p.sugars ?? p["sugars_100g"]} unit="g" />
                                <SmallStat label="Клетчатка" value={p.fiber ?? p["fiber_100g"]} unit="g" />
                                <SmallStat label="Соль" value={p.salt ?? p["salt_100g"]} unit="g" />
                              </Box>
                            </Grid>

                            {/* Метаданные */}
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Grade: {p.nutrition_grade ?? "-"} • NOVA: {p.nova_group ?? "-"}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </motion.div>
                    ))}
                  </Box>
                )}

                {/* Если нет результатов — показать подсказку */}
                {!loading && (!result || (result.products?.length ?? 0) === 0) && (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">Нет данных по продукту. Попробуйте другой ракурс или уточните поиск.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Drawer: правая боковая панель — история анализов */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6">История анализов</Typography>
            <Button size="small" onClick={clearHistory}>Очистить</Button>
          </Box>

          <Divider sx={{ mb: 1 }} />

          <List>
            {history.length === 0 && <Typography variant="body2" color="text.secondary">Пусто</Typography>}
            {history.map((h, i) => (
              <ListItem
                button
                key={i}
                onClick={() => openHistoryEntry(i)}
                alignItems="flex-start"
                sx={{ mb: 1, borderRadius: 1 }}
              >
                <ListItemAvatar>
                  <Avatar>{h.fileName?.[0]?.toUpperCase() ?? "?"}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={h.result?.predicted_label ?? "—"}
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {h.fileName}
                      </Typography>
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        {new Date(h.ts).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </ThemeProvider>
  );
}

/* ===========================
   Небольшие вспомогательные компоненты
   =========================== */

/**
 * Карточка нутриента — иконка, значение и подпись
 */
function NutrientCard({ icon, label, value, unit }) {
  return (
    <Paper variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ bgcolor: "background.paper", width: 34, height: 34 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {value ?? "—"}{unit ? ` ${unit}` : ""}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

/**
 * Малый статистический блок (сахар, клетчатка и т.д.)
 */
function SmallStat({ label, value, unit }) {
  return (
    <Paper variant="outlined" sx={{ px: 1, py: 0.5, borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700}>
        {value ?? "—"}{unit ? ` ${unit}` : ""}
      </Typography>
    </Paper>
  );
}
