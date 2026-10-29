import { OpeningInfo } from '../types/game';
import { OPENING_DATABASE, OpeningEntry } from '../data/openings';

export interface IOpeningService {
  identifyOpening(movesSan: string[]): OpeningInfo;
  getOpeningByEco(eco: string): OpeningInfo | undefined;
}

export class DeterministicOpeningService implements IOpeningService {
  private database: OpeningEntry[];

  constructor(customDatabase?: OpeningEntry[]) {
    // Sort database by move sequence length descending so deepest match is identified first
    this.database = [...(customDatabase || OPENING_DATABASE)].sort(
      (a, b) => b.moves.length - a.moves.length
    );
  }

  identifyOpening(movesSan: string[]): OpeningInfo {
    if (!movesSan || movesSan.length === 0) {
      return {
        eco: 'A00',
        name: 'Starting Position',
        variation: 'Standard',
        description: 'All 32 pieces in their starting squares. Control the center and develop smoothly.'
      };
    }

    for (const entry of this.database) {
      if (this.isPrefixMatch(entry.moves, movesSan)) {
        return entry.info;
      }
    }

    return {
      eco: 'A00',
      name: 'Uncommon Opening',
      variation: 'Modern Variation',
      description: 'An unconventional opening line. Adhere to fundamental opening principles: control the center and develop pieces.'
    };
  }

  getOpeningByEco(eco: string): OpeningInfo | undefined {
    const found = this.database.find(e => e.info.eco.toLowerCase() === eco.toLowerCase());
    return found?.info;
  }

  private isPrefixMatch(patternMoves: string[], actualMoves: string[]): boolean {
    if (patternMoves.length > actualMoves.length) return false;
    for (let i = 0; i < patternMoves.length; i++) {
      if (patternMoves[i] !== actualMoves[i]) {
        return false;
      }
    }
    return true;
  }
}

export const openingService = new DeterministicOpeningService();
