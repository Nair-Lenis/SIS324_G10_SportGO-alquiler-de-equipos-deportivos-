import { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import ChatModal from '../../components/ChatModal'
import { useAuth } from '../../context/AuthContext'
import { equiposAPI, solicitudesAPI, mensajesAPI } from '../../api/client'

const CATEGORIAS = ['Todas', 'Ciclismo', 'Acuático', 'Invierno', 'Trail/Senderismo', 'Otro']
const CAT_EMOJI  = { Ciclismo:'🚵', 'Acuático':'🚣', Invierno:'🏂', 'Trail/Senderismo':'🥾', Otro:'🏅' }

const CAT_IMAGE = {
  'Ciclismo':        '/images/ciclismo.svg',
  'Acuático':        '/images/acuatico.svg',
  'Invierno':        '/images/invierno.svg',
  'Trail/Senderismo':'/images/trail.svg',
  'Otro':            '/images/otro.svg',
}

function ProductGallery({ fotos = [], categoria }) {
  const [index, setIndex] = useState(0)
  const slides = fotos.length ? fotos : [CAT_IMAGE[categoria] || '/images/otro.svg']

  useEffect(() => { setIndex(0) }, [slides])

  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex(i => (i + 1) % slides.length)

  return (
    <div style={{ position:'relative', minHeight:'180px', overflow:'hidden' }}>
      <img
        src={slides[index]}
        alt={`${categoria} imagen ${index + 1}`}
        style={{ width:'100%', height:'180px', objectFit:'cover' }}
      />
      {slides.length > 1 && (
        <>
          <button onClick={prev} style={{
            position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)',
            background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'999px',
            width:'32px', height:'32px', color:'#fff', cursor:'pointer'
          }}>‹</button>
          <button onClick={next} style={{
            position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
            background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'999px',
            width:'32px', height:'32px', color:'#fff', cursor:'pointer'
          }}>›</button>
          <div style={{
            position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)',
            display:'flex', gap:'0.35rem'
          }}>
            {slides.map((_, dotIndex) => (
              <button key={dotIndex} onClick={() => setIndex(dotIndex)} style={{
                width:'10px', height:'10px', borderRadius:'999px', border:'none',
                background: dotIndex === index ? 'var(--teal)' : 'rgba(255,255,255,0.5)',
                cursor:'pointer'
              }} />
            ))}
          </div>
        </>
      )}
      {slides.length === 1 && (
        <span style={{
          position:'absolute', bottom:'10px', left:'10px', background:'rgba(0,0,0,0.55)',
          color:'#fff', borderRadius:'999px', padding:'0.25rem 0.75rem', fontSize:'0.75rem'
        }}>
          {fotos.length ? `${index + 1}/${slides.length}` : 'Imagen por categoría'}
        </span>
      )}
    </div>
  )
}

function buildReviewData(equipo) {
  const reviews = equipo.reviews || []
  const total = reviews.length
  const average = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
  const positiveCount = reviews.filter(r => r.rating >= 4).length
  return {
    reviews,
    average: Number(average.toFixed(1)),
    total,
    positivePercentage: total ? Math.round((positiveCount / total) * 100) : 0,
  }
}

function renderStars(value) {
  const filled = Math.round(value)
  return Array.from({ length: 5 }, (_, idx) => idx < filled ? '★' : '☆').join('')
}

function normalizePhone(phone = '') {
  return phone.replace(/\D/g, '')
}

function EquipoDetalleModal({ equipo, onClose, onRequestSuccess }) {
  const slides = equipo.fotos?.length ? equipo.fotos : [CAT_IMAGE[equipo.categoria] || '/images/otro.svg']
  const [index, setIndex] = useState(0)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [rangosOcupados, setRangosOcupados] = useState([])
  const [calMes, setCalMes] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [reviewsData, setReviewsData] = useState({ reviews: [], avg_rating: null, total: 0 })
  const [showReviews, setShowReviews] = useState(false)

  useEffect(() => {
    equiposAPI.ocupado(equipo.id).then(r => setRangosOcupados(Array.isArray(r) ? r : [])).catch(() => {})
    equiposAPI.reviews(equipo.id)
      .then(r => setReviewsData({ reviews: r.reviews || [], avg_rating: r.avg_rating, total: r.total || 0 }))
      .catch(() => {})
  }, [equipo.id])

  function esDiaOcupado(year, month, day) {
    const d = new Date(year, month, day)
    return rangosOcupados.some(r => {
      const ini = new Date(r.fecha_inicio); ini.setHours(0,0,0,0)
      const fin = new Date(r.fecha_fin);   fin.setHours(23,59,59,999)
      return d >= ini && d <= fin
    })
  }

  function renderCalendario() {
    const { year, month } = calMes
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const primerDia = new Date(year, month, 1).getDay()
    const diasEnMes = new Date(year, month + 1, 0).getDate()
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const celdas = []
    for (let i = 0; i < primerDia; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d)
    return (
      <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'12px', padding:'0.75rem', marginTop:'0.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
          <button onClick={() => setCalMes(m => { const d = new Date(m.year, m.month - 1); return { year:d.getFullYear(), month:d.getMonth() } })}
            style={{ background:'transparent', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:'1.1rem' }}>‹</button>
          <span style={{ fontWeight:700, fontSize:'0.9rem' }}>{MESES[month]} {year}</span>
          <button onClick={() => setCalMes(m => { const d = new Date(m.year, m.month + 1); return { year:d.getFullYear(), month:d.getMonth() } })}
            style={{ background:'transparent', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:'1.1rem' }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', textAlign:'center' }}>
          {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
            <div key={d} style={{ fontSize:'0.65rem', color:'var(--text2)', paddingBottom:'4px', fontWeight:600 }}>{d}</div>
          ))}
          {celdas.map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const ocupado = esDiaOcupado(year, month, d)
            const pasado = new Date(year, month, d) < hoy
            return (
              <div key={d} style={{
                fontSize:'0.75rem', padding:'4px 2px', borderRadius:'6px',
                background: ocupado ? 'rgba(239,68,68,0.2)' : 'transparent',
                color: ocupado ? '#f87171' : pasado ? 'var(--text2)' : 'var(--text)',
                fontWeight: ocupado ? 700 : 400,
                textDecoration: pasado ? 'line-through' : 'none',
              }}>{d}</div>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem', fontSize:'0.72rem', color:'var(--text2)' }}>
          <span><span style={{ color:'#f87171' }}>■</span> Ocupado</span>
          <span><span style={{ color:'var(--teal)' }}>■</span> Disponible</span>
        </div>
      </div>
    )
  }
  const phoneDigits = normalizePhone(equipo.propietario_telefono || '')
  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.875rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.9rem',
  }
  const lat = Number(equipo.lat)
  const lng = Number(equipo.lng)
  const embedMapUrl = !Number.isNaN(lat) && !Number.isNaN(lng)
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : null
  const whatsappHref = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hola ${equipo.propietario_nombre}, estoy interesado en tu equipo "${equipo.titulo}" disponible en ${equipo.ubicacion}.`)}`
    : null

  const prevSlide = () => setIndex(i => (i - 1 + slides.length) % slides.length)
  const nextSlide = () => setIndex(i => (i + 1) % slides.length)

  async function crearSolicitud() {
    setRequestError('')
    if (!fechaInicio || !fechaFin) {
      setRequestError('Debes indicar fecha de inicio y fecha de fin.')
      return
    }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    if (fin <= inicio) {
      setRequestError('La fecha de fin debe ser posterior a la fecha de inicio.')
      return
    }

    setRequestLoading(true)
    try {
      await solicitudesAPI.crear({
        equipo_id: equipo.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        mensaje: mensaje.trim() || null,
      })
      onRequestSuccess?.()
      onClose()
    } catch (err) {
      setRequestError(err.message)
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:'980px', maxHeight:'90vh', overflowY:'auto', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'24px', padding:'1.25rem', boxShadow:'0 32px 80px rgba(0,0,0,0.35)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'0.82rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--text2)', marginBottom:'0.25rem' }}>
              {equipo.categoria}
            </div>
            <h2 style={{ margin:0, fontFamily:'var(--font-head)', fontSize:'2rem' }}>{equipo.titulo}</h2>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'transparent', fontSize:'1.25rem', cursor:'pointer', color:'var(--text2)' }}>×</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 0.8fr', gap:'1rem', alignItems:'start' }}>
          <div style={{ borderRadius:'24px', overflow:'hidden', position:'relative', minHeight:'320px', background:'var(--bg)' }}>
            <img src={slides[index]} alt={`${equipo.categoria} imagen ${index + 1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            {slides.length > 1 && (
              <>
                <button onClick={prevSlide} style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'999px', width:'36px', height:'36px', color:'#fff', cursor:'pointer' }}>‹</button>
                <button onClick={nextSlide} style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'999px', width:'36px', height:'36px', color:'#fff', cursor:'pointer' }}>›</button>
              </>
            )}
            <div style={{ position:'absolute', bottom:'14px', left:'14px', display:'flex', gap:'0.35rem' }}>
              {slides.map((_, dot) => (
                <span key={dot} onClick={() => setIndex(dot)} style={{ width:'10px', height:'10px', borderRadius:'50%', background: dot === index ? 'var(--teal)' : 'rgba(255,255,255,0.55)', cursor:'pointer' }} />
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gap:'1rem' }}>
            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'20px', padding:'1rem' }}>
              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'center', marginBottom:'1rem' }}>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--teal)' }}>Bs. {equipo.precio_dia}</div>
                <span style={{ color:'var(--text2)', fontSize:'0.9rem' }}>/día</span>
              </div>
              <div style={{ display:'grid', gap:'0.85rem' }}>
                <div><strong>Ubicación:</strong> {equipo.ubicacion || 'No disponible'}</div>
                <div><strong>Propietario:</strong> {equipo.propietario_nombre}</div>
                <div><strong>Teléfono:</strong> {equipo.propietario_telefono || 'No disponible'}</div>
                <div><strong>Estado:</strong> {equipo.estado_val}</div>
              </div>
              <a href={whatsappHref || '#'} target="_blank" rel="noreferrer" style={{ display:'inline-flex', marginTop:'1rem', width:'100%', justifyContent:'center', alignItems:'center', gap:'0.5rem', background: phoneDigits ? 'var(--teal)' : 'rgba(112,128,144,0.15)', color:'#fff', border:'none', borderRadius:'14px', padding:'0.95rem 1rem', cursor: phoneDigits ? 'pointer' : 'not-allowed', textDecoration:'none', fontWeight:700 }}>📲 Contactar por WhatsApp</a>
            </div>

            <div style={{ display:'grid', gap:'0.75rem' }}>
              {/* ── Calificación + Reseñas ── */}
              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'20px', padding:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text2)', marginBottom:'0.15rem' }}>Calificación promedio</div>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color: reviewsData.avg_rating ? '#facc15' : 'var(--text2)' }}>
                      {reviewsData.avg_rating ?? '—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'#facc15', fontSize:'1.2rem', letterSpacing:'2px' }}>
                      {reviewsData.avg_rating
                        ? '★'.repeat(Math.round(reviewsData.avg_rating)) + '☆'.repeat(5 - Math.round(reviewsData.avg_rating))
                        : '☆☆☆☆☆'}
                    </div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text2)', marginTop:'0.2rem' }}>
                      {reviewsData.total} reseña{reviewsData.total !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviews(v => !v)}
                  style={{ width:'100%', marginTop:'0.75rem', padding:'0.55rem 0.75rem', borderRadius:'10px',
                    border:'1px solid var(--border)', background: showReviews ? 'rgba(45,212,191,0.1)' : 'transparent',
                    color: showReviews ? 'var(--teal)' : 'var(--text2)', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
                  {showReviews ? '▲ Ocultar reseñas' : `▼ Ver reseñas (${reviewsData.total})`}
                </button>
                {showReviews && (
                  <div style={{ marginTop:'0.85rem', display:'grid', gap:'0.65rem' }}>
                    {reviewsData.reviews.length === 0 ? (
                      <div style={{ color:'var(--text2)', fontSize:'0.875rem', textAlign:'center', padding:'0.75rem 0' }}>
                        Aún no hay reseñas. ¡Sé el primero en calificar!
                      </div>
                    ) : reviewsData.reviews.map((r, i) => (
                      <div key={i} style={{ background:'rgba(45,212,191,0.06)', border:'1px solid rgba(45,212,191,0.15)',
                        borderRadius:'14px', padding:'0.875rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.35rem' }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'0.875rem' }}>{r.name}</div>
                            {r.fecha && <div style={{ fontSize:'0.7rem', color:'var(--text2)' }}>{new Date(r.fecha).toLocaleDateString()}</div>}
                          </div>
                          <span style={{ color:'#facc15', fontSize:'0.95rem', letterSpacing:'1px' }}>
                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                          </span>
                        </div>
                        {r.comment && (
                          <p style={{ margin:0, color:'var(--text2)', fontSize:'0.85rem', lineHeight:1.6, fontStyle:'italic' }}>
                            "{r.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {embedMapUrl ? (
                <div style={{ borderRadius:'20px', overflow:'hidden', border:'1px solid var(--border)', minHeight:'220px' }}>
                  <iframe
                    title="Ubicación en Google Maps"
                    src={embedMapUrl}
                    style={{ width:'100%', height:'220px', border:'0' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'20px', padding:'1rem', color:'var(--text2)' }}>
                  La ubicación exacta no está disponible.
                </div>
              )}
            </div>
          </div>

          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'20px', padding:'1rem', marginTop:'1rem' }}>
            <div style={{ display:'grid', gap:'0.85rem' }}>
              <div style={{ fontSize:'1rem', fontWeight:700 }}>Enviar solicitud de alquiler</div>
              <div>
                <div style={{ fontSize:'0.85rem', color:'var(--text2)', marginBottom:'0.25rem' }}>Disponibilidad del equipo</div>
                {renderCalendario()}
              </div>
              {requestError && <div style={{ color:'#b91c1c', fontSize:'0.9rem' }}>{requestError}</div>}
              <div style={{ display:'grid', gap:'0.75rem', gridTemplateColumns:'1fr 1fr' }}>
                <label style={{ display:'grid', gap:'0.35rem', fontSize:'0.85rem', color:'var(--text2)' }}>
                  Fecha de inicio
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ ...inputStyle, margin:0 }} />
                </label>
                <label style={{ display:'grid', gap:'0.35rem', fontSize:'0.85rem', color:'var(--text2)' }}>
                  Fecha de fin
                  <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ ...inputStyle, margin:0 }} />
                </label>
              </div>
              <label style={{ display:'grid', gap:'0.35rem', fontSize:'0.85rem', color:'var(--text2)' }}>
                Mensaje al propietario (opcional)
                <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} style={{ ...inputStyle, minHeight:'90px', resize:'vertical', margin:0 }} placeholder="Escribe una breve nota para el propietario" />
              </label>
              <button onClick={crearSolicitud} disabled={requestLoading} style={{ background:'var(--teal)', border:'none', borderRadius:'12px', color:'#fff', padding:'0.95rem 1rem', fontWeight:700, cursor:'pointer' }}>
                {requestLoading ? 'Enviando solicitud...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.65rem', marginTop:'1rem' }}>
            <button onClick={onClose} style={{ border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', borderRadius:'14px', padding:'0.85rem 1.1rem', cursor:'pointer' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StarRating({ value, onChange, readonly = false, size = '1.8rem' }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display:'flex', gap:'0.15rem' }}>
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button"
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            background:'transparent', border:'none', padding:'0',
            cursor: readonly ? 'default' : 'pointer',
            fontSize: size,
            color: star <= (hover || value) ? '#facc15' : 'rgba(255,255,255,0.15)',
            transition:'color 0.1s', lineHeight:1,
          }}>★</button>
      ))}
    </div>
  )
}

export default function DashboardArrendatario() {
  const { user } = useAuth()
  const [equipos, setEquipos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [sortBy, setSortBy]       = useState('relevancia')
  const [selectedEquipo, setSelectedEquipo] = useState(null)
  const [activeSection, setActiveSection] = useState('explorar')
  const [solicitudes, setSolicitudes] = useState([])
  const [solicitudesLoading, setSolicitudesLoading] = useState(false)
  const [solicitudesError, setSolicitudesError] = useState('')
  const [requestStatus, setRequestStatus] = useState('')
  const [requestError, setRequestError] = useState('')
  const [calificaciones, setCalificaciones] = useState({})
  const [calError, setCalError]   = useState({})
  const [calLoading, setCalLoading] = useState({})
  const [chatSolicitud, setChatSolicitud] = useState(null)

  function cargarEquipos() {
    setLoading(true)
    setError('')
    equiposAPI.listar()
      .then(setEquipos)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (activeSection === 'explorar') cargarEquipos()
    if (activeSection === 'mis_solicitudes' || activeSection === 'historial') cargarMisSolicitudes()
  }, [activeSection])

  async function cargarMisSolicitudes() {
    setSolicitudesError('')
    setSolicitudesLoading(true)
    try {
      const data = await solicitudesAPI.mis()
      setSolicitudes(Array.isArray(data) ? data : [])
    } catch (err) {
      setSolicitudesError(err.message)
    } finally {
      setSolicitudesLoading(false)
    }
  }

  async function enviarCalificacion(solicitudId) {
    const cal = calificaciones[solicitudId] || {}
    if (!cal.estrellas) {
      setCalError(e => ({ ...e, [solicitudId]: 'Seleccioná al menos 1 estrella.' }))
      return
    }
    setCalLoading(l => ({ ...l, [solicitudId]: true }))
    setCalError(e => ({ ...e, [solicitudId]: '' }))
    try {
      await solicitudesAPI.calificar(solicitudId, {
        calificacion: cal.estrellas,
        comentario_cal: cal.comentario?.trim() || null,
      })
      await cargarMisSolicitudes()
    } catch (err) {
      setCalError(e => ({ ...e, [solicitudId]: err.message }))
    } finally {
      setCalLoading(l => ({ ...l, [solicitudId]: false }))
    }
  }

  function handleSolicitudCreada() {
    setRequestStatus('Solicitud enviada correctamente. El propietario te responderá pronto.')
    setRequestError('')
    setSelectedEquipo(null)
    if (activeSection === 'mis_solicitudes') cargarMisSolicitudes()
  }

  const equiposFiltrados = equipos.filter(eq => {
    if (eq.estado_val !== 'aprobado') return false
    const matchCat = catFiltro === 'Todas' || eq.categoria === catFiltro
    const matchBus = busqueda === '' ||
      eq.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      eq.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      eq.categoria.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBus
  })

  const equiposOrdenados = [...equiposFiltrados].sort((a, b) => {
    if (sortBy === 'precio_asc') return Number(a.precio_dia) - Number(b.precio_dia)
    if (sortBy === 'precio_desc') return Number(b.precio_dia) - Number(a.precio_dia)
    return a.titulo.localeCompare(b.titulo)
  })

  const resumenSolicitudes = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
    aceptadas: solicitudes.filter(s => s.estado === 'aceptada').length,
    devueltas: solicitudes.filter(s => s.estado === 'devuelta').length,
  }

  return (
    <DashboardShell title={`Hola, ${user?.nombre} 👋`} activeSection={activeSection} onSectionChange={setActiveSection}>

      <div className="hero-panel">
        <div>
          <div style={{ fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--text2)', marginBottom:'0.75rem' }}>
            {activeSection === 'mis_solicitudes' ? 'Solicitudes' : 'Mercado de equipos'}
          </div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:'2rem', marginBottom:'0.75rem' }}>
            {activeSection === 'mis_solicitudes'
              ? 'Revisa tus solicitudes activas'
              : 'Encuentra tu próximo equipo al mejor precio'}
          </h2>
          <p style={{ color:'var(--text2)', lineHeight:1.8, maxWidth:'620px' }}>
            {activeSection === 'mis_solicitudes'
              ? 'Revisa el estado de tus alquileres, chatea con tus propietarios y califica después de la devolución.'
              : 'Explora disponibilidad, filtra por categoría y compara ofertas en un catálogo moderno inspirado en marketplaces profesionales.'}
          </p>
          <div className="dashboard-metrics" style={{ marginTop:'1rem' }}>
            <div style={{ background:'rgba(0,128,128,0.15)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>
                {activeSection === 'mis_solicitudes' ? 'Solicitudes totales' : 'Resultados'}
              </div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--teal)' }}>
                {activeSection === 'mis_solicitudes' ? resumenSolicitudes.total : equiposFiltrados.length || 0}
              </div>
            </div>
            <div style={{ background:'rgba(112,128,144,0.15)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>
                {activeSection === 'mis_solicitudes' ? 'Pendientes' : 'Orden'}
              </div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--slate)' }}>
                {activeSection === 'mis_solicitudes' ? resumenSolicitudes.pendientes : (sortBy === 'relevancia' ? 'A‑Z' : sortBy === 'precio_asc' ? 'Precio ↑' : 'Precio ↓')}
              </div>
            </div>
          </div>
        </div>
        <img src={activeSection === 'mis_solicitudes' ? '/images/requests-hero.svg' : '/images/market-hero.svg'} alt="Mercado deportivo" className="hero-illustration" />
      </div>

      {requestStatus && <div style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.35)', color:'var(--teal)', borderRadius:'16px', padding:'1rem 1.25rem', marginBottom:'1rem' }}>{requestStatus}</div>}
      {requestError && <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#b91c1c', borderRadius:'16px', padding:'1rem 1.25rem', marginBottom:'1rem' }}>{requestError}</div>}

      {activeSection === 'explorar' && (
        <>
          <div style={{ display:'grid', gap:'0.75rem' }}>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem 1.5rem', display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:'1.2rem' }}>🔍</span>
              <input
                placeholder="¿Qué equipo buscás? (título, categoría...)"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ flex:1, minWidth:'220px', background:'var(--bg3)', border:'1px solid var(--border)',
                  borderRadius:'8px', padding:'0.65rem 1rem', color:'var(--text)', fontSize:'0.95rem' }}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} style={{ background:'transparent',
                  border:'1px solid var(--border)', borderRadius:'8px', padding:'0.65rem 1rem',
                  color:'var(--text2)', cursor:'pointer', fontSize:'0.85rem' }}>
                  Limpiar
                </button>
              )}
              <button onClick={cargarEquipos} disabled={loading} style={{
                background:'transparent', border:'1px solid var(--border)',
                borderRadius:'8px', padding:'0.65rem 1rem',
                color: loading ? 'var(--text2)' : 'var(--teal)',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize:'0.85rem',
              }}>
                {loading ? '...' : '↻ Actualizar'}
              </button>
            </div>

            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              {CATEGORIAS.map(cat => (
                <button key={cat} onClick={() => setCatFiltro(cat)} style={{
                  background: catFiltro === cat ? 'var(--teal)' : 'var(--bg2)',
                  border: `1px solid ${catFiltro === cat ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius:'999px', padding:'0.45rem 1rem',
                  color: catFiltro === cat ? '#fff' : 'var(--text2)',
                  fontSize:'0.85rem', cursor:'pointer', fontWeight: catFiltro === cat ? 600 : 400,
                  transition:'all 0.15s'
                }}>
                  {cat !== 'Todas' ? `${CAT_EMOJI[cat]} ` : '🏆 '}{cat}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:'1.4rem', margin:0 }}>Equipos disponibles</h2>
                <span style={{ color:'var(--text2)', fontSize:'0.9rem' }}>
                  {loading ? '...' : `${equiposFiltrados.length} resultado${equiposFiltrados.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <span style={{ color:'var(--text2)', fontSize:'0.85rem' }}>Ordenar por</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                  background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'999px', padding:'0.65rem 1rem',
                  color:'var(--text)', fontSize:'0.9rem', cursor:'pointer', minWidth:'170px'
                }}>
                  <option value="relevancia">Relevancia (A-Z)</option>
                  <option value="precio_asc">Precio más bajo</option>
                  <option value="precio_desc">Precio más alto</option>
                </select>
              </div>
            </div>
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

          <div className="dashboard-grid">
            {equiposOrdenados.map(eq => (
              <div key={eq.id} className="product-card">
                <ProductGallery fotos={eq.fotos || []} categoria={eq.categoria} />
                <div className="product-body">
                  <div style={{ fontWeight:600, fontSize:'0.95rem', lineHeight:1.3 }}>{eq.titulo}</div>

                  <p style={{ fontSize:'0.83rem', color:'var(--text2)', lineHeight:1.5, margin:0 }}>
                    {eq.descripcion.length > 80 ? eq.descripcion.slice(0,80)+'…' : eq.descripcion}
                  </p>

                  <div style={{ fontSize:'0.78rem', color:'var(--text2)', display:'flex', gap:'0.75rem' }}>
                    <span>📍 {eq.ubicacion || 'Bolivia'}</span>
                    <span>👤 {eq.propietario_nombre}</span>
                  </div>

                  {/* ── Estrellas en la card ── */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.8rem' }}>
                    {eq.avg_rating ? (
                      <>
                        <span style={{ color:'#facc15', letterSpacing:'1px' }}>
                          {'★'.repeat(Math.round(eq.avg_rating))}{'☆'.repeat(5 - Math.round(eq.avg_rating))}
                        </span>
                        <span style={{ color:'var(--teal)', fontWeight:700 }}>{eq.avg_rating}</span>
                        <span style={{ color:'var(--text2)' }}>({eq.review_count} reseña{eq.review_count !== 1 ? 's' : ''})</span>
                      </>
                    ) : (
                      <span style={{ color:'var(--text2)' }}>☆☆☆☆☆ Sin reseñas</span>
                    )}
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'0.5rem' }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:'1.5rem', color:'var(--teal)' }}>
                      Bs. {eq.precio_dia}
                      <span style={{ fontSize:'0.78rem', color:'var(--text2)', fontFamily:'inherit', fontWeight:400 }}>/día</span>
                    </div>
                    <button onClick={() => { setSelectedEquipo(eq); setRequestStatus(''); setRequestError('') }} className="btn-pill btn-primary" style={{ minWidth:'110px' }}>
                      Contactar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeSection === 'mis_solicitudes' && (
        <div style={{ display:'grid', gap:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', alignItems:'center' }}>
            <div>
              <h2 style={{ fontSize:'1.4rem', margin:0 }}>Mis solicitudes</h2>
              <p style={{ color:'var(--text2)', margin:'0.5rem 0 0' }}>Revisa tus reservas, comunica tu estatus y califica al propietario una vez que devuelvas el equipo.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(120px,1fr))', gap:'0.75rem', width:'100%', maxWidth:'420px' }}>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>Pendientes</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', color:'var(--teal)' }}>{resumenSolicitudes.pendientes}</div>
              </div>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>Aceptadas</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', color:'var(--teal)' }}>{resumenSolicitudes.aceptadas}</div>
              </div>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>Devueltas</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', color:'var(--teal)' }}>{resumenSolicitudes.devueltas}</div>
              </div>
            </div>
          </div>

          {solicitudesLoading && <p style={{ color:'var(--text2)' }}>Cargando solicitudes...</p>}
          {solicitudesError && <p style={{ color:'#f87171' }}>{solicitudesError}</p>}

          {!solicitudesLoading && solicitudes.length === 0 && (
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📩</div>
              <p>No tenés solicitudes registradas aún.</p>
            </div>
          )}

          {!solicitudesLoading && solicitudes.length > 0 && (
            <div style={{ display:'grid', gap:'1rem' }}>
              {solicitudes.map(sol => (
                <div key={sol.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', display:'grid', gap:'0.85rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'1rem' }}>{sol.equipo_titulo}</div>
                      <div style={{ color:'var(--text2)', fontSize:'0.9rem' }}>{sol.equipo_categoria} · Bs. {sol.equipo_precio}/día</div>
                    </div>
                    <span style={{ borderRadius:'999px', padding:'0.45rem 0.9rem', background:'rgba(255,255,255,0.08)', color:'var(--text2)', fontSize:'0.85rem' }}>{sol.estado.toUpperCase()}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem' }}>
                    <div><strong>Propietario:</strong> {sol.propietario_nombre}</div>
                    <div><strong>WhatsApp:</strong> {sol.propietario_whatsapp || 'No disponible'}</div>
                    <div><strong>Teléfono:</strong> {sol.propietario_telefono || 'No disponible'}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
                    <div><strong>Inicio:</strong> {new Date(sol.fecha_inicio).toLocaleDateString()}</div>
                    <div><strong>Fin:</strong> {new Date(sol.fecha_fin).toLocaleDateString()}</div>
                    {sol.motivo_rechazo && <div><strong>Motivo rechazo:</strong> {sol.motivo_rechazo}</div>}
                  </div>
                  {sol.mensaje && <p style={{ color:'var(--text2)', margin:0 }}><strong>Mensaje:</strong> {sol.mensaje}</p>}

                  <button onClick={() => setChatSolicitud(sol)} style={{
                    alignSelf:'flex-start', background:'rgba(45,212,191,0.1)',
                    border:'1px solid rgba(45,212,191,0.3)', borderRadius:'8px',
                    padding:'0.45rem 1rem', color:'var(--teal)', fontSize:'0.85rem',
                    cursor:'pointer', fontWeight:600
                  }}>💬 Abrir chat</button>

                  {/* ── CALIFICACIÓN ── */}
                  {sol.estado === 'devuelta' && (
                    <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.85rem', marginTop:'0.25rem' }}>
                      {sol.calificacion ? (
                        /* Ya calificado — mostrar resultado */
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--teal)' }}>
                            Tu calificación
                          </div>
                          <StarRating value={sol.calificacion} readonly />
                          {sol.comentario_cal && (
                            <p style={{ margin:0, color:'var(--text2)', fontSize:'0.875rem', fontStyle:'italic' }}>
                              "{sol.comentario_cal}"
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Pendiente de calificar */
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#facc15' }}>
                            Calificá este equipo
                          </div>
                          <StarRating
                            value={calificaciones[sol.id]?.estrellas || 0}
                            onChange={v => setCalificaciones(c => ({ ...c, [sol.id]: { ...c[sol.id], estrellas: v } }))}
                          />
                          <textarea
                            placeholder="Comentario opcional (¿cómo fue tu experiencia?)"
                            value={calificaciones[sol.id]?.comentario || ''}
                            onChange={e => setCalificaciones(c => ({ ...c, [sol.id]: { ...c[sol.id], comentario: e.target.value } }))}
                            style={{
                              width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
                              borderRadius:'8px', padding:'0.6rem 0.875rem', color:'var(--text)',
                              fontSize:'0.875rem', resize:'vertical', minHeight:'64px',
                            }}
                          />
                          {calError[sol.id] && (
                            <p style={{ color:'#f87171', margin:0, fontSize:'0.85rem' }}>{calError[sol.id]}</p>
                          )}
                          <button
                            onClick={() => enviarCalificacion(sol.id)}
                            disabled={calLoading[sol.id]}
                            style={{
                              alignSelf:'flex-start', background:'#facc15', border:'none',
                              borderRadius:'8px', padding:'0.55rem 1.25rem',
                              color:'#0f172a', fontWeight:700, fontSize:'0.875rem', cursor:'pointer',
                            }}
                          >
                            {calLoading[sol.id] ? 'Enviando...' : '★ Enviar calificación'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {activeSection === 'historial' && (
        <div style={{ display:'grid', gap:'1rem' }}>
          <div>
            <h2 style={{ fontSize:'1.4rem', margin:0 }}>Historial de alquileres</h2>
            <p style={{ color:'var(--text2)', margin:'0.5rem 0 0' }}>Todos tus alquileres completados.</p>
          </div>

          {solicitudesLoading && <p style={{ color:'var(--text2)' }}>Cargando...</p>}

          {(() => {
            const historial = solicitudes.filter(s => s.estado === 'devuelta')
            if (!solicitudesLoading && historial.length === 0) return (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📦</div>
                <p>Aún no tienes alquileres completados.</p>
              </div>
            )
            const totalGastado = historial.reduce((sum, s) => {
              const dias = Math.max(1, Math.ceil((new Date(s.fecha_fin) - new Date(s.fecha_inicio)) / 86400000))
              return sum + (s.equipo_precio * dias)
            }, 0)
            return (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.75rem' }}>
                  {[
                    { label:'Alquileres', value: historial.length },
                    { label:'Total gastado', value: `Bs. ${totalGastado}` },
                    { label:'Calificados', value: historial.filter(s => s.calificacion).length },
                  ].map(c => (
                    <div key={c.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'16px', padding:'1rem', textAlign:'center' }}>
                      <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>{c.label}</div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', color:'var(--teal)' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gap:'0.75rem' }}>
                  {historial.map(sol => {
                    const dias = Math.max(1, Math.ceil((new Date(sol.fecha_fin) - new Date(sol.fecha_inicio)) / 86400000))
                    return (
                      <div key={sol.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', display:'grid', gap:'0.75rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
                          <div>
                            <div style={{ fontWeight:700 }}>{sol.equipo_titulo}</div>
                            <div style={{ color:'var(--text2)', fontSize:'0.875rem' }}>{sol.equipo_categoria} · {sol.propietario_nombre}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'var(--font-head)', fontSize:'1.3rem', color:'var(--teal)' }}>Bs. {sol.equipo_precio * dias}</div>
                            <div style={{ fontSize:'0.75rem', color:'var(--text2)' }}>{dias} día{dias !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <div style={{ fontSize:'0.875rem', color:'var(--text2)' }}>
                          {new Date(sol.fecha_inicio).toLocaleDateString()} → {new Date(sol.fecha_fin).toLocaleDateString()}
                        </div>
                        {sol.calificacion && (
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.875rem' }}>
                            <span style={{ color:'#facc15' }}>{'★'.repeat(sol.calificacion)}{'☆'.repeat(5 - sol.calificacion)}</span>
                            {sol.comentario_cal && <span style={{ color:'var(--text2)', fontStyle:'italic' }}>"{sol.comentario_cal}"</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {selectedEquipo && <EquipoDetalleModal equipo={selectedEquipo} onClose={() => { setSelectedEquipo(null); setRequestError(''); setRequestStatus('') }} onRequestSuccess={handleSolicitudCreada} />}
      {chatSolicitud && <ChatModal solicitud={chatSolicitud} onClose={() => setChatSolicitud(null)} />}
    </DashboardShell>
  )
}
