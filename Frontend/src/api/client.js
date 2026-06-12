// Cliente HTTP centralizado para SportGo API
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

function getToken() {
  return localStorage.getItem('sportgo_token')
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : null,
    })
  } catch {
    throw new Error('No se puede conectar con el servidor.')
  }

  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      const trimmed = text.trim().slice(0, 30).toLowerCase()
      const htmlError = trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<!doctype html')
      data = { error: htmlError ? `Error ${res.status}: respuesta inesperada del servidor.` : text }
    }
  }

  if (!res.ok) throw new Error(data.error || text || `Error ${res.status}`)
  return data
}

export const authAPI = {
  login:    (email, password) => request('POST', '/auth/login', { email, password }),
  register: (nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad, provincia) =>
    request('POST', '/auth/register', { nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad, provincia }),
}

export const usersAPI = {
  listar:      ()           => request('GET',    '/users'),
  ver:         (id)         => request('GET',    `/users/${id}`),
  crear:       (data)       => request('POST',   '/users', data),
  editar:      (id, data)   => request('PUT',    `/users/${id}`, data),
  eliminar:    (id)         => request('DELETE', `/users/${id}`),
  cambiarPlan: (id, plan)   => request('POST',   '/setplan',     { userId: id, plan }),
}

export const equiposAPI = {
  listar:     ()              => request('GET',    '/equipos'),
  pendientes: ()              => request('GET',    '/equipos/pendientes'),
  ver:        (id)            => request('GET',    `/equipos/${id}`),
  crear:      (data)          => request('POST',   '/equipos', data),
  editar:     (id, data)      => request('PUT',    `/equipos/${id}`, data),
  eliminar:   (id)            => request('DELETE', `/equipos/${id}`),
  validar:    (id, accion, motivo) => request('PATCH', `/equipos/${id}/validar`, { accion, motivo }),
  reviews:    (id)            => request('GET',    `/equipos/${id}/reviews`),
  ocupado:    (id)            => request('GET',    `/equipos/${id}/ocupado`),
}

export const mensajesAPI = {
  listar:    (solicitudId) => request('GET',  `/mensajes/${solicitudId}`),
  enviar:    (data)        => request('POST', '/mensajes', data),
  novistos:  (userId)      => request('GET',  `/mensajes/novistos/${userId}`),
}

export const solicitudesAPI = {
  crear:     (data)          => request('POST',  '/solicitudes', data),
  mis:       ()              => request('GET',   '/solicitudes/mis'),
  recibidas: ()              => request('GET',   '/solicitudes/recibidas'),
  responder: (id, data)      => request('PATCH', `/solicitudes/${id}/responder`, data),
  devolver:  (id)            => request('PATCH', `/solicitudes/${id}/devolver`, {}),
  calificar: (id, data)      => request('PATCH', `/solicitudes/${id}/calificar`, data),
}