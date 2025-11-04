import { useEffect, useState, useRef } from 'react';
import { getSocket } from '../configs/websockets';
import type { Socket } from 'socket.io-client';
import type { GameRoom } from '../types/Game.types';

export const useGame = () => {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [room, setRoom] = useState<GameRoom | null>(null);
	const [gameStarted, setGameStarted] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const hasInitialized = useRef<boolean>(false);

	useEffect(() => {
		if (hasInitialized.current) return;
		hasInitialized.current = true;

		const socketInstance = getSocket();
		setSocket(socketInstance);

		if (!socketInstance.connected) {
			socketInstance.connect();
		}

		const savedRoom = sessionStorage.getItem('currentRoom');
		if (savedRoom) {
			try {
				const parsedRoom = JSON.parse(savedRoom);
				console.log('🔄 Restoring room from sessionStorage:', parsedRoom);
				setRoom(parsedRoom);
			} catch (e) {
				console.error('Failed to parse saved room:', e);
			}
		}

		// Handle successful room creation
		socketInstance.on('roomCreated', (data) => {
			setRoom(data.room);
			setError(null);
			sessionStorage.setItem('currentRoom', JSON.stringify(data.room));
		});

		socketInstance.on('playerJoined', (data) => {
			setRoom(data.room);
			setError(null);
			sessionStorage.setItem('currentRoom', JSON.stringify(data.room));
		});

		socketInstance.on('playerLeft', (data) => {
			console.log('👋 Player left event received:', data);
			setRoom(data.room);
			sessionStorage.setItem('currentRoom', JSON.stringify(data.room));
		});

		socketInstance.on('playerStatusChanged', (data) => {
			setRoom((prev) => {
				if (!prev) return prev;
				if (data.room) {
					console.log('✅ Updating room with full data:', data.room);
					sessionStorage.setItem('currentRoom', JSON.stringify(data.room));
					return data.room;
				}
				const updatedRoom = {
					...prev,
					players: prev.players.map((p) =>
						p.id === data.playerId
							? { ...p, isReady: data.isReady }
							: p
					),
				};
				sessionStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
				return updatedRoom;
			});
		});

		socketInstance.on('gameStarted', (data) => {
			setGameStarted(true);
			setRoom((prev) => {
				if (!prev) return prev;
				const updatedRoom = { ...prev, text: data.text, isActive: true };
				sessionStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
				return updatedRoom;
			});
		});

		socketInstance.on('progressUpdated', (data) => {
			setRoom((prev) => {
				if (!prev) return prev;
				const updatedRoom = {
					...prev,
					players: prev.players.map((p) =>
						p.id === data.playerId
							? { ...p, progress: data.progress, wpm: data.wpm }
							: p
					),
				};
				sessionStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
				return updatedRoom;
			});
		});

		socketInstance.on('playerFinished', (data) => {
			console.log('Player finished:', data);
		});

		socketInstance.on('gameEnded', (data) => {
			console.log('Game ended:', data);
			setGameStarted(false);
		});

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

		socket.emit('createRoom', { username }, (response: any) => {
			if (response.error) {
				setError(response.error);
			} else {
				setRoom(response.room);
				setError(null);
			}
		});
	};

	const joinRoom = (roomId: string, username: string) => {
		if (!socket) {
			setError('Socket not connected');
			return;
		}

		socket.emit('joinRoom', { roomId, username }, (response: any) => {
			if (response.error) {
				setError(response.error);
			} else {
				setRoom(response.room);
				setError(null);
			}
		});
	};

	const setReady = (isReady: boolean) => {
		if (!socket) return;
		socket.emit('playerReady', { isReady });
	};

	const leaveRoom = () => {
		if (!socket) return;
		socket.emit('leaveRoom');
		setRoom(null);
		sessionStorage.removeItem('currentRoom');
	};

	const updateProgress = (progress: number, currentText: string) => {
		if (!socket) return;
		socket.emit('updateProgress', { progress, currentText });
	};

	return {
		room,
		gameStarted,
		createRoom,
		joinRoom,
		setReady,
		leaveRoom,
		updateProgress,
		error,
	};
};
