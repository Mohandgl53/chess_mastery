import { afterEach, describe, expect, it, vi } from 'vitest';
import { SavedGame } from '../../types/game';
import { gameApi, mapSavedGameToCreateGameDto } from './gameApi';
import { ApiGameService } from '../ApiGameService';

function makeGame(id: string): SavedGame {
  const opening = { eco: 'A00', name: 'Test Opening', description: 'Test' };
  return {
    id,
    whitePlayer: 'You',
    whiteRating: 400,
    blackPlayer: 'Stockfish',
    blackRating: 1400,
    result: 'WHITE_WINS',
    resultString: '1 - 0',
    date: 'Today',
    opening,
    accuracy: { white: 80, black: 80 },
    moves: [],
    pgn: '',
    finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    analysis: {
      result: 'WHITE_WINS',
      resultReason: 'Test game',
      playerColor: 'w',
      accuracy: { player: 80, opponent: 80 },
      opening,
      bestMove: 'e4',
      keyLesson: 'Develop pieces',
      moveBreakdown: {
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracies: 0,
        mistakes: 0,
        blunders: 0
      },
      phaseReviews: {
        opening: { title: 'Opening', positivePoints: [], negativePoints: [] },
        middlegame: { title: 'Middlegame', positivePoints: [], negativePoints: [] },
        endgame: { title: 'Endgame', positivePoints: [], negativePoints: [] }
      }
    }
  };
}

describe('Game save idempotency (frontend)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses SavedGame.id as the create payload idempotency key', () => {
    const payload = mapSavedGameToCreateGameDto(makeGame('game-stable-123'));
    expect(payload.idempotencyKey).toBe('game-stable-123');
  });

  it('generates a stable key when SavedGame.id is missing and honours an override', () => {
    const payload = mapSavedGameToCreateGameDto(makeGame(''));
    expect(payload.idempotencyKey).toMatch(/^game-/);
    expect(payload.idempotencyKey!.length).toBeGreaterThan(4);

    expect(mapSavedGameToCreateGameDto(makeGame(''), 'explicit-key').idempotencyKey).toBe('explicit-key');
  });

  it('sends the same idempotency key on repeated save attempts', async () => {
    const createSpy = vi
      .spyOn(gameApi, 'createGame')
      .mockResolvedValue({ data: {} as any });

    const service = new ApiGameService();
    const game = makeGame('');

    await service.saveGame(game);
    await service.saveGame(game);

    expect(game.id).toBeTruthy();
    expect(createSpy).toHaveBeenCalledTimes(2);
    const keys = createSpy.mock.calls.map(([payload]) => payload.idempotencyKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
});
