import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const initialForm = {
  EdadMeses: '',
  Hemoglobina: '',
  AlturaREN: '',
  Sexo: 'M',
  Cred: 0,
  Consejeria: 0,
  Suplementacion: 0,
  Diresa: '',
}

const severityOrder = ['Normal', 'Leve', 'Moderada', 'Severa']

function App() {
  const [activeTab, setActiveTab] = useState('form')
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')

  const sortedProbabilidades = useMemo(() => {
    if (!result?.probabilidades) return []
    const entries = Object.entries(result.probabilidades)
    return entries.sort((a, b) => severityOrder.indexOf(b[0]) - severityOrder.indexOf(a[0]))
  }, [result])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }))
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...formData,
        EdadMeses: Number(formData.EdadMeses),
        Hemoglobina: Number(formData.Hemoglobina),
        AlturaREN: Number(formData.AlturaREN),
        Consejeria: Number(formData.Consejeria),
        Suplementacion: Number(formData.Suplementacion),
        Cred: Number(formData.Cred),
      }
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const detail = await response.json()
        throw new Error(detail?.detail || 'Error al procesar la solicitud')
      }
      const data = await response.json()
      setResult(data)
      setModalOpen(true)
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`${API_URL}/history?limit=200`)
      if (!response.ok) {
        throw new Error('No se pudo obtener el historial')
      }
      const data = await response.json()
      setHistory(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
  }

  const renderSemaforo = (dx) => {
    const mapping = {
      Normal: '🟢',
      Leve: '🟡',
      Moderada: '🟠',
      Severa: '🔴',
    }
    return mapping[dx] || '🟢'
  }

  return (
    <div className="page">
      <header className="header">
        <div className="logo">Triaje digital de anemia</div>
        <nav className="tabs">
          <button
            className={activeTab === 'form' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('form')}
          >
            Ingresar datos
          </button>
          <button
            className={activeTab === 'history' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('history')}
          >
            Ver historial
          </button>
        </nav>
      </header>

      <main className="content">
        {activeTab === 'form' && (
          <section className="card">
            <h2>Formulario de análisis</h2>
            <p className="muted">
              Ingrese los datos del paciente y obtenga un diagnóstico preliminar usando el modelo clínico.
            </p>
            <form className="form" onSubmit={submitForm}>
              <div className="grid">
                <label>
                  Edad (meses)
                  <input
                    type="number"
                    name="EdadMeses"
                    min="0"
                    max="60"
                    value={formData.EdadMeses}
                    onChange={handleNumberChange}
                    required
                  />
                </label>
                <label>
                  Hemoglobina (g/dL)
                  <input
                    type="number"
                    name="Hemoglobina"
                    step="0.1"
                    min="0"
                    max="20"
                    value={formData.Hemoglobina}
                    onChange={handleNumberChange}
                    required
                  />
                </label>
                <label>
                  Altura REN (msnm)
                  <input
                    type="number"
                    name="AlturaREN"
                    min="0"
                    max="6000"
                    value={formData.AlturaREN}
                    onChange={handleNumberChange}
                    required
                  />
                </label>
                <label>
                  Sexo
                  <select name="Sexo" value={formData.Sexo} onChange={handleChange} required>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </label>
                <label>
                  Consejería
                  <select name="Consejeria" value={formData.Consejeria} onChange={handleNumberChange}>
                    <option value={0}>0 - No</option>
                    <option value={1}>1 - Sí</option>
                  </select>
                </label>
                <label>
                  Suplementación
                  <select name="Suplementacion" value={formData.Suplementacion} onChange={handleNumberChange}>
                    <option value={0}>0 - No</option>
                    <option value={1}>1 - Sí</option>
                  </select>
                </label>
                <label>
                  CRED
                  <select name="Cred" value={formData.Cred} onChange={handleNumberChange}>
                    <option value={0}>0 - No</option>
                    <option value={1}>1 - Sí</option>
                  </select>
                </label>
                <label>
                  Diresa
                  <input
                    type="text"
                    name="Diresa"
                    placeholder="Ej: Lima"
                    value={formData.Diresa}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="actions">
                <button type="button" className="secondary" onClick={resetForm}>
                  Limpiar
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Analizando...' : 'Analizar'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="card">
            <div className="history-header">
              <div>
                <h2>Historial de evaluaciones</h2>
                <p className="muted">Últimos registros guardados en el sistema.</p>
              </div>
              <button className="secondary" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Diagnóstico</th>
                    <th>Hemoglobina</th>
                    <th>Edad</th>
                    <th>Sexo</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="muted">
                        No hay registros disponibles.
                      </td>
                    </tr>
                  )}
                  {history.map((row, idx) => (
                    <tr key={`${row.fecha}-${idx}`}>
                      <td>{row.fecha}</td>
                      <td>
                        <span className="pill">
                          {renderSemaforo(row.dx_predicho)} {row.dx_predicho}
                        </span>
                      </td>
                      <td>{row.Hemoglobina}</td>
                      <td>{row.EdadMeses}</td>
                      <td>{row.Sexo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {modalOpen && result && (
        <div className="modal">
          <div className="modal-content">
            <header className="modal-header">
              <div>
                <p className="muted">Resultado del análisis</p>
                <h3>
                  {renderSemaforo(result.dx_predicho)} {result.dx_predicho}
                </h3>
              </div>
              <button className="icon" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </header>
            <div className="modal-body">
              <p className="muted">Recomendación</p>
              <p className="recommendation">{result.recomendacion}</p>
              <p className="muted">Probabilidades</p>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Clase</th>
                      <th>Probabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProbabilidades.map(([clase, prob]) => (
                      <tr key={clase}>
                        <td>{clase}</td>
                        <td>{(prob * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="secondary" onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
