import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Algo salió mal</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'Error inesperado en la aplicación.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              background: '#2dd4bf', border: 'none', borderRadius: '10px',
              padding: '0.75rem 1.5rem', color: '#fff', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Recargar la página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
