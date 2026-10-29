import React, { useEffect, useRef, useState } from 'react';
import {
  Crown,
  Brain,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Star,
  ArrowRight,
  BarChart3,
  Swords,
  Users,
  Trophy,
  Sparkles,
  CheckCircle,
  ChevronDown,
  Play,
  ArrowLeft,
  Shield,
  Menu,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return count;
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Mini Chess Board (SVG / Unicode with responsive squares) ─────────────────
const MiniChessBoard: React.FC = () => {
  const pieces: Record<string, string> = {
    a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♝', h8: '♜',
    a7: '♟', b7: '♟', c7: '♟', e7: '♟', f7: '♟', g7: '♟', h7: '♟',
    g8: '♞', d7: '♟',
    a1: '♖', b1: '♘', c1: '♗', d1: '♕', e1: '♔', f1: '♗', g1: '♘', h1: '♖',
    a2: '♙', b2: '♙', c2: '♙', f2: '♙', g2: '♙', h2: '♙',
    e4: '♙', d4: '♙', e5: '♟', c5: '♝',
  };
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = [8,7,6,5,4,3,2,1];

  return (
    <div className="lp2-board-frame">
      <table className="lp2-chess-table">
        <tbody>
          {ranks.map((rank, ri) => (
            <tr key={rank}>
              {files.map((file, fi) => {
                const sq = `${file}${rank}`;
                const isLight = (ri + fi) % 2 === 0;
                const piece = pieces[sq];
                const isHighlight = sq === 'e5' || sq === 'e4';
                return (
                  <td
                    key={sq}
                    className={`lp2-chess-td ${isHighlight ? 'lp2-highlight-sq' : isLight ? 'lp2-light-sq' : 'lp2-dark-sq'}`}
                  >
                    {piece && (
                      <span className={`lp2-chess-piece ${piece === piece.toLowerCase() ? 'lp2-black-piece' : 'lp2-white-piece'}`}>
                        {piece}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; value: string; label: string; sub?: string; delay: number; inView: boolean }> = ({ icon, value, label, sub, delay, inView }) => (
  <div
    className="lp2-stat-card"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}
  >
    <div style={{ color: '#81B64C', marginBottom: 8 }}>{icon}</div>
    <div className="lp2-stat-value">{value}</div>
    <div className="lp2-stat-label">{label}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: '#81B64C', fontWeight: 700, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── Feature Card ──────────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  delay: number;
  inView: boolean;
}> = ({ icon, title, description, accent, delay, inView }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="lp2-feature-card"
      style={{
        background: hovered ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.03)',
        border: hovered ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.08)',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, background 0.3s, border 0.3s`,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: hovered ? `linear-gradient(90deg, ${accent}, transparent)` : 'transparent',
        transition: 'background 0.3s',
        borderRadius: '20px 20px 0 0',
      }} />
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${accent}18`,
        border: `1px solid ${accent}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, color: accent,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F5F0E8', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>{title}</h3>
      <p style={{ fontSize: '0.86rem', color: '#8a7a70', lineHeight: 1.65 }}>{description}</p>
    </div>
  );
};

// ─── Testimonial Card ─────────────────────────────────────────────────────────
const TestimonialCard: React.FC<{
  quote: string; name: string; elo: string; progress: string; avatar: string; delay: number; inView: boolean;
}> = ({ quote, name, elo, progress, avatar, delay, inView }) => (
  <div
    className="lp2-testimonial-card"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}
  >
    <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
      {[...Array(5)].map((_,i) => <Star key={i} size={14} fill="#81B64C" color="#81B64C" />)}
    </div>
    <p style={{ color: '#c4b09a', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 18, flex: 1 }}>"{quote}"</p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'linear-gradient(135deg, #81B64C, #588329)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 800, color: '#fff', flexShrink: 0,
      }}>{avatar}</div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F5F0E8' }}>{name}</div>
        <div style={{ fontSize: '0.72rem', color: '#a89080' }}>{elo}</div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#81B64C' }}>{progress}</div>
        <div style={{ fontSize: '0.68rem', color: '#7a6a60' }}>Rating Gain</div>
      </div>
    </div>
  </div>
);

// ─── Main Landing Page ────────────────────────────────────────────────────────
export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { ref: statsRef, inView: statsInView } = useInView(0.15);
  const { ref: featuresRef, inView: featuresInView } = useInView(0.1);
  const { ref: boardRef, inView: boardInView } = useInView(0.15);
  const { ref: testimonialsRef, inView: testimonialsInView } = useInView(0.1);
  const { ref: ctaRef, inView: ctaInView } = useInView(0.15);

  const count1 = useCounter(50000, 2200, statsInView);
  const count2 = useCounter(2400, 2000, statsInView);
  const count3 = useCounter(98, 1800, statsInView);
  const count4 = useCounter(300, 1600, statsInView);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    const timer = setTimeout(() => setHeroReady(true), 80);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const features = [
    {
      icon: <Brain size={20} />,
      title: 'AI Grandmaster Coach',
      description: 'An engine that knows your weaknesses better than you do. Get personalized move feedback, pattern training, and opening repertoire analysis.',
      accent: '#a78bfa',
    },
    {
      icon: <Target size={20} />,
      title: 'Tactical Puzzle Training',
      description: 'A dynamic puzzle queue that adapts to your blind spots. Master forks, pins, skewers, and complex combinations until they become instinct.',
      accent: '#81B64C',
    },
    {
      icon: <BarChart3 size={20} />,
      title: 'Deep Game Analysis',
      description: 'Every game dissected. Find the exact moment the balance shifted, understand your positional mistakes, and never repeat them.',
      accent: '#81B64C',
    },
    {
      icon: <BookOpen size={20} />,
      title: 'Structured Curriculum',
      description: 'From beginner fundamentals to advanced endgame theory — a complete learning path designed by titled players for every skill level.',
      accent: '#38bdf8',
    },
    {
      icon: <Swords size={20} />,
      title: 'Adaptive Practice Games',
      description: 'Play against AI opponents that dynamically match and challenge your current ability, scaling to keep you in the optimal learning zone.',
      accent: '#f87171',
    },
    {
      icon: <TrendingUp size={20} />,
      title: 'Progress Intelligence',
      description: 'Visual analytics that track your rating trajectory, accuracy trends, time pressure performance, and opening success rates over time.',
      accent: '#81B64C',
    },
  ];

  const testimonials = [
    {
      quote: 'My rating went from 1150 to 1480 in four months. The AI coach found my tendency to miss backward threats — something I never noticed on my own.',
      name: 'Arjun Mehta',
      elo: 'Club Player · Delhi',
      progress: '+330',
      avatar: 'A',
    },
    {
      quote: 'The structured curriculum is exceptional. It didn\'t just give me puzzles — it built my chess understanding layer by layer. I finally "see" the board differently.',
      name: 'Priya Sharma',
      elo: 'Intermediate · Mumbai',
      progress: '+260',
      avatar: 'P',
    },
    {
      quote: 'As a coach, I use Chess Mastery with all my students. The analysis tools save me hours of preparation and the reporting is remarkably accurate.',
      name: 'Nikhil Kulkarni',
      elo: 'FIDE 2150 · Coach',
      progress: '+180',
      avatar: 'N',
    },
  ];

  const responsiveStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap');

    @keyframes lp2-float {
      0%, 100% { transform: translateY(0px) rotate(var(--r, 0deg)); }
      50% { transform: translateY(-16px) rotate(var(--r, 0deg)); }
    }
    @keyframes lp2-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes lp2-gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* Base Reset & Variables */
    :root {
      --sq-size: 44px;
    }

    .lp2-hero-word {
      background: linear-gradient(135deg, #FFFFFF 20%, #81B64C 60%, #A3E635 90%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: lp2-gradient-shift 4s ease infinite;
    }

    /* Application signature green button with tactile depth */
    .lp2-cta-primary {
      background: #81B64C;
      color: #FFFFFF;
      border: none;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
      text-decoration: none;
      box-shadow: 0 4px 0 #588329, 0 10px 24px rgba(129, 182, 76, 0.3);
    }
    .lp2-cta-primary::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: lp2-shimmer 3s ease-in-out infinite;
    }
    .lp2-cta-primary:hover {
      background-color: #73A444;
      transform: translateY(-2px);
      box-shadow: 0 6px 0 #588329, 0 14px 32px rgba(129, 182, 76, 0.45);
    }
    .lp2-cta-primary:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #588329;
    }

    .lp2-cta-ghost {
      background: rgba(255,255,255,0.05);
      color: #c4b09a;
      border: 1px solid rgba(255,255,255,0.15);
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      backdrop-filter: blur(8px);
      text-decoration: none;
    }
    .lp2-cta-ghost:hover {
      background: rgba(129,182,76,0.12);
      border-color: rgba(129,182,76,0.35);
      color: #81B64C;
    }

    .lp2-nav-link {
      color: #8a7a70;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: color 0.2s;
    }
    .lp2-nav-link:hover { color: #81B64C; }

    .lp2-scroll-indicator {
      animation: lp2-float 2s ease-in-out infinite;
    }
    .lp2-piece-float {
      animation: lp2-float var(--dur, 8s) ease-in-out infinite var(--delay, 0s);
    }

    /* ─── Responsive Navbar ─── */
    .lp2-navbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      padding: 0 40px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.3s, border-color 0.3s, backdrop-filter 0.3s;
    }
    .lp2-nav-links-desktop {
      display: flex;
      align-items: center;
      gap: 36px;
    }
    .lp2-nav-auth-desktop {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .lp2-hamburger-btn {
      display: none;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(129,182,76,0.3);
      color: #F5F0E8;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }
    .lp2-mobile-dropdown {
      position: fixed;
      top: 64px; left: 0; right: 0;
      background: rgba(10,10,12,0.97);
      backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(129,182,76,0.25);
      padding: 24px 20px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 99;
      box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      animation: lp2-hero-fade 0.25s ease-out;
    }

    /* ─── Responsive Hero Section ─── */
    .lp2-hero-section {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      overflow: hidden;
      padding-top: 68px;
      width: 100%;
    }
    .lp2-hero-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      align-items: center;
      gap: 56px;
      max-width: 1280px;
      margin: 0 auto;
      padding: 80px 48px;
      width: 100%;
      position: relative;
      z-index: 10;
    }
    .lp2-hero-cards {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      max-width: 380px;
      margin-left: auto;
    }

    /* ─── Responsive Chess Board Table ─── */
    .lp2-board-frame {
      display: inline-block;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 0 0 2px rgba(129,182,76,0.35), 0 24px 60px rgba(0,0,0,0.6);
      max-width: 100%;
    }
    .lp2-chess-table {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .lp2-chess-td {
      width: var(--sq-size, 44px);
      height: var(--sq-size, 44px);
      text-align: center;
      vertical-align: middle;
      font-size: calc(var(--sq-size, 44px) * 0.58);
      line-height: 1;
      position: relative;
      user-select: none;
    }
    .lp2-light-sq { background: #EBECD0; }
    .lp2-dark-sq { background: #779556; }
    .lp2-highlight-sq { background: rgba(129,182,76,0.7); }
    .lp2-chess-piece {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lp2-black-piece {
      color: #1a1a1a;
      filter: drop-shadow(0 1px 1px rgba(255,255,255,0.2));
    }
    .lp2-white-piece {
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
    }

    /* ─── Responsive Sections ─── */
    .lp2-section {
      padding: 80px 48px;
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
    }

    .lp2-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 28px;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(129,182,76,0.18);
      border-radius: 24px;
      padding: 40px 48px;
    }
    .lp2-stat-card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(129,182,76,0.22);
      border-radius: 16px;
      padding: 20px 22px;
      min-width: 0;
      width: 100%;
    }
    .lp2-stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #F5F0E8;
      font-family: 'Outfit', sans-serif;
      line-height: 1;
    }
    .lp2-stat-label {
      font-size: 0.72rem;
      color: #a89080;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-top: 6px;
    }

    .lp2-board-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 72px;
      align-items: center;
    }
    .lp2-board-container {
      position: relative;
      display: inline-block;
      max-width: 100%;
    }
    .lp2-floating-badge-top {
      position: absolute;
      top: -20px; right: -170px;
      background: rgba(10,8,20,0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(167,139,250,0.4);
      border-radius: 14px;
      padding: 12px 16px;
      width: 160px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .lp2-floating-badge-rating {
      position: absolute;
      bottom: -20px; left: -130px;
      background: rgba(10,8,20,0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(129,182,76,0.35);
      border-radius: 14px;
      padding: 12px 16px;
      width: 130px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .lp2-floating-badge-acc {
      position: absolute;
      bottom: 40px; right: -150px;
      background: rgba(10,8,20,0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(129,182,76,0.35);
      border-radius: 14px;
      padding: 10px 14px;
      width: 140px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .lp2-mobile-board-badges {
      display: none;
    }

    .lp2-features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .lp2-feature-card {
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 28px 24px;
      cursor: default;
      position: relative;
      overflow: hidden;
      min-width: 0;
    }

    .lp2-steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      position: relative;
    }
    .lp2-steps-connector {
      position: absolute;
      top: 40px;
      left: 17%; right: 17%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(129,182,76,0.25), rgba(129,182,76,0.25), transparent);
      z-index: 0;
    }

    .lp2-testimonials-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .lp2-testimonial-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(129,182,76,0.18);
      border-radius: 20px;
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .lp2-cta-card {
      background: linear-gradient(135deg, rgba(129,182,76,0.08) 0%, rgba(88,131,41,0.04) 50%, rgba(129,182,76,0.06) 100%);
      border: 1px solid rgba(129,182,76,0.25);
      border-radius: 28px;
      padding: 72px 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .lp2-footer-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }

    /* ══════════════════════════════════════════════════
       MEDIA QUERIES FOR ADAPTIVE RESPONSIVENESS
    ══════════════════════════════════════════════════ */

    /* Large Tablets & Small Laptops (<= 1024px) */
    @media (max-width: 1024px) {
      .lp2-navbar {
        padding: 0 24px;
      }
      .lp2-nav-links-desktop {
        gap: 20px;
      }
      .lp2-hero-grid {
        grid-template-columns: 1fr;
        gap: 48px;
        padding: 60px 32px;
      }
      .lp2-hero-cards {
        max-width: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-left: 0;
      }
      .lp2-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 32px 32px;
        gap: 20px;
      }
      .lp2-board-section {
        grid-template-columns: 1fr;
        gap: 56px;
        text-align: center;
      }
      .lp2-board-features-list {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
      .lp2-floating-badge-top,
      .lp2-floating-badge-rating,
      .lp2-floating-badge-acc {
        display: none !important;
      }
      .lp2-mobile-board-badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 24px;
        width: 100%;
      }
      .lp2-features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .lp2-steps-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .lp2-testimonials-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .lp2-section {
        padding: 64px 32px;
      }
    }

    /* Tablets & Phablets (<= 768px) */
    @media (max-width: 768px) {
      :root {
        --sq-size: 38px;
      }
      .lp2-navbar {
        padding: 0 16px;
        height: 62px;
      }
      .lp2-nav-links-desktop {
        display: none !important;
      }
      .lp2-nav-auth-desktop {
        display: none !important;
      }
      .lp2-hamburger-btn {
        display: flex !important;
      }
      .lp2-hero-section {
        padding-top: 62px;
      }
      .lp2-hero-grid {
        padding: 40px 20px 48px;
        gap: 36px;
      }
      .lp2-hero-cards {
        grid-template-columns: 1fr;
        max-width: 440px;
        margin: 0 auto;
      }
      .lp2-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 24px 18px;
        gap: 14px;
        border-radius: 18px;
      }
      .lp2-stat-card {
        padding: 16px;
      }
      .lp2-stat-value {
        font-size: 1.45rem;
      }
      .lp2-stat-label {
        font-size: 0.65rem;
      }
      .lp2-steps-grid {
        grid-template-columns: 1fr;
        gap: 18px;
      }
      .lp2-steps-connector {
        display: none;
      }
      .lp2-features-grid {
        grid-template-columns: 1fr;
      }
      .lp2-testimonials-grid {
        grid-template-columns: 1fr;
      }
      .lp2-section {
        padding: 52px 20px;
      }
      .lp2-cta-card {
        padding: 44px 20px;
        border-radius: 20px;
      }
      .lp2-footer-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 18px;
      }
    }

    /* Mobile Phones (<= 480px) */
    @media (max-width: 480px) {
      :root {
        --sq-size: clamp(28px, 8.5vw, 34px);
      }
      .lp2-hero-grid {
        padding: 32px 16px 40px;
      }
      .lp2-hero-btn-group {
        flex-direction: column;
        width: 100%;
      }
      .lp2-hero-btn-group button {
        width: 100%;
        justify-content: center;
      }
      .lp2-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px 12px;
        gap: 10px;
      }
      .lp2-stat-card {
        padding: 14px 10px;
      }
      .lp2-stat-value {
        font-size: 1.25rem;
      }
      .lp2-stat-label {
        font-size: 0.62rem;
        letter-spacing: 0.08em;
      }
      .lp2-cta-card {
        padding: 36px 14px;
      }
      .lp2-cta-buttons-wrap {
        flex-direction: column;
        width: 100%;
      }
      .lp2-cta-buttons-wrap button {
        width: 100%;
        justify-content: center;
      }
      .lp2-section {
        padding: 40px 14px;
      }
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={{
        background: '#090909',
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        color: '#F5F0E8',
        overflowX: 'hidden',
        width: '100%',
      }}>

        {/* ══════════════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════════════ */}
        <nav
          className="lp2-navbar"
          style={{
            background: scrolled || mobileMenuOpen ? 'rgba(9,9,9,0.95)' : 'transparent',
            backdropFilter: scrolled || mobileMenuOpen ? 'blur(20px)' : 'none',
            borderBottom: scrolled || mobileMenuOpen ? '1px solid rgba(129,182,76,0.2)' : '1px solid transparent',
          }}
        >
          {/* Brand */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #81B64C, #588329)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(129,182,76,0.35)',
              flexShrink: 0,
            }}>
              <Crown size={18} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#F5F0E8', letterSpacing: '-0.01em' }}>
              Chess Mastery
            </span>
          </button>

          {/* Desktop Nav links */}
          <div className="lp2-nav-links-desktop">
            {['Features', 'How It Works', 'Testimonials'].map(item => (
              <a
                key={item}
                href={`#lp2-${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="lp2-nav-link"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Desktop Auth buttons */}
          <div className="lp2-nav-auth-desktop">
            <button
              onClick={() => onNavigate('/login')}
              className="lp2-cta-ghost"
              id="landing-nav-sign-in"
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: '0.875rem' }}
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('/register')}
              className="lp2-cta-primary"
              id="landing-nav-get-started"
              style={{ padding: '9px 22px', borderRadius: 10, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 7 }}
            >
              Get Started Free
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="lp2-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lp2-mobile-dropdown">
            {['Features', 'How It Works', 'Testimonials'].map(item => (
              <a
                key={item}
                href={`#lp2-${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="lp2-nav-link"
                style={{ fontSize: '1.05rem', padding: '6px 0' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div style={{ height: 1, background: 'rgba(129,182,76,0.2)', margin: '6px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/login');
                }}
                className="lp2-cta-ghost"
                style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: '0.95rem' }}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/register');
                }}
                className="lp2-cta-primary"
                style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Get Started Free
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            HERO — Cinematic Section
        ══════════════════════════════════════════════════ */}
        <section className="lp2-hero-section">
          {/* Knight image — background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/images/login-knight.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            filter: 'brightness(0.26) saturate(0.65)',
          }} />

          {/* Layered gradient overlays */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, #090909 45%, rgba(9,9,9,0.55) 75%, rgba(9,9,9,0.15) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, #090909 0%, transparent 50%)',
          }} />
          <div style={{
            position: 'absolute',
            top: '15%', right: '5%',
            width: 600, height: 600,
            background: 'radial-gradient(ellipse, rgba(129,182,76,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Floating chess piece glyphs */}
          {[
            { piece: '♛', s: '6rem', top: '18%', left: '72%', dur: '9s', delay: '0s', r: '-8deg' },
            { piece: '♞', s: '3.5rem', top: '65%', left: '68%', dur: '11s', delay: '1.5s', r: '5deg' },
            { piece: '♜', s: '3rem', top: '30%', left: '85%', dur: '7.5s', delay: '0.5s', r: '3deg' },
            { piece: '♝', s: '4.5rem', top: '75%', left: '82%', dur: '13s', delay: '2.5s', r: '-5deg' },
          ].map((p, i) => (
            <div
              key={i}
              className="lp2-piece-float"
              style={{
                position: 'absolute',
                fontSize: p.s,
                top: p.top, left: p.left,
                color: '#81B64C',
                opacity: 0.08,
                pointerEvents: 'none',
                userSelect: 'none',
                '--dur': p.dur,
                '--delay': p.delay,
                '--r': p.r,
              } as React.CSSProperties}
            >
              {p.piece}
            </div>
          ))}

          {/* Hero Content Grid */}
          <div className="lp2-hero-grid">
            {/* Left: Text & CTA */}
            <div>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(129,182,76,0.12)',
                border: '1px solid rgba(129,182,76,0.35)',
                borderRadius: 100,
                padding: '6px 16px',
                marginBottom: 24,
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
              }}>
                <Sparkles size={13} color="#81B64C" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  AI-Powered Chess Training
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(2.6rem, 5.5vw, 5.2rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                marginBottom: 22,
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s',
              }}>
                <span style={{ color: '#F5F0E8' }}>Master the</span><br />
                <span className="lp2-hero-word">Royal Game.</span>
              </h1>

              {/* Subheadline */}
              <p style={{
                fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)',
                color: '#9a8a80',
                lineHeight: 1.7,
                marginBottom: 36,
                maxWidth: 540,
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s',
              }}>
                AI coaching that adapts to <em style={{ color: '#c4b09a', fontStyle: 'normal', fontWeight: 600 }}>your</em> weaknesses. Tactical training that builds real pattern recognition. Deep analysis that transforms how you think about chess.
              </p>

              {/* CTA Buttons */}
              <div
                className="lp2-hero-btn-group"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexWrap: 'wrap',
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s',
                }}
              >
                <button
                  onClick={() => onNavigate('/register')}
                  id="landing-hero-cta"
                  className="lp2-cta-primary"
                  style={{
                    padding: '16px 32px',
                    borderRadius: 14,
                    fontSize: '1rem',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <Zap size={18} />
                  Start Training Free
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('/login')}
                  className="lp2-cta-ghost"
                  style={{
                    padding: '16px 28px',
                    borderRadius: 14,
                    fontSize: '1rem',
                    display: 'flex', alignItems: 'center', gap: 9,
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  Sign In
                </button>
              </div>

              {/* Social proof */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                marginTop: 34,
                flexWrap: 'wrap',
                opacity: heroReady ? 1 : 0,
                transition: 'opacity 0.7s ease 0.65s',
              }}>
                <div style={{ display: 'flex' }}>
                  {['A','P','N','R','K'].map((l, i) => (
                    <div key={i} style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `hsl(${i * 55 + 30}, 60%, 45%)`,
                      border: '2px solid #090909',
                      marginLeft: i === 0 ? 0 : -10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                    }}>{l}</div>
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {[...Array(5)].map((_,i) => <Star key={i} size={12} fill="#81B64C" color="#81B64C" />)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#81B64C', marginLeft: 4 }}>4.9</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7a6a60' }}>
                    Trusted by <strong style={{ color: '#9a8a80' }}>50,000+</strong> chess players worldwide
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Glassmorphic Telemetry Cards */}
            <div
              className="lp2-hero-cards"
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.9s ease 0.7s, transform 0.9s ease 0.7s',
              }}
            >
              {/* Accuracy card */}
              <div style={{
                background: 'rgba(10,10,15,0.78)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(129,182,76,0.3)',
                borderRadius: 16,
                padding: '16px 20px',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6a60', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  🎯 AI Coaching Session
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#81B64C', fontFamily: "'Outfit', sans-serif" }}>94.2%</span>
                  <span style={{ fontSize: '0.75rem', color: '#7a6a60' }}>accuracy</span>
                </div>
                <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '94%', height: '100%', background: 'linear-gradient(90deg, #81B64C, #A3E635)', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#81B64C', fontWeight: 700, marginTop: 8 }}>↑ +12% from last week</div>
              </div>

              {/* Rating progress card */}
              <div style={{
                background: 'rgba(10,10,15,0.78)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '16px 20px',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#7a6a60', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  ♔ Rating Progress
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#7a6a60' }}>Joined</div>
                    <div style={{ fontWeight: 800, color: '#F5F0E8', fontFamily: "'Outfit', sans-serif" }}>1150</div>
                  </div>
                  <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #38531D, #81B64C)', borderRadius: 2 }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#7a6a60' }}>Now</div>
                    <div style={{ fontWeight: 800, color: '#81B64C', fontFamily: "'Outfit', sans-serif" }}>1480</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#81B64C', fontWeight: 700, marginTop: 6 }}>+330 pts in 4 months</div>
              </div>

              {/* AI Best Move card */}
              <div style={{
                background: 'rgba(10,10,15,0.78)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', flexShrink: 0,
                }}>♞</div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Best Move</div>
                  <div style={{ fontWeight: 800, color: '#a78bfa', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem' }}>Nf3 → e5</div>
                  <div style={{ fontSize: '0.68rem', color: '#7a6a80' }}>+0.8 advantage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="lp2-scroll-indicator"
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              opacity: heroReady ? 0.5 : 0, transition: 'opacity 0.6s ease 1.2s',
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#6a5a50', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Scroll to explore</span>
            <ChevronDown size={18} color="#6a5a50" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════════════ */}
        <section
          ref={statsRef as React.RefObject<HTMLElement>}
          id="lp2-stats"
          className="lp2-section"
        >
          <div className="lp2-stats-grid">
            {[
              { value: count1.toLocaleString(), label: 'Active Players', suffix: '+', icon: <Users size={20} />, sub: 'worldwide' },
              { value: count2.toString(), label: 'Puzzles Available', suffix: '+', icon: <Target size={20} />, sub: 'hand-crafted' },
              { value: count3.toString(), label: 'Satisfaction Rate', suffix: '%', icon: <Star size={20} />, sub: 'user-rated' },
              { value: count4.toString(), label: 'Avg Rating Gain', suffix: 'pts', icon: <TrendingUp size={20} />, sub: 'in 3 months' },
            ].map((s, i) => (
              <StatCard
                key={i}
                icon={s.icon}
                value={statsInView ? `${s.value}${s.suffix}` : '0'}
                label={s.label}
                sub={s.sub}
                delay={i * 100}
                inView={statsInView}
              />
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            LIVE BOARD PREVIEW SECTION
        ══════════════════════════════════════════════════ */}
        <section
          ref={boardRef as React.RefObject<HTMLElement>}
          id="lp2-how-it-works"
          className="lp2-section"
        >
          <div className="lp2-board-section">
            {/* Board + annotation UI */}
            <div style={{
              opacity: boardInView ? 1 : 0,
              transform: boardInView ? 'translateY(0)' : 'translateY(36px)',
              transition: 'opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div className="lp2-board-container">
                {/* Board border frame */}
                <div style={{
                  padding: 4,
                  background: 'linear-gradient(135deg, rgba(129,182,76,0.4), rgba(88,131,41,0.2), rgba(129,182,76,0.1))',
                  borderRadius: 14,
                  display: 'inline-block',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
                }}>
                  <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <MiniChessBoard />
                  </div>
                </div>

                {/* Floating Desktop Annotations */}
                <div className="lp2-floating-badge-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Brain size={12} color="#a78bfa" />
                    <span style={{ fontSize: '0.62rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Analysis</span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#a78bfa', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem' }}>Nf3 → e5</div>
                  <div style={{ fontSize: '0.68rem', color: '#6a5060', marginTop: 2 }}>Best move · +0.8</div>
                </div>

                <div className="lp2-floating-badge-rating">
                  <div style={{ fontSize: '0.62rem', color: '#6a5a50', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Rating</div>
                  <div style={{ fontWeight: 800, color: '#81B64C', fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem' }}>+47 pts</div>
                  <div style={{ fontSize: '0.68rem', color: '#4a4030' }}>this week</div>
                </div>

                <div className="lp2-floating-badge-acc">
                  <div style={{ fontSize: '0.62rem', color: '#81B64C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Accuracy</div>
                  <div style={{ fontWeight: 800, color: '#81B64C', fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem' }}>94.2%</div>
                  <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                    <div style={{ width: '94%', height: '100%', background: '#81B64C', borderRadius: 2 }} />
                  </div>
                </div>
              </div>

              {/* Tablet & Mobile Badges Strip (Shown <= 1024px) */}
              <div className="lp2-mobile-board-badges">
                <div style={{
                  background: 'rgba(10,8,20,0.85)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  borderRadius: 12, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Brain size={13} color="#a78bfa" />
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700 }}>Nf3 → e5 (+0.8)</span>
                </div>
                <div style={{
                  background: 'rgba(10,8,20,0.85)',
                  border: '1px solid rgba(129,182,76,0.3)',
                  borderRadius: 12, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Target size={13} color="#81B64C" />
                  <span style={{ fontSize: '0.75rem', color: '#81B64C', fontWeight: 700 }}>94.2% Accuracy</span>
                </div>
                <div style={{
                  background: 'rgba(10,8,20,0.85)',
                  border: '1px solid rgba(129,182,76,0.3)',
                  borderRadius: 12, padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <TrendingUp size={13} color="#81B64C" />
                  <span style={{ fontSize: '0.75rem', color: '#81B64C', fontWeight: 700 }}>+47 pts this week</span>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div style={{
              opacity: boardInView ? 1 : 0,
              transform: boardInView ? 'translateX(0)' : 'translateX(36px)',
              transition: 'opacity 0.8s ease 0.25s, transform 0.8s ease 0.25s',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(129,182,76,0.12)',
                border: '1px solid rgba(129,182,76,0.35)',
                borderRadius: 100, padding: '5px 14px',
                marginBottom: 20,
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live AI Session</span>
              </div>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(1.9rem, 3.2vw, 2.9rem)',
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                color: '#F5F0E8',
                marginBottom: 18,
              }}>
                Your AI Coach<br />
                <span style={{ color: '#81B64C' }}>Never Sleeps.</span>
              </h2>
              <p style={{ color: '#8a7a70', lineHeight: 1.75, marginBottom: 28, fontSize: '0.95rem', maxWidth: 500 }}>
                Every game you play is analyzed in real time. Your AI coach identifies the exact moves where you went wrong — not just blunders, but subtle positional inaccuracies that weaken your position over time.
              </p>
              <div className="lp2-board-features-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Move-by-move annotation with engine evaluation',
                  'Missed tactics highlighted with visual overlays',
                  'Opening theory comparison against your repertoire',
                  'Endgame conversion analysis and training drills',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle size={16} color="#81B64C" fill="rgba(129,182,76,0.18)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.88rem', color: '#9a8a80' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32 }}>
                <button
                  onClick={() => onNavigate('/register')}
                  className="lp2-cta-primary"
                  style={{ padding: '13px 28px', borderRadius: 12, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  Try It Free
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FEATURES GRID
        ══════════════════════════════════════════════════ */}
        <section
          ref={featuresRef as React.RefObject<HTMLElement>}
          id="lp2-features"
          className="lp2-section"
        >
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(129,182,76,0.12)',
              border: '1px solid rgba(129,182,76,0.35)',
              borderRadius: 100, padding: '5px 16px', marginBottom: 18,
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Everything You Need</span>
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.9rem, 3.2vw, 2.9rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#F5F0E8',
              marginBottom: 16,
            }}>
              Built for players who want to<br />
              <span style={{ color: '#81B64C' }}>actually improve.</span>
            </h2>
            <p style={{ color: '#7a6a60', maxWidth: 520, margin: '0 auto', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Not another puzzle app. Chess Mastery is a complete training ecosystem — from your opening repertoire to your endgame precision.
            </p>
          </div>

          <div className="lp2-features-grid">
            {features.map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                accent={f.accent}
                delay={i * 80}
                inView={featuresInView}
              />
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            HOW IT WORKS — 3-step process
        ══════════════════════════════════════════════════ */}
        <section
          id="lp2-how-it-works"
          className="lp2-section"
          style={{ position: 'relative' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 52, position: 'relative' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(129,182,76,0.12)',
              border: '1px solid rgba(129,182,76,0.35)',
              borderRadius: 100, padding: '5px 16px', marginBottom: 18,
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>How It Works</span>
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.9rem, 3.2vw, 2.9rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#F5F0E8',
            }}>
              Three steps to transform<br />
              <span style={{ color: '#81B64C' }}>your chess game.</span>
            </h2>
          </div>

          <div className="lp2-steps-grid">
            {/* Connector line on desktop */}
            <div className="lp2-steps-connector" />

            {[
              {
                step: '01',
                icon: <Trophy size={24} color="#81B64C" />,
                title: 'Set Your Level',
                desc: 'Take a quick skill assessment. Tell us your goals. We build your personalized training plan around your ELO, weaknesses, and chess ambitions.',
                accent: '#81B64C',
              },
              {
                step: '02',
                icon: <Brain size={24} color="#a78bfa" />,
                title: 'Train with AI',
                desc: 'Work through your daily training queue — AI-curated puzzles, game analysis, opening lessons, and adaptive practice games aligned to your goals.',
                accent: '#a78bfa',
              },
              {
                step: '03',
                icon: <TrendingUp size={24} color="#81B64C" />,
                title: 'Track & Accelerate',
                desc: 'Watch your rating climb. Your dashboard tracks accuracy, tactical sharpness, and improvement velocity. Adjust your training focus as you grow.',
                accent: '#81B64C',
              },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${s.accent}25`,
                borderRadius: 20,
                padding: '34px 26px',
                position: 'relative',
                zIndex: 1,
              }}>
                <div style={{
                  width: 54, height: 54,
                  borderRadius: '50%',
                  background: `${s.accent}18`,
                  border: `2px solid ${s.accent}45`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  {s.icon}
                </div>
                <div style={{
                  position: 'absolute', top: 22, right: 24,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '2.4rem', fontWeight: 900,
                  color: `${s.accent}15`,
                  letterSpacing: '-0.04em',
                }}>{s.step}</div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.1rem', fontWeight: 700,
                  color: '#F5F0E8', marginBottom: 12,
                }}>{s.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#7a6a60', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════ */}
        <section
          ref={testimonialsRef as React.RefObject<HTMLElement>}
          id="lp2-testimonials"
          className="lp2-section"
        >
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(129,182,76,0.12)',
              border: '1px solid rgba(129,182,76,0.35)',
              borderRadius: 100, padding: '5px 16px', marginBottom: 18,
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Real Players. Real Results.</span>
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.9rem, 3.2vw, 2.9rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#F5F0E8',
            }}>
              Players who trusted the process.
            </h2>
          </div>

          <div className="lp2-testimonials-grid">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} delay={i * 120} inView={testimonialsInView} />
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FINAL CTA SECTION
        ══════════════════════════════════════════════════ */}
        <section
          ref={ctaRef as React.RefObject<HTMLElement>}
          id="lp2-cta"
          className="lp2-section"
          style={{ paddingBottom: 90 }}
        >
          <div
            className="lp2-cta-card"
            style={{
              opacity: ctaInView ? 1 : 0,
              transform: ctaInView ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            {/* Decorative corner chess pieces */}
            <div style={{ position: 'absolute', top: 16, left: 24, fontSize: '4.5rem', color: '#81B64C', opacity: 0.06, pointerEvents: 'none' }}>♛</div>
            <div style={{ position: 'absolute', bottom: 16, right: 24, fontSize: '4.5rem', color: '#81B64C', opacity: 0.06, pointerEvents: 'none' }}>♚</div>

            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(129,182,76,0.12)',
                border: '1px solid rgba(129,182,76,0.35)',
                borderRadius: 100, padding: '5px 16px', marginBottom: 22,
              }}>
                <Crown size={13} color="#81B64C" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#81B64C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Start Your Journey</span>
              </div>

              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(2rem, 3.8vw, 3.4rem)',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                color: '#F5F0E8',
                marginBottom: 16,
                lineHeight: 1.1,
              }}>
                Your best game is still<br />
                <span style={{ color: '#81B64C' }}>ahead of you.</span>
              </h2>

              <p style={{ color: '#8a7a70', maxWidth: 480, margin: '0 auto 34px', lineHeight: 1.7, fontSize: '0.98rem' }}>
                Join 50,000+ players who've already chosen Chess Mastery as their competitive edge. Free forever. No credit card.
              </p>

              <div
                className="lp2-cta-buttons-wrap"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}
              >
                <button
                  onClick={() => onNavigate('/register')}
                  id="landing-cta-final"
                  className="lp2-cta-primary"
                  style={{
                    padding: '16px 36px',
                    borderRadius: 14,
                    fontSize: '1rem',
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <Zap size={18} />
                  Create Free Account
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => onNavigate('/login')}
                  className="lp2-cta-ghost"
                  style={{ padding: '16px 30px', borderRadius: 14, fontSize: '1rem' }}
                >
                  Sign In
                </button>
              </div>

              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: <Shield size={13} />, text: 'No credit card required' },
                  { icon: <Zap size={13} />, text: 'Free forever plan' },
                  { icon: <Trophy size={13} />, text: 'Cancel anytime' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6a5a50', fontSize: '0.78rem' }}>
                    <span style={{ color: '#81B64C' }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════ */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '36px 48px',
          maxWidth: 1280, margin: '0 auto',
        }}>
          <div className="lp2-footer-content">
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #81B64C, #588329)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Crown size={15} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#F5F0E8', fontSize: '0.95rem' }}>Chess Mastery</span>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Privacy Policy', 'Terms of Service', 'Contact'].map(link => (
                <a key={link} href="#" className="lp2-nav-link" style={{ fontSize: '0.8rem' }}>{link}</a>
              ))}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#4a3a35' }}>
              © {new Date().getFullYear()} Chess Mastery. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;
