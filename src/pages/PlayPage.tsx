import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Move, Square } from 'chess.js';
import { ChessBoard } from '../components/chess/ChessBoard';
import { EvaluationBar } from '../components/chess/EvaluationBar';
import { PlayerCard } from '../components/game/PlayerCard';
import { GameControls } from '../components/game/GameControls';
import { GameStatusBanner } from '../components/game/GameStatusBanner';
import { GameReviewModal } from '../components/game/GameReviewModal';
import { CoachPanel } from '../components/coach/CoachPanel';
import { chessEngine } from '../services/chessEngine';
import { coachService } from '../services/coachService';
import { openingService } from '../services/openingService';
import { gameService } from '../services/gameService';
import { SavedGame } from '../mock/mockGames';
import { sounds } from '../utils/soundEffects';
import { detectChessTheme } from '../utils/analyzeUtils';
import {
  PieceColor,
  PieceType,
  MoveRecord,
  MoveClassification,
  EvaluationData,
  BoardOrientation,
  SquareName
} from '../types/chess';
import {
  GameDifficulty,
  GameStatus,
  OpeningInfo,
  PostGameAnalysis,
  GameResult
} from '../types/game';
import { CoachMessage, CoachMode, CoachPromptOption } from '../types/coach';
import { PlayerProfile } from '../types/user';
import { recordCompletedMatch } from '../services/playerProfileService';
import {
  Bot,
  Play,
  Sparkles,
  Clock,
  Shield,
  Zap,
  Check,
  RotateCcw,
  Shuffle,
  ChevronRight,
  Award,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

export interface BotPersona {
  id: string;
  name: string;
  title: string;
  rating: number;
  difficulty: GameDifficulty;
  avatar: string;
  style: string;
  description: string;
  badgeClass: string;
}

export const BOT_PERSONAS: BotPersona[] = [
  {
    id: 'bot-jimmy',
    name: 'Jimmy',
    title: 'Beginner Bot',
    rating: 600,
    difficulty: 'Beginner',
    avatar: '🐣',
    style: 'Casual & Tactical Learner',
    description: 'Prone to tactical oversights. Excellent for practicing piece development, captures, and fundamental checkmates.',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40'
  },
  {
    id: 'bot-elena',
    name: 'Elena',
    title: 'Club Player',
    rating: 1200,
    difficulty: 'Intermediate',
    avatar: '⚔️',
    style: 'Solid Classical Play',
    description: 'Knows foundational opening principles, castles early, and defends solidly. Punishes hanging pieces and early mistakes.',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800/40'
  },
  {
    id: 'bot-victor',
    name: 'Victor',
    title: 'Tactical Master',
    rating: 1600,
    difficulty: 'Advanced',
    avatar: '⚡',
    style: 'Aggressive Attacker',
    description: 'Loves open files, king hunts, and pawn storms. Seeks dynamic tactical complications and demands sharp calculation.',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800/40'
  },
  {
    id: 'bot-magnus',
    name: 'Magnus Bot',
    title: 'Grandmaster AI',
    rating: 2200,
    difficulty: 'Expert',
    avatar: '👑',
    style: 'Deep Stockfish 19 Engine',
    description: 'Ruthless positional and tactical mastery. Evaluates deep candidate variations and exploits the slightest positional weakness.',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800/40'
  },
  {
    id: 'bot-adaptive',
    name: 'Adaptive Coach',
    title: 'Balanced Peer',
    rating: 1400,
    difficulty: 'Equal',
    avatar: '🎓',
    style: 'Real-Time Mentorship',
    description: 'Matches your personal rating dynamically and provides guided real-time explanations for every key phase of the match.',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40'
  }
];

export interface TimeControlOption {
  id: string;
  name: string;
  category: 'Blitz' | 'Rapid' | 'Casual';
  totalSeconds: number;
  incrementSeconds: number;
}

export const TIME_CONTROLS: TimeControlOption[] = [
  { id: '3m', name: '3 min', category: 'Blitz', totalSeconds: 180, incrementSeconds: 0 },
  { id: '5m', name: '5 min', category: 'Blitz', totalSeconds: 300, incrementSeconds: 0 },
  { id: '10m', name: '10 min', category: 'Rapid', totalSeconds: 600, incrementSeconds: 0 },
  { id: '15|10', name: '15 | 10', category: 'Rapid', totalSeconds: 900, incrementSeconds: 10 },
  { id: 'unlimited', name: 'Unlimited', category: 'Casual', totalSeconds: 0, incrementSeconds: 0 }
];

interface PlayPageProps {
  userProfile: PlayerProfile;
  onNavigate: (route: string) => void;
}

export const PlayPage: React.FC<PlayPageProps> = ({ userProfile, onNavigate }) => {
  // Match Lobby & Setup State: user does not auto-start upon entering /play
  const [hasStartedMatch, setHasStartedMatch] = useState<boolean>(false);
  const [selectedBotId, setSelectedBotId] = useState<string>('bot-elena');
  const [chosenSide, setChosenSide] = useState<'w' | 'b' | 'random'>('w');
  const [selectedTimeControlId, setSelectedTimeControlId] = useState<string>('10m');

  // Active Game State
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('Intermediate');
  const [coachMode, setCoachMode] = useState<CoachMode>('FULL_COACHING');
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);

  const selectedBot = useMemo(() => {
    return BOT_PERSONAS.find((b) => b.id === selectedBotId) || BOT_PERSONAS[1];
  }, [selectedBotId]);

  const selectedTimeControl = useMemo(() => {
    return TIME_CONTROLS.find((t) => t.id === selectedTimeControlId) || TIME_CONTROLS[2];
  }, [selectedTimeControlId]);

  // Chess Game State
  const [chess] = useState<Chess>(() => new Chess());
  const [, setRenderTrigger] = useState(0); // force React re-render when chess state changes
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const movesRef = useRef<MoveRecord[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<PieceType[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceType[]>([]);
  const [materialDelta, setMaterialDelta] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('IN_PROGRESS');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [opening, setOpening] = useState<OpeningInfo | undefined>(undefined);
  const [evaluation, setEvaluation] = useState<EvaluationData>(() => {
    const status = chessEngine.getStatus?.();
    return {
      score: 0.2,
      isMate: false,
      label: 'Equal',
      source: status?.isStockfish ? 'stockfish' : 'heuristic'
    };
  });

  // Clocks State (in seconds)
  const [playerTime, setPlayerTime] = useState(600); // 10 minutes
  const [opponentTime, setOpponentTime] = useState(600);

  // Coach State
  const [currentCoachMessage, setCurrentCoachMessage] = useState<CoachMessage | null>(() => ({
    id: 'welcome',
    type: 'OPENING_PRINCIPLE',
    title: 'Ready for Today\'s Match',
    content: 'Stake your claim in the center with 1. e4 or 1. d4, or respond dynamically to your opponent.',
    lesson: 'Develop your pieces efficiently and prioritize early king safety.',
    timestamp: Date.now()
  }));
  const [coachMessageHistory, setCoachMessageHistory] = useState<CoachMessage[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [presetPrompts] = useState<CoachPromptOption[]>(() => coachService.getPresetPrompts());

  // Post Game Review
  const [postGameAnalysis, setPostGameAnalysis] = useState<PostGameAnalysis | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedGame, setLastSavedGame] = useState<SavedGame | null>(null);
  const [lastRatingDelta, setLastRatingDelta] = useState<number | undefined>(undefined);
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);
  const [isFocusBoardMode, setIsFocusBoardMode] = useState(false);

  const isMounted = useRef(true);

  // Helper to force board re-render
  const updateBoard = useCallback(() => {
    setRenderTrigger((prev) => prev + 1);
  }, []);

  const persistCompletedGame = useCallback(async (gameToSave: SavedGame) => {
    setLastSavedGame(gameToSave);
    setSaveStatus('saving');
    setSaveError(null);

    try {
      await gameService.saveGame(gameToSave);
      setSaveStatus('saved');
      setSaveError(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('chess_mastery_unsaved_game');
      }
    } catch (err: any) {
      console.error('[PlayPage] Failed to save game to server:', err);
      const errorMsg = err.message || 'Could not connect to persistence server.';
      setSaveStatus('failed');
      setSaveError(errorMsg);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('chess_mastery_unsaved_game', JSON.stringify(gameToSave));
        } catch {
          // Ignore localStorage quota errors
        }
      }
    }
  }, []);

  // Update captured pieces & material difference
  const updateCapturedPieces = useCallback(() => {
    const history = chess.history({ verbose: true }) as Move[];
    const whiteCaptures: PieceType[] = [];
    const blackCaptures: PieceType[] = [];

    const pieceValues: Record<PieceType, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0
    };

    let wScore = 0;
    let bScore = 0;

    for (const m of history) {
      if (m.captured) {
        if (m.color === 'w') {
          whiteCaptures.push(m.captured);
          wScore += pieceValues[m.captured] || 0;
        } else {
          blackCaptures.push(m.captured);
          bScore += pieceValues[m.captured] || 0;
        }
      }
    }

    setCapturedWhite(whiteCaptures);
    setCapturedBlack(blackCaptures);
    setMaterialDelta(wScore - bScore);
  }, [chess]);

  const runFullGameAnalysis = useCallback(async (
    rawMoves: MoveRecord[],
    color: PieceColor,
    gameResult: GameResult,
    resultReason: string
  ): Promise<{ analyzedMoves: MoveRecord[]; analysis: PostGameAnalysis }> => {
    const analyzedMoves: MoveRecord[] = [];
    const replayChess = new Chess();

    for (const m of rawMoves) {
      const fenBefore = replayChess.fen();
      let classification: MoveClassification = m.classification || 'GOOD';
      let bestMove: string = m.bestMove || m.san;
      let explanation: string = m.explanation || '';
      let evaluation: number = m.evaluation ?? 0;
      let evalBefore: number | undefined = m.evalBefore;
      let evalDelta: number | undefined = m.evalDelta;
      let principalVariation: string[] | undefined = m.principalVariation;
      let theme: string | undefined = m.theme;

      try {
        const moveRes = replayChess.move({
          from: m.from as Square,
          to: m.to as Square,
          promotion: m.promotion as PieceType | undefined
        });

        if (moveRes) {
          const fenAfter = replayChess.fen();
          const classRes = await chessEngine.classifyMove(fenBefore, fenAfter, m.san);
          classification = classRes.classification;
          bestMove = classRes.bestMove;
          explanation = classRes.explanation;
          evalBefore = classRes.evalBefore;
          evalDelta = classRes.evalDelta;
          principalVariation = classRes.principalVariation;
          theme = detectChessTheme(fenBefore, fenAfter, m);

          const posEval = await chessEngine.evaluatePosition(fenAfter);
          evaluation = posEval.score;
        }
      } catch (err) {
        console.warn('[PlayPage] Move classification error for', m.san, err);
      }

      analyzedMoves.push({
        ...m,
        classification,
        bestMove,
        explanation,
        evaluation,
        evalBefore,
        evalDelta,
        principalVariation,
        theme
      });
    }

    const postGame = await coachService.generatePostGameAnalysis(
      analyzedMoves,
      color,
      gameResult,
      resultReason
    );

    // Collect detected themes for player mistakes
    const detectedThemes = Array.from(
      new Set(
        analyzedMoves
          .filter((m) => m.color === color && m.theme)
          .map((m) => m.theme!)
      )
    );
    postGame.detectedThemes = detectedThemes;

    return { analyzedMoves, analysis: postGame };
  }, []);

  // Check Game Completion
  const checkGameCompletion = useCallback(async () => {
    if (chess.isGameOver()) {
      let result: GameResult = 'DRAW';
      let reason = 'Game finished';

      if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'b' : 'w';
        result = winner === 'w' ? 'WHITE_WINS' : 'BLACK_WINS';
        reason = `Checkmate! ${winner === 'w' ? 'White' : 'Black'} won`;
        setGameStatus('CHECKMATE');
        sounds.playVictory();
      } else if (chess.isStalemate()) {
        setGameStatus('STALEMATE');
        reason = 'Draw by Stalemate';
      } else if (chess.isThreefoldRepetition()) {
        setGameStatus('DRAW_REPETITION');
        reason = 'Draw by Threefold Repetition';
      } else if (chess.isInsufficientMaterial()) {
        setGameStatus('DRAW_MATERIAL');
        reason = 'Draw by Insufficient Material';
      } else {
        setGameStatus('DRAW_50_MOVES');
        reason = 'Draw by 50-move rule';
      }

      // Generate objective post game review with move-by-move evaluations
      const { analyzedMoves, analysis } = await runFullGameAnalysis(
        [...movesRef.current],
        playerColor,
        result,
        reason
      );
      movesRef.current = analyzedMoves;
      setMoves(analyzedMoves);
      setPostGameAnalysis(analysis);

      // Persist the completed game with all moves so it can be fully analyzed in AnalyzePage
      const botRating = selectedBot.id === 'bot-adaptive' ? userProfile.rating : selectedBot.rating;

      const savedGame: SavedGame = {
        id: `game-${Date.now()}`,
        whitePlayer: playerColor === 'w' ? userProfile.name : selectedBot.name,
        whiteRating: playerColor === 'w' ? userProfile.rating : botRating,
        blackPlayer: playerColor === 'b' ? userProfile.name : selectedBot.name,
        blackRating: playerColor === 'b' ? userProfile.rating : botRating,
        result,
        resultString: result === 'WHITE_WINS' ? '1 - 0' : result === 'BLACK_WINS' ? '0 - 1' : '1/2 - 1/2',
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        opening: opening || {
          eco: 'A00',
          name: 'Standard Opening',
          description: 'Initial chess opening moves.'
        },
        accuracy: {
          white: playerColor === 'w' ? analysis.accuracy.player : analysis.accuracy.opponent,
          black: playerColor === 'b' ? analysis.accuracy.player : analysis.accuracy.opponent
        },
        moves: analyzedMoves,
        pgn: chess.pgn(),
        finalFen: chess.fen(),
        analysis
      };

      // Record match rating progression dynamically
      const { delta } = recordCompletedMatch(selectedBot.name, botRating, result, playerColor);
      setLastRatingDelta(delta);

      setIsReviewModalOpen(true);
      await persistCompletedGame(savedGame);

      return true;
    }

    if (chess.inCheck()) {
      setGameStatus('CHECK');
      sounds.playCheck();
    } else {
      setGameStatus('IN_PROGRESS');
    }

    return false;
  }, [chess, playerColor, userProfile, difficulty, opening, persistCompletedGame, runFullGameAnalysis]);

  // Execute bot move when it's AI turn
  const handleBotMove = useCallback(async () => {
    if (chess.isGameOver() || chess.turn() === playerColor) {
      return;
    }

    setIsAiThinking(true);
    try {
      const fenBefore = chess.fen();
      const botMoveResult = await chessEngine.getBestMove(fenBefore, difficulty, userProfile.rating);

      if (!isMounted.current) return;

      const move = chess.move({
        from: botMoveResult.from as Square,
        to: botMoveResult.to as Square,
        promotion: botMoveResult.promotion as PieceType | undefined
      });

      if (move) {
        if (move.captured) {
          sounds.playCapture();
        } else if (move.san === 'O-O' || move.san === 'O-O-O') {
          sounds.playCastle();
        } else {
          sounds.playMove();
        }

        setLastMove({ from: move.from, to: move.to });

        const currentMoves = movesRef.current;
        const newRecord: MoveRecord = {
          from: move.from as SquareName,
          to: move.to as SquareName,
          san: move.san,
          piece: move.piece,
          color: move.color,
          captured: move.captured,
          flags: move.flags,
          fenAfter: chess.fen(),
          moveNumber: Math.floor(currentMoves.length / 2) + 1
        };

        const updatedMoves = [...currentMoves, newRecord];
        movesRef.current = updatedMoves;
        setMoves(updatedMoves);
        updateCapturedPieces();

        // Update opening
        const currentOpening = openingService.identifyOpening(updatedMoves.map((m) => m.san));
        setOpening(currentOpening);

        // Update eval
        const newEval = await chessEngine.evaluatePosition(chess.fen());
        setEvaluation(newEval);

        updateBoard();
        await checkGameCompletion();
      }
    } catch (error) {
      console.error('Bot move failed', error);
    } finally {
      if (isMounted.current) {
        setIsAiThinking(false);
      }
    }
  }, [chess, difficulty, playerColor, updateCapturedPieces, updateBoard, checkGameCompletion]);

  // Clocks timer effect
  useEffect(() => {
    if (gameStatus !== 'IN_PROGRESS' && gameStatus !== 'CHECK') return;

    const timer = setInterval(() => {
      if (chess.turn() === playerColor) {
        setPlayerTime((prev) => Math.max(0, prev - 1));
      } else {
        setOpponentTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [chess, gameStatus, playerColor]);

  // Handle human move on board
  const handlePlayerMove = async ({
    from,
    to,
    promotion
  }: {
    from: string;
    to: string;
    promotion?: PieceType;
  }) => {
    if (chess.isGameOver() || chess.turn() !== playerColor || isAiThinking) {
      return false;
    }

    const fenBefore = chess.fen();
    try {
      const move = chess.move({
        from: from as Square,
        to: to as Square,
        promotion: promotion as PieceType | undefined
      });

      if (!move) return false;

      // Play audio
      if (move.captured) {
        sounds.playCapture();
      } else if (move.san === 'O-O' || move.san === 'O-O-O') {
        sounds.playCastle();
      } else {
        sounds.playMove();
      }

      setLastMove({ from: move.from, to: move.to });
      setHighlightedSquares([]);

      const currentMoves = movesRef.current;
      const newRecord: MoveRecord = {
        from: move.from as SquareName,
        to: move.to as SquareName,
        san: move.san,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        flags: move.flags,
        fenAfter: chess.fen(),
        moveNumber: Math.floor(currentMoves.length / 2) + 1
      };

      const updatedMoves = [...currentMoves, newRecord];
      movesRef.current = updatedMoves;
      setMoves(updatedMoves);
      updateCapturedPieces();

      // Identify opening
      const currentOpening = openingService.identifyOpening(updatedMoves.map((m) => m.san));
      setOpening(currentOpening);

      // Evaluate position
      const newEval = await chessEngine.evaluatePosition(chess.fen());
      setEvaluation(newEval);

      updateBoard();

      // Coach reaction
      const coachReaction = await coachService.analyzeMove({
        fenBefore,
        fenAfter: chess.fen(),
        moveSan: move.san,
        moveNumber: newRecord.moveNumber,
        moveHistorySan: updatedMoves.map((m) => m.san),
        playerColor,
        opening: currentOpening,
        coachMode
      });

      if (coachReaction) {
        setCurrentCoachMessage(coachReaction);
        setCoachMessageHistory((prev) => [coachReaction, ...prev]);
        if (coachReaction.highlightSquares) {
          setHighlightedSquares(coachReaction.highlightSquares);
        }
      }

      // Check if player's move ended game
      const isOver = await checkGameCompletion();
      if (!isOver) {
        // Trigger bot reply
        setTimeout(() => {
          handleBotMove();
        }, 300);
      }

      return true;
    } catch (err) {
      console.warn('Illegal move attempted:', err);
      return false;
    }
  };

  // Undo move (reverts both player & bot moves)
  const handleUndo = () => {
    if (moves.length === 0 || isAiThinking) return;

    // Undo bot move if it exists
    if (chess.turn() === playerColor && movesRef.current.length >= 2) {
      chess.undo();
      chess.undo();
      const newMoves = movesRef.current.slice(0, -2);
      movesRef.current = newMoves;
      setMoves(newMoves);
      const last = newMoves[newMoves.length - 1];
      setLastMove(last ? { from: last.from, to: last.to } : null);
    } else {
      chess.undo();
      const newMoves = movesRef.current.slice(0, -1);
      movesRef.current = newMoves;
      setMoves(newMoves);
      const last = newMoves[newMoves.length - 1];
      setLastMove(last ? { from: last.from, to: last.to } : null);
    }

    updateCapturedPieces();
    updateBoard();
    setGameStatus('IN_PROGRESS');
  };

  // Coach Hint Request
  const handleRequestHint = async () => {
    if (isAiThinking || chess.turn() !== playerColor) return;
    const hint = await coachService.getHint(chess.fen(), playerColor);
    setCurrentCoachMessage(hint);
    if (hint.highlightSquares) {
      setHighlightedSquares(hint.highlightSquares);
    }
  };

  // Conversational Coach query
  const handleAskCoach = async (query: string) => {
    const reply = await coachService.answerQuestion(query, chess.fen(), moves, opening);
    setCurrentCoachMessage(reply);
    setCoachMessageHistory((prev) => [reply, ...prev]);
  };

  // Resignation
  const handleResign = async () => {
    if (chess.isGameOver()) return;
    setGameStatus('RESIGNED');
    const result: GameResult = playerColor === 'w' ? 'BLACK_WINS' : 'WHITE_WINS';
    const reason = 'You resigned the game';

    const { analyzedMoves, analysis } = await runFullGameAnalysis(
      [...movesRef.current],
      playerColor,
      result,
      reason
    );
    movesRef.current = analyzedMoves;
    setMoves(analyzedMoves);
    setPostGameAnalysis(analysis);

    const botRating = selectedBot.id === 'bot-adaptive' ? userProfile.rating : selectedBot.rating;

    const savedGame: SavedGame = {
      id: `game-${Date.now()}`,
      whitePlayer: playerColor === 'w' ? userProfile.name : selectedBot.name,
      whiteRating: playerColor === 'w' ? userProfile.rating : botRating,
      blackPlayer: playerColor === 'b' ? userProfile.name : selectedBot.name,
      blackRating: playerColor === 'b' ? userProfile.rating : botRating,
      result,
      resultString: result === 'WHITE_WINS' ? '1 - 0' : '0 - 1',
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      opening: opening || {
        eco: 'A00',
        name: 'Standard Opening',
        description: 'Initial chess opening moves.'
      },
      accuracy: {
        white: playerColor === 'w' ? analysis.accuracy.player : analysis.accuracy.opponent,
        black: playerColor === 'b' ? analysis.accuracy.player : analysis.accuracy.opponent
      },
      moves: analyzedMoves,
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      analysis
    };

    const { delta } = recordCompletedMatch(selectedBot.name, botRating, result, playerColor);
    setLastRatingDelta(delta);

    setIsReviewModalOpen(true);
    await persistCompletedGame(savedGame);
  };

  // Timeout / Flag fall handler
  const handleFlagFall = useCallback(async (flaggedSide: 'PLAYER' | 'OPPONENT') => {
    if (chess.isGameOver()) return;
    setGameStatus('TIMEOUT');
    const result: GameResult = flaggedSide === 'PLAYER'
      ? (playerColor === 'w' ? 'BLACK_WINS' : 'WHITE_WINS')
      : (playerColor === 'w' ? 'WHITE_WINS' : 'BLACK_WINS');
    const reason = flaggedSide === 'PLAYER' ? 'You ran out of time' : `${selectedBot.name} ran out of time`;
    sounds.playVictory();

    const { analyzedMoves, analysis } = await runFullGameAnalysis(
      [...movesRef.current],
      playerColor,
      result,
      reason
    );
    movesRef.current = analyzedMoves;
    setMoves(analyzedMoves);
    setPostGameAnalysis(analysis);

    const savedGame: SavedGame = {
      id: `game-${Date.now()}`,
      whitePlayer: playerColor === 'w' ? userProfile.name : selectedBot.name,
      whiteRating: playerColor === 'w' ? userProfile.rating : selectedBot.rating,
      blackPlayer: playerColor === 'b' ? userProfile.name : selectedBot.name,
      blackRating: playerColor === 'b' ? userProfile.rating : selectedBot.rating,
      result,
      resultString: result === 'WHITE_WINS' ? '1 - 0' : '0 - 1',
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      opening: opening || {
        eco: 'A00',
        name: 'Standard Opening',
        description: 'Initial chess opening moves.'
      },
      accuracy: {
        white: playerColor === 'w' ? analysis.accuracy.player : analysis.accuracy.opponent,
        black: playerColor === 'b' ? analysis.accuracy.player : analysis.accuracy.opponent
      },
      moves: analyzedMoves,
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      analysis
    };

    const botRating = selectedBot.id === 'bot-adaptive' ? userProfile.rating : selectedBot.rating;
    const { delta } = recordCompletedMatch(selectedBot.name, botRating, result, playerColor);
    setLastRatingDelta(delta);

    setIsReviewModalOpen(true);
    await persistCompletedGame(savedGame);
  }, [chess, playerColor, userProfile, selectedBot, opening, persistCompletedGame, runFullGameAnalysis]);

  // Start match explicitly from match setup lobby
  const startMatchNow = (
    bot: BotPersona = selectedBot,
    side: 'w' | 'b' | 'random' = chosenSide,
    tc: TimeControlOption = selectedTimeControl,
    cMode: CoachMode = coachMode
  ) => {
    const finalColor: PieceColor = side === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : side;
    setPlayerColor(finalColor);
    setBoardOrientation(finalColor === 'w' ? 'white' : 'black');
    setDifficulty(bot.difficulty);
    setCoachMode(cMode);

    chess.reset();
    movesRef.current = [];
    setMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMaterialDelta(0);
    setLastMove(null);
    setHighlightedSquares([]);
    setGameStatus('IN_PROGRESS');
    setSaveStatus('idle');
    setSaveError(null);
    setLastSavedGame(null);
    setOpening(undefined);

    const initTime = tc.totalSeconds > 0 ? tc.totalSeconds : 600;
    setPlayerTime(initTime);
    setOpponentTime(initTime);

    const engineStatus = chessEngine.getStatus?.();
    setEvaluation({
      score: 0.2,
      isMate: false,
      label: 'Equal',
      source: engineStatus?.isStockfish ? 'stockfish' : 'heuristic'
    });

    setCurrentCoachMessage({
      id: 'welcome',
      type: 'OPENING_PRINCIPLE',
      title: `Match vs ${bot.name} (${bot.rating}) Started`,
      content: finalColor === 'w'
        ? `You play as White! Stake your claim in the center with 1. e4 or 1. d4.`
        : `${bot.name} plays White and will make their opening move. Prepare your defenses!`,
      lesson: 'Control the center, develop knights & bishops, and castle early.',
      timestamp: Date.now()
    });

    setHasStartedMatch(true);
    setIsNewGameModalOpen(false);
    setIsReviewModalOpen(false);
    updateBoard();

    // If player is Black, bot plays first move
    if (finalColor === 'b') {
      setTimeout(() => {
        handleBotMove();
      }, 600);
    }
  };

  // Reset Game alias
  const startNewGame = (
    color: PieceColor = 'w',
    diff: GameDifficulty = difficulty,
    cMode: CoachMode = coachMode
  ) => {
    startMatchNow(selectedBot, color, selectedTimeControl, cMode);
  };

  const isGameActive = gameStatus === 'IN_PROGRESS' || gameStatus === 'CHECK';

  // Active Clock Countdown Effect
  useEffect(() => {
    if (!hasStartedMatch || !isGameActive || selectedTimeControl.totalSeconds === 0) {
      return;
    }

    const timer = setInterval(() => {
      const turn = chess.turn();
      const isPlayerTurn = turn === playerColor;

      if (isPlayerTurn) {
        setPlayerTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFlagFall('PLAYER');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOpponentTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleFlagFall('OPPONENT');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStartedMatch, isGameActive, selectedTimeControl.totalSeconds, chess, playerColor, handleFlagFall]);

  return (
    <div className="min-h-full p-2 sm:p-4 max-w-7xl mx-auto flex flex-col justify-start text-slate-800 dark:text-zinc-100 overflow-y-scroll">
      {!hasStartedMatch ? (
        /* Match Setup Lobby: User enters /play and selects bot, side, and time before starting */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Hero Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#81B64C]/15 text-[#81B64C] dark:text-emerald-400 border border-[#81B64C]/30 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Bot Match Setup
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                  Ready to Play
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                Play vs Computer & Bots
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
                Choose an AI bot opponent, set your side, configure your time control, and click Start Match when you are ready to begin.
              </p>
            </div>

            <button
              onClick={() => startMatchNow()}
              className="chess-btn-green px-6 py-3.5 rounded-xl text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Match vs {selectedBot.name}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 cols: Board Preview */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span className="text-base">{selectedBot.avatar}</span>
                    <span>{selectedBot.name} ({selectedBot.id === 'bot-adaptive' ? `${userProfile.rating} Dynamic` : selectedBot.rating})</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                    {chosenSide === 'b' ? 'Plays White (1st)' : 'Plays Black'}
                  </span>
                </div>

                <div className="w-full max-w-[360px] aspect-square flex items-center justify-center">
                  <ChessBoard
                    chess={chess}
                    orientation={chosenSide === 'b' ? 'black' : 'white'}
                    isInteractive={false}
                    lastMove={null}
                    highlightedSquares={[]}
                    onMovePiece={() => false}
                  />
                </div>

                <div className="w-full flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100 dark:border-[#273042]">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>👤</span>
                    <span>{userProfile.name} ({userProfile.rating})</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    {chosenSide === 'b' ? 'Plays Black' : chosenSide === 'random' ? 'Random Side' : 'Plays White (1st)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Bot & Match Configuration Options */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Choose Opponent Bot */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#81B64C]" />
                    <span>1. Select Opponent Bot</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    5 Distinct Personas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BOT_PERSONAS.map((bot) => {
                    const isSelected = bot.id === selectedBotId;
                    return (
                      <div
                        key={bot.id}
                        onClick={() => setSelectedBotId(bot.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#81B64C] ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-[#141822] border-slate-200 dark:border-[#273042] hover:bg-slate-100 dark:hover:bg-[#1C2230]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{bot.avatar}</span>
                              <div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{bot.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#81B64C]" />}
                                </h3>
                                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">
                                  {bot.title}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${bot.badgeClass}`}>
                              {bot.id === 'bot-adaptive' ? `${userProfile.rating} Dynamic` : `${bot.rating}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug mt-1">
                            {bot.description}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#242A38] flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 dark:text-zinc-400">Playstyle</span>
                          <span className="font-bold text-slate-700 dark:text-zinc-300">{bot.style}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Choose Side & 3. Time Control */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Choose Side */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-2.5">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                    2. Choose Your Side
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setChosenSide('w')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center font-bold text-xs transition-all cursor-pointer ${
                        chosenSide === 'w'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-[10px]">
                        ♔
                      </span>
                      <span>White</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenSide('random')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center font-bold text-xs transition-all cursor-pointer ${
                        chosenSide === 'random'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <Shuffle className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                      <span>Random</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenSide('b')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center font-bold text-xs transition-all cursor-pointer ${
                        chosenSide === 'b'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 shadow-xs flex items-center justify-center text-white text-[10px]">
                        ♚
                      </span>
                      <span>Black</span>
                    </button>
                  </div>
                </div>

                {/* Time Control */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-2.5">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#81B64C]" />
                    <span>3. Time Control</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {TIME_CONTROLS.map((tc) => (
                      <button
                        key={tc.id}
                        type="button"
                        onClick={() => setSelectedTimeControlId(tc.id)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                          selectedTimeControlId === tc.id
                            ? 'bg-[#81B64C] text-white border-[#81B64C] shadow-xs'
                            : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                        }`}
                      >
                        {tc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Coaching Feedback Mode */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-2.5">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#81B64C]" />
                  <span>4. AI Coach Guidance Level</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'FULL_COACHING' as CoachMode, label: 'Full Coaching', desc: 'Real-time tips, tactical hints, and explanations' },
                    { id: 'IMPORTANT_MISTAKES' as CoachMode, label: 'Mistakes Only', desc: 'Alerts only on inaccuracies, mistakes & blunders' },
                    { id: 'POST_GAME_ONLY' as CoachMode, label: 'Strict / Match', desc: 'No live coach hints; comprehensive post-game review' }
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => setCoachMode(cm.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        coachMode === cm.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{cm.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">{cm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Launch Match Button */}
              <button
                onClick={() => startMatchNow()}
                className="chess-btn-green w-full py-4 rounded-xl text-white font-black text-sm sm:text-base shadow-lg transition-transform flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.01]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Match vs {selectedBot.name} ({selectedBot.id === 'bot-adaptive' ? `${userProfile.rating} Dynamic` : selectedBot.rating})</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Game View */
        <>
          {/* Top Header info bar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedBot.avatar}</span>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
                  Match vs {selectedBot.name}
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-zinc-400">
                  <span>Rating: {selectedBot.id === 'bot-adaptive' ? `${userProfile.rating} Dynamic` : selectedBot.rating}</span>
                  <span>•</span>
                  <span>Time: {selectedTimeControl.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Full Board Focus Mode Toggle (Desktop) */}
              <button
                onClick={() => setIsFocusBoardMode((prev) => !prev)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E2330] hover:bg-slate-100 dark:hover:bg-[#252C3D] text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700/60 shadow-xs transition-colors cursor-pointer"
                title={isFocusBoardMode ? 'Exit Full Board Mode' : 'Expand Board (Full Board Mode)'}
              >
                {isFocusBoardMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFocusBoardMode ? 'Split View' : 'Full Board Mode'}</span>
              </button>

              {/* Toggle Coach & Move Analysis Pop-up Drawer */}
              <button
                onClick={() => setIsCoachDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  isFocusBoardMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'xl:hidden bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="Open Coach & Move History"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Coach & Analysis</span>
                {moves.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono">
                    {moves.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setHasStartedMatch(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2330] hover:bg-slate-100 dark:hover:bg-[#252C3D] text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700/60 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Change Bot / Setup</span>
              </button>
              <button
                onClick={() => setIsNewGameModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2330] hover:bg-slate-100 dark:hover:bg-[#252C3D] text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700/60 shadow-xs transition-colors cursor-pointer"
              >
                Match Options
              </button>
            </div>
          </div>

          {/* Main Layout: Fixed-size Board Column (Left) + Optional Side Panel (Right) */}
          <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 w-full">
            {/* Board Column: Locked dimensions to completely prevent size jumping on move */}
            <div
              className={`flex flex-col gap-2.5 w-full mx-auto shrink-0 transition-all ${
                isFocusBoardMode
                  ? 'max-w-[min(100%,_min(84vh,_780px))]'
                  : 'max-w-[min(100%,_min(80vh,_680px))]'
              }`}
            >
              {/* Opponent Card (Top) */}
              <PlayerCard
                name={selectedBot.name}
                rating={
                  selectedBot.id === 'bot-adaptive'
                    ? userProfile.rating
                    : selectedBot.rating
                }
                color={playerColor === 'w' ? 'b' : 'w'}
                isAi={true}
                isActiveTurn={chess.turn() !== playerColor && isGameActive}
                timeRemainingSeconds={selectedTimeControl.totalSeconds > 0 ? opponentTime : undefined}
                capturedPieces={playerColor === 'w' ? capturedBlack : capturedWhite}
                materialAdvantage={
                  playerColor === 'w'
                    ? materialDelta < 0
                      ? Math.abs(materialDelta)
                      : undefined
                    : materialDelta > 0
                    ? materialDelta
                    : undefined
                }
                statusText={isAiThinking ? 'Thinking...' : undefined}
              />

              {/* Center: Evaluation Bar + Large Chessboard */}
              <div className="flex items-center gap-3 w-full justify-center">
                {/* Evaluation Bar */}
                <EvaluationBar
                  evaluation={evaluation}
                  orientation={boardOrientation}
                  className="hidden sm:flex shrink-0 self-stretch"
                />

                {/* Chessboard (Strict aspect-square with locked sizing) */}
                <div className="flex-1 flex justify-center max-w-full">
                  <ChessBoard
                    chess={chess}
                    orientation={boardOrientation}
                    isInteractive={!isAiThinking && isGameActive}
                    lastMove={lastMove}
                    highlightedSquares={highlightedSquares}
                    onMovePiece={handlePlayerMove}
                  />
                </div>
              </div>

              {/* Player Card (Bottom) */}
              <PlayerCard
                name={userProfile.name}
                rating={userProfile.rating}
                color={playerColor}
                isAi={false}
                isActiveTurn={chess.turn() === playerColor && isGameActive}
                timeRemainingSeconds={selectedTimeControl.totalSeconds > 0 ? playerTime : undefined}
                capturedPieces={playerColor === 'w' ? capturedWhite : capturedBlack}
                materialAdvantage={
                  playerColor === 'w'
                    ? materialDelta > 0
                      ? materialDelta
                      : undefined
                    : materialDelta < 0
                    ? Math.abs(materialDelta)
                    : undefined
                }
                avatar={userProfile.avatarUrl}
              />

              {/* Game Status Banner */}
              <GameStatusBanner
                status={gameStatus}
                turn={chess.turn()}
                playerColor={playerColor}
                isAiThinking={isAiThinking}
                opening={opening}
              />

              {/* Game Controls Toolbar */}
              <GameControls
                canUndo={moves.length > 0}
                isAiThinking={isAiThinking}
                onUndo={handleUndo}
                onHint={handleRequestHint}
                onFlipBoard={() =>
                  setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
                }
                onNewGame={() => setIsNewGameModalOpen(true)}
                onResign={handleResign}
                onOpenSettings={() => onNavigate('/settings')}
              />

              {/* Quick Open Coach & Moves Drawer button for smaller screens / focus mode */}
              <div className="xl:hidden pt-1">
                <button
                  type="button"
                  onClick={() => setIsCoachDrawerOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-[#1A1F2B] hover:bg-slate-800 dark:hover:bg-[#252C3D] border border-slate-200 dark:border-[#273042] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Open Coach Analysis & Move List ({moves.length} moves)</span>
                </button>
              </div>
            </div>

            {/* Right Column: AI Coach Panel (Shown inline ONLY on full PC window when not in Focus Mode) */}
            {!isFocusBoardMode && (
              <div className="hidden xl:block flex-1 min-w-[340px] max-w-[480px]">
                <CoachPanel
                  currentMessage={currentCoachMessage}
                  messageHistory={coachMessageHistory}
                  coachMode={coachMode}
                  onChangeCoachMode={setCoachMode}
                  presetPrompts={presetPrompts}
                  onAskCoach={handleAskCoach}
                  moves={moves}
                  opening={opening}
                  isAiThinking={isAiThinking}
                  onStartPractice={(theme) => onNavigate(`/practice?theme=${encodeURIComponent(theme)}`)}
                />
              </div>
            )}
          </div>

          {/* Coach & Move Analysis Pop-up Drawer (Available on demand without squishing the board) */}
          {isCoachDrawerOpen && (
            <div
              className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end items-stretch animate-in fade-in duration-150"
              role="dialog"
              aria-modal="true"
            >
              <div className="relative bg-white dark:bg-[#11141D] border-l border-slate-200 dark:border-zinc-800 w-full max-w-md h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Coach & Analysis</h3>
                  </div>
                  <button
                    onClick={() => setIsCoachDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Close Drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <CoachPanel
                    currentMessage={currentCoachMessage}
                    messageHistory={coachMessageHistory}
                    coachMode={coachMode}
                    onChangeCoachMode={setCoachMode}
                    presetPrompts={presetPrompts}
                    onAskCoach={handleAskCoach}
                    moves={moves}
                    opening={opening}
                    isAiThinking={isAiThinking}
                    onStartPractice={(theme) => {
                      setIsCoachDrawerOpen(false);
                      onNavigate(`/practice?theme=${encodeURIComponent(theme)}`);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Game Setup Modal */}
      {isNewGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1A1F2B] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#273042] max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">Start New Game</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-5">
              Customize your opponent strength, side, and coaching feedback.
            </p>

            {/* Play as Side */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                Choose Your Color
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerColor('w')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    playerColor === 'w'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#202738]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white border border-slate-400 shadow-xs" />
                  <span>White (First move)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerColor('b')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    playerColor === 'b'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#202738]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700 shadow-xs" />
                  <span>Black</span>
                </button>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                Coach Difficulty
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(['Beginner', 'Easy', 'Intermediate', 'Equal', 'Advanced', 'Expert'] as GameDifficulty[]).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-1.5 rounded-lg text-[11px] font-bold border transition-all text-center ${
                        difficulty === d
                          ? 'bg-[#81B64C] text-white border-[#81B64C] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#202738]'
                      }`}
                    >
                      {d}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Coaching Mode */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                Coaching Feedback
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'FULL_COACHING', label: 'Full Coaching' },
                    { id: 'IMPORTANT_MISTAKES', label: 'Mistakes Only' },
                    { id: 'HINTS_ONLY', label: 'Hints Only' },
                    { id: 'POST_GAME_ONLY', label: 'Post-Game Review' }
                  ] as { id: CoachMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCoachMode(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      coachMode === m.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#81B64C] text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#273042] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#202738]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewGameModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#273042] text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#202738] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startNewGame(playerColor, difficulty, coachMode)}
                className="chess-btn-green flex-1 py-2.5 rounded-xl text-white text-xs font-black transition-colors shadow-xs"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Game Review Modal */}
      {postGameAnalysis && (
        <GameReviewModal
          analysis={postGameAnalysis}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onPlayAgain={() => startNewGame(playerColor, difficulty, coachMode)}
          onGoToAnalyze={() => onNavigate(lastSavedGame ? `/analyze?gameId=${lastSavedGame.id}` : '/analyze')}
          onGoToPractice={(theme?: string) => {
            setIsReviewModalOpen(false);
            const returnUrl = lastSavedGame ? `/analyze?gameId=${lastSavedGame.id}` : '/analyze';
            onNavigate(theme ? `/practice?theme=${encodeURIComponent(theme)}&returnTo=${encodeURIComponent(returnUrl)}` : `/practice?returnTo=${encodeURIComponent(returnUrl)}`);
          }}
          onGoToPuzzles={() => {
            setIsReviewModalOpen(false);
            onNavigate('/puzzles');
          }}
          onBackToLobby={() => {
            setIsReviewModalOpen(false);
            setHasStartedMatch(false);
          }}
          isSaving={saveStatus === 'saving'}
          saveError={saveError}
          saveSuccess={saveStatus === 'saved'}
          onRetrySave={() => {
            if (lastSavedGame) {
              persistCompletedGame(lastSavedGame);
            }
          }}
          playerName={userProfile.name}
          playerRating={userProfile.rating}
          opponentName={selectedBot.name}
          opponentRating={selectedBot.rating}
          playerColor={playerColor}
          timeControl={selectedTimeControl.name}
          pgn={lastSavedGame?.pgn || chess.pgn()}
          finalFen={lastSavedGame?.finalFen || chess.fen()}
          moveCount={moves.length}
          ratingDelta={lastRatingDelta}
        />
      )}
    </div>
  );
};
