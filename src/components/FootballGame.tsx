import React, { useEffect, useRef, useState } from 'react';
import { Ball, Player } from '../types';

const PITCH_COLOR = '#2d5a27';
const LINE_COLOR = '#ffffff';
const PLAYER_1_COLOR = '#ef4444'; // Red
const PLAYER_2_COLOR = '#3b82f6'; // Blue
const BALL_COLOR = '#ffffff';

const FRICTION = 0.99;
const PLAYER_SPEED = 0.6;
const MAX_SPEED = 10;
const BALL_BOUNCE = 0.8;
const GOAL_SIZE = 150;
const KICK_FORCE = 12;

export const FootballGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [showGoalOverlay, setShowGoalOverlay] = useState<1 | 2 | null>(null);
  const [isDraggingBall, setIsDraggingBall] = useState(false);

  // Game State Refs (to avoid re-renders on every frame)
  const gameState = useRef({
    p1: { x: 100, y: 300, vx: 0, vy: 0, radius: 25, color: PLAYER_1_COLOR, id: 1, score: 0 } as Player,
    p2: { x: 700, y: 300, vx: 0, vy: 0, radius: 25, color: PLAYER_2_COLOR, id: 2, score: 0 } as Player,
    ball: { x: 400, y: 300, vx: 0, vy: 0, radius: 12, color: BALL_COLOR, lastTouchedBy: null } as Ball,
    keys: {} as Record<string, boolean>,
    dimensions: { width: 800, height: 600 },
    mouse: { x: 0, y: 0, isDown: false }
  });

  const resetPositions = (scoringPlayer?: 1 | 2) => {
    const { width, height } = gameState.current.dimensions;
    
    if (scoringPlayer) {
      setShowGoalOverlay(scoringPlayer);
      setTimeout(() => setShowGoalOverlay(null), 2000);
    }

    gameState.current.p1.x = 100;
    gameState.current.p1.y = height / 2;
    gameState.current.p1.vx = 0;
    gameState.current.p1.vy = 0;

    gameState.current.p2.x = width - 100;
    gameState.current.p2.y = height / 2;
    gameState.current.p2.vx = 0;
    gameState.current.p2.vy = 0;

    gameState.current.ball.x = width / 2;
    gameState.current.ball.y = height / 2;
    gameState.current.ball.vx = 0;
    gameState.current.ball.vy = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { gameState.current.keys[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { gameState.current.keys[e.code] = false; };
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const { ball } = gameState.current;
      const dist = Math.sqrt((x - ball.x)**2 + (y - ball.y)**2);
      
      if (dist < ball.radius * 3) {
        setIsDraggingBall(true);
        gameState.current.mouse.isDown = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      gameState.current.mouse.x = e.clientX - rect.left;
      gameState.current.mouse.y = e.clientY - rect.top;
    };

    const handleMouseUp = () => {
      setIsDraggingBall(false);
      gameState.current.mouse.isDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasRef.current?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      if (isPaused || showGoalOverlay) return;

      const { p1, p2, ball, keys, dimensions, mouse } = gameState.current;
      const { width, height } = dimensions;

      if (isDraggingBall) {
        ball.vx = (mouse.x - ball.x) * 0.2;
        ball.vy = (mouse.y - ball.y) * 0.2;
        ball.x = mouse.x;
        ball.y = mouse.y;
        return;
      }

      // Player 1 Controls (WASD)
      if (keys['KeyW']) p1.vy -= PLAYER_SPEED;
      if (keys['KeyS']) p1.vy += PLAYER_SPEED;
      if (keys['KeyA']) p1.vx -= PLAYER_SPEED;
      if (keys['KeyD']) p1.vx += PLAYER_SPEED;

      // Player 2 Controls (Arrows)
      if (keys['ArrowUp']) p2.vy -= PLAYER_SPEED;
      if (keys['ArrowDown']) p2.vy += PLAYER_SPEED;
      if (keys['ArrowLeft']) p2.vx -= PLAYER_SPEED;
      if (keys['ArrowRight']) p2.vx += PLAYER_SPEED;

      // Apply physics to players
      [p1, p2].forEach(p => {
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        
        // Speed limit
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Boundary checks for players
        if (p.x < p.radius) { p.x = p.radius; p.vx = 0; }
        if (p.x > width - p.radius) { p.x = width - p.radius; p.vx = 0; }
        if (p.y < p.radius) { p.y = p.radius; p.vy = 0; }
        if (p.y > height - p.radius) { p.y = height - p.radius; p.vy = 0; }
      });

      // Ball physics
      ball.vx *= FRICTION;
      ball.vy *= FRICTION;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Ball boundary & Goal detection
      const goalTop = (height - GOAL_SIZE) / 2;
      const goalBottom = (height + GOAL_SIZE) / 2;

      // Left Goal
      if (ball.x < ball.radius) {
        if (ball.y > goalTop && ball.y < goalBottom) {
          setScore(prev => ({ ...prev, p2: prev.p2 + 1 }));
          resetPositions(2);
        } else {
          ball.x = ball.radius;
          ball.vx = -ball.vx * BALL_BOUNCE;
        }
      }
      // Right Goal
      if (ball.x > width - ball.radius) {
        if (ball.y > goalTop && ball.y < goalBottom) {
          setScore(prev => ({ ...prev, p1: prev.p1 + 1 }));
          resetPositions(1);
        } else {
          ball.x = width - ball.radius;
          ball.vx = -ball.vx * BALL_BOUNCE;
        }
      }
      // Top/Bottom walls
      if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * BALL_BOUNCE;
      }
      if (ball.y > height - ball.radius) {
        ball.y = height - ball.radius;
        ball.vy = -ball.vy * BALL_BOUNCE;
      }

      // Collisions: Player vs Ball
      [p1, p2].forEach(p => {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = p.radius + ball.radius;

        if (distance < minDistance + 5) {
          const angle = Math.atan2(dy, dx);
          
          // Kick Mechanic
          const isKicking = (p.id === 1 && keys['Space']) || (p.id === 2 && (keys['Enter'] || keys['KeyM']));
          
          if (distance < minDistance) {
            const targetX = p.x + Math.cos(angle) * minDistance;
            const targetY = p.y + Math.sin(angle) * minDistance;
            ball.x = targetX;
            ball.y = targetY;
          }

          if (isKicking) {
            ball.vx += Math.cos(angle) * KICK_FORCE;
            ball.vy += Math.sin(angle) * KICK_FORCE;
          } else if (distance < minDistance) {
            const force = 1.2;
            ball.vx += p.vx * force;
            ball.vy += p.vy * force;
            ball.vx += Math.cos(angle) * 2;
            ball.vy += Math.sin(angle) * 2;
          }
        }
      });

      // Collisions: Player vs Player
      const pdx = p2.x - p1.x;
      const pdy = p2.y - p1.y;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      const pMinDist = p1.radius + p2.radius;
      if (pDist < pMinDist) {
        const angle = Math.atan2(pdy, pdx);
        const overlap = pMinDist - pDist;
        const moveX = Math.cos(angle) * overlap / 2;
        const moveY = Math.sin(angle) * overlap / 2;
        
        p1.x -= moveX;
        p1.y -= moveY;
        p2.x += moveX;
        p2.y += moveY;

        // Simple bounce
        const tempVx = p1.vx;
        const tempVy = p1.vy;
        p1.vx = p2.vx * 0.5;
        p1.vy = p2.vy * 0.5;
        p2.vx = tempVx * 0.5;
        p2.vy = tempVy * 0.5;
      }
    };

    const draw = () => {
      const { p1, p2, ball, dimensions } = gameState.current;
      const { width, height } = dimensions;

      ctx.clearRect(0, 0, width, height);

      // Pitch
      ctx.fillStyle = PITCH_COLOR;
      ctx.fillRect(0, 0, width, height);

      // Markings
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 2;

      // Center line
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Goals
      const goalTop = (height - GOAL_SIZE) / 2;
      ctx.strokeRect(-1, goalTop, 40, GOAL_SIZE);
      ctx.strokeRect(width - 39, goalTop, 40, GOAL_SIZE);

      // Penalty areas
      ctx.strokeRect(0, height / 2 - 150, 100, 300);
      ctx.strokeRect(width - 100, height / 2 - 150, 100, 300);

      // Draw Ball
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Players
      [p1, p2].forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Player details (inner circle)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius - 5, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, showGoalOverlay, isDraggingBall]);

  // Handle resizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        gameState.current.dimensions = { width: clientWidth, height: clientHeight };
        resetPositions();
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-stone-900 text-white p-4 font-sans">
      <div className="flex justify-between w-full max-w-4xl mb-4 px-8">
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1">Player 1</span>
          <span className="text-5xl font-mono font-light">{score.p1}</span>
          <span className="text-[10px] text-stone-500 mt-2">WASD + SPACE</span>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <div className="text-stone-500 text-xs uppercase tracking-[0.3em] mb-4">Match Score</div>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="px-6 py-2 border border-stone-700 rounded-full hover:bg-stone-800 transition-colors text-xs uppercase tracking-widest"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-1">Player 2</span>
          <span className="text-5xl font-mono font-light">{score.p2}</span>
          <span className="text-[10px] text-stone-500 mt-2">ARROWS + ENTER</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl aspect-[4/3] bg-stone-800 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl"
      >
        <canvas 
          ref={canvasRef}
          className="w-full h-full cursor-none"
        />
        
        {isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <h2 className="text-4xl font-light tracking-tighter mb-6 italic">Game Paused</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="px-12 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:bg-stone-200 transition-all transform hover:scale-105"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {showGoalOverlay && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="animate-bounce text-center">
              <h2 className={`text-8xl font-black italic uppercase tracking-tighter ${showGoalOverlay === 1 ? 'text-red-500' : 'text-blue-500'} drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]`}>
                GOAL!
              </h2>
              <p className="text-white text-xl font-bold mt-4 tracking-widest bg-black/50 px-6 py-2 rounded-full">
                PLAYER {showGoalOverlay} SCORES
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-12 text-stone-500">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest mb-1">Physics</div>
          <div className="text-xs font-mono">Elastic Collisions</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest mb-1">Engine</div>
          <div className="text-xs font-mono">HTML5 Canvas 2D</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest mb-1">Controls</div>
          <div className="text-xs font-mono">Local Multiplayer</div>
        </div>
      </div>
    </div>
  );
};
