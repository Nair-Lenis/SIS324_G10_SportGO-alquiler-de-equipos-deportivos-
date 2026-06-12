import { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import { usersAPI, equiposAPI } from '../../api/client'

const PLAN_COLOR = {
  premium: { bg:'rgba(250,204,21,0.15)', text:'#facc15' },
  free:    { bg:'rgba(112,128,144,0.15)', text:'var(--text2)' },
}

const ROL_COLOR = {
  admin:        { bg:'rgba(210,105,30,0.15)',  text:'var(--rust)' },
  propietario:  { bg:'rgba(0,128,128,0.15)',   text:'var(--teal)' },
  arrendatario: { bg:'rgba(112,128,144,0.15)', text:'var(--slate)' },
}
const ESTADO_COLOR = {
  activo:   { bg:'rgba(34,197,94,0.12)',  text:'#4ade80' },
  inactivo: { bg:'rgba(239,68,68,0.12)',  text:'#f87171' },
}
const EVAL_COLOR = {
  pendiente: { bg:'rgba(234,179,8,0.15)',  text:'#facc15' },
  aprobado:  { bg:'rgba(34,197,94,0.12)',  text:'#4ade80' },
  rechazado: { bg:'rgba(239,68,68,0.12)', text:'#f87171' },
}

function Badge({ text, colorMap }) {
  const c = colorMap[text] || { bg:'#333', text:'#aaa' }
  return (
    <span style={{ background:c.bg, color:c.text, borderRadius:'999px', padding:'2px 10px',
      fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
      {text}
    </span>
  )
}

const inputStyle = {
  width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
  borderRadius:'8px', padding:'0.6rem 0.875rem', color:'var(--text)',
  fontSize:'0.9rem', marginBottom:'0.75rem',
}

function ModalUsuario({ user, onClose, onSaved }) {
  const isNew = !user?.id
  const [form, setForm] = useState({
    nombre: user?.nombre || '', apellido: user?.apellido || '',
    email: user?.email || '', password: '',
    telefono: user?.telefono || '', rol: user?.rol || 'arrendatario',
    estado: user?.estado || 'activo',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setError(''); setLoading(true)
    try {
      if (isNew) {
        if (!form.password) { setError('La contraseña es requerida.'); setLoading(false); return }
        await usersAPI.crear(form)
      } else {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await usersAPI.editar(user.id, payload)
      }
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'440px' }}>
        <h2 style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', marginBottom:'1.25rem' }}>
          {isNew ? 'Nuevo usuario' : 'Editar usuario'}
        </h2>
        {error && <div style={{ color:'#f87171', fontSize:'0.875rem', marginBottom:'0.75rem',
          background:'rgba(220,50,50,0.1)', padding:'0.5rem 0.75rem', borderRadius:'6px' }}>{error}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <input style={inputStyle} placeholder="Nombre"   value={form.nombre}   onChange={set('nombre')} />
          <input style={inputStyle} placeholder="Apellido" value={form.apellido} onChange={set('apellido')} />
        </div>
        <input style={inputStyle} type="email"    placeholder="Email"  value={form.email}    onChange={set('email')} />
        <input style={inputStyle} type="password" placeholder={isNew ? 'Contraseña' : 'Nueva contraseña (opcional)'} value={form.password} onChange={set('password')} />
        <input style={inputStyle} placeholder="Teléfono (opcional)" value={form.telefono} onChange={set('telefono')} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <select style={inputStyle} value={form.rol}    onChange={set('rol')}>
            <option value="arrendatario">Arrendatario</option>
            <option value="propietario">Propietario</option>
            <option value="admin">Admin</option>
          </select>
          <select style={inputStyle} value={form.estado} onChange={set('estado')}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'0.7rem', color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} style={{ flex:1, background:'var(--teal)',
            border:'none', borderRadius:'8px', padding:'0.7rem', color:'#fff', fontWeight:600, cursor:'pointer' }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalValidar({ equipo, onClose, onSaved }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAccion(accion) {
    if (accion === 'rechazar' && !motivo.trim()) { setError('El motivo es obligatorio para rechazar.'); return }
    setError(''); setLoading(true)
    try   { await equiposAPI.validar(equipo.id, accion, motivo); onSaved() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:'460px' }}>
        <h2 style={{ fontFamily:'var(--font-head)', fontSize:'1.6rem', marginBottom:'0.5rem' }}>
          Validar equipo
        </h2>
        <p style={{ color:'var(--text2)', fontSize:'0.9rem', marginBottom:'1.25rem' }}>{equipo.titulo}</p>

        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'8px',
          padding:'0.875rem', marginBottom:'1.25rem', fontSize:'0.875rem', lineHeight:1.6 }}>
          <div><strong>Propietario:</strong> {equipo.propietario_nombre}</div>
          <div><strong>Categoría:</strong> {equipo.categoria}</div>
          <div><strong>Precio:</strong> Bs. {equipo.precio_dia}/día</div>
          <div><strong>Descripción:</strong> {equipo.descripcion}</div>
          {equipo.ubicacion && <div><strong>Ubicación:</strong> {equipo.ubicacion}</div>}
        </div>

        {error && <div style={{ color:'#f87171', background:'rgba(220,50,50,0.1)',
          borderRadius:'6px', padding:'0.5rem 0.75rem', fontSize:'0.875rem', marginBottom:'0.75rem' }}>{error}</div>}

        <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase',
          letterSpacing:'0.08em', color:'var(--text2)', marginBottom:'0.4rem' }}>
          Motivo de rechazo (requerido si rechazás)
        </label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Ej: Las imágenes no son claras, el precio es incorrecto..."
          style={{ ...inputStyle, resize:'vertical', minHeight:'70px' }} />

        <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:'1px solid var(--border)',
            borderRadius:'8px', padding:'0.7rem', color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={() => handleAccion('rechazar')} disabled={loading} style={{ flex:1,
            background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)',
            borderRadius:'8px', padding:'0.7rem', color:'#f87171', fontWeight:600, cursor:'pointer' }}>
            Rechazar
          </button>
          <button onClick={() => handleAccion('aprobar')} disabled={loading} style={{ flex:1,
            background:'var(--teal)', border:'none', borderRadius:'8px', padding:'0.7rem',
            color:'#fff', fontWeight:600, cursor:'pointer' }}>
            Aprobar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardAdmin() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [users, setUsers]       = useState([])
  const [equipos, setEquipos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [modalUser, setModalUser]     = useState(null)
  const [modalEquipo, setModalEquipo] = useState(null)

  async function cargarUsuarios() {
    setLoading(true)
    try   { setUsers(await usersAPI.listar()) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function cargarEquipos() {
    setLoading(true)
    try   { setEquipos(await equiposAPI.listar()) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargarUsuarios(); cargarEquipos() }, [])

  function handleSection(s) {
    setActiveSection(s); setError('')
    if (s === 'usuarios') cargarUsuarios()
    else if (s === 'equipos') cargarEquipos()
    else { cargarUsuarios(); cargarEquipos() }
  }

  async function handleEliminarUser(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    try   { await usersAPI.eliminar(id); cargarUsuarios() }
    catch (err) { alert(err.message) }
  }

  async function handleCambiarPlan(u) {
    const nuevoPlan = u.plan === 'premium' ? 'free' : 'premium'
    const msg = nuevoPlan === 'premium'
      ? `¿Activar Plan Premium para ${u.nombre}? Podrá publicar equipos ilimitados.`
      : `¿Quitar Plan Premium a ${u.nombre}? Volverá al límite de 3 equipos.`
    if (!confirm(msg)) return
    try { await usersAPI.cambiarPlan(u.id, nuevoPlan); cargarUsuarios() }
    catch (err) { alert(err.message) }
  }

  async function handleEliminarEquipo(id, titulo) {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return
    try   { await equiposAPI.eliminar(id); cargarEquipos() }
    catch (err) { alert(err.message) }
  }

  const pendientes = equipos.filter(e => e.estado_val === 'pendiente')

  return (
    <DashboardShell title="Panel de administración" activeSection={activeSection} onSectionChange={handleSection}>

      <div className="hero-panel">
        <div>
          <div style={{ color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.12em', fontSize:'0.78rem', marginBottom:'0.75rem' }}>Visión general</div>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:'2rem', marginBottom:'0.75rem' }}>Gestión centralizada para tu plataforma</h2>
          <p style={{ color:'var(--text2)', lineHeight:1.8, maxWidth:'620px' }}>Revisa usuarios, controla publicaciones y valida solicitudes pendientes desde un dashboard claro. Toma decisiones rápidas con métricas actualizadas.</p>
          <div className="dashboard-metrics" style={{ marginTop:'1rem' }}>
            <div style={{ background:'rgba(0,128,128,0.15)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Pendientes</div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--teal)' }}>{pendientes.length || '0'}</div>
            </div>
            <div style={{ background:'rgba(210,105,30,0.15)', borderRadius:'18px', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Usuarios inactivos</div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', color:'var(--rust)' }}>{users.filter(u => u.estado === 'inactivo').length || '0'}</div>
            </div>
          </div>
        </div>
        <img src="/images/dashboard-hero.svg" alt="Visión general del administrador" className="hero-illustration" />
      </div>

      {/* Stats */}
      <div className="dashboard-metrics" style={{ marginBottom:'2rem' }}>
        {[
          { label:'Total usuarios', value: users.length },
          { label:'Propietarios',   value: users.filter(u => u.rol === 'propietario').length },
          { label:'Equipos totales',value: equipos.length || '—' },
          { label:'⏳ Pendientes',   value: pendientes.length || equipos.filter(e=>e.estado_val==='pendiente').length || '—' },
          { label:'Inactivos',      value: users.filter(u => u.estado === 'inactivo').length },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'1.25rem' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--text2)', textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:'0.4rem' }}>{c.label}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {error   && <p style={{ color:'#f87171', marginBottom:'1rem' }}>{error}</p>}
      {loading && <p style={{ color:'var(--text2)' }}>Cargando...</p>}

      {/* ── SECCIÓN USUARIOS ── */}
      {activeSection === 'usuarios' && !loading && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <h2 style={{ fontSize:'1.2rem' }}>Usuarios ({users.length})</h2>
            <button onClick={() => setModalUser('new')} style={{ background:'var(--rust)', border:'none',
              borderRadius:'8px', padding:'0.55rem 1.25rem', color:'#fff', fontWeight:600,
              fontSize:'0.875rem', cursor:'pointer' }}>+ Nuevo usuario</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.9rem' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Nombre','Email','Teléfono','Rol','Plan','Estado','Acciones'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0.6rem 0.75rem',
                      color:'var(--text2)', fontWeight:600, fontSize:'0.75rem',
                      textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'0.75rem' }}><strong>{u.nombre} {u.apellido}</strong></td>
                    <td style={{ padding:'0.75rem', color:'var(--text2)' }}>{u.email}</td>
                    <td style={{ padding:'0.75rem', color:'var(--text2)' }}>{u.telefono || '—'}</td>
                    <td style={{ padding:'0.75rem' }}><Badge text={u.rol} colorMap={ROL_COLOR} /></td>
                    <td style={{ padding:'0.75rem' }}>
                      <Badge text={u.plan || 'free'} colorMap={PLAN_COLOR} />
                    </td>
                    <td style={{ padding:'0.75rem' }}><Badge text={u.estado} colorMap={ESTADO_COLOR} /></td>
                    <td style={{ padding:'0.75rem', display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                      <button onClick={() => setModalUser(u)} style={{ background:'transparent',
                        border:'1px solid var(--border)', borderRadius:'6px', padding:'0.3rem 0.75rem',
                        color:'var(--text2)', fontSize:'0.8rem', cursor:'pointer' }}>Editar</button>
                      {u.rol === 'propietario' && (
                        <button onClick={() => handleCambiarPlan(u)} style={{ background: u.plan === 'premium' ? 'rgba(250,204,21,0.15)' : 'rgba(250,204,21,0.08)',
                          border:'1px solid rgba(250,204,21,0.4)', borderRadius:'6px', padding:'0.3rem 0.75rem',
                          color:'#facc15', fontSize:'0.8rem', cursor:'pointer' }}>
                          {u.plan === 'premium' ? '⭐ Quitar Premium' : '⭐ Dar Premium'}
                        </button>
                      )}
                      <button onClick={() => handleEliminarUser(u.id, u.nombre)} style={{ background:'transparent',
                        border:'1px solid rgba(220,50,50,0.3)', borderRadius:'6px', padding:'0.3rem 0.75rem',
                        color:'#f87171', fontSize:'0.8rem', cursor:'pointer' }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── SECCIÓN EQUIPOS ── */}
      {activeSection === 'equipos' && !loading && (
        <>
          <h2 style={{ fontSize:'1.2rem', marginBottom:'1rem' }}>
            Equipos ({equipos.length}) —{' '}
            <span style={{ color:'#facc15' }}>{pendientes.length} pendientes</span>
          </h2>
          <div style={{ display:'grid', gap:'0.75rem' }}>
            {equipos.map(eq => {
              const CAT_IMAGE = {
                'Ciclismo':'/images/ciclismo.svg','Acuático':'/images/acuatico.svg',
                'Invierno':'/images/invierno.svg','Trail/Senderismo':'/images/trail.svg','Otro':'/images/otro.svg'
              }
              return (
              <div key={eq.id} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
                borderRadius:'var(--radius)', padding:'1rem 1.25rem',
                display:'flex', alignItems:'center', gap:'1rem' }}>
                {/* Miniatura de categoría */}
                <div style={{ width:'60px', height:'60px', borderRadius:'8px', overflow:'hidden', flexShrink:0 }}>
                  <img src={CAT_IMAGE[eq.categoria] || '/images/otro.svg'} alt={eq.categoria}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{eq.titulo}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--text2)' }}>
                    {eq.propietario_nombre} · {eq.categoria} · Bs. {eq.precio_dia}/día
                  </div>
                  {eq.estado_val === 'rechazado' && eq.motivo_rechazo && (
                    <div style={{ fontSize:'0.78rem', color:'#f87171', marginTop:'3px' }}>
                      Motivo: {eq.motivo_rechazo}
                    </div>
                  )}
                </div>
                <Badge text={eq.estado_val} colorMap={EVAL_COLOR} />
                {eq.estado_val === 'pendiente' && (
                  <button onClick={() => setModalEquipo(eq)} style={{ background:'var(--teal)',
                    border:'none', borderRadius:'8px', padding:'0.4rem 0.875rem',
                    color:'#fff', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    Revisar
                  </button>
                )}
                <button onClick={() => handleEliminarEquipo(eq.id, eq.titulo)} style={{ background:'transparent',
                  border:'1px solid rgba(220,50,50,0.3)', borderRadius:'6px',
                  padding:'0.35rem 0.75rem', color:'#f87171', fontSize:'0.8rem', cursor:'pointer' }}>
                  Eliminar
                </button>
              </div>
              )
            })}
          </div>
        </>
      )}

      {modalUser && (
        <ModalUsuario
          user={modalUser === 'new' ? null : modalUser}
          onClose={() => setModalUser(null)}
          onSaved={() => { setModalUser(null); cargarUsuarios() }}
        />
      )}
      {modalEquipo && (
        <ModalValidar
          equipo={modalEquipo}
          onClose={() => setModalEquipo(null)}
          onSaved={() => { setModalEquipo(null); cargarEquipos() }}
        />
      )}
    </DashboardShell>
  )
}
