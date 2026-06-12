import { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import ChatModal from '../../components/ChatModal'
import MapLocationPicker from '../../components/MapLocationPicker'
import { useAuth } from '../../context/AuthContext'
import { equiposAPI, solicitudesAPI, usersAPI } from '../../api/client'

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

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function getBrowserLocation() {
  if (!navigator.geolocation) throw new Error('Tu navegador no soporta geolocalización.')
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(new Error(err.message || 'No se pudo obtener la ubicación.')),
      { timeout: 15000 }
    )
  })
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo obtener la dirección desde la ubicación.')
  const data = await res.json()
  const address = data.address || {}
  const parts = [address.city, address.town, address.village, address.state, address.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
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
    lat:         equipo?.lat         || null,
    lng:         equipo?.lng         || null,
    fotos:       equipo?.fotos       || [],
  })
  const [error, setError]             = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading]         = useState(false)
  const [geoLoading, setGeoLoading]   = useState(false)
  const [geoError, setGeoError]       = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    const nextFieldErrors = {}
    if (!form.titulo?.trim())      nextFieldErrors.titulo      = 'El título es obligatorio.'
    if (!form.descripcion?.trim()) nextFieldErrors.descripcion = 'La descripción es obligatoria.'
    if (!form.precio_dia)          nextFieldErrors.precio_dia  = 'El precio por día es obligatorio.'
    if (!form.ubicacion?.trim())   nextFieldErrors.ubicacion   = 'La ubicación es obligatoria.'
    if (isNew && !form.fotos?.length) nextFieldErrors.fotos = 'Agrega al menos una foto del equipo.'

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Corrige los campos marcados antes de continuar.')
      return
    }

    setFieldErrors({})
    setError('')
    setLoading(true)
    try {
      if (isNew) await equiposAPI.crear(form)
      else       await equiposAPI.editar(equipo.id, form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Error inesperado al guardar el equipo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
      overflowY:'auto', padding:'1rem' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'480px',
        maxHeight:'calc(100vh - 2rem)', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>

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

        <input style={{
            ...inputStyle,
            borderColor: fieldErrors.titulo ? '#f87171' : 'var(--border)'
          }}
          placeholder="Título del equipo *" value={form.titulo} onChange={set('titulo')} />
        {fieldErrors.titulo && <div style={{ color:'#f87171', fontSize:'0.8rem', margin:'-0.5rem 0 0.75rem' }}>{fieldErrors.titulo}</div>}

        <textarea style={{ ...inputStyle, resize:'vertical', minHeight:'80px',
            borderColor: fieldErrors.descripcion ? '#f87171' : 'var(--border)'
          }}
          placeholder="Descripción detallada *" value={form.descripcion} onChange={set('descripcion')} />
        {fieldErrors.descripcion && <div style={{ color:'#f87171', fontSize:'0.8rem', margin:'-0.5rem 0 0.75rem' }}>{fieldErrors.descripcion}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <select style={inputStyle} value={form.categoria} onChange={set('categoria')}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
          </select>
          <div style={{ width:'100%' }}>
            <input style={{
              ...inputStyle,
              borderColor: fieldErrors.precio_dia ? '#f87171' : 'var(--border)'
            }} type="number" placeholder="Precio/día (Bs.) *"
              value={form.precio_dia} onChange={set('precio_dia')} min="1" />
            {fieldErrors.precio_dia && <div style={{ color:'#f87171', fontSize:'0.8rem', margin:'-0.5rem 0 0.75rem' }}>{fieldErrors.precio_dia}</div>}
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', flexDirection:'column' }}>
          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', marginBottom:'0.4rem' }}>
            Ubicación *
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'0.75rem' }}>
            <input style={{ ...inputStyle }} placeholder="Buscar ubicación" value={form.ubicacion} onChange={set('ubicacion')} />
            {fieldErrors.ubicacion && <div style={{ color:'#f87171', fontSize:'0.8rem', margin:'-0.5rem 0 0.75rem' }}>{fieldErrors.ubicacion}</div>}
            <MapLocationPicker
              value={form.ubicacion}
              coordinates={form.lat && form.lng ? { lat: form.lat, lng: form.lng } : null}
              onChange={({ address, lat, lng }) => setForm(f => ({ ...f, ubicacion: address, lat, lng }))}
            />
          </div>
        </div>

        <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', marginBottom:'0.4rem' }}>Fotos del equipo <span style={{ fontWeight:400, textTransform:'none' }}>(mínimo 1)</span></label>
        <input style={{ ...inputStyle, padding:'0.55rem 0.75rem', borderColor: fieldErrors.fotos ? '#f87171' : 'var(--border)' }} type="file" accept="image/*" multiple onChange={async e => {
          const files = Array.from(e.target.files || [])
          if (files.length === 0) return
          const fotos = await Promise.all(files.map(fileToDataUrl))
          setForm(f => ({ ...f, fotos: [...(f.fotos || []), ...fotos] }))
        }} />
        {fieldErrors.fotos && <div style={{ color:'#f87171', fontSize:'0.8rem', margin:'0.35rem 0 0.75rem' }}>{fieldErrors.fotos}</div>}

        {form.fotos.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginBottom:'0.75rem' }}>
            {form.fotos.map((src, idx) => (
              <div key={idx} style={{ position:'relative', width:'72px', height:'72px', borderRadius:'14px', overflow:'hidden', border:'1px solid var(--border)' }}>
                <img src={src} alt={`Foto ${idx + 1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <button type="button" onClick={() => setForm(f => ({
                  ...f,
                  fotos: f.fotos.filter((_, i) => i !== idx)
                }))} style={{
                  position:'absolute', top:'6px', right:'6px', background:'rgba(0,0,0,0.65)',
                  border:'none', width:'22px', height:'22px', borderRadius:'999px', color:'#fff', cursor:'pointer'
                }}>×</button>
              </div>
            ))}
          </div>
        )}

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
  const { user, updateUser } = useAuth()
  const [equipos, setEquipos]         = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [profile, setProfile]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [modal, setModal]             = useState(null)
  const [chatSolicitud, setChatSolicitud] = useState(null)
  const [activeSection, setActiveSection] = useState('equipos')
  const [profileStatus, setProfileStatus] = useState('')
  const [profileError, setProfileError]   = useState('')
  const [solicitudesLoading, setSolicitudesLoading] = useState(false)
  const [solicitudesError, setSolicitudesError]     = useState('')

  const departamentosBolivia = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija']

  async function cargarEquipos() {
    setError('')
    setLoading(true)
    try   { setEquipos(await equiposAPI.listar()) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function cargarSolicitudes() {
    setSolicitudesError('')
    setSolicitudesLoading(true)
    try   { setSolicitudes(await solicitudesAPI.recibidas()) }
    catch (err) { setSolicitudesError(err.message) }
    finally { setSolicitudesLoading(false) }
  }

  async function cargarPerfil() {
    setProfileError('')
    try {
      const data = await usersAPI.ver(user.id)
      setProfile(data)
    } catch (err) {
      setProfileError(err.message)
    }
  }

  useEffect(() => { cargarEquipos(); cargarPerfil() }, [])

  useEffect(() => {
    if (activeSection === 'solicitudes') cargarSolicitudes()
  }, [activeSection])

  async function handleEliminar(id, titulo) {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return
    try   { await equiposAPI.eliminar(id); cargarEquipos() }
    catch (err) { alert(err.message) }
  }

  async function handlePerfilSave() {
    if (!profile) return
    setProfileStatus('')
    setProfileError('')
    try {
      await usersAPI.editar(user.id, {
        nombre: profile.nombre,
        apellido: profile.apellido,
        email: profile.email,
        telefono: profile.telefono,
        whatsapp: profile.whatsapp,
        departamento: profile.departamento,
        ciudad: profile.ciudad,
        provincia: profile.provincia,
        bio: profile.bio,
      })
      updateUser({ nombre: profile.nombre })
      setProfileStatus('Perfil actualizado correctamente.')
    } catch (err) {
      setProfileError(err.message)
    }
  }

  async function responderSolicitud(solicitudId, accion) {
    if (accion === 'rechazar') {
      const motivo = prompt('Indica el motivo de rechazo (mínimo 10 caracteres):')
      if (!motivo || motivo.trim().length < 10) {
        alert('Motivo de rechazo inválido.')
        return
      }
      try {
        await solicitudesAPI.responder(solicitudId, { accion, motivo })
        cargarSolicitudes()
      } catch (err) {
        alert(err.message)
      }
      return
    }

    if (accion === 'aceptar') {
      try {
        await solicitudesAPI.responder(solicitudId, { accion })
        cargarSolicitudes()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  async function marcarDevuelta(solicitudId) {
    if (!confirm('¿Marcar la solicitud como devuelta?')) return
    try {
      await solicitudesAPI.devolver(solicitudId)
      cargarSolicitudes()
    } catch (err) {
      alert(err.message)
    }
  }

  const LIMITE_FREE = 3
  const esPremium = profile?.plan === 'premium'
  const limiteAlcanzado = !esPremium && equipos.length >= LIMITE_FREE

  const stats = [
    { label: 'Mis equipos',  value: equipos.length },
    { label: 'Aprobados',    value: equipos.filter(e => e.estado_val === 'aprobado').length },
    { label: 'Pendientes',   value: equipos.filter(e => e.estado_val === 'pendiente').length },
    { label: 'Rechazados',   value: equipos.filter(e => e.estado_val === 'rechazado').length },
  ]

  const countsByCategory = CATEGORIAS.reduce((acc, cat) => ({
    ...acc,
    [cat]: equipos.filter(e => e.categoria === cat).length,
  }), {})

  const totalPotential = equipos.reduce((sum, eq) => sum + Number(eq.precio_dia || 0), 0)
  const approvedEarnings = equipos.filter(eq => eq.estado_val === 'aprobado').reduce((sum, eq) => sum + Number(eq.precio_dia || 0), 0)
  const movementItems = equipos.map((eq, idx) => ({
    id: eq.id || idx,
    title: eq.titulo,
    amount: `Bs. ${eq.precio_dia || 0}`,
    status: eq.estado_val === 'aprobado' ? 'Ingreso activo' : eq.estado_val === 'pendiente' ? 'Pendiente' : 'Rechazado',
  }))

  return (
    <DashboardShell
      title={`Bienvenido, ${user?.nombre}`}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      badge={profile?.estado === 'activo' ? 'Cuenta activa' : 'Cuenta inactiva'}
    >

      <div className="hero-panel">
        <div>
          <div style={{ color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.12em', fontSize:'0.78rem', marginBottom:'0.75rem' }}>Resumen rápido</div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:'2rem', marginBottom:'0.75rem' }}>Tu inventario de alquiler</h2>
          <p style={{ color:'var(--text2)', lineHeight:1.8, maxWidth:'620px' }}>Administra tus publicaciones con claridad, revisa solicitudes y mantén tu perfil al día para atraer más reservas.</p>
          <div className="dashboard-metrics" style={{ marginTop:'1rem' }}>
            <div style={{ background:'rgba(0,128,128,0.12)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Ingresos/día</div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--teal)' }}>Bs. {totalPotential}</div>
            </div>
            <div style={{ background:'rgba(112,128,144,0.15)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Solicitudes</div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--slate)' }}>{solicitudes.length || 0}</div>
            </div>
          </div>
        </div>
        <img src="/images/dashboard-hero.svg" alt="Resumen del inventario" className="hero-illustration" />
      </div>

      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            {esPremium ? (
              <span style={{ background:'rgba(250,204,21,0.15)', border:'1px solid rgba(250,204,21,0.4)', color:'#facc15', borderRadius:'999px', padding:'0.35rem 0.9rem', fontSize:'0.8rem', fontWeight:700 }}>
                ⭐ Plan Premium — equipos ilimitados
              </span>
            ) : (
              <span style={{ background:'rgba(112,128,144,0.15)', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:'999px', padding:'0.35rem 0.9rem', fontSize:'0.8rem' }}>
                Plan Gratuito: {equipos.length}/3 equipos
              </span>
            )}
          </div>
          <button
            onClick={() => limiteAlcanzado ? alert('Has alcanzado el límite de 3 equipos del plan gratuito.\nContacta al administrador para activar el plan Premium.') : setModal('new')}
            style={{ padding:'0.9rem 1.5rem', borderRadius:'12px', background: limiteAlcanzado ? 'rgba(112,128,144,0.3)' : 'var(--teal)', color: limiteAlcanzado ? 'var(--text2)' : '#fff', border:'none', cursor: limiteAlcanzado ? 'not-allowed' : 'pointer', fontWeight:700 }}>
            {limiteAlcanzado ? '🔒 Límite alcanzado' : '+ Publicar equipo'}
          </button>
        </div>
        {limiteAlcanzado && (
          <div style={{ background:'rgba(250,204,21,0.08)', border:'1px solid rgba(250,204,21,0.3)', borderRadius:'12px', padding:'0.875rem 1rem', marginBottom:'1rem', fontSize:'0.875rem', color:'#facc15' }}>
            ⚠️ Alcanzaste el límite de <strong>3 equipos gratuitos</strong>. Contacta al administrador para activar el <strong>Plan Premium</strong> y publicar equipos ilimitados.
          </div>
        )}

        <section>
          {error && <p style={{ color:'#f87171', marginBottom:'1rem' }}>{error}</p>}

          {activeSection === 'equipos' && (
            <>
              {loading ? (
                <p style={{ color:'var(--text2)' }}>Cargando equipos...</p>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'1rem' }}>
                    <h2 style={{ fontSize:'1.4rem', margin:0 }}>Mis equipos</h2>
                  </div>

                  {equipos.length === 0 ? (
                    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
                      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🏅</div>
                      <p>Aún no publicaste ningún equipo.</p>
                      <button onClick={() => setModal('new')} style={{ marginTop:'1rem', background:'var(--teal)', border:'none', borderRadius:'8px', padding:'0.6rem 1.5rem', color:'#fff', fontWeight:600, cursor:'pointer' }}>
                        Publicar mi primer equipo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
                      {equipos.map(eq => {
                        const est = ESTADO_STYLE[eq.estado_val] || {}
                        const imgSrc = (eq.fotos && eq.fotos.length > 0) ? eq.fotos[0] : CAT_IMAGE[eq.categoria] || '/images/otro.svg'
                        return (
                          <div key={eq.id} className="dashboard-card">
                            <div style={{ position:'relative' }}>
                              <img src={imgSrc} alt={eq.categoria} />
                              <span className="dashboard-badge" style={{ position:'absolute', top:'14px', right:'14px', background:est.bg, color:est.text, border:`1px solid ${est.text}30` }}>
                                {est.label || eq.estado_val}
                              </span>
                            </div>

                            <div className="dashboard-card-body">
                              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                                <span style={{ fontSize:'1.3rem' }}>{CAT_EMOJI[eq.categoria] || '🏅'}</span>
                                <div style={{ fontWeight:700, fontSize:'1.05rem' }}>{eq.titulo}</div>
                              </div>
                              <div style={{ fontSize:'0.87rem', color:'var(--text2)', lineHeight:1.6 }}>
                                {eq.categoria} · 📍 {eq.ubicacion || 'Sin ubicación'}
                              </div>
                              {eq.estado_val === 'rechazado' && eq.motivo_rechazo && (
                                <div style={{ fontSize:'0.78rem', color:'#f87171', background:'rgba(220,50,50,0.08)', borderRadius:'12px', padding:'0.7rem 0.9rem' }}>
                                  Motivo: {eq.motivo_rechazo}
                                </div>
                              )}
                            </div>

                            <div className="dashboard-card-footer">
                              <div style={{ fontFamily:'var(--font-head)', fontSize:'1.35rem', color:'var(--teal)' }}>
                                Bs. {eq.precio_dia}/día
                              </div>
                              <div style={{ display:'flex', gap:'0.65rem' }}>
                                <button onClick={() => setModal(eq)} className="dashboard-button secondary">
                                  Editar
                                </button>
                                <button onClick={() => handleEliminar(eq.id, eq.titulo)} className="dashboard-button secondary" style={{ color:'#f87171', borderColor:'rgba(239,68,68,0.3)' }}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeSection === 'solicitudes' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'1rem' }}>
                <div>
                  <h2 style={{ fontSize:'1.4rem', margin:0 }}>Solicitudes recibidas</h2>
                  <p style={{ color:'var(--text2)', margin: '0.5rem 0 0' }}>Responde rápidamente a los arrendatarios y mantén tu inventario bajo control.</p>
                </div>
                <span style={{ borderRadius:'999px', padding:'0.65rem 1rem', background:'rgba(0,128,128,0.1)', color:'var(--teal)', fontWeight:700, fontSize:'0.85rem' }}>
                  {solicitudes.length || 0} solicitudes
                </span>
              </div>

              {solicitudesLoading && <p style={{ color:'var(--text2)' }}>Cargando solicitudes...</p>}
              {solicitudesError && <p style={{ color:'#f87171' }}>{solicitudesError}</p>}

              {!solicitudesLoading && solicitudes.length === 0 && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'3rem', textAlign:'center', color:'var(--text2)' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📩</div>
                  <p>No hay solicitudes nuevas en este momento.</p>
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
                        <div><strong>Arrendatario:</strong> {sol.arrendatario_nombre}</div>
                        <div><strong>WhatsApp:</strong> {sol.arrendatario_whatsapp || 'No disponible'}</div>
                        <div><strong>Teléfono:</strong> {sol.arrendatario_telefono || 'No disponible'}</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
                        <div><strong>Inicio:</strong> {new Date(sol.fecha_inicio).toLocaleDateString()}</div>
                        <div><strong>Fin:</strong> {new Date(sol.fecha_fin).toLocaleDateString()}</div>
                        {sol.motivo_rechazo && <div><strong>Motivo rechazo:</strong> {sol.motivo_rechazo}</div>}
                      </div>
                      {sol.mensaje && <p style={{ color:'var(--text2)', margin:0 }}><strong>Mensaje:</strong> {sol.mensaje}</p>}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginTop:'0.75rem' }}>
                        {sol.estado === 'pendiente' && (
                          <>
                            <button onClick={() => responderSolicitud(sol.id, 'aceptar')} style={{ background:'var(--teal)', border:'none', borderRadius:'8px', color:'#fff', padding:'0.75rem 1rem', cursor:'pointer' }}>
                              Aceptar
                            </button>
                            <button onClick={() => responderSolicitud(sol.id, 'rechazar')} style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'8px', color:'#f87171', padding:'0.75rem 1rem', cursor:'pointer' }}>
                              Rechazar
                            </button>
                          </>
                        )}
                        {sol.estado === 'aceptada' && (
                          <button onClick={() => marcarDevuelta(sol.id)} style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.35)', borderRadius:'8px', color:'var(--teal)', padding:'0.75rem 1rem', cursor:'pointer' }}>
                            Marcar como devuelta
                          </button>
                        )}
                        <button onClick={() => setChatSolicitud(sol)}
                          style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', padding:'0.75rem 1rem', cursor:'pointer' }}>
                          💬 Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'perfil' && (
            <div style={{ display:'grid', gap:'1rem' }}>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem' }}>
                <h2 style={{ fontSize:'1.4rem', margin:0 }}>Mi perfil</h2>
                <p style={{ color:'var(--text2)', margin:'0.75rem 0 0' }}>Actualiza tus datos de contacto y ubicación para que los arrendatarios puedan encontrarte con facilidad.</p>
              </div>

              {profileError && <div style={{ color:'#f87171' }}>{profileError}</div>}
              {profileStatus && <div style={{ color:'var(--teal)' }}>{profileStatus}</div>}
              {!profile ? (
                <p style={{ color:'var(--text2)' }}>Cargando perfil...</p>
              ) : (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Nombre</label>
                      <input value={profile.nombre} onChange={e => setProfile(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Apellido</label>
                      <input value={profile.apellido} onChange={e => setProfile(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Email</label>
                      <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Teléfono</label>
                      <input value={profile.telefono || ''} onChange={e => setProfile(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>WhatsApp</label>
                      <input value={profile.whatsapp || ''} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Provincia</label>
                      <input value={profile.provincia || ''} onChange={e => setProfile(p => ({ ...p, provincia: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Departamento</label>
                      <select value={profile.departamento || ''} onChange={e => setProfile(p => ({ ...p, departamento: e.target.value }))} style={inputStyle}>
                        {departamentosBolivia.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Ciudad</label>
                      <input value={profile.ciudad || ''} onChange={e => setProfile(p => ({ ...p, ciudad: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>

                  <label style={{ color:'var(--text2)', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block' }}>Bio</label>
                  <textarea value={profile.bio || ''} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} style={{ ...inputStyle, minHeight:'100px', resize:'vertical' }} />

                  <button onClick={handlePerfilSave} style={{ background:'var(--teal)', border:'none', borderRadius:'8px', color:'#fff', padding:'0.9rem 1.2rem', fontWeight:700, cursor:'pointer' }}>
                    Guardar perfil
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {modal && (
        <ModalEquipo
          equipo={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargarEquipos() }}
        />
      )}
      {chatSolicitud && <ChatModal solicitud={chatSolicitud} onClose={() => setChatSolicitud(null)} />}
    </DashboardShell>
  )
}
