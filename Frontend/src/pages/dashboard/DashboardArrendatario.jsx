import { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import { useAuth } from '../../context/AuthContext'
import { equiposAPI } from '../../api/client'

const CATEGORIAS = ['Todas', 'Ciclismo', 'Acuático', 'Invierno', 'Trail/Senderismo', 'Otro']
const CAT_EMOJI  = { Ciclismo:'🚵', 'Acuático':'🚣', Invierno:'🏂', 'Trail/Senderismo':'🥾', Otro:'🏅' }

const CAT_IMAGE = {
  'Ciclismo':        '/images/ciclismo.svg',
  'Acuático':        '/images/acuatico.svg',
  'Invierno':        '/images/invierno.svg',
  'Trail/Senderismo':'/images/trail.svg',
  'Otro':            '/images/otro.svg',
}

export default function DashboardArrendatario() {
  const { user } = useAuth()
  const [equipos, setEquipos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')

  useEffect(() => {
    equiposAPI.listar()
      .then(setEquipos)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const equiposFiltrados = equipos.filter(eq => {
    const matchCat = catFiltro === 'Todas' || eq.categoria === catFiltro
    const matchBus = busqueda === '' ||
      eq.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      eq.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      eq.categoria.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBus
  })

  return (
    <DashboardShell title={`Hola, ${user?.nombre} 👋`}>

      {/* Buscador */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'1.25rem 1.5rem',
        display:'flex', gap:'0.75rem', marginBottom:'1.5rem', alignItems:'center' }}>
        <span style={{ fontSize:'1.2rem' }}>🔍</span>
        <input
          placeholder="¿Qué equipo buscás? (título, categoría...)"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'0.65rem 1rem', color:'var(--text)', fontSize:'0.95rem' }}
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} style={{ background:'transparent',
            border:'1px solid var(--border)', borderRadius:'8px', padding:'0.65rem 1rem',
            color:'var(--text2)', cursor:'pointer', fontSize:'0.85rem' }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros por categoría */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'2rem' }}>
        {CATEGORIAS.map(cat => (
          <button key={cat} onClick={() => setCatFiltro(cat)} style={{
            background: catFiltro === cat ? 'var(--teal)' : 'var(--bg2)',
            border: `1px solid ${catFiltro === cat ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius:'999px', padding:'0.4rem 1rem',
            color: catFiltro === cat ? '#fff' : 'var(--text2)',
            fontSize:'0.85rem', cursor:'pointer', fontWeight: catFiltro === cat ? 600 : 400,
            transition:'all 0.15s'
          }}>
            {cat !== 'Todas' ? `${CAT_EMOJI[cat]} ` : '🏆 '}{cat}
          </button>
        ))}
      </div>

      {/* Header resultados */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h2 style={{ fontSize:'1.4rem' }}>Equipos disponibles</h2>
        <span style={{ color:'var(--text2)', fontSize:'0.85rem' }}>
          {loading ? '...' : `${equiposFiltrados.length} resultado${equiposFiltrados.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error   && <p style={{ color:'#f87171', marginBottom:'1rem' }}>{error}</p>}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
              borderRadius:'var(--radius)', height:'280px', opacity:0.4 }} />
          ))}
        </div>
      )}

      {!loading && equiposFiltrados.length === 0 && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔍</div>
          <p>No se encontraron equipos{busqueda ? ` para "${busqueda}"` : ''}.</p>
        </div>
      )}

      {/* Grid de cards con imagen */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1.25rem' }}>
        {equiposFiltrados.map(eq => (
          <div key={eq.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', overflow:'hidden',
            display:'flex', flexDirection:'column',
            transition:'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
            cursor:'default' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--teal)'
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,180,166,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}>

            {/* Imagen de la categoría */}
            <div style={{ width:'100%', height:'150px', overflow:'hidden', position:'relative' }}>
              <img
                src={CAT_IMAGE[eq.categoria] || '/images/otro.svg'}
                alt={eq.categoria}
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
              />
              {/* Badge categoría sobre imagen */}
              <span style={{
                position:'absolute', bottom:'10px', left:'10px',
                background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
                color:'white', borderRadius:'999px',
                padding:'3px 10px', fontSize:'0.72rem', fontWeight:600
              }}>
                {CAT_EMOJI[eq.categoria] || '🏅'} {eq.categoria}
              </span>
            </div>

            {/* Contenido */}
            <div style={{ padding:'1rem 1.25rem', flex:1, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              <div style={{ fontWeight:600, fontSize:'0.95rem', lineHeight:1.3 }}>{eq.titulo}</div>

              <p style={{ fontSize:'0.83rem', color:'var(--text2)', lineHeight:1.5, margin:0 }}>
                {eq.descripcion.length > 80 ? eq.descripcion.slice(0,80)+'…' : eq.descripcion}
              </p>

              <div style={{ fontSize:'0.78rem', color:'var(--text2)', display:'flex', gap:'0.75rem' }}>
                <span>📍 {eq.ubicacion || 'Bolivia'}</span>
                <span>👤 {eq.propietario_nombre}</span>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'0.5rem' }}>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'1.5rem', color:'var(--teal)' }}>
                  Bs. {eq.precio_dia}
                  <span style={{ fontSize:'0.78rem', color:'var(--text2)', fontFamily:'inherit', fontWeight:400 }}>/día</span>
                </div>
                <button style={{ background:'var(--rust)', border:'none', borderRadius:'8px',
                  padding:'0.45rem 1.1rem', color:'#fff', fontWeight:600, fontSize:'0.85rem',
                  cursor:'pointer', transition:'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                  Contactar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
