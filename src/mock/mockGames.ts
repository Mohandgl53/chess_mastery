import { MoveRecord, MoveClassification } from '../types/chess';
import { OpeningInfo, GameResult, PostGameAnalysis } from '../types/game';

export interface SavedGame {
  id: string;
  whitePlayer: string;
  whiteRating: number;
  blackPlayer: string;
  blackRating: number;
  result: GameResult;
  resultString: string;
  date: string;
  opening: OpeningInfo;
  accuracy: {
    white: number;
    black: number;
  };
  moves: MoveRecord[];
  pgn: string;
  finalFen: string;
  analysis: PostGameAnalysis;
}

export const MOCK_SAVED_GAMES: SavedGame[] = [
  {
    "id": "game-italian-victory",
    "whitePlayer": "Mohan",
    "whiteRating": 800,
    "blackPlayer": "Chess Coach (Intermediate)",
    "blackRating": 1200,
    "result": "WHITE_WINS",
    "resultString": "1 - 0 (Checkmate)",
    "date": "Today, 2:15 PM",
    "opening": {
      "eco": "C53",
      "name": "Italian Game: Giuoco Piano",
      "variation": "Greco Attack",
      "description": "Classical tactical assault creating central pressure and kingside breakthrough."
    },
    "accuracy": {
      "white": 89,
      "black": 68
    },
    "analysis": {
      "result": "WHITE_WINS",
      "resultReason": "Checkmate on move 20",
      "playerColor": "w",
      "accuracy": {
        "player": 89,
        "opponent": 68
      },
      "opening": {
        "eco": "C53",
        "name": "Italian Game: Giuoco Piano",
        "variation": "Greco Attack",
        "description": "Classical tactical assault creating central pressure and kingside breakthrough."
      },
      "bestMove": "Nxh7",
      "keyLesson": "Aggressive central pawn dominance and timely piece sacrifices will break through uncastled or weakened kings.",
      "moveBreakdown": {
        "best": 14,
        "excellent": 2,
        "good": 4,
        "inaccuracies": 0,
        "mistakes": 0,
        "blunders": 0
      },
      "phaseReviews": {
        "opening": {
          "title": "Opening Mastery",
          "positivePoints": [
            "Established dominant central pawn duo with c3 and d4",
            "Rapid development toward kingside attack"
          ],
          "negativePoints": []
        },
        "middlegame": {
          "title": "Middlegame Execution",
          "positivePoints": [
            "Decisive Greek Gift sacrifice on h7",
            "Rook lift to h4 and interference sacrifice on e6"
          ],
          "negativePoints": []
        },
        "endgame": {
          "title": "Tactical Finish",
          "positivePoints": [
            "Flawless mating net execution with Qh8#"
          ],
          "negativePoints": []
        }
      }
    },
    "moves": [
      {
        "from": "e2",
        "to": "e4",
        "san": "e4",
        "piece": "p",
        "color": "w",
        "flags": "b",
        "moveNumber": 1,
        "fenAfter": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        "classification": "BEST",
        "evaluation": 0.2,
        "explanation": "Classical opening claiming the central e4 square and opening lines for the queen and bishop."
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5",
        "piece": "p",
        "color": "b",
        "flags": "b",
        "moveNumber": 1,
        "fenAfter": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        "classification": "BEST",
        "evaluation": 0.2,
        "explanation": "Symmetric central response fighting for control of d4."
      },
      {
        "from": "g1",
        "to": "f3",
        "san": "Nf3",
        "piece": "n",
        "color": "w",
        "flags": "n",
        "moveNumber": 2,
        "fenAfter": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        "classification": "BEST",
        "evaluation": 0.3,
        "explanation": "Develops kingside knight, attacks e5, and prepares castling."
      },
      {
        "from": "b8",
        "to": "c6",
        "san": "Nc6",
        "piece": "n",
        "color": "b",
        "flags": "n",
        "moveNumber": 2,
        "fenAfter": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        "classification": "BEST",
        "evaluation": 0.3,
        "explanation": "Natural development defending the attacked e5 pawn."
      },
      {
        "from": "f1",
        "to": "c4",
        "san": "Bc4",
        "piece": "b",
        "color": "w",
        "flags": "n",
        "moveNumber": 3,
        "fenAfter": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        "classification": "BEST",
        "evaluation": 0.4,
        "explanation": "Italian Game setup targeting Black’s vulnerable f7 square."
      },
      {
        "from": "f8",
        "to": "c5",
        "san": "Bc5",
        "piece": "b",
        "color": "b",
        "flags": "n",
        "moveNumber": 3,
        "fenAfter": "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "classification": "BEST",
        "evaluation": 0.3,
        "explanation": "Active bishop development into the Giuoco Piano."
      },
      {
        "from": "c2",
        "to": "c3",
        "san": "c3",
        "piece": "p",
        "color": "w",
        "flags": "n",
        "moveNumber": 4,
        "fenAfter": "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
        "classification": "BEST",
        "evaluation": 0.4,
        "explanation": "Prepares the aggressive central thrust d4 to claim full pawn center."
      },
      {
        "from": "g8",
        "to": "f6",
        "san": "Nf6",
        "piece": "n",
        "color": "b",
        "flags": "n",
        "moveNumber": 4,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5",
        "classification": "BEST",
        "evaluation": 0.3,
        "explanation": "Counterattacks White’s e4 pawn and prepares kingside castling."
      },
      {
        "from": "d2",
        "to": "d4",
        "san": "d4",
        "piece": "p",
        "color": "w",
        "flags": "b",
        "moveNumber": 5,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 5",
        "classification": "BEST",
        "evaluation": 0.5,
        "explanation": "Classical Greco central strike questioning Black’s bishop."
      },
      {
        "from": "e5",
        "to": "d4",
        "san": "exd4",
        "piece": "p",
        "color": "b",
        "captured": "p",
        "flags": "c",
        "moveNumber": 5,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/2b5/2BpP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6",
        "classification": "GOOD",
        "evaluation": 0.4,
        "explanation": "Forced capture to avoid losing piece coordination."
      },
      {
        "from": "c3",
        "to": "d4",
        "san": "cxd4",
        "piece": "p",
        "color": "w",
        "captured": "p",
        "flags": "c",
        "moveNumber": 6,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/2b5/2BPP3/5N2/PP3PPP/RNBQK2R b KQkq - 0 6",
        "classification": "BEST",
        "evaluation": 0.5,
        "explanation": "Recaptures toward the center, forming a formidable pawn duo."
      },
      {
        "from": "c5",
        "to": "b4",
        "san": "Bb4+",
        "piece": "b",
        "color": "b",
        "flags": "n",
        "moveNumber": 6,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/5N2/PP3PPP/RNBQK2R w KQkq - 1 7",
        "classification": "GOOD",
        "evaluation": 0.3,
        "explanation": "Active counter-check preventing White from rolling pawns immediately."
      },
      {
        "from": "b1",
        "to": "c3",
        "san": "Nc3",
        "piece": "n",
        "color": "w",
        "flags": "n",
        "moveNumber": 7,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/2N2N2/PP3PPP/R1BQK2R b KQkq - 2 7",
        "classification": "BEST",
        "evaluation": 0.4,
        "explanation": "Pins knight to defend king and continues rapid piece deployment."
      },
      {
        "from": "f6",
        "to": "e4",
        "san": "Nxe4",
        "piece": "n",
        "color": "b",
        "captured": "p",
        "flags": "c",
        "moveNumber": 7,
        "fenAfter": "r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQK2R w KQkq - 0 8",
        "classification": "INACCURACY",
        "evaluation": 0.9,
        "explanation": "Greedy capture into White’s tactical center trap."
      },
      {
        "from": "e1",
        "to": "g1",
        "san": "O-O",
        "piece": "k",
        "color": "w",
        "flags": "k",
        "moveNumber": 8,
        "fenAfter": "r1bqk2r/pppp1ppp/2n5/8/1bBPn3/2N2N2/PP3PPP/R1BQ1RK1 b kq - 1 8",
        "classification": "BEST",
        "evaluation": 1.2,
        "explanation": "Pins the knight on the e-file and completes king safety."
      },
      {
        "from": "b4",
        "to": "c3",
        "san": "Bxc3",
        "piece": "b",
        "color": "b",
        "captured": "n",
        "flags": "c",
        "moveNumber": 8,
        "fenAfter": "r1bqk2r/pppp1ppp/2n5/8/2BPn3/2b2N2/PP3PPP/R1BQ1RK1 w kq - 0 9",
        "classification": "GOOD",
        "evaluation": 1.1,
        "explanation": "Exchanges piece to remove defender of e4."
      },
      {
        "from": "d4",
        "to": "d5",
        "san": "d5",
        "piece": "p",
        "color": "w",
        "flags": "n",
        "moveNumber": 9,
        "fenAfter": "r1bqk2r/pppp1ppp/2n5/3P4/2B1n3/2b2N2/PP3PPP/R1BQ1RK1 b kq - 0 9",
        "classification": "BEST",
        "evaluation": 2.1,
        "explanation": "Aggressive pawn clearance attacking Black’s defensive knight!"
      },
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6",
        "piece": "b",
        "color": "b",
        "flags": "n",
        "moveNumber": 9,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2b2/3P4/2B1n3/5N2/PP3PPP/R1BQ1RK1 w kq - 1 10",
        "classification": "INACCURACY",
        "evaluation": 2.6,
        "explanation": "Retreats bishop but leaves kingside coordination compromised."
      },
      {
        "from": "f1",
        "to": "e1",
        "san": "Re1",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 10,
        "fenAfter": "r1bqk2r/pppp1ppp/2n2b2/3P4/2B1n3/5N2/PP3PPP/R1BQR1K1 b kq - 2 10",
        "classification": "BEST",
        "evaluation": 3.2,
        "explanation": "Dominates the open e-file, pinning the e4 knight directly to Black’s king."
      },
      {
        "from": "c6",
        "to": "e7",
        "san": "Ne7",
        "piece": "n",
        "color": "b",
        "flags": "n",
        "moveNumber": 10,
        "fenAfter": "r1bqk2r/ppppnppp/5b2/3P4/2B1n3/5N2/PP3PPP/R1BQR1K1 w kq - 3 11",
        "classification": "GOOD",
        "evaluation": 3.3,
        "explanation": "Attempting to unpin and redeploy knight to g6."
      },
      {
        "from": "e1",
        "to": "e4",
        "san": "Rxe4",
        "piece": "r",
        "color": "w",
        "captured": "n",
        "flags": "c",
        "moveNumber": 11,
        "fenAfter": "r1bqk2r/ppppnppp/5b2/3P4/2B1R3/5N2/PP3PPP/R1BQ2K1 b kq - 0 11",
        "classification": "BEST",
        "evaluation": 3.8,
        "explanation": "Regains material with massive spatial and tactical superiority."
      },
      {
        "from": "d7",
        "to": "d6",
        "san": "d6",
        "piece": "p",
        "color": "b",
        "flags": "n",
        "moveNumber": 11,
        "fenAfter": "r1bqk2r/ppp1nppp/3p1b2/3P4/2B1R3/5N2/PP3PPP/R1BQ2K1 w kq - 0 12",
        "classification": "GOOD",
        "evaluation": 3.9,
        "explanation": "Blunts White’s d5 pawn and opens diagonal for light-squared bishop."
      },
      {
        "from": "c1",
        "to": "g5",
        "san": "Bg5",
        "piece": "b",
        "color": "w",
        "flags": "n",
        "moveNumber": 12,
        "fenAfter": "r1bqk2r/ppp1nppp/3p1b2/3P2B1/2B1R3/5N2/PP3PPP/R2Q2K1 b kq - 1 12",
        "classification": "BEST",
        "evaluation": 4.4,
        "explanation": "Pins and pressures the critical f6 defender."
      },
      {
        "from": "f6",
        "to": "g5",
        "san": "Bxg5",
        "piece": "b",
        "color": "b",
        "captured": "b",
        "flags": "c",
        "moveNumber": 12,
        "fenAfter": "r1bqk2r/ppp1nppp/3p4/3P2b1/2B1R3/5N2/PP3PPP/R2Q2K1 w kq - 0 13",
        "classification": "INACCURACY",
        "evaluation": 5.1,
        "explanation": "Trading defenders opens decisive attacking lines toward the black king."
      },
      {
        "from": "f3",
        "to": "g5",
        "san": "Nxg5",
        "piece": "n",
        "color": "w",
        "captured": "b",
        "flags": "c",
        "moveNumber": 13,
        "fenAfter": "r1bqk2r/ppp1nppp/3p4/3P2N1/2B1R3/8/PP3PPP/R2Q2K1 b kq - 0 13",
        "classification": "BEST",
        "evaluation": 5.4,
        "explanation": "Knight leaps to an aggressive outpost threatening both f7 and h7."
      },
      {
        "from": "e8",
        "to": "g8",
        "san": "O-O",
        "piece": "k",
        "color": "b",
        "flags": "k",
        "moveNumber": 13,
        "fenAfter": "r1bq1rk1/ppp1nppp/3p4/3P2N1/2B1R3/8/PP3PPP/R2Q2K1 w - - 1 14",
        "classification": "GOOD",
        "evaluation": 5.8,
        "explanation": "Finally castles, but White’s attack is already crashing through."
      },
      {
        "from": "g5",
        "to": "h7",
        "san": "Nxh7",
        "piece": "n",
        "color": "w",
        "captured": "p",
        "flags": "c",
        "moveNumber": 14,
        "fenAfter": "r1bq1rk1/ppp1nppN/3p4/3P4/2B1R3/8/PP3PPP/R2Q2K1 b - - 0 14",
        "classification": "EXCELLENT",
        "evaluation": 7.2,
        "explanation": "Devastating Greek Gift piece sacrifice dismantling Black’s pawn shield!"
      },
      {
        "from": "g8",
        "to": "h7",
        "san": "Kxh7",
        "piece": "k",
        "color": "b",
        "captured": "n",
        "flags": "c",
        "moveNumber": 14,
        "fenAfter": "r1bq1r2/ppp1nppk/3p4/3P4/2B1R3/8/PP3PPP/R2Q2K1 w - - 0 15",
        "classification": "GOOD",
        "evaluation": 7.1,
        "explanation": "Accepts the sacrifice to prevent immediate ruin."
      },
      {
        "from": "d1",
        "to": "h5",
        "san": "Qh5+",
        "piece": "q",
        "color": "w",
        "flags": "n",
        "moveNumber": 15,
        "fenAfter": "r1bq1r2/ppp1nppk/3p4/3P3Q/2B1R3/8/PP3PPP/R5K1 b - - 1 15",
        "classification": "BEST",
        "evaluation": 8.5,
        "explanation": "Decisive queen check forcing the king backward."
      },
      {
        "from": "h7",
        "to": "g8",
        "san": "Kg8",
        "piece": "k",
        "color": "b",
        "flags": "n",
        "moveNumber": 15,
        "fenAfter": "r1bq1rk1/ppp1npp1/3p4/3P3Q/2B1R3/8/PP3PPP/R5K1 w - - 2 16",
        "classification": "BEST",
        "evaluation": 8.6,
        "explanation": "Sole retreat square for the king."
      },
      {
        "from": "e4",
        "to": "h4",
        "san": "Rh4",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 16,
        "fenAfter": "r1bq1rk1/ppp1npp1/3p4/3P3Q/2B4R/8/PP3PPP/R5K1 b - - 3 16",
        "classification": "BEST",
        "evaluation": 9.9,
        "explanation": "Rook joins the attack with an unstoppable mate threat on h7 and h8."
      },
      {
        "from": "f7",
        "to": "f5",
        "san": "f5",
        "piece": "p",
        "color": "b",
        "flags": "b",
        "moveNumber": 16,
        "fenAfter": "r1bq1rk1/ppp1n1p1/3p4/3P1p1Q/2B4R/8/PP3PPP/R5K1 w - - 0 17",
        "classification": "GOOD",
        "evaluation": 9.8,
        "explanation": "Desperation pawn push attempting to create an escape square for the king."
      },
      {
        "from": "a1",
        "to": "e1",
        "san": "Re1",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 17,
        "fenAfter": "r1bq1rk1/ppp1n1p1/3p4/3P1p1Q/2B4R/8/PP3PPP/4R1K1 b - - 1 17",
        "classification": "BEST",
        "evaluation": 12,
        "explanation": "Brings final reserves into the attack, cutting off all retreat paths."
      },
      {
        "from": "c8",
        "to": "d7",
        "san": "Bd7",
        "piece": "b",
        "color": "b",
        "flags": "n",
        "moveNumber": 17,
        "fenAfter": "r2q1rk1/pppbn1p1/3p4/3P1p1Q/2B4R/8/PP3PPP/4R1K1 w - - 2 18",
        "classification": "GOOD",
        "evaluation": 12.5,
        "explanation": "Connecting rooks, but White’s attack cannot be halted."
      },
      {
        "from": "e1",
        "to": "e6",
        "san": "Re6",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 18,
        "fenAfter": "r2q1rk1/pppbn1p1/3pR3/3P1p1Q/2B4R/8/PP3PPP/6K1 b - - 3 18",
        "classification": "BEST",
        "evaluation": 15,
        "explanation": "Brilliant interference sacrifice! Blocks the e-file and seals Black’s doom."
      },
      {
        "from": "d7",
        "to": "e6",
        "san": "Bxe6",
        "piece": "b",
        "color": "b",
        "captured": "r",
        "flags": "c",
        "moveNumber": 18,
        "fenAfter": "r2q1rk1/ppp1n1p1/3pb3/3P1p1Q/2B4R/8/PP3PPP/6K1 w - - 0 19",
        "classification": "GOOD",
        "evaluation": 18,
        "explanation": "Forced capture to eliminate the menacing rook."
      },
      {
        "from": "d5",
        "to": "e6",
        "san": "dxe6",
        "piece": "p",
        "color": "w",
        "captured": "b",
        "flags": "c",
        "moveNumber": 19,
        "fenAfter": "r2q1rk1/ppp1n1p1/3pP3/5p1Q/2B4R/8/PP3PPP/6K1 b - - 0 19",
        "classification": "BEST",
        "evaluation": 25,
        "explanation": "Pawn recaptures, denying the black king any escape via f7."
      },
      {
        "from": "f8",
        "to": "f6",
        "san": "Rf6",
        "piece": "r",
        "color": "b",
        "flags": "n",
        "moveNumber": 19,
        "fenAfter": "r2q2k1/ppp1n1p1/3pPr2/5p1Q/2B4R/8/PP3PPP/6K1 w - - 1 20",
        "classification": "GOOD",
        "evaluation": 50,
        "explanation": "Desperate sacrifice to delay checkmate."
      },
      {
        "from": "h5",
        "to": "h8",
        "san": "Qh8#",
        "piece": "q",
        "color": "w",
        "flags": "n",
        "moveNumber": 20,
        "fenAfter": "r2q2kQ/ppp1n1p1/3pPr2/5p2/2B4R/8/PP3PPP/6K1 b - - 2 20",
        "classification": "BEST",
        "evaluation": 99,
        "explanation": "Checkmate! The queen delivers the final blow with full rook and bishop coordination."
      }
    ],
    "pgn": "[Event \"?\"]\n[Site \"?\"]\n[Date \"????.??.??\"]\n[Round \"?\"]\n[White \"?\"]\n[Black \"?\"]\n[Result \"*\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 12. Bg5 Bxg5 13. Nxg5 O-O 14. Nxh7 Kxh7 15. Qh5+ Kg8 16. Rh4 f5 17. Re1 Bd7 18. Re6 Bxe6 19. dxe6 Rf6 20. Qh8# *",
    "finalFen": "r2q2kQ/ppp1n1p1/3pPr2/5p2/2B4R/8/PP3PPP/6K1 b - - 2 20"
  },
  {
    "id": "game-opera-brilliancy",
    "whitePlayer": "Paul Morphy",
    "whiteRating": 2600,
    "blackPlayer": "Duke of Brunswick & Count Isouard",
    "blackRating": 2100,
    "result": "WHITE_WINS",
    "resultString": "1 - 0 (Checkmate)",
    "date": "Master Classic (1858)",
    "opening": {
      "eco": "C41",
      "name": "Philidor Defense",
      "variation": "Morphy Counter-Attack",
      "description": "The immortal Opera Game demonstrating pure principles of rapid development and initiative."
    },
    "accuracy": {
      "white": 98,
      "black": 71
    },
    "analysis": {
      "result": "WHITE_WINS",
      "resultReason": "Checkmate on move 17",
      "playerColor": "w",
      "accuracy": {
        "player": 98,
        "opponent": 71
      },
      "opening": {
        "eco": "C41",
        "name": "Philidor Defense",
        "variation": "Morphy Counter-Attack",
        "description": "The immortal Opera Game demonstrating pure principles of rapid development and initiative."
      },
      "bestMove": "Qb8+",
      "keyLesson": "Rapid piece development, open lines, and pins are vastly superior to premature pawn grabbing.",
      "moveBreakdown": {
        "best": 15,
        "excellent": 1,
        "good": 1,
        "inaccuracies": 0,
        "mistakes": 0,
        "blunders": 0
      },
      "phaseReviews": {
        "opening": {
          "title": "Opening Phase",
          "positivePoints": [
            "Open center exploitation",
            "Continuous development with threats on every move"
          ],
          "negativePoints": []
        },
        "middlegame": {
          "title": "Middlegame Attacks",
          "positivePoints": [
            "Sacrifice on b5 and d7 to strip king safety",
            "Double rook pin on the d-file"
          ],
          "negativePoints": []
        },
        "endgame": {
          "title": "Immortal Finish",
          "positivePoints": [
            "Queen sacrifice deflection leading to Rd8# checkmate"
          ],
          "negativePoints": []
        }
      }
    },
    "moves": [
      {
        "from": "e2",
        "to": "e4",
        "san": "e4",
        "piece": "p",
        "color": "w",
        "flags": "b",
        "moveNumber": 1,
        "fenAfter": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        "classification": "BEST",
        "evaluation": 0.2,
        "explanation": "King pawn opening opening routes for bishop and queen."
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5",
        "piece": "p",
        "color": "b",
        "flags": "b",
        "moveNumber": 1,
        "fenAfter": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        "classification": "BEST",
        "evaluation": 0.2,
        "explanation": "Open game classical reply."
      },
      {
        "from": "g1",
        "to": "f3",
        "san": "Nf3",
        "piece": "n",
        "color": "w",
        "flags": "n",
        "moveNumber": 2,
        "fenAfter": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        "classification": "BEST",
        "evaluation": 0.3,
        "explanation": "Develops knight and attacks e5."
      },
      {
        "from": "d7",
        "to": "d6",
        "san": "d6",
        "piece": "p",
        "color": "b",
        "flags": "n",
        "moveNumber": 2,
        "fenAfter": "rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
        "classification": "GOOD",
        "evaluation": 0.2,
        "explanation": "Philidor Defense, solid but slightly passive for Black’s dark-squared bishop."
      },
      {
        "from": "d2",
        "to": "d4",
        "san": "d4",
        "piece": "p",
        "color": "w",
        "flags": "b",
        "moveNumber": 3,
        "fenAfter": "rnbqkbnr/ppp2ppp/3p4/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3",
        "classification": "BEST",
        "evaluation": 0.5,
        "explanation": "Morphy immediately strikes in the center to exploit Black’s passive setup."
      },
      {
        "from": "c8",
        "to": "g4",
        "san": "Bg4",
        "piece": "b",
        "color": "b",
        "flags": "n",
        "moveNumber": 3,
        "fenAfter": "rn1qkbnr/ppp2ppp/3p4/4p3/3PP1b1/5N2/PPP2PPP/RNBQKB1R w KQkq - 1 4",
        "classification": "INACCURACY",
        "evaluation": 0.9,
        "explanation": "Premature pin before developing kingside pieces."
      },
      {
        "from": "d4",
        "to": "e5",
        "san": "dxe5",
        "piece": "p",
        "color": "w",
        "captured": "p",
        "flags": "c",
        "moveNumber": 4,
        "fenAfter": "rn1qkbnr/ppp2ppp/3p4/4P3/4P1b1/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 4",
        "classification": "BEST",
        "evaluation": 1,
        "explanation": "Morphy opens the center to rapidly accelerate piece development."
      },
      {
        "from": "g4",
        "to": "f3",
        "san": "Bxf3",
        "piece": "b",
        "color": "b",
        "captured": "n",
        "flags": "c",
        "moveNumber": 4,
        "fenAfter": "rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5b2/PPP2PPP/RNBQKB1R w KQkq - 0 5",
        "classification": "GOOD",
        "evaluation": 0.9,
        "explanation": "Conceding the bishop pair to maintain material balance."
      },
      {
        "from": "d1",
        "to": "f3",
        "san": "Qxf3",
        "piece": "q",
        "color": "w",
        "captured": "b",
        "flags": "c",
        "moveNumber": 5,
        "fenAfter": "rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5Q2/PPP2PPP/RNB1KB1R b KQkq - 0 5",
        "classification": "BEST",
        "evaluation": 1.1,
        "explanation": "Queen develops with tempo eyeing both d1 and f7."
      },
      {
        "from": "d6",
        "to": "e5",
        "san": "dxe5",
        "piece": "p",
        "color": "b",
        "captured": "p",
        "flags": "c",
        "moveNumber": 5,
        "fenAfter": "rn1qkbnr/ppp2ppp/8/4p3/4P3/5Q2/PPP2PPP/RNB1KB1R w KQkq - 0 6",
        "classification": "BEST",
        "evaluation": 1.1,
        "explanation": "Recaptures central pawn."
      },
      {
        "from": "f1",
        "to": "c4",
        "san": "Bc4",
        "piece": "b",
        "color": "w",
        "flags": "n",
        "moveNumber": 6,
        "fenAfter": "rn1qkbnr/ppp2ppp/8/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R b KQkq - 1 6",
        "classification": "BEST",
        "evaluation": 1.5,
        "explanation": "Direct checkmate threat on f7 (Scholar’s threat motif)."
      },
      {
        "from": "g8",
        "to": "f6",
        "san": "Nf6",
        "piece": "n",
        "color": "b",
        "flags": "n",
        "moveNumber": 6,
        "fenAfter": "rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R w KQkq - 2 7",
        "classification": "BEST",
        "evaluation": 1.4,
        "explanation": "Blocks the checkmate threat with kingside knight development."
      },
      {
        "from": "f3",
        "to": "b3",
        "san": "Qb3",
        "piece": "q",
        "color": "w",
        "flags": "n",
        "moveNumber": 7,
        "fenAfter": "rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/1Q6/PPP2PPP/RNB1K2R b KQkq - 3 7",
        "classification": "BEST",
        "evaluation": 2.2,
        "explanation": "Dual threat attacking both f7 and b7 simultaneously!"
      },
      {
        "from": "d8",
        "to": "e7",
        "san": "Qe7",
        "piece": "q",
        "color": "b",
        "flags": "n",
        "moveNumber": 7,
        "fenAfter": "rn2kb1r/ppp1qppp/5n2/4p3/2B1P3/1Q6/PPP2PPP/RNB1K2R w KQkq - 4 8",
        "classification": "GOOD",
        "evaluation": 2.1,
        "explanation": "Guards f7, but clutters Black’s development and blocks the f8 bishop."
      },
      {
        "from": "b1",
        "to": "c3",
        "san": "Nc3",
        "piece": "n",
        "color": "w",
        "flags": "n",
        "moveNumber": 8,
        "fenAfter": "rn2kb1r/ppp1qppp/5n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R b KQkq - 5 8",
        "classification": "BEST",
        "evaluation": 2.4,
        "explanation": "Morphy ignores the poisoned b7 pawn to prioritize overwhelming development!"
      },
      {
        "from": "c7",
        "to": "c6",
        "san": "c6",
        "piece": "p",
        "color": "b",
        "flags": "n",
        "moveNumber": 8,
        "fenAfter": "rn2kb1r/pp2qppp/2p2n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R w KQkq - 0 9",
        "classification": "GOOD",
        "evaluation": 2.3,
        "explanation": "Guards b7 and controls central squares."
      },
      {
        "from": "c1",
        "to": "g5",
        "san": "Bg5",
        "piece": "b",
        "color": "w",
        "flags": "n",
        "moveNumber": 9,
        "fenAfter": "rn2kb1r/pp2qppp/2p2n2/4p1B1/2B1P3/1QN5/PPP2PPP/R3K2R b KQkq - 1 9",
        "classification": "BEST",
        "evaluation": 3.1,
        "explanation": "Pins the critical knight that defends Black’s position."
      },
      {
        "from": "b7",
        "to": "b5",
        "san": "b5",
        "piece": "p",
        "color": "b",
        "flags": "b",
        "moveNumber": 9,
        "fenAfter": "rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10",
        "classification": "MISTAKE",
        "evaluation": 4.8,
        "explanation": "Weakens queenside pawns without resolving the uncastled king."
      },
      {
        "from": "c3",
        "to": "b5",
        "san": "Nxb5",
        "piece": "n",
        "color": "w",
        "captured": "p",
        "flags": "c",
        "moveNumber": 10,
        "fenAfter": "rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 10",
        "classification": "EXCELLENT",
        "evaluation": 5.5,
        "explanation": "Knight sacrifice blows open the a4-e8 diagonal directly at Black’s king!"
      },
      {
        "from": "c6",
        "to": "b5",
        "san": "cxb5",
        "piece": "p",
        "color": "b",
        "captured": "n",
        "flags": "c",
        "moveNumber": 10,
        "fenAfter": "rn2kb1r/p3qppp/5n2/1p2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R w KQkq - 0 11",
        "classification": "GOOD",
        "evaluation": 5.4,
        "explanation": "Accepts the sacrifice."
      },
      {
        "from": "c4",
        "to": "b5",
        "san": "Bxb5+",
        "piece": "b",
        "color": "w",
        "captured": "p",
        "flags": "c",
        "moveNumber": 11,
        "fenAfter": "rn2kb1r/p3qppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 11",
        "classification": "BEST",
        "evaluation": 6.2,
        "explanation": "Bishop check with decisive tempo!"
      },
      {
        "from": "b8",
        "to": "d7",
        "san": "Nbd7",
        "piece": "n",
        "color": "b",
        "flags": "n",
        "moveNumber": 11,
        "fenAfter": "r3kb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/R3K2R w KQkq - 1 12",
        "classification": "BEST",
        "evaluation": 6.2,
        "explanation": "Forced block under heavy pin."
      },
      {
        "from": "e1",
        "to": "c1",
        "san": "O-O-O",
        "piece": "k",
        "color": "w",
        "flags": "q",
        "moveNumber": 12,
        "fenAfter": "r3kb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R b kq - 2 12",
        "classification": "BEST",
        "evaluation": 7.5,
        "explanation": "Queenside castling activates the d1 rook with full vertical pressure on d7!"
      },
      {
        "from": "a8",
        "to": "d8",
        "san": "Rd8",
        "piece": "r",
        "color": "b",
        "flags": "n",
        "moveNumber": 12,
        "fenAfter": "3rkb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R w k - 3 13",
        "classification": "GOOD",
        "evaluation": 7.6,
        "explanation": "Defending the pinned knight with the rook."
      },
      {
        "from": "d1",
        "to": "d7",
        "san": "Rxd7",
        "piece": "r",
        "color": "w",
        "captured": "n",
        "flags": "c",
        "moveNumber": 13,
        "fenAfter": "3rkb1r/p2Rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2K4R b k - 0 13",
        "classification": "BEST",
        "evaluation": 9.8,
        "explanation": "Rook exchange sacrifice demolishing Black’s defensive foundation!"
      },
      {
        "from": "d8",
        "to": "d7",
        "san": "Rxd7",
        "piece": "r",
        "color": "b",
        "captured": "r",
        "flags": "c",
        "moveNumber": 13,
        "fenAfter": "4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2K4R w k - 0 14",
        "classification": "GOOD",
        "evaluation": 9.7,
        "explanation": "Recaptures on d7."
      },
      {
        "from": "h1",
        "to": "d1",
        "san": "Rd1",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 14,
        "fenAfter": "4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 1 14",
        "classification": "BEST",
        "evaluation": 11.2,
        "explanation": "Brings the final rook into play. The pin on d7 is completely paralyzing."
      },
      {
        "from": "e7",
        "to": "e6",
        "san": "Qe6",
        "piece": "q",
        "color": "b",
        "flags": "n",
        "moveNumber": 14,
        "fenAfter": "4kb1r/p2r1ppp/4qn2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 2 15",
        "classification": "GOOD",
        "evaluation": 11.5,
        "explanation": "Attempting to trade queens and escape the vice grip."
      },
      {
        "from": "b5",
        "to": "d7",
        "san": "Bxd7+",
        "piece": "b",
        "color": "w",
        "captured": "r",
        "flags": "c",
        "moveNumber": 15,
        "fenAfter": "4kb1r/p2B1ppp/4qn2/4p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 15",
        "classification": "BEST",
        "evaluation": 14,
        "explanation": "Liquidating defenders with check."
      },
      {
        "from": "f6",
        "to": "d7",
        "san": "Nxd7",
        "piece": "n",
        "color": "b",
        "captured": "b",
        "flags": "c",
        "moveNumber": 15,
        "fenAfter": "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16",
        "classification": "BEST",
        "evaluation": 14.1,
        "explanation": "Recaptures knight."
      },
      {
        "from": "b3",
        "to": "b8",
        "san": "Qb8+",
        "piece": "q",
        "color": "w",
        "flags": "n",
        "moveNumber": 16,
        "fenAfter": "1Q2kb1r/p2n1ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 b k - 1 16",
        "classification": "BEST",
        "evaluation": 99,
        "explanation": "Legendary queen sacrifice! Deflects Black’s knight from guarding the d8 square."
      },
      {
        "from": "d7",
        "to": "b8",
        "san": "Nxb8",
        "piece": "n",
        "color": "b",
        "captured": "q",
        "flags": "c",
        "moveNumber": 16,
        "fenAfter": "1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 17",
        "classification": "BEST",
        "evaluation": 99,
        "explanation": "Forced recapture."
      },
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#",
        "piece": "r",
        "color": "w",
        "flags": "n",
        "moveNumber": 17,
        "fenAfter": "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17",
        "classification": "BEST",
        "evaluation": 99,
        "explanation": "Back-rank checkmate! Morphy finishes with every piece contributing to total dominance."
      }
    ],
    "pgn": "[Event \"?\"]\n[Site \"?\"]\n[Date \"????.??.??\"]\n[Round \"?\"]\n[White \"?\"]\n[Black \"?\"]\n[Result \"*\"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# *",
    "finalFen": "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17"
  }
];
