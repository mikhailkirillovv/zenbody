import React from "react";
import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://130.61.57.107:8000/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Ошибка:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">🍎 Zenbody Food Analyzer</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
      >
        {loading ? "Анализируем..." : "Загрузить и анализировать"}
      </button>

      <div className="mt-6 w-full max-w-2xl">
        {results.map((res, idx) => (
          <div key={idx} className="bg-white p-4 shadow rounded mb-4">
            <h2 className="text-xl font-semibold">
              {res.predicted} ({res.confidence}%)
            </h2>
            {res.openfoodfacts.length > 0 ? (
              <ul className="mt-2">
                {res.openfoodfacts.map((p, i) => (
                  <li key={i} className="border-t py-2">
                    <p className="font-bold">{p.name}</p>
                    <p>Бренд: {p.brand}</p>
                    <p>Калории: {p.energy} ккал</p>
                    <p>Белки: {p.proteins} г</p>
                    <p>Жиры: {p.fats} г</p>
                    <p>Углеводы: {p.carbs} г</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Нет данных в OpenFoodFacts</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
