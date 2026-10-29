import { IGameService } from './gameService';
import { SavedGame } from '../mock/mockGames';
import {
  gameApi,
  mapBackendGameToSavedGame,
  mapSavedGameToCreateGameDto
} from './api/gameApi';
import { ApiError } from './api/client';

export class ApiGameService implements IGameService {
  async getRecentGames(): Promise<SavedGame[]> {
    try {
      const response = await gameApi.getGames(1, 20);
      return response.data.map(mapBackendGameToSavedGame);
    } catch (err) {
      console.error('[ApiGameService] Failed to load recent games from server:', err);
      throw err;
    }
  }

  async getGameById(id: string): Promise<SavedGame | undefined> {
    try {
      const response = await gameApi.getGameById(id);
      if (!response.data) return undefined;
      return mapBackendGameToSavedGame(response.data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        return undefined;
      }
      console.error(`[ApiGameService] Failed to load game ${id} from server:`, err);
      throw err;
    }
  }

  async getLatestGame(): Promise<SavedGame | undefined> {
    const games = await this.getRecentGames();
    return games.length > 0 ? games[0] : undefined;
  }

  async saveGame(game: SavedGame): Promise<void> {
    try {
      const payload = mapSavedGameToCreateGameDto(game);
      await gameApi.createGame(payload);
    } catch (err) {
      console.error('[ApiGameService] Failed to persist game to server:', err);
      throw err;
    }
  }
}
