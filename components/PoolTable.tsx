
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, Pocket, GameMode, GameStatus, GameState } from '../types';
import { TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, POCKET_RADIUS, BALL_COLORS, MIN_VELOCITY } from '../constants';
import { updateBallMovement, resolveBallCollision, checkPocket, getDistance } from '../engine/physics';
import { calculateAIShot } from '../engine/ai';
import { playCollisionSound, playPocketSound, initAudio } from '../engine/audio';

interface PoolTableProps {
  mode: GameMode;
  onGameOver: (winner: number) => void;
  onScoreUpdate: (scores: [number, number]) => void;
  onTurnChange: (player: number) => void;
  onAIDifficultyChange?: (difficulty: number) => void;
}

const PoolTable: React.FC<PoolTableProps> = ({ mode, onGameOver, onScoreUpdate, onTurnChange, onAIDifficultyChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aiActionRef = useRef<boolean>(false); 

  const [gameState, setGameState] = useState<GameState>(() => {
    const balls: Ball[] = [];
    const startX = TABLE_WIDTH * 0.7;
    const startY = TABLE_HEIGHT * 0.5;
    let ballId = 1;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j <= i; j++) {
        balls.push({
          id: ballId,
          number: ballId,
          position: { x: startX + i * (BALL_RADIUS * 2 * 0.95), y: startY - (i * BALL_RADIUS) + j * (BALL_RADIUS * 2) },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color: BALL_COLORS[ballId % BALL_COLORS.length],
          isStriped: ballId > 8,
          inPocket: false
        });
        ballId++;
      }
    }

    return {
      balls,
      cueBall: {
        id: 0,
        number: 0,
        position: { x: TABLE_WIDTH * 0.25, y: TABLE_HEIGHT * 0.5 },
        velocity: { x: 0, y: 0 },
        radius: BALL_RADIUS,
        color: '#ffffff',
        isStriped: false,
        inPocket: false
      },
      currentPlayer: 0,
      status: GameStatus.PLAYING,
      mode,
      scores: [0, 0],
      isMoving: false,
      pottedThisShot: false,
      winner: null
    };
  });

  const [aiming, setAiming] = useState<{ angle: number; power: number; rawX: number; rawY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const requestRef = useRef<number>(0);

  const pockets: Pocket[] = [
    { position: { x: 0, y: 0 }, radius: POCKET_RADIUS },
    { position: { x: TABLE_WIDTH / 2, y: -2 }, radius: POCKET_RADIUS },
    { position: { x: TABLE_WIDTH, y: 0 }, radius: POCKET_RADIUS },
    { position: { x: 0, y: TABLE_HEIGHT }, radius: POCKET_RADIUS },
    { position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 2 }, radius: POCKET_RADIUS },
    { position: { x: TABLE_WIDTH, y: TABLE_HEIGHT }, radius: POCKET_RADIUS },
  ];

  const handleShoot = useCallback((angle: number, power: number) => {
    setGameState(prev => ({
      ...prev,
      cueBall: {
        ...prev.cueBall,
        velocity: {
          x: Math.cos(angle) * power,
          y: Math.sin(angle) * power
        }
      },
      isMoving: true,
      pottedThisShot: false
    }));
    setAiming(null);
    aiActionRef.current = false; 
  }, []);

  const update = useCallback(() => {
    setGameState(prev => {
      if (prev.winner !== null) return prev;
      
      const nextCueBall = { ...prev.cueBall };
      const nextBalls = prev.balls.map(b => ({ ...b }));
      let nextPottedThisShot = prev.pottedThisShot;
      
      let anyMoving = false;
      if (!nextCueBall.inPocket) {
        const wallImpulse = updateBallMovement(nextCueBall);
        if (wallImpulse > 0.4) playCollisionSound(wallImpulse);
        if (Math.abs(nextCueBall.velocity.x) >= MIN_VELOCITY || Math.abs(nextCueBall.velocity.y) >= MIN_VELOCITY) anyMoving = true;
      }
      
      nextBalls.forEach(b => {
        const wallImpulse = updateBallMovement(b);
        if (wallImpulse > 0.4) playCollisionSound(wallImpulse);
        if (Math.abs(b.velocity.x) >= MIN_VELOCITY || Math.abs(b.velocity.y) >= MIN_VELOCITY) anyMoving = true;
      });

      for (let i = 0; i < nextBalls.length; i++) {
        const cueImpulse = resolveBallCollision(nextCueBall, nextBalls[i]);
        if (cueImpulse > 0.2) playCollisionSound(cueImpulse);
        for (let j = i + 1; j < nextBalls.length; j++) {
          const ballImpulse = resolveBallCollision(nextBalls[i], nextBalls[j]);
          if (ballImpulse > 0.2) playCollisionSound(ballImpulse);
        }
      }

      if (checkPocket(nextCueBall, pockets)) {
        playPocketSound();
        nextCueBall.inPocket = false;
        nextCueBall.position = { x: TABLE_WIDTH * 0.25, y: TABLE_HEIGHT * 0.5 };
        nextCueBall.velocity = { x: 0, y: 0 };
        anyMoving = false; 
      }

      const nextScores = [...prev.scores] as [number, number];
      nextBalls.forEach(b => {
        if (!b.inPocket && checkPocket(b, pockets)) {
          playPocketSound();
          nextPottedThisShot = true;
          nextScores[prev.currentPlayer]++;
        }
      });

      let nextPlayer = prev.currentPlayer;
      let turnDone = false;
      
      if (prev.isMoving && !anyMoving) {
        turnDone = true;
        if (!nextPottedThisShot) {
          nextPlayer = (prev.currentPlayer + 1) % 2;
        }
      }

      const eightBall = nextBalls.find(b => b.number === 8);
      let winner = prev.winner;
      if (eightBall?.inPocket) {
        winner = prev.currentPlayer;
        onGameOver(winner);
      }

      if (turnDone) {
        onScoreUpdate(nextScores);
        onTurnChange(nextPlayer);
      }

      return {
        ...prev,
        cueBall: nextCueBall,
        balls: nextBalls,
        isMoving: anyMoving,
        pottedThisShot: nextPottedThisShot,
        currentPlayer: nextPlayer,
        scores: nextScores,
        winner
      };
    });

    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate, onTurnChange]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  useEffect(() => {
    const isAITurn = 
      (gameState.mode === GameMode.PvE && gameState.currentPlayer === 1) ||
      (gameState.mode === GameMode.EvE);

    if (isAITurn && !gameState.isMoving && gameState.winner === null && !aiActionRef.current) {
      aiActionRef.current = true; 
      const timer = setTimeout(() => {
        const shot = calculateAIShot(gameState.cueBall, gameState.balls, pockets);
        if (shot) handleShoot(shot.angle, shot.power);
      }, 400); // 略微缩短思考时间
      return () => clearTimeout(timer);
    }
  }, [gameState.isMoving, gameState.currentPlayer, gameState.mode, gameState.winner, handleShoot]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    pockets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#020617';
      ctx.fill();
    });

    const drawBall = (ball: Ball) => {
      if (ball.inPocket) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      
      const grad = ctx.createRadialGradient(
        ball.position.x - ball.radius * 0.3, 
        ball.position.y - ball.radius * 0.3, 
        1, 
        ball.position.x, 
        ball.position.y, 
        ball.radius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = grad;
      ctx.fill();

      if (ball.isStriped) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(ball.position.x - ball.radius, ball.position.y - ball.radius * 0.4, ball.radius * 2, ball.radius * 0.8);
        ctx.restore();
      }

      if (ball.number > 0) {
        ctx.fillStyle = ball.number === 8 ? 'white' : 'black';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), ball.position.x, ball.position.y);
      }
      ctx.restore();
    };

    gameState.balls.forEach(drawBall);
    drawBall(gameState.cueBall);

    if (aiming && !gameState.isMoving) {
      const { angle, power } = aiming;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(gameState.cueBall.position.x, gameState.cueBall.position.y);
      ctx.lineTo(
        gameState.cueBall.position.x + Math.cos(angle) * (60 + power * 15),
        gameState.cueBall.position.y + Math.sin(angle) * (60 + power * 15)
      );
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.arc(gameState.cueBall.position.x, gameState.cueBall.position.y, BALL_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();
    }
  }, [gameState, aiming]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (TABLE_WIDTH / rect.width),
      y: (clientY - rect.top) * (TABLE_HEIGHT / rect.height)
    };
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    initAudio();
    if (gameState.isMoving || gameState.winner !== null || aiActionRef.current) return;
    const isHumanTurn = (gameState.mode === GameMode.PvP) || (gameState.mode === GameMode.PvE && gameState.currentPlayer === 0);
    if (!isHumanTurn) return;

    setIsDragging(true);
    const pos = getCanvasPos(e);
    const dx = pos.x - gameState.cueBall.position.x;
    const dy = pos.y - gameState.cueBall.position.y;
    setAiming({ angle: Math.atan2(dy, dx), power: 0, rawX: pos.x, rawY: pos.y });
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const pos = getCanvasPos(e);
    const dx = pos.x - gameState.cueBall.position.x;
    const dy = pos.y - gameState.cueBall.position.y;
    const shotAngle = Math.atan2(-dy, -dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance / 9, 26); // 稍微提升人类拉杆的敏感度
    setAiming({ angle: shotAngle, power, rawX: pos.x, rawY: pos.y });
  };

  const onMouseUp = () => {
    if (isDragging && aiming) {
      if (aiming.power > 0.5) {
        handleShoot(aiming.angle, aiming.power);
      } else {
        setAiming(null);
      }
    }
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative bg-[#065f46] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] border-[12px] sm:border-[28px] border-slate-900 overflow-hidden cursor-crosshair touch-none"
        style={{ width: '92%', maxWidth: '850px', aspectRatio: '2/1' }}
      >
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          className="w-full h-full block"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]"></div>
      </div>
    </div>
  );
};

export default PoolTable;
