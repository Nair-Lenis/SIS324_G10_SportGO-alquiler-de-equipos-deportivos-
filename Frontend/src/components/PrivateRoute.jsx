import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// roles: array de roles permitidos, ej: ['admin'] o ['admin','propietario']
export default function PrivateRoute({ children, roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) return null // esperar a que se cargue la sesión

  if (!user) return <Navigate to="/register" replace />

  if (roles.length > 0 && !roles.includes(user.rol)) {
    // Redirigir al dashboard correcto si el rol no coincide
    const redirects = {
      admin:        '/dashboard/admin',
      propietario:  '/dashboard/propietario',
      arrendatario: '/dashboard/arrendatario',
    }
    return <Navigate to={redirects[user.rol] || '/login'} replace />
  }

  return children
}
