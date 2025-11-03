import './App.css'
import { Routes, Route } from 'react-router-dom'
import Homepage from './pages/Homepage'
import GameLobby from './pages/GameLobby'
import GameRoom from './pages/GameRoom'

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/lobby" element={<GameLobby />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
      </Routes>
    </div>
  )
}

export default App
