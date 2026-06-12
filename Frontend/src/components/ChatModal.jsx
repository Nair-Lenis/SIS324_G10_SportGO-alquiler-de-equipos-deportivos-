import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { mensajesAPI } from '../api/client'

export default function ChatModal({ solicitud, onClose }) {
  const { user } = useAuth()
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const bottomRef = useRef(null)

  async function cargar() {
    try {
      const data = await mensajesAPI.listar(solicitud.id)
      setMensajes(Array.isArray(data) ? data : [])
    } catch {}
  }

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 5000)
    return () => clearInterval(interval)
  }, [solicitud.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true); setError('')
    try {
      await mensajesAPI.enviar({ solicitud_id: solicitud.id, contenido: texto.trim() })
      setTexto('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const otroNombre = user.id === solicitud.arrendatario_id
    ? solicitud.propietario_nombre
    : solicitud.arrendatario_nombre

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:'520px', height:'80vh', display:'flex',
        flexDirection:'column', background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:'24px', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'1rem' }}>💬 Chat — {solicitud.equipo_titulo}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text2)' }}>con {otroNombre}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none',
            fontSize:'1.4rem', cursor:'pointer', color:'var(--text2)' }}>×</button>
        </div>

        {/* Mensajes */}
        <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex',
          flexDirection:'column', gap:'0.6rem' }}>
          {mensajes.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--text2)', marginTop:'2rem', fontSize:'0.9rem' }}>
              No hay mensajes aún. ¡Inicia la conversación!
            </div>
          )}
          {mensajes.map(m => {
            const esMio = m.remitente_id === user.id
            return (
              <div key={m.id} style={{ display:'flex',
                justifyContent: esMio ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'75%', padding:'0.6rem 0.9rem', borderRadius: esMio ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: esMio ? 'var(--teal)' : 'var(--bg)',
                  color: esMio ? '#fff' : 'var(--text)',
                  border: esMio ? 'none' : '1px solid var(--border)',
                  fontSize:'0.9rem', lineHeight:1.5,
                }}>
                  {!esMio && <div style={{ fontSize:'0.72rem', fontWeight:700, marginBottom:'0.25rem',
                    color:'var(--teal)' }}>{m.remitente_nombre}</div>}
                  <div>{m.contenido}</div>
                  <div style={{ fontSize:'0.65rem', marginTop:'0.25rem', opacity:0.7, textAlign:'right' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={enviar} style={{ padding:'0.875rem 1rem', borderTop:'1px solid var(--border)',
          display:'flex', gap:'0.6rem' }}>
          {error && <div style={{ color:'#f87171', fontSize:'0.8rem', width:'100%' }}>{error}</div>}
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={loading}
            style={{ flex:1, background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:'12px', padding:'0.65rem 1rem', color:'var(--text)', fontSize:'0.9rem' }}
          />
          <button type="submit" disabled={loading || !texto.trim()}
            style={{ background:'var(--teal)', border:'none', borderRadius:'12px',
              padding:'0.65rem 1.1rem', color:'#fff', fontWeight:700, cursor:'pointer',
              opacity: !texto.trim() ? 0.5 : 1 }}>
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
