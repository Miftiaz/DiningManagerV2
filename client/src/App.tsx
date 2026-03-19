import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import Layout from "./components/layout"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import ManageBorder from "./pages/ManageBorder"
import ManageFeastToken from "./pages/ManageFeastToken"
import Transactions from "./pages/Transactions"
import AdjustDiningMonth from "./pages/AdjustDiningMonth"
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

export function App() {
  const isAuthenticated = !!localStorage.getItem('token')

  return (
    <>
      <Router>
        <Routes>
          {/* Public routes (without sidebar) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes (with sidebar) */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/manage-border" element={<ManageBorder />} />
            <Route path="/manage-feast-token" element={<ManageFeastToken />} />
            <Route path="/adjust-dining-month" element={<AdjustDiningMonth />} />
            <Route path="/transactions" element={<Transactions />} />
            {/* Add more routes here */}
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}

export default App
