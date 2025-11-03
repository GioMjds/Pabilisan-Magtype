export interface Player {
    id: string;
    username: string;
    progress: number;
    wpm: number;
    isReady: boolean;
}

export interface GameRoom {
    id: string;
    players: Map<string, Player>;
    text: string;
    startTime: number | null;
    isActive: boolean;
}