import React, { useState } from 'react'


export default function App() {
const [file, setFile] = useState(null)
const [preview, setPreview] = useState(null)
const [result, setResult] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)


function handleFile(e) {
const f = e.target.files[0]
if (!f) return
setFile(f)
setPreview(URL.createObjectURL(f))
setResult(null)
setError(null)
}


async function handleSubmit() {
if (!file) return
setLoading(true)
setError(null)
const fd = new FormData()
fd.append('image', file)
try {
const res = await fetch('http://130.61.57.107:8000/api/analyze', {
method: 'POST',
body: fd
})
if (!res.ok) throw new Error(`Server: ${res.status}`)
const data = await res.json()
setResult(data)
} catch (err) {
setError(err.message)
} finally {
setLoading(false)
}
}


return (
<div style={{maxWidth: 720, margin: '24px auto', fontFamily: 'Arial, sans-serif'}}>
<h1>Calorie Photo — прототип</h1>


<div style={{margin: '12px 0'}}>
<input type="file" accept="image/*" onChange={handleFile} />
</div>


{preview && (
<div style={{marginBottom: 12}}>
<img src={preview} alt="preview" style={{maxWidth: '100%'}} />
</div>
)}


<div>
<button onClick={handleSubmit} disabled={loading || !file}>
{loading ? 'Анализ...' : 'Анализировать'}
</button>
</div>


{error && <div style={{color:'red', marginTop:12}}>Ошибка: {error}</div>}


{result && (
<div style={{marginTop: 16}}>
<h2>Результат</h2>
<div>Общая калорийность (оценка): <b>{result.total_calories} kcal</b></div>
<h3>Детали</h3>
<ul>
{result.items.map((it, idx) => (
<li key={idx}>{it.name} — {it.estimated_calories} kcal — confidence {Math.round(it.confidence*100)}%</li>
))}
</ul>
</div>
)}


</div>
)
}
