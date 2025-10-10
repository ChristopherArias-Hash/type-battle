import React, { useState, useEffect, useCallback, useRef } from 'react';
import './IslandGame.css'; // Import the new CSS file

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 30;
const TILE_SIZE = 30;
const GAME_DURATION = 60;
const ROUNDS = 8;
const ROUND_INTERVAL = GAME_DURATION / ROUNDS;
const PLAYER_SPEED = 0.2;
const CANNONBALL_SPEED = 0.15;
const CANNON_FIRE_INTERVAL = 2500; // Fire every 2.5 seconds
const ISLAND_RADIUS = 12; // Island radius in tiles

// --- GAME COMPONENTS ---

const Player = ({ position }) => (
  <div
    className="player"
    style={{
      left: position.x * TILE_SIZE,
      top: position.y * TILE_SIZE,
    }}
  />
);

const Cannon = ({ position, rotation }) => (
  <div
    className="cannon"
    style={{
      left: position.x * TILE_SIZE,
      top: position.y * TILE_SIZE,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }}
  >
    <div className="cannon-base"></div>
    <div className="cannon-barrel"></div>
  </div>
);

const Cannonball = ({ position }) => (
  <div
    className="cannonball"
    style={{
      left: position.x * TILE_SIZE,
      top: position.y * TILE_SIZE,
    }}
  />
);

const Island = () => (
  <div className="island-container">
    <div className="water-background"></div>
    <div className="water-waves"></div>
    <div className="water-ripples"></div>
    <div className="island-shadow" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px` }}></div>
    <div className="shallow-water" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px` }}></div>
    <div className="island-sand" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px` }}></div>
    <div className="sand-texture" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px` }}></div>
    <div className="island-grass-outer" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px` }}></div>
    <div className="grass-texture" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px` }}></div>
    <div className="island-grass-inner" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px` }}></div>
    <div className="island-highlight" style={{ width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px`, height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px` }}></div>
  </div>
);

// --- MAIN GAME COMPONENT ---

const IslandGame = () => {
  const [gameState, setGameState] = useState('waiting');
  const [timer, setTimer] = useState(GAME_DURATION);
  const [playerPos, setPlayerPos] = useState({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
  const [cannons, setCannons] = useState([]);
  const [cannonballs, setCannonballs] = useState([]);

  const keysDownRef = useRef({});
  const gameLoopRef = useRef();
  const lastTimeRef = useRef();
  const cannonballIdRef = useRef(0);

  const resetGame = useCallback(() => {
    setTimer(GAME_DURATION);
    setPlayerPos({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
    setCannons([]);
    setCannonballs([]);
    keysDownRef.current = {};
  }, []);

  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  const playerPosRef = useRef(playerPos);
  useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
  const cannonsRef = useRef(cannons);
  useEffect(() => { cannonsRef.current = cannons; }, [cannons]);

  const gameLoop = useCallback((timestamp) => {
    if (gameStateRef.current !== 'playing') {
      cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setPlayerPos(prevPos => {
      let { x, y } = prevPos;
      const speed = PLAYER_SPEED;
      if (keysDownRef.current['ArrowUp'] || keysDownRef.current['w']) y -= speed;
      if (keysDownRef.current['ArrowDown'] || keysDownRef.current['s']) y += speed;
      if (keysDownRef.current['ArrowLeft'] || keysDownRef.current['a']) x -= speed;
      if (keysDownRef.current['ArrowRight'] || keysDownRef.current['d']) x += speed;

      const distFromCenter = Math.sqrt(Math.pow(x - BOARD_SIZE / 2, 2) + Math.pow(y - BOARD_SIZE / 2, 2));

      if (distFromCenter > ISLAND_RADIUS - 0.5) {
        const angle = Math.atan2(y - BOARD_SIZE / 2, x - BOARD_SIZE / 2);
        x = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.cos(angle);
        y = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.sin(angle);
      }
      return { x, y };
    });

    setTimer(prevTimer => {
      const newTime = prevTimer - deltaTime;
      if (newTime <= 0) {
        setGameState('won');
        return 0;
      }

      const currentRound = ROUNDS - Math.floor((newTime - 1) / ROUND_INTERVAL);
      if (cannonsRef.current.length < currentRound && cannonsRef.current.length < ROUNDS) {
        const angle = Math.random() * Math.PI * 2;
        const x = BOARD_SIZE / 2 + ISLAND_RADIUS * Math.cos(angle);
        const y = BOARD_SIZE / 2 + ISLAND_RADIUS * Math.sin(angle);
        setCannons(prevCannons => [...prevCannons, { id: prevCannons.length, pos: { x, y }, angle: 0, lastShot: timestamp }]);
      }

      setCannons(prevCannons => prevCannons.map(c => {
        const dx = playerPosRef.current.x - c.pos.x;
        const dy = playerPosRef.current.y - c.pos.y;
        c.angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (timestamp - c.lastShot > CANNON_FIRE_INTERVAL) {
          c.lastShot = timestamp;
          setCannonballs(prevBalls => {
            const angleRad = c.angle * (Math.PI / 180);
            const velocity = {
              x: Math.cos(angleRad) * CANNONBALL_SPEED,
              y: Math.sin(angleRad) * CANNONBALL_SPEED,
            };
            return [...prevBalls, { id: cannonballIdRef.current++, pos: { ...c.pos }, velocity }];
          });
        }
        return c;
      }));

      return newTime;
    });

    setCannonballs(prevBalls => {
      const updatedBalls = prevBalls.map(ball => ({
        ...ball,
        pos: {
          x: ball.pos.x + ball.velocity.x,
          y: ball.pos.y + ball.velocity.y
        }
      })).filter(ball =>
        ball.pos.x > 0 && ball.pos.x < BOARD_SIZE &&
        ball.pos.y > 0 && ball.pos.y < BOARD_SIZE
      );

      for (const ball of updatedBalls) {
        const dx = ball.pos.x - playerPosRef.current.x;
        const dy = ball.pos.y - playerPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
          setGameState('lost');
        }
      }
      return updatedBalls;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
  }, [resetGame]);

  useEffect(() => {
    const handleKeyDown = (e) => { keysDownRef.current[e.key] = true; };
    const handleKeyUp = (e) => { keysDownRef.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (gameState === 'playing') {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  return (
    <div className="game-container">
      <h1 className="game-title">Cannon Island Survival</h1>
      <div
        className="game-board"
        style={{ width: BOARD_SIZE * TILE_SIZE, height: BOARD_SIZE * TILE_SIZE }}
      >
        {(gameState === 'waiting' || gameState === 'lost' || gameState === 'won') && (
          <div className="game-overlay">
            <div className="game-modal">
              {gameState === 'waiting' && (
                <>
                  <h2 className="modal-title">Survive for {GAME_DURATION} seconds!</h2>
                  <p className="modal-text">Use arrow keys or WASD to move</p>
                  <button onClick={startGame} className="modal-button">
                    Start Game
                  </button>
                </>
              )}
              {gameState === 'lost' && (
                <>
                  <h2 className="modal-title lost">Game Over!</h2>
                  <p className="modal-text">You survived for {GAME_DURATION - Math.ceil(timer)} seconds.</p>
                  <button onClick={startGame} className="modal-button">
                    Play Again
                  </button>
                </>
              )}
              {gameState === 'won' && (
                <>
                  <h2 className="modal-title won">You Survived!</h2>
                  <p className="modal-text">Congratulations, you won the game!</p>
                  <button onClick={startGame} className="modal-button">
                    Play Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <Island />
        <Player position={playerPos} />
        {cannons.map(c => <Cannon key={c.id} position={c.pos} rotation={c.angle} />)}
        {cannonballs.map(b => <Cannonball key={b.id} position={b.pos} />)}
      </div>
      <div className="game-timer">
        Time Remaining: {Math.ceil(timer)}s
      </div>
    </div>
  );
};

export default IslandGame;