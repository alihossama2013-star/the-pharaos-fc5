export interface Player {
  id: string;
  name: string;
  username: string;
  position?: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
  avatar: string;
}

export interface MatchRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'W' | 'D' | 'L';
  teamGoals: number;
  opponentGoals: number;
  scorers: { playerId: string; goals: number }[];
  assisters: { playerId: string; assists: number }[];
  mvpPlayerId?: string;
  playerRatings?: { playerId: string; rating: number }[];
  notes?: string;
}

export interface UpcomingMatch {
  id: string;
  opponent: string;
  date: string;
  time?: string;
  location?: string;
  competition?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskCategory = 'MATCHDAY' | 'TRAINING' | 'TACTICAL' | 'FITNESS' | 'ADMIN' | 'COMMUNITY';

export interface SquadTask {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  assignedTo?: string; // Player ID or 'ALL'
  assignedToName?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  importedBy: string;
  importedAt: string;
  orderIndex?: number;
  tags?: string[];
  rewardXp?: number;
}
