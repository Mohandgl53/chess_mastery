import { SavedGame } from '../types/game';
import { ApiGameService } from './ApiGameService';

export interface IGameService {
  getRecentGames(): Promise<SavedGame[]>;
  getGameById(id: string): Promise<SavedGame | undefined>;
  getLatestGame(): Promise<SavedGame | undefined>;
  saveGame(game: SavedGame): Promise<void>;
}

const STORAGE_KEY = 'chess_mastery_saved_games';

export class LocalGameService implements IGameService {
  private games: SavedGame[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.games = parsed;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Could not load games from localStorage:', err);
    }
    this.games = [];
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.games));
      }
    } catch (err) {
      console.warn('Could not save games to localStorage:', err);
    }
  }

  async getRecentGames(): Promise<SavedGame[]> {
    return [...this.games];
  }

  async getGameById(id: string): Promise<SavedGame | undefined> {
    return this.games.find(g => g.id === id);
  }

  async getLatestGame(): Promise<SavedGame | undefined> {
    return this.games[0];
  }

  async saveGame(game: SavedGame): Promise<void> {
    this.games = [game, ...this.games.filter(g => g.id !== game.id)];
    this.persist();
  }
}

export const gameService: IGameService = new ApiGameService();

