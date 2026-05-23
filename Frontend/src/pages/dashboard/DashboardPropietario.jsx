import { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import { useAuth } from '../../context/AuthContext'
import { equiposAPI } from '../../api/client'

const CATEGORIAS = ['Ciclismo', 'Acuático', 'Invierno', 'Trail/Senderismo', 'Otro']

const ESTADO_STYLE = {
  pendiente:  { bg: 'rgba(234,179,8,0.15)',   text: '#facc15', label: '⏳ Pendiente' },
  aprobado:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', label: '✅ Aprobado' },
  rechazado:  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', label: '❌ Rechazado' },
}

const CAT_EMOJI = { Ciclismo:'🚵', 'Acuático':'🚣', Invierno:'🏂', 'Trail/Senderismo':'🥾', Otro:'🏅' }

// Mapa de imagen por categoría (SVGs en /images/)
const CAT_IMAGE = {
  'Ciclismo':        '/images/ciclismo.svg',
  'Acuático':        '/images/acuatico.svg',
  'Invierno':        '/images/invierno.svg',
  'Trail/Senderismo':'/images/trail.svg',
  'Otro':            '/images/otro.svg',
}

const inputStyle = {
  width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
  borderRadius:'8px', padding:'0.6rem 0.875rem', color:'var(--text)',
  fontSize:'0.9rem', marginBottom:'0.75rem',
}

function ModalEquipo({ equipo, onClose, onSaved }) {
  const isNew = !equipo?.id
  const [form, setForm] = useState({
    titulo:      equipo?.titulo      || '',
    descripcion: equipo?.descripcion || '',
    categoria:   equipo?.categoria   || 'Ciclismo',
    precio_dia:  equipo?.precio_dia  || '',
    ubicacion:   equipo?.ubicacion   || '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.titulo || !form.descripcion || !form.precio_dia) {
      setError('Título, descripción y precio son obligatorios.'); return
    }
    setError(''); setLoading(true)
    try {
      if (isNew) await equiposAPI.crear(form)
      else       await equiposAPI.editar(equipo.id, form)
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'480px',
        boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Preview de imagen según categoría seleccionada */}
        <div style={{ width:'100%', height:'140px', borderRadius:'10px', overflow:'hidden',
          marginBottom:'1.25rem', background:'var(--bg)' }}>
          <img src={CAT_IMAGE[form.categoria] || '/images/otro.svg'}
            alt={form.categoria}
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>

        <h2 style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', marginBottom:'1rem' }}>
          {isNew ? '+ Publicar equipo' : 'Editar equipo'}
        </h2>

        {!isNew && (
          <div style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.3)',
            borderRadius:'8px', padding:'0.6rem 0.875rem', fontSize:'0.82rem',
            color:'#facc15', marginBottom:'0.75rem' }}>
            ⚠️ Editar título, descripción, categoría o precio devolverá el equipo a estado <strong>pendiente</strong>.
          </div>
        )}

        {error && <div style={{ color:'#f87171', background:'rgba(220,50,50,0.1)',
          borderRadius:'6px', padding:'0.5rem 0.75rem', fontSize:'0.875rem', marginBottom:'0.75rem' }}>{error}</div>}

        <input style={inputStyle} placeholder="Título del equipo *" value={form.titulo} onChange={set('titulo')} />
        <textarea style={{ ...inputStyle, resize:'vertical', minHeight:'80px' }}
          placeholder="Descripción detallada *" value={form.descripcion} onChange={set('descripcion')} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <select style={inputStyle} value={form.categoria} onChange={set('categoria')}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
          </select>
          <input style={inputStyle} type="number" placeholder="Precio/día (Bs.) *"
            value={form.precio_dia} onChange={set('precio_dia')} min="1" />
        </div>

        <input style={inputStyle} placeholder="Ubicación (opcional)" value={form.ubicacion} onChange={set('ubicacion')} />

        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'0.7rem', color:'var(--text2)', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} style={{ flex:1, background:'var(--teal)',
            border:'none', borderRadius:'8px', padding:'0.7rem', color:'#fff', fontWeight:600, cursor:'pointer' }}>
            {loading ? 'Guardando...' : isNew ? 'Publicar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPropietario() {
  const { user } = useAuth()
  const [equipos, setEquipos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [modal, setModal]       = useState(null)

  async function cargar() {
    setLoading(true)
    try   { setEquipos(await equiposAPI.listar()) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleEliminar(id, titulo) {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return
    try   { await equiposAPI.eliminar(id); cargar() }
    catch (err) { alert(err.message) }
  }

  const stats = [
    { label: 'Mis equipos',  value: equipos.length },
    { label: 'Aprobados',    value: equipos.filter(e => e.estado_val === 'aprobado').length },
    { label: 'Pendientes',   value: equipos.filter(e => e.estado_val === 'pendiente').length },
    { label: 'Rechazados',   value: equipos.filter(e => e.estado_val === 'rechazado').length },
  ]

  return (
    <DashboardShell title={`Bienvenido, ${user?.nombre}`}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
        {stats.map(c => (
          <div key={c.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'1.25rem' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:'0.4rem' }}>{c.label}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h2 style={{ fontSize:'1.4rem' }}>Mis equipos</h2>
        <button onClick={() => setModal('new')} style={{ background:'var(--teal)', border:'none',
          borderRadius:'8px', padding:'0.55rem 1.25rem', color:'#fff', fontWeight:600,
          fontSize:'0.875rem', cursor:'pointer' }}>
          + Publicar equipo
        </button>
      </div>

      {error   && <p style={{ color:'#f87171', marginBottom:'1rem' }}>{error}</p>}
      {loading && <p style={{ color:'var(--text2)' }}>Cargando...</p>}

      {!loading && equipos.length === 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
          padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🏅</div>
          <p>Aún no publicaste ningún equipo.</p>
          <button onClick={() => setModal('new')} style={{ marginTop:'1rem', background:'var(--teal)',
            border:'none', borderRadius:'8px', padding:'0.6rem 1.5rem', color:'#fff',
            fontWeight:600, cursor:'pointer' }}>
            Publicar mi primer equipo
          </button>
        </div>
      )}

      {/* Cards con imagen */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
        {equipos.map(eq => {
          const est = ESTADO_STYLE[eq.estado_val] || {}
          const imgSrc = CAT_IMAGE[eq.categoria] || '/images/otro.svg'
          return (
            <div key={eq.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
              borderRadius:'var(--radius)', overflow:'hidden',
              transition:'border-color 0.2s, transform 0.15s',
              display:'flex', flexDirection:'column' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)' }}>

              {/* Imagen de categoría */}
              <div style={{ width:'100%', height:'140px', overflow:'hidden', position:'relative' }}>
                <img src={imgSrc} alt={eq.categoria}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                {/* Badge de estado sobre la imagen */}
                <span style={{
                  position:'absolute', top:'10px', right:'10px',
                  background:est.bg, color:est.text, backdropFilter:'blur(8px)',
                  borderRadius:'999px', padding:'3px 12px',
                  fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.06em', border:`1px solid ${est.text}30`
                }}>
                  {est.label || eq.estado_val}
                </span>
              </div>

              {/* Contenido de la card */}
              <div style={{ padding:'1rem 1.25rem', flex:1, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <span style={{ fontSize:'1.2rem' }}>{CAT_EMOJI[eq.categoria] || '🏅'}</span>
                  <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{eq.titulo}</div>
                </div>

                <div style={{ fontSize:'0.8rem', color:'var(--text2)' }}>
                  {eq.categoria} · 📍 {eq.ubicacion || 'Sin ubicación'}
                </div>

                {eq.estado_val === 'rechazado' && eq.motivo_rechazo && (
                  <div style={{ fontSize:'0.78rem', color:'#f87171',
                    background:'rgba(220,50,50,0.08)', borderRadius:'6px',
                    padding:'0.4rem 0.6rem' }}>
                    Motivo: {eq.motivo_rechazo}
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'0.5rem' }}>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:'1.4rem', color:'var(--teal)' }}>
                    Bs. {eq.precio_dia}/día
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button onClick={() => setModal(eq)} style={{ background:'transparent',
                      border:'1px solid var(--border)', borderRadius:'6px',
                      padding:'0.35rem 0.75rem', color:'var(--text2)', fontSize:'0.8rem', cursor:'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => handleEliminar(eq.id, eq.titulo)} style={{ background:'transparent',
                      border:'1px solid rgba(220,50,50,0.3)', borderRadius:'6px',
                      padding:'0.35rem 0.75rem', color:'#f87171', fontSize:'0.8rem', cursor:'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <ModalEquipo
          equipo={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}
    </DashboardShell>
  )
}
