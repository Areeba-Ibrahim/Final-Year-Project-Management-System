import { Navigate } from 'react-router-dom'

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Case-insensitive check for admin role
  const role = (user.role || '').toLowerCase()

  if (!token || role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return children
}