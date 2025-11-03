import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import './GameLobby.css';

const GameLobby = () => {
    const [roomId, setRoomId] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const navigate = useNavigate();
    const { createRoom, joinRoom, room, error } = useGame();

    const username = localStorage.getItem('username') || 'Guest';

    useEffect(() => {
        if (!username || username === 'Guest') {
            navigate('/');
        }
    }, [username, navigate]);

    useEffect(() => {
        if (room?.id) {
            console.log('Room loaded, navigating to:', room.id);
            setShowJoinModal(false);
            navigate(`/room/${room.id}`);
        }
    }, [room, navigate]);

    const handleCreateRoom = () => {
        console.log('Creating room for:', username);
        createRoom(username);
    };

    const handleJoinRoom = () => {
        if (roomId.trim()) {
            console.log('Joining room:', roomId);
            joinRoom(roomId.toUpperCase(), username);
            setShowJoinModal(false);
        } else {
            alert('Please enter a room code');
        }
    };

    return (
        <div className="lobby">
            <div className="lobby-card">
                <div className="lobby-header">
                    <h1 className="lobby-title">Game Lobby</h1>
                    <p className="lobby-subtitle">Welcome, {username}!</p>
                </div>

                {error && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                <div className="lobby-actions">
                    <button onClick={handleCreateRoom} className="action-button primary">
                        <span className="button-icon">🎮</span>
                        <div className="button-content">
                            <div className="button-title">Create Room</div>
                            <div className="button-description">
                                Start a new game and invite friends
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="action-button secondary"
                    >
                        <span className="button-icon">🚪</span>
                        <div className="button-content">
                            <div className="button-title">Join Room</div>
                            <div className="button-description">
                                Enter a room code to join
                            </div>
                        </div>
                    </button>
                </div>

                <button onClick={() => navigate('/')} className="back-button">
                    ← Back to Home
                </button>

                {showJoinModal && (
                    <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">Join Room</h2>
                            <input
                                type="text"
                                placeholder="Enter room code"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                                className="room-input"
                                maxLength={6}
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button onClick={handleJoinRoom} className="modal-button primary">
                                    Join
                                </button>
                                <button
                                    onClick={() => setShowJoinModal(false)}
                                    className="modal-button secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameLobby;