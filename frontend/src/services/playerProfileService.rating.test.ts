import { describe, expect, it } from 'vitest';
import { calculateMatchRating } from './playerProfileService';

describe('Local rating mirror uses the backend K=16 formula', () => {
  it('applies +/-16 for decisive games and 0 for draws', () => {
    expect(calculateMatchRating(400, 1400, 'WHITE_WINS', 'w')).toEqual({
      delta: 16,
      newRating: 416,
      matchResult: 'WIN'
    });
    expect(calculateMatchRating(400, 600, 'BLACK_WINS', 'w')).toEqual({
      delta: -16,
      newRating: 384,
      matchResult: 'LOSS'
    });
    expect(calculateMatchRating(400, 2800, 'DRAW', 'b')).toEqual({
      delta: 0,
      newRating: 400,
      matchResult: 'DRAW'
    });
  });

  it('floors at 100 like the backend', () => {
    expect(calculateMatchRating(105, 2000, 'BLACK_WINS', 'w').newRating).toBe(100);
  });
});
