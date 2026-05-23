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
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

export const authAPI = {
  login:    (email, password) => request('POST', '/auth/login', { email, password }),
  register: (nombre, apellido, email, password, telefono) =>
    request('POST', '/auth/register', { nombre, apellido, email, password, telefono }),
}

export const usersAPI = {
  listar:   ()         => request('GET',    '/users'),
  ver:      (id)       => request('GET',    `/users/${id}`),
  crear:    (data)     => request('POST',   '/users', data),
  editar:   (id, data) => request('PUT',    `/users/${id}`, data),
  eliminar: (id)       => request('DELETE', `/users/${id}`),
}

export const equiposAPI = {
  listar:     ()              => request('GET',    '/equipos'),
  pendientes: ()              => request('GET',    '/equipos/pendientes'),
  ver:        (id)            => request('GET',    `/equipos/${id}`),
  crear:      (data)          => request('POST',   '/equipos', data),
  editar:     (id, data)      => request('PUT',    `/equipos/${id}`, data),
  eliminar:   (id)            => request('DELETE', `/equipos/${id}`),
  validar:    (id, accion, motivo) => request('PATCH', `/equipos/${id}/validar`, { accion, motivo }),
}