import React from "react";
import { useState } from "react";


function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // URL бэкенда (берётся из .env или Vite env)
  const API_URL = import.meta.env.VITE_API_URL || "http://130.61.57.107:8000";

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert("Выберите изображение еды!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">🍏 Zenbody – Анализ еды</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Анализируем..." : "Анализировать"}
      </button>

      {error && (
        <p className="text-red-600 mt-4">⚠ Ошибка: {error}</p>
      )}

      {result && (
        <div className="mt-6 p-4 bg-white shadow rounded-lg w-80 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Результат анализа
          </h2>
          <p>🍽 Еда: <strong>{result.food}</strong></p>
          <p>🔥 Калории: <strong>{result.calories}</strong></p>
          <p className="text-gray-500 text-sm mt-2">
            Файл: {result.filename}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
