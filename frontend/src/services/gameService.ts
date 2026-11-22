import { SavedGame } from '../types/game';
import { ApiGameService } from './ApiGameService';

export interface IGameService {
  getRecentGames(): Promise<SavedGame[]>;
  getGameById(id: string): Promise<SavedGame | undefined>;
  getLatestGame(): Promise<SavedGame | undefined>;
  saveGame(game: SavedGame): Promise<void>;
}

export const gameService: IGameService = new ApiGameService();

