import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { getSocket } from '../configs/websockets';
import './GameRoom.css';

const GameRoom = () => {
	const { roomId } = useParams<{ roomId: string }>();
	const navigate = useNavigate();
	const { room: hookRoom, gameStarted, setReady, updateProgress } = useGame();
	const [room, setRoom] = useState<any>(null);
	const [inputText, setInputText] = useState('');
	const [isReady, setIsReady] = useState(false);
	const [copied, setCopied] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const socket = getSocket();
	const currentPlayerId = socket.id;

	const username = localStorage.getItem('username') || 'Guest';

	useEffect(() => {
		if (!username || username === 'Guest') {
			navigate('/');
		}
	}, [username, navigate]);

	// On mount, try to restore room from sessionStorage
	useEffect(() => {
		const savedRoom = sessionStorage.getItem('currentRoom');
		if (savedRoom) {
			try {
				const parsedRoom = JSON.parse(savedRoom);
				console.log('✅ Restored room from sessionStorage:', parsedRoom);
				setRoom(parsedRoom);
			} catch (e) {
				console.error('Failed to parse saved room:', e);
			}
		}
	}, []);

	// Update room when hook room changes
	useEffect(() => {
		if (hookRoom) {
			console.log('✅ Room loaded from hook:', hookRoom);
			setRoom(hookRoom);
			sessionStorage.setItem('currentRoom', JSON.stringify(hookRoom));
		}
	}, [hookRoom]);

	useEffect(() => {
		if (gameStarted && inputRef.current) {
			inputRef.current.focus();
		}
	}, [gameStarted]);

	const handleReadyToggle = () => {
		const newReadyState = !isReady;
		setIsReady(newReadyState);
		setReady(newReadyState);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!gameStarted || !room) return;

		const value = e.target.value;
		setInputText(value);

		// Calculate progress
		const progress = Math.min((value.length / room.text.length) * 100, 100);
		updateProgress(progress, value);

		// Check if completed
		if (value === room.text) {
			updateProgress(100, value);
		}
	};

	const copyRoomCode = () => {
		if (roomId) {
			navigator.clipboard.writeText(roomId);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const getCurrentPlayer = () => {
		return room?.players.find((p: any) => p.id === currentPlayerId);
	};

	const getCharacterClass = (index: number) => {
		if (!inputText || index >= inputText.length) return '';
		const isCorrect = inputText[index] === room?.text[index];
		return isCorrect ? 'correct' : 'incorrect';
	};

	if (!room) {
		return (
			<div className="game-room">
				<div className="game-card">
					<div className="loading">
						<div className="loading-spinner"></div>
						<p>Loading room {roomId}...</p>
					</div>
				</div>
			</div>
		);
	}

	const currentPlayer = getCurrentPlayer();

	return (
		<div className="game-room">
			<div className="game-card">
				{/* Header */}
				<div className="game-header">
					<div className="room-info">
						<h2 className="room-title">Room: {room.id}</h2>
						<button onClick={copyRoomCode} className="copy-button">
							{copied ? '✓ Copied!' : '📋 Copy Code'}
						</button>
					</div>
					<button onClick={() => navigate('/lobby')} className="leave-button">
						Leave Room
					</button>
				</div>

				{/* Players List */}
				<div className="players-section">
					<h3 className="section-title">
						Players ({room.players.length}/4)
					</h3>
					<div className="players-grid">
						{room.players.map((player: any) => (
							<div
								key={player.id}
								className={`player-card ${player.id === currentPlayerId ? 'current' : ''}`}
							>
								<div className="player-info">
									<div className="player-name">
										{player.username}
										{player.id === currentPlayerId && ' (You)'}
									</div>
									<div className="player-stats">
										{gameStarted ? (
											<>
												<span className="stat">
													{Math.round(player.progress)}%
												</span>
												<span className="stat">{player.wpm} WPM</span>
											</>
										) : (
											<span
												className={`ready-badge ${player.isReady ? 'ready' : ''}`}
											>
												{player.isReady ? '✓ Ready' : 'Not Ready'}
											</span>
										)}
									</div>
								</div>
								{gameStarted && (
									<div className="progress-bar">
										<div
											className="progress-fill"
											style={{ width: `${player.progress}%` }}
										/>
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Game Area */}
				{!gameStarted ? (
					<div className="waiting-area">
						<p className="waiting-text">
							{room.players.length < 2
								? 'Waiting for more players...'
								: 'Waiting for all players to be ready...'}
						</p>
						<button
							onClick={handleReadyToggle}
							className={`ready-button ${isReady ? 'ready' : ''}`}
						>
							{isReady ? '✓ Ready' : 'Ready Up'}
						</button>
					</div>
				) : (
					<div className="game-area">
						<div className="text-display">
							{room.text.split('').map((char: any, index: number) => (
								<span key={index} className={`char ${getCharacterClass(index)}`}>
									{char}
								</span>
							))}
						</div>

						<div className="input-area">
							<input
								ref={inputRef}
								type="text"
								value={inputText}
								onChange={handleInputChange}
								className="game-input"
								placeholder="Start typing..."
								disabled={currentPlayer?.progress === 100}
								autoComplete="off"
								spellCheck="false"
							/>
						</div>

						<div className="current-stats">
							<div className="stat-item">
								<div className="stat-label">Progress</div>
								<div className="stat-value">
									{Math.round(currentPlayer?.progress || 0)}%
								</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">WPM</div>
								<div className="stat-value">{currentPlayer?.wpm || 0}</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">Accuracy</div>
								<div className="stat-value">
									{inputText.length > 0
										? Math.round(
												(inputText
													.split('')
													.filter((c, i) => c === room.text[i]).length /
													inputText.length) *
													100
											)
										: 100}
									%
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default GameRoom;
