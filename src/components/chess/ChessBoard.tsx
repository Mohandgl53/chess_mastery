import React, { useState, useMemo } from 'react';
import { Chess, Move, Square } from 'chess.js';
import { ChessSquare } from './ChessSquare';
import { PromotionModal } from './PromotionModal';
import { BoardOrientation, PieceColor, PieceType, SquareName } from '../../types/chess';
import { sounds } from '../../utils/soundEffects';

interface ChessBoardProps {
  chess: Chess;
  orientation?: BoardOrientation;
  isInteractive?: boolean;
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string } | null;
  onMovePiece: (move: { from: string; to: string; promotion?: PieceType }) => boolean | void | Promise<boolean | void>;
  className?: string;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation = 'white',
  isInteractive = true,
  highlightedSquares = [],
  lastMove = null,
  onMovePiece,
  className = ''
}) => {
  const [selectedSquare, setSelectedSquare] = useState<SquareName | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: SquareName; to: SquareName } | null>(null);

  // Files and ranks setup based on orientation
  const files = useMemo(() => {
    return orientation === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  }, [orientation]);

  const ranks = useMemo(() => {
    return orientation === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  }, [orientation]);

  // Compute legal moves for currently selected square
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !isInteractive) return [];
    try {
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true }) as Move[];
      return moves;
    } catch {
      return [];
    }
  }, [chess, selectedSquare, isInteractive]);

  // Map of legal destination squares
  const legalTargetsMap = useMemo(() => {
    const map = new Map<string, Move>();
    for (const move of legalMovesForSelected) {
      map.set(move.to, move);
    }
    return map;
  }, [legalMovesForSelected]);

  // Find king in check square
  const inCheckKingSquare = useMemo<SquareName | null>(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          return `${file}${rank}` as SquareName;
        }
      }
    }
    return null;
  }, [chess]);

  // Execute move helper
  const tryExecuteMove = (from: SquareName, to: SquareName, promotion?: PieceType) => {
    if (!isInteractive) return;

    // Check if move is pawn promotion
    const piece = chess.get(from as Square);
    const isPawnPromotion =
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));

    if (isPawnPromotion && !promotion) {
      setPendingPromotion({ from, to });
      return;
    }

    try {
      onMovePiece({ from, to, promotion });
      setSelectedSquare(null);
    } catch (err) {
      console.error('Invalid move attempt', err);
      setSelectedSquare(null);
    }
  };

  // Click on square handler
  const handleSquareClick = (square: SquareName) => {
    if (!isInteractive) return;

    const clickedPiece = chess.get(square as Square);
    const currentTurn = chess.turn();

    // If clicking a destination for an already selected piece
    if (selectedSquare && legalTargetsMap.has(square)) {
      tryExecuteMove(selectedSquare, square);
      return;
    }

    // If clicking on a piece of the current player's turn
    if (clickedPiece && clickedPiece.color === currentTurn) {
      if (selectedSquare === square) {
        setSelectedSquare(null); // toggle off
      } else {
        setSelectedSquare(square);
      }
      return;
    }

    // Otherwise clear selection
    setSelectedSquare(null);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, square: SquareName) => {
    if (!isInteractive) {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square as Square);
    if (!piece || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }

    setSelectedSquare(square);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: SquareName) => {
    e.preventDefault();
    const fromSquare = e.dataTransfer.getData('text/plain') as SquareName;
    if (fromSquare && fromSquare !== targetSquare) {
      if (legalTargetsMap.has(targetSquare) || chess.moves({ square: fromSquare as Square, verbose: true }).some(m => m.to === targetSquare)) {
        tryExecuteMove(fromSquare, targetSquare);
      }
    }
  };

  const handleConfirmPromotion = (piece: PieceType) => {
    if (pendingPromotion) {
      tryExecuteMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Board container with Chess.com styling */}
      <div className="w-full max-w-[620px] aspect-square rounded-lg overflow-hidden shadow-2xl border border-[#262B36] bg-[#779556] grid grid-cols-8 grid-rows-8">
        {ranks.map((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const square = `${file}${rank}` as SquareName;
            const piece = chess.get(square as Square);
            const isLight = (fileIndex + rankIndex) % 2 === 0;

            const isSelected = selectedSquare === square;
            const legalMove = legalTargetsMap.get(square);
            const isLegalTarget = Boolean(legalMove);
            const isCaptureTarget = isLegalTarget && (Boolean(piece) || legalMove?.flags.includes('e') || false);

            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isInCheck = inCheckKingSquare === square;
            const isHighlightedByCoach = highlightedSquares.includes(square);

            // Coordinates on edges
            const showRank = fileIndex === 0 ? rank : undefined;
            const showFile = rankIndex === 7 ? file : undefined;

            return (
              <ChessSquare
                key={square}
                square={square}
                isLight={isLight}
                piece={piece}
                isSelected={isSelected}
                isLegalTarget={isLegalTarget}
                isCaptureTarget={isCaptureTarget}
                isLastMoveFrom={isLastMoveFrom}
                isLastMoveTo={isLastMoveTo}
                isInCheck={isInCheck}
                isHighlightedByCoach={isHighlightedByCoach}
                showRankCoordinate={showRank}
                showFileCoordinate={showFile}
                onSquareClick={handleSquareClick}
                onSquareDragStart={handleDragStart}
                onSquareDragOver={handleDragOver}
                onSquareDrop={handleDrop}
              />
            );
          })
        )}
      </div>

      {/* Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          color={chess.turn()}
          isOpen={Boolean(pendingPromotion)}
          onSelectPiece={handleConfirmPromotion}
          onCancel={() => {
            setPendingPromotion(null);
            setSelectedSquare(null);
          }}
        />
      )}
    </div>
  );
};
