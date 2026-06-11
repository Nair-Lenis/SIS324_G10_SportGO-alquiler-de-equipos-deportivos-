import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(0,128,128,0.08) 0%, transparent 60%)',
    padding: '1rem',
  },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '2.5rem 2rem',
    width: '100%', maxWidth: '440px',
  },
  logo: {
    fontFamily: 'var(--font-head)', fontSize: '2.4rem',
    color: 'var(--teal)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '0.25rem',
  },
  subtitle: { color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '2rem' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text2)', marginBottom: '0.4rem' },
  input: {
    width: '100%', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: '8px',
    padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem',
    marginBottom: '1.25rem',
  },
  btn: {
    width: '100%', background: 'var(--teal)', color: '#fff',
    border: 'none', borderRadius: '8px', padding: '0.85rem',
    fontWeight: 600, fontSize: '1rem', textTransform: 'uppercase',
    letterSpacing: '0.06em', cursor: 'pointer', marginTop: '0.5rem',
  },
  error: {
    background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171',
    fontSize: '0.9rem', marginBottom: '1.25rem',
  },
  success: {
    background: 'rgba(0,128,128,0.12)', border: '1px solid rgba(0,128,128,0.3)',
    borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--teal)',
    fontSize: '0.9rem', marginBottom: '1.25rem',
  },
}

export default function Register() {
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', telefono: '', whatsapp: '', departamento: 'Santa Cruz', ciudad: '', provincia: ''
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register }          = useAuth()
  const navigate              = useNavigate()

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.whatsapp.trim() || !form.departamento.trim() || !form.ciudad.trim() || !form.provincia.trim()) {
      setError('Completa todos los campos obligatorios.');
      return
    }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await register(
        form.nombre, form.apellido, form.email, form.password, form.telefono,
        form.whatsapp, form.departamento, form.ciudad, form.provincia
      )
      setSuccess('¡Cuenta creada! Redirigiendo al login...')
      setTimeout(() => navigate('/login'), 1800)
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
        <p style={s.subtitle}>Creá tu cuenta gratuita</p>

        {error   && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <div>
              <label style={s.label}>Nombre</label>
              <input style={s.input} value={form.nombre}   onChange={set('nombre')}   placeholder="Carlos" required />
            </div>
            <div>
              <label style={s.label}>Apellido</label>
              <input style={s.input} value={form.apellido} onChange={set('apellido')} placeholder="Mendoza" required />
            </div>
          </div>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" required />

          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" required />

          <div style={s.row}>
            <div>
              <label style={s.label}>Teléfono <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
              <input style={s.input} value={form.telefono} onChange={set('telefono')} placeholder="+591 7..." />
            </div>
            <div>
              <label style={s.label}>WhatsApp *</label>
              <input style={s.input} value={form.whatsapp} onChange={set('whatsapp')} placeholder="+591 7..." required />
            </div>
          </div>

          <div style={s.row}>
            <div>
              <label style={s.label}>Departamento *</label>
              <select style={s.input} value={form.departamento} onChange={set('departamento')} required>
                {['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'].map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Ciudad *</label>
              <input style={s.input} value={form.ciudad} onChange={set('ciudad')} placeholder="Sucre" required />
            </div>
          </div>

          <label style={s.label}>Provincia *</label>
          <input style={s.input} value={form.provincia} onChange={set('provincia')} placeholder="Cercado" required />

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text2)' }}>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--rust)', fontWeight: 600 }}>Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
