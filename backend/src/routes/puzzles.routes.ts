import { Router } from 'express';
import { Chess } from 'chess.js';

export const puzzleRoutes = Router();

// Helper to parse Chess.com PGN and FEN into legal Puzzle format
function parseChessComPuzzle(data: any) {
  try {
    const fen = data.fen;
    const chess = new Chess(fen);
    const pgn = data.pgn || '';

    // Strip PGN headers and comments
    const pgnMoves = pgn
      .replace(/\[.*?\]/g, '')
      .replace(/\{.*?\}/g, '')
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .trim();

    // Extract SAN tokens, ignoring turn numbers like 1... or 31.
    const tokens = pgnMoves
      .split(/\s+/)
      .filter((tok: string) => tok && !tok.match(/^\d+\./) && !tok.match(/^\d+\.\.\./));

    const solutionMoves: Array<{
      from: string;
      to: string;
      san: string;
      response?: { from: string; to: string; san: string };
    }> = [];

    const testChess = new Chess(fen);
    for (let i = 0; i < tokens.length; i += 2) {
      const m = testChess.move(tokens[i]);
      if (!m) break;
      const moveObj: {
        from: string;
        to: string;
        san: string;
        response?: { from: string; to: string; san: string };
      } = { from: m.from, to: m.to, san: m.san };

      if (i + 1 < tokens.length) {
        const resp = testChess.move(tokens[i + 1]);
        if (resp) {
          moveObj.response = { from: resp.from, to: resp.to, san: resp.san };
        }
      }
      solutionMoves.push(moveObj);
    }

    if (solutionMoves.length === 0) {
      throw new Error('Could not parse any valid moves from Chess.com PGN');
    }

    const sideToMove = fen.split(' ')[1] === 'w' ? 'w' : 'b';
    const firstMove = solutionMoves[0];

    return {
      id: `chesscom-${data.publish_time || Date.now()}`,
      title: data.title || 'Chess.com Tactical Puzzle',
      theme: 'Tactics',
      themeDescription: 'Authentic grandmaster puzzle from Chess.com archives.',
      difficulty: 'Medium',
      rating: 1450,
      fen: fen,
      playerColor: sideToMove,
      solutionMoves,
      hints: [
        {
          level: 1,
          title: 'Find the winning motif',
          description: `Look for high-impact tactical forcing moves for ${sideToMove === 'w' ? 'White' : 'Black'}.`,
          highlightSquares: [firstMove.from]
        },
        {
          level: 2,
          title: 'Target Square',
          description: `Focus your attention on square ${firstMove.to}.`,
          highlightSquares: [firstMove.from, firstMove.to]
        },
        {
          level: 3,
          title: 'Winning move',
          description: `Play ${firstMove.san}!`,
          highlightSquares: [firstMove.from, firstMove.to]
        }
      ],
      tacticalExplanation: `Winning continuation: ${solutionMoves.map(m => m.san + (m.response ? ' ' + m.response.san : '')).join(', ')}.`,
      coachInsight: 'Precision calculation is the bedrock of master tactical vision. Look for checks, captures, and threats first.',
      source: 'Chess.com',
      externalUrl: data.url
    };
  } catch (err: any) {
    throw new Error(`Failed to parse Chess.com puzzle: ${err?.message || err}`);
  }
}

// Helper to parse Lichess puzzle into Puzzle format
function parseLichessPuzzle(data: any) {
  try {
    const puzzleInfo = data.puzzle;
    const fen = puzzleInfo.fen;
    const uciList: string[] = puzzleInfo.solution || [];
    const testChess = new Chess(fen);
    const solutionMoves: Array<{
      from: string;
      to: string;
      san: string;
      response?: { from: string; to: string; san: string };
    }> = [];

    for (let i = 0; i < uciList.length; i += 2) {
      const uci = uciList[i];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci.length > 4 ? uci[4] : undefined;
      const m = testChess.move({ from: from as any, to: to as any, promotion: promo });
      if (!m) break;
      const moveObj: {
        from: string;
        to: string;
        san: string;
        response?: { from: string; to: string; san: string };
      } = { from: m.from, to: m.to, san: m.san };

      if (i + 1 < uciList.length) {
        const respUci = uciList[i + 1];
        const rFrom = respUci.slice(0, 2);
        const rTo = respUci.slice(2, 4);
        const rPromo = respUci.length > 4 ? respUci[4] : undefined;
        const resp = testChess.move({ from: rFrom as any, to: rTo as any, promotion: rPromo });
        if (resp) {
          moveObj.response = { from: resp.from, to: resp.to, san: resp.san };
        }
      }
      solutionMoves.push(moveObj);
    }

    if (solutionMoves.length === 0) {
      throw new Error('Could not parse valid moves from Lichess solution');
    }

    const sideToMove = fen.split(' ')[1] === 'w' ? 'w' : 'b';
    const rating = puzzleInfo.rating || 1500;
    const difficulty = rating < 1100 ? 'Easy' : rating < 1700 ? 'Medium' : 'Hard';
    const themes = (puzzleInfo.themes || []).join(', ');

    return {
      id: `lichess-${puzzleInfo.id}`,
      title: `Lichess #${puzzleInfo.id} (${themes || 'Tactics'})`,
      theme: puzzleInfo.themes?.[0] || 'Tactics',
      themeDescription: `Stockfish NNUE-verified tactic (${themes || 'tactics'}).`,
      difficulty,
      rating,
      fen,
      playerColor: sideToMove,
      solutionMoves,
      hints: [
        {
          level: 1,
          title: 'Find the initiating piece',
          description: `Look for forcing moves starting from ${solutionMoves[0].from}.`,
          highlightSquares: [solutionMoves[0].from]
        },
        {
          level: 2,
          title: 'Target Square',
          description: `Look at square ${solutionMoves[0].to}.`,
          highlightSquares: [solutionMoves[0].from, solutionMoves[0].to]
        },
        {
          level: 3,
          title: 'First Move',
          description: `Play ${solutionMoves[0].san}!`,
          highlightSquares: [solutionMoves[0].from, solutionMoves[0].to]
        }
      ],
      tacticalExplanation: `Solution: ${solutionMoves.map(m => m.san + (m.response ? ' ' + m.response.san : '')).join(', ')}.`,
      coachInsight: 'Real game tactics punish unnatural piece placements. Exploit the loose defender immediately.',
      source: 'Lichess Open Database',
      externalUrl: `https://lichess.org/training/${puzzleInfo.id}`
    };
  } catch (err: any) {
    throw new Error(`Failed to parse Lichess puzzle: ${err?.message || err}`);
  }
}

// Route 1: Chess.com Daily Puzzle
puzzleRoutes.get('/chesscom-daily', async (_req, res) => {
  try {
    const response = await fetch('https://api.chess.com/pub/puzzle', {
      headers: { 'User-Agent': 'ChessMasteryApp/1.0 (contact@chessmastery.local)' }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Chess.com' });
    }
    const data = await response.json();
    const parsed = parseChessComPuzzle(data);
    res.json({ success: true, puzzle: parsed, raw: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route 2: Chess.com Random Daily Archive Puzzle
puzzleRoutes.get('/chesscom-random', async (_req, res) => {
  try {
    const response = await fetch('https://api.chess.com/pub/puzzle/random', {
      headers: { 'User-Agent': 'ChessMasteryApp/1.0 (contact@chessmastery.local)' }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Chess.com' });
    }
    const data = await response.json();
    const parsed = parseChessComPuzzle(data);
    res.json({ success: true, puzzle: parsed, raw: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route 3: Lichess Daily Puzzle
puzzleRoutes.get('/lichess-daily', async (_req, res) => {
  try {
    const response = await fetch('https://lichess.org/api/puzzle/daily', {
      headers: { 'User-Agent': 'ChessMasteryApp/1.0 (contact@chessmastery.local)' }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Lichess' });
    }
    const data = await response.json();
    const parsed = parseLichessPuzzle(data);
    res.json({ success: true, puzzle: parsed, raw: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
