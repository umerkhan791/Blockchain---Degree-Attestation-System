import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth()

  // Not logged in → go to login
  if (!isLoggedIn) return <Navigate to="/login" replace />

  // Admin trying to access student pages → go to admin dashboard
  if (isAdmin) return <Navigate to="/admin" replace />

  return children
}
