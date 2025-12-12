# Triaje digital de anemia

Aplicación fullstack para ingresar datos de pacientes, obtener un diagnóstico automático con un modelo de anemia y revisar el historial de evaluaciones.

## Backend (FastAPI)

Requisitos: Python 3.11+

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

El backend carga `pipeline.pkl` ubicado en `backend/` y persiste los registros en `backend/history.csv`.

## Frontend (React + Vite)

Requisitos: Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Configure la URL del backend con la variable `VITE_API_URL` si es necesario (por defecto usa `http://localhost:8000`).
