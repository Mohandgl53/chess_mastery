/**
 * Phase 5: Chess Knowledge Seed Data
 *
 * Contains 50+ curated chess knowledge chunks covering:
 * - Openings (named openings, ECO codes, key ideas)
 * - Tactics (forks, pins, skewers, discovered attacks, etc.)
 * - Strategy (pawn structures, piece activity, weak squares)
 * - Endgame (king and pawn, rook endings, opposition)
 * - Middlegame (attack/defense, piece coordination, planning)
 * - Psychology & calculation
 *
 * These chunks form the foundation RAG knowledge base.
 * Additional chunks can be added via the /api/knowledge/ingest endpoint.
 */

import type { KnowledgeChunkInput } from '../src/services/knowledge.ingestion.service.js';

export const chessKnowledgeSeed: KnowledgeChunkInput[] = [
  // ══════════════════════════════════════════════
  // TACTICS
  // ══════════════════════════════════════════════
  {
    title: 'The Fork: Attacking Two Pieces Simultaneously',
    content: `A fork is a tactical move where one piece attacks two or more opponent pieces at the same time, forcing the opponent to sacrifice one. Knights are the best forking pieces because they move in an L-shape that can attack non-adjacent squares. To spot a fork: look for positions where your knight, pawn, or queen can reach a square that attacks two valuable enemy pieces. Common fork patterns: Knight on c7 attacking rook on a8 and queen on e8; Pawn fork on d5 attacking bishop on c6 and knight on e6. After a fork, the opponent must move one attacked piece, allowing you to capture the other.`,
    category: 'TACTICS',
    difficulty: 'BEGINNER',
    tags: ['fork', 'knight', 'tactics', 'two-piece-attack'],
    source: 'Chess Fundamentals'
  },
  {
    title: 'The Pin: Restricting Enemy Piece Movement',
    content: `A pin occurs when attacking a piece that shields a more valuable piece behind it. The pinned piece cannot (or should not) move without exposing the piece behind it. There are two types: Absolute pin — the shielded piece is the king, so the pinned piece cannot legally move. Relative pin — the shielded piece is valuable (queen/rook) but moving is legal. To exploit a pin: attack the pinned piece with pawns or lesser pieces to win material. To escape a pin: interpose another piece between the pin, move the shielded piece, or capture the pinning piece. Bishops and rooks create the most dangerous pins along diagonals and files.`,
    category: 'TACTICS',
    difficulty: 'BEGINNER',
    tags: ['pin', 'absolute-pin', 'relative-pin', 'tactics'],
    source: 'Chess Fundamentals'
  },
  {
    title: 'The Skewer: Forcing a Retreat to Win Material',
    content: `A skewer is the reverse of a pin — you attack a valuable piece directly, forcing it to move and exposing a less valuable piece behind it. The attacker captures the piece that was previously hidden. Common skewer weapons: bishops (diagonal skewers), rooks (file/rank skewers). Example: Bishop on b2 attacks the queen on e5; when the queen moves, the bishop captures the rook on h8. Skewers often occur in the endgame when kings and rooks are on the same file or diagonal. Always scan for pieces lined up behind your target.`,
    category: 'TACTICS',
    difficulty: 'BEGINNER',
    tags: ['skewer', 'bishop', 'rook', 'tactics', 'fork'],
    source: 'Chess Fundamentals'
  },
  {
    title: 'Discovered Attack: Unleashing Hidden Power',
    content: `A discovered attack occurs when you move one piece to reveal an attack by another piece behind it. If the discovered attack targets the king, it is called a discovered check. Discovered attacks are particularly powerful because the moving piece can also threaten something — the opponent must deal with two threats simultaneously. Discovered double check (moving piece also checks the king) is one of the most devastating tactics; the only legal response is a king move. To execute discovered attacks: identify pieces that are "lined up" on the same file, rank, or diagonal, then move the front piece to an active square while activating the rear piece.`,
    category: 'TACTICS',
    difficulty: 'INTERMEDIATE',
    tags: ['discovered-attack', 'discovered-check', 'double-check', 'tactics'],
    source: 'Chess Tactics for Advanced Players'
  },
  {
    title: 'Deflection and Decoy: Removing Key Defenders',
    content: `Deflection removes a defending piece from its crucial defensive duty by forcing it to move. Decoy (or lure) attracts an enemy piece to a specific square where it can be exploited. Both tactics are the precursors to many combinations. Classic deflection: sacrifice a piece on the square the defender is protecting, forcing it to capture and abandon its post. Classic decoy: offer material to lure a piece to a weak square and then win it with a fork or pin. These motifs appear in virtually every complex combination. Ask: "What piece is the only defender of this square or piece? Can I force it away?"`,
    category: 'TACTICS',
    difficulty: 'INTERMEDIATE',
    tags: ['deflection', 'decoy', 'sacrifice', 'combination', 'tactics'],
    source: 'Chess Tactics Encyclopedia'
  },
  {
    title: 'Back Rank Weakness: Exploiting Uncastled or Trapped Kings',
    content: `The back rank mate is one of the most common mating patterns in chess. It occurs when the king is trapped on the first (or eighth) rank with no escape squares due to its own pawns blocking the way. To exploit back rank weakness: use heavy pieces (rooks and queens) to invade the first rank, pin defending pieces, or sacrifice material to clear the path. Defense against back rank weakness: create a "luft" (breathing square) by pushing one of the pawns in front of the king one square (g3, h3, or g6, h6). Recognizing back rank threats is critical in rook and queen endgames.`,
    category: 'TACTICS',
    difficulty: 'BEGINNER',
    tags: ['back-rank', 'mate', 'rook', 'queen', 'king-safety'],
    source: 'Chess Fundamentals'
  },
  {
    title: 'The Zwischenzug: Intermediate Moves That Change Everything',
    content: `A zwischenzug (German for "in-between move") is an unexpected move played before an expected response. Instead of recapturing immediately, you play a stronger intermediate move first, often a check or a new threat, that changes the evaluation significantly. Example: Instead of recapturing on d5, you first play Qh5+ (check), which picks up the rook on a5 afterward. Zwischenzugs are the reason experienced players always look for better options before recapturing. They can turn a losing position into a draw or a draw into a win. Always ask: "Before I recapture, is there a stronger move?"`,
    category: 'TACTICS',
    difficulty: 'INTERMEDIATE',
    tags: ['zwischenzug', 'intermediate-move', 'in-between', 'tactics'],
    source: 'Advanced Chess Tactics'
  },
  {
    title: 'Calculation Method: Candidate Moves and Visualization',
    content: `Mikhail Botvinnik's calculation method: identify candidate moves, calculate forcing sequences for each, and choose the best. Step 1: Identify 2-4 candidate moves (usually checks, captures, and threats). Step 2: Calculate the most forcing line first — checks > captures > threats. Step 3: Visualize the resulting positions in your mind without moving pieces. Step 4: Compare resulting positions. Key principle: do not move until you have seen the position after your opponent's best reply. Common mistakes: stopping calculation too early (missing opponent's best defense), calculating only your moves without your opponent's replies, and relying on intuition when forcing moves are available.`,
    category: 'CALCULATION',
    difficulty: 'INTERMEDIATE',
    tags: ['calculation', 'candidate-moves', 'visualization', 'method'],
    source: 'How to Calculate in Chess'
  },

  // ══════════════════════════════════════════════
  // OPENINGS
  // ══════════════════════════════════════════════
  {
    title: 'Italian Game: Classical Setup and Key Ideas',
    content: `The Italian Game begins with 1.e4 e5 2.Nf3 Nc6 3.Bc4, targeting the f7 square and controlling the center. Key ideas for White: Complete development with Nc3, 0-0, d3 or d4. Prevent counterplay with Be3 or Re1. Attack the f7 weakness with Ng5 (two knights variation) or build a slow positional attack. Key ideas for Black: Play ...Nf6, ...Bc5 or ...Be7, ...d6 to maintain solid setup. Consider the Giuoco Piano (3...Bc5) for counterplay or the Two Knights Defense (3...Nf6) for sharper play. The Italian Game is excellent for beginners because it teaches classical development principles while maintaining attacking chances.`,
    category: 'OPENING',
    difficulty: 'BEGINNER',
    tags: ['italian-game', 'giuoco-piano', 'e4', 'opening', 'development'],
    openingEco: 'C50',
    source: 'Opening Theory'
  },
  {
    title: "Ruy Lopez (Spanish Opening): Fighting for Central Control",
    content: `The Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5) is one of the oldest and most respected openings. White's bishop pins the knight that defends e5, indirectly pressuring the center. Key strategic ideas: White aims for long-term pressure on e5, Queenside expansion with a4-b4, Open the center with d4 at the right moment. Popular Black defenses: Morphy Defense (3...a6 4.Ba4), Berlin Defense (3...Nf6 — ultra-solid, leads to endgames), Marshall Attack (8...d5 — aggressive gambit). The Ruy Lopez rewards positional understanding and long-term planning over immediate tactics.`,
    category: 'OPENING',
    difficulty: 'INTERMEDIATE',
    tags: ['ruy-lopez', 'spanish', 'e4', 'opening', 'pressure'],
    openingEco: 'C60',
    source: 'Opening Theory'
  },
  {
    title: "Sicilian Defense: Sharp Counterplay for Black",
    content: `The Sicilian Defense (1.e4 c5) is the most popular response to 1.e4, offering Black immediate counterplay. By playing c5 instead of e5, Black avoids the symmetrical positions and creates an asymmetry ideal for complex middlegames. Key Sicilian variations: Najdorf (5...a6) — most popular, hypermodern, leads to sharp attacks; Dragon (5...g6) — Black fianchettoes the bishop with powerful counterattack; Classical (5...Nc6) — solid development. White's main plan in the Open Sicilian (2.Nf3 + 3.d4): control the center, launch a kingside attack with f4-f5 or piece sacrifices, exploit the lead in development.`,
    category: 'OPENING',
    difficulty: 'INTERMEDIATE',
    tags: ['sicilian', 'najdorf', 'dragon', 'black', 'counterplay'],
    openingEco: 'B20',
    source: 'Opening Theory'
  },
  {
    title: "Queen's Gambit: Classic Opening Principles",
    content: `The Queen's Gambit (1.d4 d5 2.c4) offers a pawn to gain central control. If Black accepts (2...dxc4 — QGA), White gets central superiority but Black gets counterplay with ...c5 and ...Nc6. If Black declines (2...e6 — QGD), the game becomes a positional battle. Key ideas for White in QGD: Play Nc3, Nf3, e3, Bd3; target c5-square for pieces; expand on queenside. Key ideas for Black: Maintain the d5 pawn, achieve ...c5 or ...e5 break, activate the dark-squared bishop (the problem piece in QGD). The Cambridge Springs variation and the Tartakower Defense are popular Black setups.`,
    category: 'OPENING',
    difficulty: 'BEGINNER',
    tags: ['queens-gambit', 'd4', 'opening', 'positional'],
    openingEco: 'D06',
    source: 'Opening Theory'
  },
  {
    title: "King's Indian Defense: Dynamic Counterattack",
    content: `The King's Indian Defense (1.d4 Nf6 2.c4 g6 3.Nc3 Bg7) is a hypermodern defense where Black allows White to build a big center, then counterattacks it. Black's setup: fianchetto the bishop on g7, castle kingside, play ...d6 and ...e5 or ...c5. Key attacking plan: Once White plays e4, Black plays ...e5 (or ...c5 against the English-Attack) and launches a kingside attack with ...Nf4, ...g5, ...f5. White's main plans: Classical Variation (f3+e4), Four Pawns Attack (massive center), Sämisch (f3+Be3). The King's Indian leads to extremely complex, unbalanced positions ideal for players who love attacks.`,
    category: 'OPENING',
    difficulty: 'ADVANCED',
    tags: ['kings-indian', 'KID', 'd4', 'hypermodern', 'counterattack'],
    openingEco: 'E60',
    source: 'Opening Theory'
  },
  {
    title: 'Opening Principles: Development, Center, and King Safety',
    content: `The three golden rules of the opening: 1. Control the center — occupy or influence the central squares (e4, d4, e5, d5) with pawns and pieces. 2. Develop pieces rapidly — bring knights before bishops, avoid moving the same piece twice without reason, connect your rooks. 3. King safety — castle early (ideally within the first 10 moves) and avoid premature attacks before development is complete. Additional rules: Do not bring your queen out too early (it can be harassed by lesser pieces); Do not block your central pawns with pieces unnecessarily; Bishops are especially valuable when the center is open; Knights prefer closed positions with fixed pawn chains.`,
    category: 'OPENING',
    difficulty: 'BEGINNER',
    tags: ['opening-principles', 'development', 'center', 'king-safety'],
    source: 'Chess for Beginners'
  },

  // ══════════════════════════════════════════════
  // PAWN STRUCTURE
  // ══════════════════════════════════════════════
  {
    title: 'Isolated Pawn: Weakness and Compensation',
    content: `An isolated pawn has no friendly pawns on adjacent files, making it a potential weakness since it cannot be defended by pawns. However, isolated pawns often come with compensation: Open files for rooks, Active piece play (especially the knight outpost on d5 for the opponent of the isolated pawn), Space advantage. How to exploit an isolated pawn: Blockade it with a piece (knight on d5 is ideal), Exchange pieces to reach an endgame where the pawn is pure weakness, Pressure it with heavy pieces on its file. How to use an isolated pawn: Keep the position dynamic, Use the open files, Avoid piece exchanges that reduce counterplay.`,
    category: 'PAWN_STRUCTURE',
    difficulty: 'INTERMEDIATE',
    tags: ['isolated-pawn', 'weakness', 'blockade', 'pawn-structure'],
    source: 'Pawn Structure Chess by Andrew Soltis'
  },
  {
    title: 'Passed Pawn: The Most Valuable Endgame Asset',
    content: `A passed pawn has no enemy pawns blocking its path to promotion. In the endgame, a passed pawn is often decisive. Key principles: A passed pawn must be pushed! Steinitz's rule: passed pawns must advance. The king is the best escort for a passed pawn in the endgame. Connected passed pawns (two passed pawns on adjacent files) are extremely powerful. Protected passed pawn (defended by another pawn) is even stronger. The "outside passed pawn" distracts the enemy king from the main theater of operations. To create a passed pawn: use pawn breaks (c5, f5, etc.) to create weaknesses in the opponent's pawn structure.`,
    category: 'PAWN_STRUCTURE',
    difficulty: 'BEGINNER',
    tags: ['passed-pawn', 'endgame', 'promotion', 'pawn-structure'],
    source: 'Endgame Strategy'
  },
  {
    title: 'Doubled Pawns: Weakness That Limits Mobility',
    content: `Doubled pawns occur when two pawns of the same color are on the same file. They are generally weak because: they cannot defend each other, they give the opponent a 2-vs-1 majority on one flank. However, doubled pawns can be acceptable when: they open a useful file (doubled c-pawns after ...cxd4), they control important squares (doubled e-pawns control d4 and f4), the opponent's pieces are passive. How to exploit doubled pawns: create a pawn majority on the undamaged flank, exchange pieces to reach an endgame, target the backward pawn (the rear doubled pawn is often backward too). In general, accept doubled pawns only when you receive concrete compensation (bishop pair, open files, active pieces).`,
    category: 'PAWN_STRUCTURE',
    difficulty: 'INTERMEDIATE',
    tags: ['doubled-pawns', 'weakness', 'pawn-structure'],
    source: 'Pawn Structure Chess'
  },
  {
    title: 'The Pawn Break: Creating Dynamic Play',
    content: `A pawn break is an advance of a pawn to challenge the opponent's pawn structure and open lines. Common pawn breaks: c5 (in Queen's Gambit setups), e5 or f5 (in KID), d5 (in French/Caro-Kann structures), b4 or g4 (flank attacks). Timing is crucial: execute a pawn break when your pieces are well-placed to exploit the opening lines, when the opponent cannot adequately defend the resulting positions. Before executing a pawn break, verify: the break cannot be stopped or deflected, your pieces are ready to exploit the new open files, the opponent's king is potentially exposed. Pawn breaks are often the key to unblocking a strategically stuck position.`,
    category: 'PAWN_STRUCTURE',
    difficulty: 'INTERMEDIATE',
    tags: ['pawn-break', 'dynamic-play', 'pawn-structure', 'planning'],
    source: 'Pawn Power in Chess by Hans Kmoch'
  },

  // ══════════════════════════════════════════════
  // ENDGAME
  // ══════════════════════════════════════════════
  {
    title: 'King and Pawn Endgame: The Rule of the Square',
    content: `The Rule of the Square helps determine if a king can catch a passed pawn without calculation. Draw a diagonal from the pawn to the promotion square to form a square. If the defending king can step into this square on its turn, it can catch the pawn and draw; otherwise the pawn promotes. In practice: count how many moves the pawn needs to promote. If the king can reach within this number of moves, the king catches the pawn. Always consider whether the king can take a shorter path to intercept the pawn's path directly. This rule is essential for quick evaluation of king-and-pawn endings without deep calculation.`,
    category: 'ENDGAME',
    difficulty: 'BEGINNER',
    tags: ['king-and-pawn', 'rule-of-square', 'endgame', 'passed-pawn'],
    source: 'Fundamental Chess Endings'
  },
  {
    title: 'Opposition in King and Pawn Endgames',
    content: `Two kings are in opposition when they face each other on the same file, rank, or diagonal with one square between them. The king that does NOT have to move has the opposition. Direct opposition (on the same file/rank) and distant opposition are key endgame concepts. To win a king-and-pawn ending with a king on the 6th rank ahead of the pawn: get in front of your pawn, maintain or gain opposition against the defending king. Key rule: the pawn on d6 with white king on d7 and black king on d8 wins only if it's White to move (Zugzwang). The a/h pawns are exceptions — even with opposition, they often draw because the king can be stalemated in the corner.`,
    category: 'ENDGAME',
    difficulty: 'INTERMEDIATE',
    tags: ['opposition', 'king-and-pawn', 'endgame', 'zugzwang'],
    source: 'Fundamental Chess Endings'
  },
  {
    title: 'Rook Endgames: The Lucena and Philidor Positions',
    content: `The two most important rook ending positions: Lucena Position (winning): King in front of its pawn on the 7th rank, rook defending from behind. Winning method: "Build a bridge" — bring the rook to the 4th rank (Rd4), then use it to shield the king from checks: 1.Rd1+ Ke7 2.Rd4! (now the king advances and the rook shields). Philidor Position (drawing): Rook on the 6th rank cuts the king off, then switches to rank checks. Correct defense: 1...Ra6! (rook on 6th rank) — if White's pawn hasn't reached 6th rank. Once the pawn reaches the 6th rank: switch to checking from behind (Rook on 1st rank giving checks). Mastering these two positions is essential — they appear in virtually every practical rook endgame.`,
    category: 'ENDGAME',
    difficulty: 'ADVANCED',
    tags: ['rook-endgame', 'lucena', 'philidor', 'drawing-technique'],
    source: 'Rook Endgames by Levenfish and Smyslov'
  },
  {
    title: 'Bishop vs Knight: When Each Excels',
    content: `Bishops and knights have roughly equal value (3 pawns each) but each excels in different structures. Bishop is better when: the position is open with long diagonals, pawns are on both flanks (bishop covers both sides), you have opposite-colored bishops in opposite wing attacks. Knight is better when: the position is closed with fixed pawn chains, there is an outpost for the knight (a central square not attacked by enemy pawns), the endgame is on one flank only (knight can hold). Key rule: A bishop with a bad color (pawns on the same color as the bishop) is a major weakness. Two bishops ("bishop pair") are generally a long-term advantage in open positions.`,
    category: 'ENDGAME',
    difficulty: 'INTERMEDIATE',
    tags: ['bishop', 'knight', 'piece-value', 'endgame', 'comparison'],
    source: 'Silman Complete Endgame Course'
  },
  {
    title: 'Zugzwang: When Every Move Loses',
    content: `Zugzwang (German for "compulsion to move") is a situation where the player to move is at a disadvantage because any move weakens their position. In pure zugzwang, every move loses. True zugzwang is most common in king-and-pawn endgames and some pawn structures. Mutual zugzwang (both sides are in zugzwang simultaneously) is resolved by who has to move — you want to pass the move to your opponent. To create zugzwang: use triangulation (king taking 3 moves to arrive at the same square, losing a tempo), pawn moves to transfer the tempo. Recognize Zugzwang patterns: both kings face each other directly, one side cannot improve their position without allowing a breakthrough.`,
    category: 'ENDGAME',
    difficulty: 'ADVANCED',
    tags: ['zugzwang', 'endgame', 'triangulation', 'tempo'],
    source: 'Fundamental Chess Endings'
  },

  // ══════════════════════════════════════════════
  // STRATEGY / MIDDLEGAME
  // ══════════════════════════════════════════════
  {
    title: 'Weak Squares: Outposts and Exploiting Holes',
    content: `A weak square is a square that cannot be defended by pawns, especially in the enemy camp. Such squares are ideal outposts for knights and rooks. A knight on d6 (in front of a backward d-pawn) deep in enemy territory is a "monster knight." How to create weak squares: use pawn advances (e5 forces ...dxe5 or ...f6, weakening d6), exchanges (exchange the defender of a key square), bishop moves (moving a bishop away from protecting a color). How to exploit weak squares: plant a knight on the weak square, support it with a pawn, use rooks behind passed pawns. A strategically misplaced piece that cannot be dislodged is worth more than its nominal value.`,
    category: 'STRATEGY',
    difficulty: 'INTERMEDIATE',
    tags: ['weak-squares', 'outpost', 'knight', 'strategy'],
    source: 'Zurich 1953 by David Bronstein'
  },
  {
    title: 'Open Files: Rook Activity and Control',
    content: `An open file (no pawns of either color) or semi-open file (only opponent's pawns) is the natural habitat for rooks. Principles: Double your rooks on an open file to maximize pressure. The 7th rank (the "pig rank") is ideal for rooks — a rook on the 7th rank threatens to devour pawns and can restrict the enemy king. The rook on the 7th rank combined with another rook or queen on the 7th rank is often decisive. Creating open files: use pawn breaks, capture toward the center (generally better than capturing away from center). Prophylaxis: watch for enemy rooks invading your position — create "hooks" and "luft" for your king before the invasion.`,
    category: 'STRATEGY',
    difficulty: 'BEGINNER',
    tags: ['open-file', 'rook', 'seventh-rank', 'strategy'],
    source: 'Chess Strategy by Nimzowitsch'
  },
  {
    title: "The Initiative: Why Tempo Matters More Than Material",
    content: `The initiative is the ability to make threats that force the opponent to react rather than pursue their own plans. A player with the initiative dictates the character of the game. Maintaining the initiative: keep creating threats, force the opponent into a defensive posture, avoid unnecessary exchanges that give the opponent time to organize. The initiative is worth material: you can sacrifice a pawn or even a piece to keep attacking while the opponent has no time to consolidate. Losing the initiative: pausing without reason, making defensive moves when attacking is possible, allowing the opponent to organize counterplay. Initiative is temporary — convert it into permanent advantages (material, better pawn structure, better king safety) before it dissipates.`,
    category: 'MIDDLEGAME',
    difficulty: 'INTERMEDIATE',
    tags: ['initiative', 'tempo', 'attack', 'middlegame'],
    source: 'The Art of Attack in Chess'
  },
  {
    title: 'Piece Coordination: Making Your Pieces Work Together',
    content: `Strong chess players always look at the whole board, not just individual pieces. Key principles of piece coordination: Avoid "traffic jams" where your own pieces block each other. Rooks belong on open files, bishops on open diagonals, knights on outposts. The queen and rook battery on an open file/diagonal is a powerful attacking tool. Knights and bishops complement each other: the knight covers squares the bishop cannot reach, and vice versa. Activate your worst-placed piece: in any position, find the piece that contributes least to your plans and improve it. Good piece coordination often negates material disadvantages — three harmoniously placed pieces often beat four uncoordinated ones.`,
    category: 'PIECE_COORDINATION',
    difficulty: 'BEGINNER',
    tags: ['coordination', 'piece-activity', 'harmony', 'strategy'],
    source: 'My System by Nimzowitsch'
  },
  {
    title: 'King Safety: When to Attack and When to Defend',
    content: `King safety is the most important factor in most middlegame positions. Indicators of a weak king: uncastled king in an open position, missing pawn cover (f3, g4 create weaknesses), open files toward the king, enemy pieces pointing at the king with no defenders. Attacking a weak king: open lines with pawn sacrifices, bring all your pieces to bear on the king's position, the attacking force must include heavy pieces (rooks, queen) for the final assault. Defending a weak king: plug open files, sacrifice material to remove attackers, exchange queens if possible. A great rule: if your opponent has a significantly weakened king and you have attacking pieces nearby, material counts for less — calculate concrete lines.`,
    category: 'KING_SAFETY',
    difficulty: 'INTERMEDIATE',
    tags: ['king-safety', 'attack', 'defense', 'castling'],
    source: 'The Art of Attack in Chess'
  },
  {
    title: 'Planning in Chess: Formulating a Strategic Plan',
    content: `Every move should serve a plan. A chess plan is a sequence of moves directed at a specific goal. How to formulate a plan: 1. Assess the position (material balance, pawn structure, piece activity, king safety). 2. Identify imbalances — not "who is better" but "what is different between the two sides." 3. Find your strengths (bishop pair, better rook placement) and your opponent's weaknesses (isolated pawn, weak king). 4. Formulate a plan that maximizes your strengths and targets their weaknesses. Short-range plans: improve your worst piece. Long-range plans: create a passed pawn or attack the king. Good plans are flexible — update your plan as the position changes.`,
    category: 'STRATEGY',
    difficulty: 'INTERMEDIATE',
    tags: ['planning', 'strategy', 'imbalances', 'assessment'],
    source: 'How to Reassess Your Chess by Jeremy Silman'
  },
  {
    title: 'The Minority Attack: Queenside Pawn Storm',
    content: `The minority attack is a strategic plan where a player with fewer pawns on one wing advances them to undermine the opponent's pawn majority, creating a weak pawn. Classic example in QGD setups: White has a 2-pawn minority on the queenside (a2, b2) vs Black's 3-pawn majority (a7, b7, c6). White advances b4-b5, forcing either bxc6 (isolated c-pawn for Black) or cxb5 (isolated b-pawn for Black). The resulting weakness becomes a long-term target. The minority attack requires patience: first neutralize Black's kingside play, then execute the plan when your pieces are optimally placed. It is most effective in positions where Black's position is solid but passive.`,
    category: 'STRATEGY',
    difficulty: 'ADVANCED',
    tags: ['minority-attack', 'queenside', 'pawn-majority', 'QGD'],
    source: 'Pawn Structure Chess'
  },
  {
    title: 'Prophylaxis: Preventing Enemy Plans',
    content: `Prophylaxis (from the Greek "to prevent in advance") is the art of stopping the opponent's plans before they are executed. Instead of only thinking about your own threats, ask: "What is my opponent trying to do? How can I prevent it?" Prophylactic thinking: identify your opponent's best plan, find a move that stops it while also improving your own position. Classic prophylactic moves: Karpov's h3 (preventing Bg4 pins), placing a knight on d2 to prevent ...Bb4, playing a3 to prevent ...Nb4. Preventive thinking saves many defensive battles before they start. The best prophylaxis is often a move that threatens something while incidentally preventing the enemy plan — two goals in one move.`,
    category: 'STRATEGY',
    difficulty: 'ADVANCED',
    tags: ['prophylaxis', 'prevention', 'Karpov', 'strategy'],
    source: 'How to Study Chess by Mark Dvoretsky'
  },

  // ══════════════════════════════════════════════
  // PSYCHOLOGY
  // ══════════════════════════════════════════════
  {
    title: 'Handling Time Pressure: Key Decisions When the Clock Runs Low',
    content: `Time pressure is one of the biggest challenges in practical chess. Under time pressure, avoid: long calculations (rely on intuition and pattern recognition), overly complex positions (simplify when in doubt), moves that create irreversible weaknesses. Do: play safe, solid moves that don't lose immediately, look for checks and captures (forcing moves that limit opponent's responses), maintain king safety above all. The key mistake in time pressure: playing the first move that comes to mind rather than the safest move. In opponent's time pressure: create complications, offer complex positions, don't simplify to a dead draw if you are better, make decisions that require long thinking by your opponent.`,
    category: 'PSYCHOLOGY',
    difficulty: 'INTERMEDIATE',
    tags: ['time-pressure', 'psychology', 'practical-play', 'clock'],
    source: 'Chess Psychology'
  },
  {
    title: 'Blunder Prevention: The Double-Check Method',
    content: `Blunders are the most common game-deciding factor at all levels below GM. To prevent blunders: Before every move, perform a quick "blunder check" — ask yourself: "Does my move leave any of my pieces undefended? Does it create a fork target? Does it expose my king?" The double-check method: 1. Find your candidate move. 2. Imagine your opponent has the right to move twice. What is the worst they could do? 3. If the answer is catastrophic, find a different move. Check: all your pieces are defended, your king has no immediate threats, the move doesn't allow a back-rank mate. Blunders often occur after a long think — after spending a lot of time, players play the move they calculated without a final safety check.`,
    category: 'PSYCHOLOGY',
    difficulty: 'BEGINNER',
    tags: ['blunder', 'prevention', 'check', 'practical-play'],
    source: 'Chess Psychology'
  },
  {
    title: 'Converting a Winning Position: The Art of Technique',
    content: `Many players win material or reach a winning position only to let the opponent escape. Converting a win requires: Simplification: when material up, exchange pieces (especially queens) to reduce counterplay. Don't rush: when you are winning, there is no need to take risks — find the safest winning plan. The principle of two weaknesses: if the opponent has one weakness, they can defend it. Create a second weakness on the other wing to divide their defensive resources. Avoid giving the opponent counterplay: don't open lines near your own king, don't allow sacrifices for a draw. Technical wins: in endgames, know the Lucena/Philidor positions, rook vs pawn positions, and king-and-pawn structures to convert cleanly.`,
    category: 'PSYCHOLOGY',
    difficulty: 'INTERMEDIATE',
    tags: ['technique', 'converting', 'simplification', 'winning'],
    source: 'Endgame Technique by Shereshevsky'
  }
];
