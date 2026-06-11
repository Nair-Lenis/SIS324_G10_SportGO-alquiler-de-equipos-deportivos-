import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { id, nombre, email, rol }
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)   // cargando sesión guardada

  // Al montar: recuperar sesión guardada en localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('sportgo_token')
    const savedUser  = localStorage.getItem('sportgo_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  async function login(email, password) {
    const data = await authAPI.login(email, password)
    localStorage.setItem('sportgo_token', data.token)
    localStorage.setItem('sportgo_user',  JSON.stringify({
      id:     data.id,
      nombre: data.nombre,
      rol:    data.rol,
    }))
    setToken(data.token)
    setUser({ id: data.id, nombre: data.nombre, rol: data.rol })
    return data // contiene redirect
  }

  async function register(nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad, provincia) {
    return await authAPI.register(nombre, apellido, email, password, telefono, whatsapp, departamento, ciudad, provincia)
  }

  function updateUser(updates) {
    const updated = { ...user, ...updates }
    localStorage.setItem('sportgo_user', JSON.stringify(updated))
    setUser(updated)
  }

  function logout() {
    localStorage.removeItem('sportgo_token')
    localStorage.removeItem('sportgo_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar el contexto fácilmente
export function useAuth() {
  return useContext(AuthContext)
}
