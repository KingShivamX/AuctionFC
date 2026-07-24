export interface User {
  _id?: string;
  id: string;
  username: string;
  teamName: string;
  pin: string; // 4 digit pin
  createdAt: number;
}

export type PlayerPosition = 'Attacker' | 'Midfielder' | 'Defender' | 'Goalkeeper' | string;

export interface Player {
  _id?: string;
  id: string;
  leagueId: string;
  srNo: number;
  name: string;
  franchise: string; // Current Club
  position: PlayerPosition;
  pool: string; // e.g. Pool A - Star Players
  basePrice: number; // in Cr (Crores)
  soldStatus: 'unsold' | 'live' | 'sold';
  soldToTeam?: string;
  soldToUsername?: string;
  soldPrice?: number;
  orderIndex: number;
}

export interface Bid {
  _id?: string;
  id: string;
  leagueId: string;
  playerId: string;
  amount: number;
  userId: string;
  username: string;
  teamName: string;
  timestamp: number;
}

export interface LeagueMember {
  userId: string;
  username: string;
  teamName: string;
  joinedAt: number;
}

export interface League {
  _id?: string;
  id: string;
  name: string;
  code: string;
  adminId: string;
  adminUsername: string;
  adminTeamName: string;
  totalPurse: number; // e.g. 100 (in Cr)
  members: LeagueMember[];
  status: 'draft' | 'live' | 'completed';
  currentAuctionPlayerId?: string | null;
  timerEnd?: number | null;
  isPaused?: boolean;
  pausedTimeLeft?: number; // seconds remaining when paused
  createdAt: number;
}

export interface AuthSession {
  user: User;
  token: string;
}
