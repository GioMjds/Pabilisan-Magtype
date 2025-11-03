export interface Player {
    id: string;
    username: string;
    progress: number;
    wpm: number;
    isReady: boolean;
}

export interface GameRoom {
    id: string;
    players: Player[];
    text: string;
    isActive: boolean;
}