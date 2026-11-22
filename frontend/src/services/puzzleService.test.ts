import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnhancedPuzzleService } from './puzzleService';
import { MASTERCLASS_PUZZLES } from '../data/masterclassPuzzles';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function libraryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'puz-test-101',
    title: 'Test Fork',
    theme: 'FORK',
    rating: 1500,
    difficulty: 'Medium',
    fen: START_FEN,
    playerColor: 'w',
    solutionMoves: [{ from: 'e2', to: 'e4', san: 'e4' }],
    hints: [{ level: 1, title: 'Hint', description: 'Look for the fork' }],
    tacticalExplanation: 'Fork wins material',
    coachInsight: 'Check both attacked pieces',
    ...overrides
  };
}

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body
  } as unknown as Response;
}

describe('puzzleService — backend library with offline fallback', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps backend rows to Puzzle objects and merges them with the bundled catalog', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      puzzles: [
        libraryRow(),
        libraryRow({
          id: 'puz-test-102',
          theme: 'BACK_RANK',
          difficulty: 'Hard',
          playerColor: 'b',
          rating: 900,
          solutionMoves: [{ from: 'e7', to: 'e5', san: 'e5' }, { from: 'a1', to: 'a2' }],
          hints: [{ level: 9, title: 'bad', description: 'ignored' }],
          coachInsight: null
        })
      ]
    }));
    vi.stubGlobal('fetch', fetchMock);

    const puzzles = await new EnhancedPuzzleService().getPuzzles();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/puzzles/library'), expect.any(Object));
    expect(puzzles.length).toBe(MASTERCLASS_PUZZLES.length + 2);
    expect(puzzles.map((p) => p.rating)).toEqual([...puzzles.map((p) => p.rating)].sort((a, b) => a - b));

    const fork = puzzles.find((p) => p.id === 'lib-puz-test-101')!;
    expect(fork.theme).toBe('Fork');
    expect(fork.source).toBe('Mastery Library');
    expect(fork.hints[0].level).toBe(1);
    expect(fork.coachInsight).toBe('Check both attacked pieces');

    const backRank = puzzles.find((p) => p.id === 'lib-puz-test-102')!;
    expect(backRank.theme).toBe('Back-Rank Mate');
    expect(backRank.difficulty).toBe('Hard');
    expect(backRank.playerColor).toBe('b');
    expect(backRank.solutionMoves).toHaveLength(1);
    expect(backRank.hints).toHaveLength(3); // generated fallback hints
    expect(backRank.coachInsight).toBe('Fork wins material');
  });

  it('falls back to the offline catalog when the request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const puzzles = await new EnhancedPuzzleService().getPuzzles();
    expect(puzzles).toHaveLength(MASTERCLASS_PUZZLES.length);
    expect(puzzles[0].source).toBe('Mastery Archive');
  });

  it('falls back when the endpoint returns an error or no usable puzzles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false }, false)));
    expect(await new EnhancedPuzzleService().getPuzzles()).toHaveLength(MASTERCLASS_PUZZLES.length);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, puzzles: [] })));
    expect(await new EnhancedPuzzleService().getPuzzles()).toHaveLength(MASTERCLASS_PUZZLES.length);
  });

  it('does not refetch after a successful load', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, puzzles: [libraryRow()] }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new EnhancedPuzzleService();
    await service.getPuzzles();
    await service.getPuzzles();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight request for concurrent callers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, puzzles: [libraryRow()] }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new EnhancedPuzzleService();

    await Promise.all([service.getPuzzles(), service.getPuzzles(), service.getPuzzles()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
