import { Routes, Route } from 'react-router-dom'
import { SocketIOProvider } from './contexts/SocketIOContext'
import { AuthProvider } from './contexts/AuthContext'
import Home from './routes/home'
import Chat from './routes/chat'
import Auth from './routes/auth'

function App() {
  return (
    <AuthProvider>
      <SocketIOProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </SocketIOProvider>
    </AuthProvider>
  )
}

export default App 