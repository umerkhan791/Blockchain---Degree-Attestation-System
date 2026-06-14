import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('dv-user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (userData) => {
    setUser(userData)
    sessionStorage.setItem(
      'dv-user',
      JSON.stringify(userData)
    )
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('dv-user')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoggedIn: !!user,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)