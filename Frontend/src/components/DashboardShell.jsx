import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mensajesAPI, solicitudesAPI } from '../api/client'

const ROL_LABEL = { admin: 'Administrador', propietario: 'Propietario', arrendatario: 'Arrendatario' }
const ROL_COLOR = { admin: 'var(--rust)', propietario: 'var(--teal)', arrendatario: 'var(--slate)' }

const ITEMS_BY_ROLE = {
  admin: [
    { icon: '📊', label: 'Dashboard', section: 'dashboard' },
    { icon: '🏋️', label: 'Equipos', section: 'equipos' },
    { icon: '👥', label: 'Usuarios', section: 'usuarios' },
  ],
  propietario: [
    { icon: '🏠', label: 'Mis Equipos', section: 'equipos' },
    { icon: '📋', label: 'Solicitudes', section: 'solicitudes' },
    { icon: '👤', label: 'Mi Perfil', section: 'perfil' },
  ],
  arrendatario: [
    { icon: '🔍', label: 'Explorar', section: 'explorar' },
    { icon: '📦', label: 'Mis Solicitudes', section: 'mis_solicitudes' },
    { icon: '🗓️', label: 'Historial', section: 'historial' },
  ],
}

const MOBILE_BREAKPOINT = 720

export default function DashboardShell({ title, activeSection, onSectionChange = () => {}, children, badge }) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sportgo_sidebar') === 'collapsed' }
    catch { return false }
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT)
  const [notifCount, setNotifCount] = useState(0)
  const lastCheckRef = useRef(localStorage.getItem('sportgo_last_check') || new Date(0).toISOString())

  useEffect(() => {
    if (!user?.id) return
    async function checkNotifs() {
      try {
        const msgs = await mensajesAPI.novistos(user.id)
        setNotifCount(msgs.total || 0)
      } catch {}
    }
    checkNotifs()
    const interval = setInterval(checkNotifs, 15000)
    return () => clearInterval(interval)
  }, [user?.id])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('sportgo_sidebar', collapsed ? 'collapsed' : 'expanded') }
    catch {}
  }, [collapsed])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const items = ITEMS_BY_ROLE[user?.rol] || []

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <aside style={{
        width: collapsed ? '64px' : '240px',
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease', overflow: 'hidden', position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1rem 1rem 1rem' }}>
            <button onClick={() => setCollapsed(c => !c)} style={{
              width: '38px', height: '38px', borderRadius: '12px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1.1rem'
            }}>☰</button>
            {!collapsed && (
              <Link to="/" style={{ textDecoration: 'none', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-head)', fontSize: '1.1rem' }}>
                <span>⚡</span>
                <span>SportGo</span>
              </Link>
            )}
          </div>

          <nav style={{ flex: 1, padding: '0 0.5rem' }}>
            {items.map(item => (
              <button key={item.section} onClick={() => onSectionChange(item.section)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.95rem 1rem', border: 'none', borderRadius: '14px',
                  background: activeSection === item.section ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                  color: activeSection === item.section ? 'var(--teal)' : 'var(--text)',
                  cursor: 'pointer', marginBottom: '0.4rem', textAlign: 'left'
                }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                {!collapsed && <span style={{ fontWeight: 600 }}>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: 'var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text)' }}>
                {user?.nombre?.[0] || 'U'}
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontWeight: 700 }}>{user?.nombre}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{ROL_LABEL[user?.rol]}</div>
                </div>
              )}
            </div>
            <button onClick={handleLogout} style={{
              width: '100%', marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer'
            }}>
              Salir
            </button>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          position: 'sticky', top: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '1rem', padding: '1rem 1.5rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem', color: 'var(--text)' }}>{title}</div>
            {badge && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16,185,129,0.12)', color: 'var(--teal)', padding: '0.4rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>{badge}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position:'relative' }}>
              <button onClick={() => onSectionChange(user?.rol === 'propietario' ? 'solicitudes' : 'mis_solicitudes')}
                title="Mensajes nuevos"
                style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'12px',
                  padding:'0.5rem 0.75rem', cursor:'pointer', fontSize:'1.1rem', color:'var(--text)' }}>
                💬
              </button>
              {notifCount > 0 && (
                <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444',
                  color:'#fff', borderRadius:'999px', fontSize:'0.65rem', fontWeight:700,
                  minWidth:'18px', height:'18px', display:'flex', alignItems:'center',
                  justifyContent:'center', padding:'0 4px' }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ROL_LABEL[user?.rol]}</span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
