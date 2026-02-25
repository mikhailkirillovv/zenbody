import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
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
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Tooltip,
  Skeleton,
  Chip,
  LinearProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Container,
} from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import HistoryIcon from "@mui/icons-material/History";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import OilBarrelIcon from "@mui/icons-material/OilBarrel";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SpaIcon from "@mui/icons-material/Spa";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import EmailIcon from "@mui/icons-material/Email";
import LogoutIcon from "@mui/icons-material/Logout";
import FastfoodIcon from "@mui/icons-material/Fastfood";

import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ===========================
   Configuration
   =========================== */

const API_URL = "http://130.61.57.107:8000/analyze-image";

// Ключи для localStorage
const LS_THEME_KEY = "food_sane_team:theme_dark";
const LS_USER_KEY = "food_sane_team:user";
const LS_TOKEN_KEY = "food_sane_team:token";

/* ===========================
   Mock Auth Service
   =========================== */

const mockAuthService = {
  async login(email, password) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && password.length >= 6) {
          const user = {
            id: Date.now().toString(),
            email,
            name: email.split('@')[0],
            createdAt: new Date().toISOString(),
          };
          const token = `mock-jwt-token-${Date.now()}`;
          resolve({ success: true, user, token });
        } else {
          resolve({ success: false, error: "Invalid credentials" });
        }
      }, 1000);
    });
  },

  async register(email, password, name) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && password.length >= 6 && name) {
          const user = {
            id: Date.now().toString(),
            email,
            name,
            createdAt: new Date().toISOString(),
          };
          const token = `mock-jwt-token-${Date.now()}`;
          resolve({ success: true, user, token });
        } else {
          resolve({ success: false, error: "Registration failed" });
        }
      }, 1000);
    });
  },

  async logout() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 500);
    });
  },

  async validateToken(token) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (token && token.startsWith('mock-jwt-token-')) {
          const user = {
            id: "12345",
            email: "user@example.com",
            name: "Demo User",
            createdAt: new Date().toISOString(),
          };
          resolve({ valid: true, user });
        } else {
          resolve({ valid: false });
        }
      }, 500);
    });
  }
};

/* ===========================
   Utilities
   =========================== */

function getHistoryKey(userId) {
  return `food_sane_team:history:${userId}`;
}

function saveHistory(userId, arr) {
  try {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to save history:", e);
  }
}

function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(getHistoryKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load history:", e);
    return [];
  }
}

function saveUserData(user, token) {
  try {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LS_TOKEN_KEY, token);
  } catch (e) {
    console.warn("Failed to save user data:", e);
  }
}

function loadUserData() {
  try {
    const userRaw = localStorage.getItem(LS_USER_KEY);
    const token = localStorage.getItem(LS_TOKEN_KEY);
    if (userRaw && token) {
      return { user: JSON.parse(userRaw), token };
    }
  } catch (e) {
    console.warn("Failed to load user data:", e);
  }
  return null;
}

function clearUserData() {
  try {
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_TOKEN_KEY);
  } catch (e) {
    console.warn("Failed to clear user data:", e);
  }
}

// Функция для транслитерации русского текста в латиницу
function transliterateRussian(text) {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return text.toLowerCase().split('').map(char => ru[char] || char).join('');
}

// Функция для создания fallback продукта
function createFallbackProduct(productName) {
  // База данных распространенных продуктов с их нутриентами
  const fallbackDatabase = {
    'пельмени': {
      name: 'Пельмени (Dumplings)',
      brand: 'Традиционные',
      energy: 250,
      proteins: 12,
      fats: 15,
      carbs: 25,
    },
    'борщ': {
      name: 'Борщ (Borscht)',
      brand: 'Традиционный суп',
      energy: 65,
      proteins: 3,
      fats: 2,
      carbs: 8,
    },
    'блины': {
      name: 'Блины (Pancakes)',
      brand: 'Традиционные',
      energy: 230,
      proteins: 6,
      fats: 8,
      carbs: 34,
    },
    'гречка': {
      name: 'Гречка (Buckwheat)',
      brand: 'Крупа',
      energy: 343,
      proteins: 13,
      fats: 3,
      carbs: 72,
    },
    'рис': {
      name: 'Рис (Rice)',
      brand: 'Крупа',
      energy: 365,
      proteins: 7,
      fats: 1,
      carbs: 79,
    },
    'картофель': {
      name: 'Картофель (Potato)',
      brand: 'Овощи',
      energy: 77,
      proteins: 2,
      fats: 0,
      carbs: 17,
    },
    'курица': {
      name: 'Курица (Chicken)',
      brand: 'Мясо',
      energy: 165,
      proteins: 31,
      fats: 4,
      carbs: 0,
    },
    'говядина': {
      name: 'Говядина (Beef)',
      brand: 'Мясо',
      energy: 250,
      proteins: 26,
      fats: 17,
      carbs: 0,
    },
    'свинина': {
      name: 'Свинина (Pork)',
      brand: 'Мясо',
      energy: 242,
      proteins: 27,
      fats: 14,
      carbs: 0,
    },
    'яйца': {
      name: 'Яйца (Eggs)',
      brand: 'Яйца',
      energy: 155,
      proteins: 13,
      fats: 11,
      carbs: 1,
    },
    'сыр': {
      name: 'Сыр (Cheese)',
      brand: 'Молочные продукты',
      energy: 402,
      proteins: 25,
      fats: 33,
      carbs: 1,
    },
    'творог': {
      name: 'Творог (Cottage Cheese)',
      brand: 'Молочные продукты',
      energy: 160,
      proteins: 18,
      fats: 9,
      carbs: 3,
    },
    'йогурт': {
      name: 'Йогурт (Yogurt)',
      brand: 'Молочные продукты',
      energy: 80,
      proteins: 4,
      fats: 2,
      carbs: 12,
    },
    'кефир': {
      name: 'Кефир (Kefir)',
      brand: 'Молочные продукты',
      energy: 60,
      proteins: 3,
      fats: 2,
      carbs: 6,
    },
    'хлеб': {
      name: 'Хлеб (Bread)',
      brand: 'Хлебобулочные изделия',
      energy: 265,
      proteins: 9,
      fats: 3,
      carbs: 49,
    },
    'макароны': {
      name: 'Макароны (Pasta)',
      brand: 'Макаронные изделия',
      energy: 350,
      proteins: 12,
      fats: 2,
      carbs: 72,
    },
    'салат': {
      name: 'Салат (Salad)',
      brand: 'Салат',
      energy: 120,
      proteins: 5,
      fats: 8,
      carbs: 8,
    },
    'суп': {
      name: 'Суп (Soup)',
      brand: 'Суп',
      energy: 80,
      proteins: 4,
      fats: 3,
      carbs: 9,
    },
    'каша': {
      name: 'Каша (Porridge)',
      brand: 'Каша',
      energy: 120,
      proteins: 4,
      fats: 3,
      carbs: 20,
    },
    'яблоко': {
      name: 'Яблоко (Apple)',
      brand: 'Фрукты',
      energy: 52,
      proteins: 0.3,
      fats: 0.2,
      carbs: 14,
    },
    'банан': {
      name: 'Банан (Banana)',
      brand: 'Фрукты',
      energy: 96,
      proteins: 1.2,
      fats: 0.3,
      carbs: 23,
    },
    'апельсин': {
      name: 'Апельсин (Orange)',
      brand: 'Фрукты',
      energy: 47,
      proteins: 0.9,
      fats: 0.1,
      carbs: 12,
    },
  };

  // Ищем в базе по ключевому слову
  const searchTerm = productName.toLowerCase();
  
  for (const [key, value] of Object.entries(fallbackDatabase)) {
    if (searchTerm.includes(key) || key.includes(searchTerm)) {
      return value;
    }
  }
  
  // Если не нашли, возвращаем обобщенные данные
  return {
    name: productName,
    brand: 'Продукт питания',
    energy: 200,
    proteins: 8,
    fats: 8,
    carbs: 20,
  };
}

// Функция для агрегации нутриентов за день
function aggregateDailyNutrition(history) {
  const today = new Date().toDateString();
  const todayEntries = history.filter(h => 
    new Date(h.ts).toDateString() === today
  );

  return todayEntries.reduce((acc, entry) => {
    const product = entry.result?.products?.[0];
    if (product) {
      acc.calories += product.energy || 0;
      acc.protein += product.proteins || 0;
      acc.fat += product.fats || 0;
      acc.carbs += product.carbs || 0;
    }
    return acc;
  }, {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    count: todayEntries.length
  });
}

// Функция для подготовки данных за неделю
function getWeeklyData(history) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toDateString();
  }).reverse();

  return last7Days.map(date => {
    const dayEntries = history.filter(h => 
      new Date(h.ts).toDateString() === date
    );
    
    const totalCalories = dayEntries.reduce((sum, entry) => {
      const product = entry.result?.products?.[0];
      return sum + (product?.energy || 0);
    }, 0);

    return {
      date: new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' }),
      calories: totalCalories,
      meals: dayEntries.length
    };
  });
}

// Функция для сохранения изображения в history
async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

/* ===========================
   Helper Components
   =========================== */

function CompactMacroCard({ icon, label, value, unit, color }) {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1.5px solid ${color}30`,
        textAlign: 'center'
      }}
    >
      <Avatar sx={{ bgcolor: color, width: 32, height: 32, mx: 'auto', mb: 1 }}>
        {icon}
      </Avatar>
      <Typography variant="h6" fontWeight={900}>
        {value ?? "—"}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      {unit && (
        <Typography variant="caption" color="text.secondary" display="block">
          {unit}
        </Typography>
      )}
    </Paper>
  );
}

/* ===========================
   Auth Components
   =========================== */

function AuthDialog({ open, onClose, onLogin, onRegister }) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError("");
    setFormData({ email: "", password: "", name: "" });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (tab === 0) {
        const result = await onLogin(formData.email, formData.password);
        if (result.success) {
          onClose();
        } else {
          setError(result.error || "Login failed");
        }
      } else {
        const result = await onRegister(formData.email, formData.password, formData.name);
        if (result.success) {
          onClose();
        } else {
          setError(result.error || "Registration failed");
        }
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          {tab === 1 && (
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          )}
          
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            margin="normal"
            InputProps={{
              startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            margin="normal"
            InputProps={{
              startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.email || !formData.password || (tab === 1 && !formData.name)}
        >
          {loading ? <CircularProgress size={24} /> : tab === 0 ? "Login" : "Register"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ===========================
   Dashboard Components
   =========================== */

function DailyNutritionSummary({ dailyData }) {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  const pieData = [
    { name: 'Protein', value: dailyData.protein },
    { name: 'Fat', value: dailyData.fat },
    { name: 'Carbs', value: dailyData.carbs },
  ].filter(item => item.value > 0);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Today's Total
            </Typography>
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <Typography variant="h2" fontWeight={900} color="primary.main">
                {Math.round(dailyData.calories)}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                kcal
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {dailyData.count} {dailyData.count === 1 ? 'meal' : 'meals'} today
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Macronutrients
            </Typography>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <CompactMacroCard
                  icon={<FitnessCenterIcon sx={{ fontSize: 20 }} />}
                  label="Protein"
                  value={dailyData.protein ? Math.round(dailyData.protein) : "—"}
                  unit="g"
                  color="#3b82f6"
                />
              </Grid>
              <Grid item xs={6}>
                <CompactMacroCard
                  icon={<OilBarrelIcon sx={{ fontSize: 20 }} />}
                  label="Fat"
                  value={dailyData.fat ? Math.round(dailyData.fat) : "—"}
                  unit="g"
                  color="#f59e0b"
                />
              </Grid>
              <Grid item xs={12}>
                <CompactMacroCard
                  icon={<RestaurantIcon sx={{ fontSize: 20 }} />}
                  label="Carbs"
                  value={dailyData.carbs ? Math.round(dailyData.carbs) : "—"}
                  unit="g"
                  color="#8b5cf6"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              Distribution
            </Typography>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No data for today
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function WeeklyChart({ weeklyData }) {
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Weekly Calories
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="calories" fill="#10b981" name="Calories (kcal)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ===========================
   Analytics Components
   =========================== */

function AnalyticsStats({ history, darkMode }) {
  const totalAnalyses = history.length;
  const today = new Date().toDateString();
  const todayAnalyses = history.filter(h => 
    new Date(h.ts).toDateString() === today
  ).length;
  
  const avgConfidence = history.length > 0 
    ? Math.round(history.reduce((sum, h) => {
        const firstPred = h.result?.predictions?.[0];
        return sum + (firstPred?.confidence * 100 || 0);
      }, 0) / history.length)
    : 0;

  const uniqueProducts = new Set(
    history.flatMap(h => 
      h.result?.predictions?.map(p => p.label) || []
    )
  ).size;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Analytics Overview
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} color="primary.main">
                {totalAnalyses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Analyses
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} color="secondary.main">
                {todayAnalyses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Today's Analyses
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} color="info.main">
                {avgConfidence}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Confidence
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={900} color="success.main">
                {uniqueProducts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique Foods
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Recent Activity
          </Typography>
          <List>
            {history.slice(0, 5).map((h, i) => {
              const mainPred = h.result?.predictions?.[0];
              const mainProduct = h.result?.products?.[0];
              return (
                <ListItem key={i} divider={i < 4}>
                  <ListItemAvatar>
                    <Avatar src={h.preview} sx={{ bgcolor: 'primary.main' }}>
                      <RestaurantIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={mainPred?.label || 'Unknown Food'}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {new Date(h.ts).toLocaleString()}
                        </Typography>
                        {mainProduct && (
                          <Typography variant="caption" color="primary">
                            {Math.round(mainProduct.energy || 0)} kcal
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ===========================
   History Components
   =========================== */

function HistoryPanel({ history, onSelectEntry, selectedIndex }) {
  const [filter, setFilter] = useState('');

  const filteredHistory = history.filter(h => {
    const mainPred = h.result?.predictions?.[0];
    return mainPred?.label?.toLowerCase().includes(filter.toLowerCase()) ||
           h.fileName?.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Analysis History
        </Typography>
        <TextField
          size="small"
          placeholder="Search history..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ width: 300 }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredHistory.map((h, index) => {
          const mainPred = h.result?.predictions?.[0];
          const mainProduct = h.result?.products?.[0];
          const isSelected = selectedIndex === index;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: isSelected ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                }}
                onClick={() => onSelectEntry(index)}
              >
                {h.preview && (
                  <CardMedia
                    component="img"
                    height="140"
                    image={h.preview}
                    alt={mainPred?.label || 'Food'}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" fontWeight={700} noWrap>
                    {mainPred?.label || 'Unknown Food'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {new Date(h.ts).toLocaleString()}
                  </Typography>
                  {mainProduct && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      <Chip 
                        label={`${Math.round(mainProduct.energy || 0)} kcal`}
                        size="small"
                        color="primary"
                      />
                      <Chip 
                        label={`${(mainPred?.confidence * 100).toFixed(0)}%`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {filteredHistory.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {history.length === 0 ? 'No history yet' : 'No matches found'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

/* ===========================
   Settings Components
   =========================== */

function SettingsPanel({ darkMode, onThemeToggle }) {
  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Appearance
          </Typography>
          
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {darkMode ? <Brightness4Icon /> : <Brightness7Icon />}
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toggle between dark and light theme
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={darkMode}
              onChange={onThemeToggle}
              color="primary"
            />
          </Paper>
        </CardContent>
      </Card>
    </Container>
  );
}

/* ===========================
   Nutrition Display Component
   =========================== */

function NutritionCard({ product }) {
  if (!product) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        background: (theme) => alpha(theme.palette.primary.main, 0.05),
        border: `1px solid`,
        borderColor: 'primary.main',
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          {product.name || "Unknown Product"}
        </Typography>
        {product.brand && (
          <Typography variant="caption" color="text.secondary" display="block">
            Бренд: {product.brand}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          * на 100g продукта
        </Typography>
      </Box>

      <Box 
        sx={{ 
          bgcolor: "primary.main",
          color: "white",
          p: 1.5,
          borderRadius: 2,
          textAlign: "center",
          mb: 1.5,
        }}
      >
        <Typography variant="h4" fontWeight={900}>
          {product.energy ? Math.round(product.energy) : "—"}
        </Typography>
        <Typography variant="caption" fontWeight={600}>
          ккал на 100g
        </Typography>
      </Box>

      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Paper
            sx={{
              p: 1,
              textAlign: 'center',
              bgcolor: alpha('#3b82f6', 0.1),
              border: '1px solid #3b82f6',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="#3b82f6">
              Белки
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {product.proteins ? product.proteins.toFixed(1) : "—"} г
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            sx={{
              p: 1,
              textAlign: 'center',
              bgcolor: alpha('#f59e0b', 0.1),
              border: '1px solid #f59e0b',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="#f59e0b">
              Жиры
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {product.fats ? product.fats.toFixed(1) : "—"} г
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            sx={{
              p: 1,
              textAlign: 'center',
              bgcolor: alpha('#8b5cf6', 0.1),
              border: '1px solid #8b5cf6',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="#8b5cf6">
              Углеводы
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {product.carbs ? product.carbs.toFixed(1) : "—"} г
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

/* ===========================
   Main App Component
   =========================== */

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // App state
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(LS_THEME_KEY) === "1";
    } catch {
      return false;
    }
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: { 
            main: "#10b981",
            light: "#34d399",
            dark: "#059669",
          },
          secondary: {
            main: "#8b5cf6",
          },
          background: {
            default: darkMode ? "#0f172a" : "#f8fafc",
            paper: darkMode ? "#1e293b" : "#ffffff",
          },
        },
        typography: {
          fontFamily: '"Poppins", "Inter", "Roboto", sans-serif',
          h4: { fontWeight: 800 },
          h5: { 
            fontWeight: 800,
            fontFamily: '"Montserrat", "Poppins", sans-serif',
          },
          h6: { fontWeight: 700 },
          button: {
            fontWeight: 600,
            textTransform: 'none',
          },
        },
        shape: { borderRadius: 16 },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 20,
                boxShadow: darkMode 
                  ? "0 10px 30px -10px rgba(0, 0, 0, 0.3)" 
                  : "0 10px 30px -10px rgba(0, 0, 0, 0.1)",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                textTransform: "none",
                fontWeight: 600,
                padding: "10px 24px",
              },
              contained: {
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
              }
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: { borderRadius: 16 },
            },
          },
        },
      }),
    [darkMode]
  );

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const saved = loadUserData();
      if (saved) {
        const result = await mockAuthService.validateToken(saved.token);
        if (result.valid) {
          setUser(result.user);
          setToken(saved.token);
        } else {
          clearUserData();
        }
      }
      setAuthLoading(false);
    };
    
    initAuth();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_THEME_KEY, darkMode ? "1" : "0");
    } catch {}
  }, [darkMode]);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => user ? loadHistory(user.id) : []);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [activeMenu, setActiveMenu] = useState("home");
  const [selectedHistoryImage, setSelectedHistoryImage] = useState(null);

  const uploadCardRef = useRef(null);

  // Обновляем историю при смене пользователя
  useEffect(() => {
    if (user) {
      setHistory(loadHistory(user.id));
    } else {
      setHistory([]);
    }
    setSelectedHistoryIndex(null);
    setSelectedHistoryImage(null);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
  }, [user]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setSelectedHistoryIndex(null);
      setSelectedHistoryImage(null);
      setResult(null);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const pushHistory = async (entry) => {
    if (!user) return;
    
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    saveHistory(user.id, next);
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedHistoryIndex(null);
    setSelectedHistoryImage(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
      }
      const data = await res.json();
      
      // Улучшаем данные о продукте
      if (data.products && data.products.length === 0) {
        // Если OpenFoodFacts не нашел продукты, используем fallback базу
        const mainPrediction = data.predictions?.[0];
        if (mainPrediction) {
          const fallbackProduct = createFallbackProduct(mainPrediction.label);
          data.products = [fallbackProduct];
        }
      } else if (data.products && data.products.length > 0) {
        // Форматируем существующие продукты
        data.products = data.products.map(p => ({
          name: p.name || p.product_name || "Неизвестный продукт",
          brand: p.brand || p.brands || "Неизвестный бренд",
          energy: p.energy || p["energy-kcal_100g"] || 0,
          proteins: p.proteins || p["proteins_100g"] || 0,
          fats: p.fats || p["fat_100g"] || 0,
          carbs: p.carbs || p["carbohydrates_100g"] || 0,
        }));
      }

      setResult(data);

      // Конвертируем изображение в base64 для сохранения в истории
      const base64Image = await imageToBase64(file);

      const entry = {
        ts: Date.now(),
        fileName: file.name,
        result: data,
        preview: base64Image,
      };
      await pushHistory(entry);
    } catch (e) {
      console.error(e);
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const openHistoryEntry = (idx) => {
    setSelectedHistoryIndex(idx);
    if (idx !== null && history[idx]) {
      const rec = history[idx];
      setResult(rec.result);
      if (rec.preview) {
        setSelectedHistoryImage(rec.preview);
        setPreviewUrl(rec.preview);
      } else {
        setSelectedHistoryImage(null);
        setPreviewUrl(null);
      }
      setFile(null);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setSelectedHistoryIndex(null);
    setSelectedHistoryImage(null);
  };

  // Auth handlers
  const handleLogin = async (email, password) => {
    const result = await mockAuthService.login(email, password);
    if (result.success) {
      setUser(result.user);
      setToken(result.token);
      saveUserData(result.user, result.token);
      return { success: true };
    }
    return result;
  };

  const handleRegister = async (email, password, name) => {
    const result = await mockAuthService.register(email, password, name);
    if (result.success) {
      setUser(result.user);
      setToken(result.token);
      saveUserData(result.user, result.token);
      return { success: true };
    }
    return result;
  };

  const handleLogout = async () => {
    await mockAuthService.logout();
    setUser(null);
    setToken(null);
    clearUserData();
  };

  const menuItems = [
    { id: "home", label: "Home", icon: <HomeIcon /> },
    { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { id: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
    { id: "history", label: "History", icon: <HistoryIcon /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  const currentImageUrl = selectedHistoryImage || previewUrl;
  const showResults = result || currentImageUrl;

  // Берем только первый продукт из ответа
  const mainProduct = result?.products?.[0];

  // Вычисляем данные для разных разделов
  const dailyData = aggregateDailyNutrition(history);
  const weeklyData = getWeeklyData(history);

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Fixed Sidebar Navigation */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          bgcolor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          zIndex: 1000,
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ p: 4, pb: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: "primary.main",
                  width: 56,
                  height: 56,
                  boxShadow: "0 8px 24px rgba(16, 185, 129, 0.5)",
                }}
              >
                <RestaurantIcon sx={{ fontSize: 28 }} />
              </Avatar>
            </motion.div>
            <Box>
              <Typography 
                variant="h5" 
                component="div" 
                fontWeight={900}
                sx={{
                  background: darkMode
                    ? 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  fontFamily: '"Montserrat", sans-serif',
                  letterSpacing: '-0.5px',
                }}
              >
                Food Sane Team
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <SpaIcon sx={{ fontSize: 14 }} />
                AI Food Recognition
              </Typography>
            </Box>
          </Box>

          {/* User Profile */}
          {user ? (
            <Paper
              sx={{
                p: 2,
                mb: 3,
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%)',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                <Tooltip title="Logout">
                  <IconButton size="small" onClick={handleLogout}>
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          ) : (
            <Button
              fullWidth
              variant="contained"
              startIcon={<PersonIcon />}
              onClick={() => setAuthDialogOpen(true)}
              sx={{ mb: 3 }}
            >
              Login / Register
            </Button>
          )}

          {/* Navigation Menu */}
          <List sx={{ width: '100%', flex: 1 }}>
            {menuItems.map((item) => (
              <ListItem
                key={item.id}
                button
                selected={activeMenu === item.id}
                onClick={() => setActiveMenu(item.id)}
                disabled={!user && item.id !== 'home'}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  bgcolor: activeMenu === item.id ? 'primary.main' : 'transparent',
                  color: activeMenu === item.id ? 'white' : 'inherit',
                  opacity: !user && item.id !== 'home' ? 0.5 : 1,
                  '&:hover': {
                    bgcolor: activeMenu === item.id ? 'primary.dark' : alpha(theme.palette.primary.main, 0.05),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    mr: 2,
                    bgcolor: activeMenu === item.id ? 'white' : alpha(theme.palette.primary.main, 0.1),
                    color: activeMenu === item.id ? 'primary.main' : 'primary.main',
                  }}
                >
                  {item.icon}
                </Avatar>
                <Typography variant="body2" fontWeight={600}>
                  {item.label}
                </Typography>
              </ListItem>
            ))}
          </List>

          {/* Theme Toggle at bottom */}
          <Paper
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              mt: 'auto',
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Brightness7Icon sx={{ fontSize: 20, color: darkMode ? 'text.disabled' : 'primary.main' }} />
              <Typography variant="caption">
                {darkMode ? 'Dark' : 'Light'}
              </Typography>
            </Box>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode((s) => !s)}
              color="primary"
              size="small"
            />
          </Paper>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          ml: { xs: 0, md: 35 },
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile Header */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <RestaurantIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Food Sane Team
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AI Food Recognition
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setAuthDialogOpen(true)}>
              {user ? (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              ) : (
                <PersonIcon />
              )}
            </IconButton>
          </Paper>
        </Box>

        {/* Auth Required Message */}
        {!user && (
          <Box sx={{ p: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: darkMode
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  border: `2px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)"}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <PersonIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={700}>
                  Welcome to Food Sane Team
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Please login or register to start analyzing your food images and track your nutrition history.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PersonIcon />}
                  onClick={() => setAuthDialogOpen(true)}
                  sx={{ minWidth: 200 }}
                >
                  Get Started
                </Button>
              </Paper>
            </motion.div>
          </Box>
        )}

        {/* Dynamic Content Based on Active Menu */}
        {user && (
          <Box sx={{ p: 4, flex: 1 }}>
            {/* Home - Upload and Results */}
            {activeMenu === "home" && (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <Paper
                    ref={uploadCardRef}
                    elevation={3}
                    sx={{
                      p: 3,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      background: darkMode
                        ? "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)"
                        : "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)",
                      border: `2px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)"}`,
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <Box
                      {...getRootProps()}
                      sx={{
                        p: 6,
                        borderRadius: 3,
                        border: `3px dashed ${isDragActive ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3)}`,
                        bgcolor: isDragActive 
                          ? alpha(theme.palette.primary.main, darkMode ? 0.15 : 0.08)
                          : 'transparent',
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        textAlign: "center",
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        "&:hover": {
                          borderColor: theme.palette.primary.main,
                          bgcolor: alpha(theme.palette.primary.main, darkMode ? 0.1 : 0.04),
                        },
                      }}
                    >
                      <input {...getInputProps()} />
                      <motion.div
                        animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <PhotoCameraIcon 
                          color="primary" 
                          sx={{ 
                            fontSize: 80,
                            mb: 2,
                            opacity: 0.8,
                          }} 
                        />
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                          {isDragActive ? "Drop your image here!" : "Upload Food Image"}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                          Drag & drop or click to select • JPG, PNG, WebP
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={<CloudUploadIcon />}
                          sx={{ mt: 2, py: 1.5, px: 4 }}
                        >
                          Choose File
                        </Button>
                      </motion.div>
                    </Box>

                    {/* Action Buttons */}
                    {file && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap", alignItems: "center" }}>
                          <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={!file || loading}
                            onClick={analyze}
                            startIcon={loading ? <RefreshIcon className="rotate" /> : <LocalFireDepartmentIcon />}
                            sx={{
                              flex: { xs: "1 1 100%", sm: "0 1 auto" },
                              minWidth: 200,
                            }}
                          >
                            {loading ? "Analyzing..." : "Analyze Food"}
                          </Button>

                          <Button
                            variant="outlined"
                            size="large"
                            onClick={resetAll}
                            startIcon={<DeleteIcon />}
                          >
                            Clear
                          </Button>

                          <Box sx={{ ml: "auto", display: { xs: 'none', sm: 'flex' }, alignItems: "center", gap: 1 }}>
                            <Chip
                              icon={<CheckCircleIcon />}
                              label={file.name}
                              color="primary"
                              variant="outlined"
                              onDelete={resetAll}
                            />
                          </Box>
                        </Box>
                      </motion.div>
                    )}

                    {/* Error Message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <Paper
                            sx={{
                              p: 2,
                              mt: 3,
                              bgcolor: "error.main",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body1">⚠️ {error}</Typography>
                            <IconButton size="small" onClick={() => setError(null)} sx={{ color: "white" }}>
                              <CloseIcon />
                            </IconButton>
                          </Paper>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Loading Progress */}
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <LinearProgress 
                          sx={{ 
                            mt: 3, 
                            borderRadius: 2,
                            height: 6,
                          }} 
                        />
                      </motion.div>
                    )}
                  </Paper>
                </motion.div>

                {/* Results Section - Only one prediction with nutrition */}
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ marginTop: 24 }}
                  >
                    <Paper
                      sx={{
                        p: 3,
                        background: darkMode
                          ? "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)"
                          : "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)",
                        border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Grid container spacing={3}>
                        {/* Image Preview */}
                        <Grid item xs={12} md={4}>
                          <Card 
                            elevation={4}
                            sx={{
                              overflow: "hidden",
                              position: "relative",
                              maxWidth: 400,
                              mx: 'auto',
                            }}
                          >
                            <CardContent sx={{ p: 0 }}>
                              <AnimatePresence mode="wait">
                                {loading && (
                                  <motion.div
                                    key="skeleton"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                  >
                                    <Skeleton 
                                      variant="rectangular" 
                                      width="100%" 
                                      height={280} 
                                      animation="wave"
                                    />
                                  </motion.div>
                                )}

                                {!loading && currentImageUrl && (
                                  <motion.div
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <CardMedia
                                      component="img"
                                      image={currentImageUrl}
                                      alt={selectedHistoryIndex !== null ? "History Preview" : "Food Preview"}
                                      sx={{ 
                                        height: 280,
                                        width: '100%',
                                        objectFit: "cover",
                                      }}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                            {selectedHistoryIndex !== null && (
                              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                                <Typography variant="caption" fontWeight={600}>
                                  Viewing from history
                                </Typography>
                              </Box>
                            )}
                          </Card>
                        </Grid>

                        {/* Prediction and Nutrition Info */}
                        <Grid item xs={12} md={8}>
                          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {loading && (
                              <Box sx={{ display: "grid", gap: 1.5 }}>
                                <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                              </Box>
                            )}

                            {!loading && result && (
                              <>
                                {/* Main Prediction */}
                                {result.predictions?.[0] && (
                                  <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                      <Typography variant="h5" fontWeight={900}>
                                        {result.predictions[0].label}
                                      </Typography>
                                      <Chip 
                                        label={`${(result.predictions[0].confidence * 100).toFixed(1)}%`}
                                        color="primary"
                                        size="small"
                                      />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                      AI-Powered Recognition
                                    </Typography>
                                  </Box>
                                )}

                                {/* Nutrition Info - First Product */}
                                {mainProduct ? (
                                  <NutritionCard product={mainProduct} />
                                ) : (
                                  <Box 
                                    sx={{ 
                                      py: 4, 
                                      textAlign: "center",
                                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                                      borderRadius: 2,
                                    }}
                                  >
                                    <FastfoodIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2, opacity: 0.5 }} />
                                    <Typography variant="body1" color="text.secondary">
                                      No nutrition information available
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Try searching for a different food item
                                    </Typography>
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </motion.div>
                )}
              </Box>
            )}

            {/* Dashboard */}
            {activeMenu === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  Dashboard
                </Typography>
                <DailyNutritionSummary dailyData={dailyData} />
                <WeeklyChart weeklyData={weeklyData} />
              </motion.div>
            )}

            {/* Analytics */}
            {activeMenu === "analytics" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  Analytics
                </Typography>
                <AnalyticsStats history={history} darkMode={darkMode} />
              </motion.div>
            )}

            {/* History */}
            {activeMenu === "history" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HistoryPanel 
                  history={history} 
                  onSelectEntry={openHistoryEntry}
                  selectedIndex={selectedHistoryIndex}
                />
              </motion.div>
            )}

            {/* Settings */}
            {activeMenu === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SettingsPanel 
                  darkMode={darkMode}
                  onThemeToggle={() => setDarkMode(!darkMode)}
                />
              </motion.div>
            )}
          </Box>
        )}
      </Box>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotate {
            animation: rotate 1s linear infinite;
          }
          
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Poppins:wght@400;500;600;700;800&display=swap');
        `}
      </style>
    </ThemeProvider>
  );
}