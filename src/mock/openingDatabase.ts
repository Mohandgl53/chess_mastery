import { OpeningInfo } from '../types/game';

export interface OpeningEntry {
  moves: string[]; // sequence of SAN moves, e.g. ["e4", "e5", "Nf3", "Nc6", "Bc4"]
  info: OpeningInfo;
}

export const OPENING_DATABASE: OpeningEntry[] = [
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    info: { eco: 'C50', name: 'Italian Game', variation: 'Giuoco Piano', description: 'Focuses on rapid piece development and controlling the central d4 and e4 squares.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    info: { eco: 'C55', name: 'Italian Game', variation: 'Two Knights Defense', description: 'Black immediately counter-attacks the white e4 pawn.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    info: { eco: 'C50', name: 'Italian Game', variation: 'Main Line', description: 'Developing the bishop to c4 targeting f7, the weakest square in black’s camp.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    info: { eco: 'C68', name: 'Ruy Lopez', variation: 'Morphy Defense', description: 'One of the oldest and most respected openings. White puts pressure on the knight defending e5.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    info: { eco: 'C60', name: 'Ruy Lopez', variation: 'Spanish Game', description: 'White attacks the knight that defends e5.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'd6'],
    info: { eco: 'C41', name: 'Philidor Defense', variation: 'Solid Defense', description: 'Black defends the e5 pawn securely, though the dark-squared bishop is slightly restricted.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nf6'],
    info: { eco: 'C42', name: 'Petrov Defense', variation: 'Russian Game', description: 'Symmetrical counterattack against the white e4 pawn.' }
  },
  {
    moves: ['e4', 'e5', 'Nf3'],
    info: { eco: 'C40', name: 'King’s Knight Opening', variation: 'Standard', description: 'Developing the knight, attacking e5, and clearing the path for kingside castling.' }
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    info: { eco: 'B90', name: 'Sicilian Defense', variation: 'Najdorf Variation', description: 'A sharp and aggressive defense striving for counter-attacking chances on the c-file.' }
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'Nc6'],
    info: { eco: 'B30', name: 'Sicilian Defense', variation: 'Old Sicilian', description: 'Combative reply fighting for control of d4.' }
  },
  {
    moves: ['e4', 'c5'],
    info: { eco: 'B20', name: 'Sicilian Defense', variation: 'Open Choice', description: 'The most popular and dynamic response to 1. e4, leading to asymmetric, rich battles.' }
  },
  {
    moves: ['e4', 'e6', 'd4', 'd5'],
    info: { eco: 'C00', name: 'French Defense', variation: 'Main Line', description: 'Solid pawn chain with counterplay aimed at White’s d4 pawn center.' }
  },
  {
    moves: ['e4', 'e6'],
    info: { eco: 'C00', name: 'French Defense', variation: 'Advance/Tarrasch Prep', description: 'Preparing d5 to challenge White’s center immediately.' }
  },
  {
    moves: ['e4', 'c6', 'd4', 'd5'],
    info: { eco: 'B12', name: 'Caro-Kann Defense', variation: 'Main Line', description: 'Extremely resilient pawn structure allowing Black’s light-squared bishop to develop freely.' }
  },
  {
    moves: ['e4', 'c6'],
    info: { eco: 'B10', name: 'Caro-Kann Defense', variation: 'Solid Setup', description: 'Preparing d5 with a rock-solid pawn chain.' }
  },
  {
    moves: ['d4', 'd5', 'c4', 'e6'],
    info: { eco: 'D30', name: 'Queen’s Gambit Declined', variation: 'Orthodox Defense', description: 'A timeless classical opening where Black maintains a solid grip on the central d5 outpost.' }
  },
  {
    moves: ['d4', 'd5', 'c4', 'c6'],
    info: { eco: 'D10', name: 'Slav Defense', variation: 'Solid Setup', description: 'Reinforcing d5 while preserving active diagonal freedom for the c8 bishop.' }
  },
  {
    moves: ['d4', 'd5', 'c4', 'dxc4'],
    info: { eco: 'D20', name: 'Queen’s Gambit Accepted', variation: 'Main Line', description: 'Black captures the pawn, planning to counterattack White’s center later with c5 or e5.' }
  },
  {
    moves: ['d4', 'd5', 'c4'],
    info: { eco: 'D06', name: 'Queen’s Gambit', variation: 'Standard Offer', description: 'White offers a flank c-pawn to gain central control on d4 and e4.' }
  },
  {
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
    info: { eco: 'E60', name: 'King’s Indian Defense', variation: 'Fianchetto/Classical', description: 'Hypermodern defense allowing White a broad center before launching a fierce kingside storm.' }
  },
  {
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    info: { eco: 'E20', name: 'Nimzo-Indian Defense', variation: 'Classical', description: 'Black pins White’s knight, controlling e4 and exerting positional pressure.' }
  },
  {
    moves: ['d4', 'd5'],
    info: { eco: 'D00', name: 'Queen’s Pawn Game', variation: 'Closed Game', description: 'Classical battle for space and central control.' }
  },
  {
    moves: ['d4', 'Nf6'],
    info: { eco: 'A45', name: 'Indian Defense', variation: 'Flexible Setup', description: 'Preventing White’s immediate e4 while keeping options open for King’s Indian or Nimzo.' }
  },
  {
    moves: ['e4', 'e5'],
    info: { eco: 'C20', name: 'Open Game', variation: 'King’s Pawn Game', description: 'The foundation of classical chess strategy: both sides claim space in the center.' }
  },
  {
    moves: ['e4'],
    info: { eco: 'B00', name: 'King’s Pawn Opening', variation: 'Initial Push', description: 'Seizes center space and immediately opens diagonals for the queen and bishop.' }
  },
  {
    moves: ['d4'],
    info: { eco: 'A40', name: 'Queen’s Pawn Opening', variation: 'Initial Push', description: 'Solid positional opening building a secure foundation for piece harmony.' }
  },
  {
    moves: ['c4'],
    info: { eco: 'A10', name: 'English Opening', variation: 'Flank Strategy', description: 'Controls the critical d5 square from the flank without committing central pawns early.' }
  },
  {
    moves: ['Nf3'],
    info: { eco: 'A04', name: 'Réti Opening', variation: 'Flexible Knight', description: 'Hypermodern opening delaying pawn structure decisions while pressuring the center.' }
  }
];
