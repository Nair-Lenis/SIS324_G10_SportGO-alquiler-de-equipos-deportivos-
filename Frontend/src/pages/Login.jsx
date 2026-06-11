import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,128,128,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(48,25,52,0.3) 0%, transparent 60%)',
    padding: '1rem',
  },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '2.5rem 2rem',
    width: '100%', maxWidth: '400px',
  },
  logo: {
    fontFamily: 'var(--font-head)', fontSize: '2.4rem',
    color: 'var(--teal)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '0.25rem',
  },
  subtitle: { color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '2rem' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text2)', marginBottom: '0.4rem' },
  input: {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: '8px',
    padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem',
    marginBottom: '1.25rem', transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%', background: 'var(--rust)', color: '#fff',
    border: 'none', borderRadius: '8px', padding: '0.85rem',
    fontWeight: 600, fontSize: '1rem', textTransform: 'uppercase',
    letterSpacing: '0.06em', cursor: 'pointer', transition: 'background 0.2s',
    marginTop: '0.5rem',
  },
  error: {
    background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171',
    fontSize: '0.9rem', marginBottom: '1.25rem',
  },
  link: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text2)' },
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      navigate(data.redirect)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ ...s.logo, cursor: 'pointer' }}>⚡ SportGo</div>
        </Link>
        <p style={s.subtitle}>Iniciá sesión sólo si ya tenés cuenta. Si recién llegás, primero registrate.</p>
        <div style={{ display:'flex', justifyContent:'center', gap:'0.75rem', marginBottom:'1rem' }}>
          <Link to="/register" style={{ background:'var(--teal)', color:'#fff', borderRadius:'999px', padding:'0.6rem 1.1rem', fontWeight:600, fontSize:'0.85rem', textDecoration:'none' }}>
            Crear cuenta
          </Link>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input
            style={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" required
          />
          <label style={s.label}>Contraseña</label>
          <input
            style={s.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required
          />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={s.link}>
          ¿No tenés cuenta?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Registrate
          </Link>
        </p>

        {/* Credenciales de demo */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Usuarios de demo</p>
          {[
            { label: 'Admin',        email: 'admin@sportgo.com', pass: 'admin123' },
            { label: 'Propietario',  email: 'ana@sportgo.com',   pass: 'ana123'   },
            { label: 'Arrendatario', email: 'luis@sportgo.com',  pass: 'luis123'  },
          ].map(u => (
            <button key={u.email}
              onClick={() => { setEmail(u.email); setPassword(u.pass) }}
              style={{
                display: 'block', width: '100%', marginBottom: '0.5rem',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--text2)',
                fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <strong style={{ color: 'var(--text)' }}>{u.label}</strong> — {u.email}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
