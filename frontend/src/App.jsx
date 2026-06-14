import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import HomePage       from './pages/HomePage'
import LoginPage      from './pages/LoginPage'
import UploadPage     from './pages/UploadPage'
import ResultPage     from './pages/ResultPage'
import VerifyPage     from './pages/VerifyPage'
import AdminDashboard from './pages/AdminDashboard'
import ReportPage     from './pages/ReportPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <Navbar />
            <Routes>

              {/* Public routes */}
              <Route path="/"            element={<HomePage />} />
              <Route path="/login"       element={<LoginPage />} />
              <Route path="/verify"      element={<VerifyPage />} />
              <Route path="/verify/:hash" element={<VerifyPage />} />

              {/* Student only routes */}
              <Route path="/upload" element={
                <ProtectedRoute><UploadPage /></ProtectedRoute>
              }/>
              <Route path="/result" element={
                <ProtectedRoute><ResultPage /></ProtectedRoute>
              }/>

              {/* Admin only routes */}
              <Route path="/admin" element={
                <AdminRoute><AdminDashboard /></AdminRoute>
              }/>
              <Route path="/report" element={
                <AdminRoute><ReportPage /></AdminRoute>
              }/>

              {/* Catch all — redirect home */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
