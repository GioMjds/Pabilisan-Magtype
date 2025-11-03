import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
	const [username, setUsername] = useState('');
	const navigate = useNavigate();

	const handleStart = () => {
		if (username.trim()) {
			localStorage.setItem('username', username);
			navigate('/lobby');
		}
	};

	return (
		<div className="homepage">
			<div className="homepage-card">
				<div className="homepage-header">
					<h1 className="homepage-title">⚡ Pabilisan</h1>
					<p className="homepage-subtitle">
						Test your typing speed in real-time multiplayer races
					</p>
				</div>

				<div className="homepage-content">
					<div className="input-group">
						<input
							type="text"
							placeholder="Enter your username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleStart()}
							className="username-input"
							maxLength={20}
							autoFocus
						/>
					</div>

					<button
						onClick={handleStart}
						disabled={!username.trim()}
						className="start-button"
					>
						Start Playing
					</button>
				</div>

				<div className="homepage-features">
					<div className="feature">
						<span className="feature-icon">🎮</span>
						<span className="feature-text">Multiplayer Racing</span>
					</div>
					<div className="feature">
						<span className="feature-icon">⚡</span>
						<span className="feature-text">Real-time Updates</span>
					</div>
					<div className="feature">
						<span className="feature-icon">📊</span>
						<span className="feature-text">WPM Tracking</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Homepage;
