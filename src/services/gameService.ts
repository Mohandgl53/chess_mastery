import { SavedGame, MOCK_SAVED_GAMES } from '../mock/mockGames';
import { ApiGameService } from './ApiGameService';

export interface IGameService {
  getRecentGames(): Promise<SavedGame[]>;
  getGameById(id: string): Promise<SavedGame | undefined>;
  getLatestGame(): Promise<SavedGame | undefined>;
  saveGame(game: SavedGame): Promise<void>;
}

const STORAGE_KEY = 'chess_mastery_saved_games';

export class MockGameService implements IGameService {
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.games = parsed;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Could not load games from localStorage:', err);
    }
    this.games = [...MOCK_SAVED_GAMES];
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
    // Put newest game first, avoid duplicates by id
    this.games = [game, ...this.games.filter(g => g.id !== game.id)];
    this.persist();
  }
}

// Explicit data mode selection:
// 'api': Communicates exclusively with PostgreSQL backend REST API. Throws ApiError if offline.
// 'mock': Uses browser MockGameService.
const dataMode = import.meta.env.VITE_DATA_MODE || 'api';

export const gameService: IGameService =
  dataMode === 'mock'
    ? new MockGameService()
    : new ApiGameService();

