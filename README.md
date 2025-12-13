# Triaje digital de anemia

Aplicación fullstack para ingresar datos de pacientes, obtener un diagnóstico automático con un modelo de anemia y revisar el historial de evaluaciones.

## Backend (FastAPI)

Requisitos: Python 3.11+

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Puntos clave:

- El modelo se carga una sola vez desde `backend/pipeline.pkl` (debes colocarlo antes de iniciar la API).
- Para evitar errores al cargar el modelo, usa la versión incluida en `requirements.txt` (`scikit-learn==1.6.1`), que coincide con la usada para entrenar `pipeline.pkl`.
- El historial se almacena en `backend/history.csv` y se crea automáticamente con cabecera si no existe.
- CORS se puede restringir con la variable de entorno `ALLOWED_ORIGINS` (por defecto permite todos los orígenes).

Endpoints principales:

- `POST /predict`: recibe las 8 variables del formulario y devuelve diagnóstico, semáforo, probabilidades y recomendación; además guarda el registro en el historial.
- `GET /history?limit=200`: devuelve los últimos registros (ordenados desc) desde `history.csv`.

## Frontend (React + Vite)

Requisitos: Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Configure la URL del backend con la variable `VITE_API_URL` si es necesario (por defecto usa `http://localhost:8000`).
