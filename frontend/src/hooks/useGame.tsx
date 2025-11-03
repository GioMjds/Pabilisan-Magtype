import { useEffect, useState, useRef } from 'react';
import { getSocket } from '../configs/websockets';
import type { Socket } from 'socket.io-client';
import type { GameRoom } from '../types/Game.types';

export const useGame = () => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [room, setRoom] = useState<GameRoom | null>(null);
	const [gameStarted, setGameStarted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const hasInitialized = useRef(false);

	useEffect(() => {
		// Only initialize once globally
		if (hasInitialized.current) {
			return;
		}
		hasInitialized.current = true;

		const socketInstance = getSocket();
		setSocket(socketInstance);

		if (!socketInstance.connected) {
			console.log('Connecting socket...');
			socketInstance.connect();
		}

		// Handle successful room creation
		socketInstance.on('roomCreated', (data) => {
			console.log('✅ Room created event received:', data);
			setRoom(data.room);
			setError(null);
		});

		socketInstance.on('playerJoined', (data) => {
			console.log('✅ Player joined event received:', data);
			setRoom(data.room);
			setError(null);
		});

		socketInstance.on('playerLeft', (data) => {
			setRoom(data.room);
		});

		socketInstance.on('playerStatusChanged', (data) => {
			setRoom((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					players: prev.players.map((p) =>
						p.id === data.playerId
							? { ...p, isReady: data.isReady }
							: p
					),
				};
			});
		});

		socketInstance.on('gameStarted', (data) => {
			setGameStarted(true);
			setRoom((prev) => {
				if (!prev) return prev;
				return { ...prev, text: data.text, isActive: true };
			});
		});

		socketInstance.on('progressUpdated', (data) => {
			setRoom((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					players: prev.players.map((p) =>
						p.id === data.playerId
							? { ...p, progress: data.progress, wpm: data.wpm }
							: p
					),
				};
			});
		});

		socketInstance.on('playerFinished', (data) => {
			console.log('Player finished:', data);
		});

		socketInstance.on('gameEnded', (data) => {
			console.log('Game ended:', data);
			setGameStarted(false);
		});

		// Don't disconnect - keep socket alive for navigation
		return () => {
			// Removed disconnect to keep socket persistent
		};
	}, []);

	const createRoom = (username: string) => {
		if (!socket) {
			console.error('Socket not connected');
			setError('Socket not connected');
			return;
		}

		console.log('Emitting createRoom with username:', username);
		socket.emit('createRoom', { username }, (response: any) => {
			console.log('Received createRoom response:', response);
			if (response.error) {
				setError(response.error);
			} else {
				console.log('Setting room:', response.room);
				setRoom(response.room);
				setError(null);
			}
		});
	};

	const joinRoom = (roomId: string, username: string) => {
		if (!socket) {
			console.error('Socket not connected');
			setError('Socket not connected');
			return;
		}

		console.log('Emitting joinRoom:', { roomId, username });
		socket.emit('joinRoom', { roomId, username }, (response: any) => {
			console.log('Received joinRoom response:', response);
			if (response.error) {
				console.error('Join error:', response.error);
				setError(response.error);
			} else {
				console.log('Setting room from join response:', response.room);
				setRoom(response.room);
				setError(null);
				sessionStorage.setItem('currentRoom', JSON.stringify(response.room));
			}
		});
	};

	const setReady = (isReady: boolean) => {
		socket?.emit('playerReady', { isReady });
	};

	const updateProgress = (progress: number, currentText: string) => {
		socket?.emit('updateProgress', { progress, currentText });
	};

	return {
		room,
		gameStarted,
		createRoom,
		joinRoom,
		setReady,
		updateProgress,
		error,
	};
};
