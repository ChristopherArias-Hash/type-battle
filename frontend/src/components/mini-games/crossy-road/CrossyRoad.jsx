import "./CrossyRoad.css"
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Game Configuration ---
const GRID_SIZE_V = 22;
const GRID_SIZE_H = 14;
const TILE_SIZE = 40; // in pixels
const PLAYER_START_POS = { x: Math.floor(GRID_SIZE_H / 2), y: GRID_SIZE_V - 1 };
// Updated vehicle types
const VEHICLE_TYPES = [
    { type: 'car', width: 2, style: 'car-red' },
    { type: 'truck', width: 3, style: 'truck-green' },
    { type: 'car', width: 2, style: 'car-blue' },
    { type: 'car', width: 2, style: 'car-purple' }
];

// --- React Components ---

// Player Component (Top-down chicken view facing north)
const Player = ({ pos }) => (
    <div
        className="player-container"
        key={`${pos.x}-${pos.y}`} // Re-triggers animation
        style={{
            left: pos.x * TILE_SIZE,
            top: pos.y * TILE_SIZE,
        }}
    >
        <svg viewBox="0 0 100 100" className="player-svg">
            <g> {/* Removed rotation to make chicken face North */}
                {/* Body */}
                <ellipse cx="50" cy="50" rx="30" ry="40" fill="#f1c40f" stroke="#e67e22" strokeWidth="4"/>
                {/* Wings */}
                <path d="M 35 30 C 20 40, 20 60, 35 70" fill="#e67e22" />
                <path d="M 65 30 C 80 40, 80 60, 65 70" fill="#e67e22" />
                {/* Head */}
                <circle cx="50" cy="15" r="15" fill="#f1c40f" stroke="#e67e22" strokeWidth="3"/>
                {/* Eyes */}
                <circle cx="43" cy="15" r="3" fill="#2c3e50"/>
                <circle cx="57" cy="15" r="3" fill="#2c3e50"/>
                 {/* Comb */}
                <path d="M 45 0 C 42 -5, 50 -8, 50 0 C 50 -8, 58 -5, 55 0 Z" fill="#e74c3c"/>
            </g>
        </svg>
    </div>
);


// Obstacle Component
const Obstacle = ({ obstacle }) => {
    const renderVehicle = () => {
        switch (obstacle.type) {
            case 'truck':
                return (
                    <div className="truck-body">
                        <div className="truck-cab"></div>
                        <div className="truck-trailer"></div>
                    </div>
                );
            case 'car':
            default:
                return <div className="vehicle-body"></div>;
        }
    };

    return (
        <div
            className={`obstacle ${obstacle.style}`}
            style={{
                left: obstacle.x * TILE_SIZE,
                top: obstacle.y * TILE_SIZE + (TILE_SIZE * 0.075),
                width: obstacle.width * TILE_SIZE,
            }}
        >
            {renderVehicle()}
        </div>
    );
};


// Road Lane Component
const RoadLane = ({ y }) => (
    <div className="road-lane" style={{ top: `${y * TILE_SIZE}px` }} />
);

// Game Over Message Overlay
const MessageOverlay = ({ status, onRestart, score }) => {
    if (status !== 'gameOver') return null;
    
    return (
        <div className="message-overlay">
            <h2 className='lose'>Game Over</h2>
            <p style={{color: 'white', fontSize: '1.2rem', margin: '-10px 0 20px'}}>Final Crossings: {score}</p>
            <button onClick={onRestart}>Play Again</button>
        </div>
    );
};

// --- Main App Component ---
const CrossyRoad = () => {
    const [playerPos, setPlayerPos] = useState(PLAYER_START_POS);
    const [obstacles, setObstacles] = useState([]);
    const [crossings, setCrossings] = useState(0);
    const [gameState, setGameState] = useState('playing');
    const [crossingDirection, setCrossingDirection] = useState('up'); // 'up' or 'down'

    const roadLanes = useMemo(() => {
        const lanes = [];
        for (let i = 1; i < GRID_SIZE_V - 1; i++) {
            lanes.push(<RoadLane key={`lane-${i}`} y={i} />);
        }
        return lanes;
    }, []);

    const resetGame = useCallback(() => {
        setPlayerPos(PLAYER_START_POS);
        setCrossings(0);
        setGameState('playing');
        setCrossingDirection('up');
    }, []);

    // Initialize obstacles only once
    useEffect(() => {
        const initialObstacles = [];
        for (let i = 1; i < GRID_SIZE_V - 1; i++) {
            const carsInLane = Math.floor(Math.random() * 2) + 1;
            const speed = (Math.random() * 0.03 + 0.02) * (Math.random() > 0.5 ? 1 : -1);
            
            for(let j = 0; j < carsInLane; j++){
                const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
                initialObstacles.push({
                    y: i,
                    x: Math.random() * GRID_SIZE_H + (j * (GRID_SIZE_H / carsInLane)),
                    ...vehicleType,
                    speed: speed,
                });
            }
        }
        setObstacles(initialObstacles);
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (gameState !== 'playing') return;

        setPlayerPos((prevPos) => {
            let newPos = { ...prevPos };
            switch (e.key) {
                case 'ArrowUp': case 'w':
                    newPos.y = Math.max(0, prevPos.y - 1);
                    break;
                case 'ArrowDown': case 's':
                    newPos.y = Math.min(GRID_SIZE_V - 1, prevPos.y + 1);
                    break;
                case 'ArrowLeft': case 'a':
                    newPos.x = Math.max(0, prevPos.x - 1);
                    break;
                case 'ArrowRight': case 'd':
                    newPos.x = Math.min(GRID_SIZE_H - 1, prevPos.x + 1);
                    break;
                default:
                    return prevPos;
            }
            return newPos;
        });
    }, [gameState]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        let animationFrameId;
        const gameLoop = () => {
            setObstacles(prevObstacles =>
                prevObstacles.map(obs => {
                    let newX = obs.x + obs.speed;
                    if (newX < -obs.width) newX = GRID_SIZE_H;
                    if (newX > GRID_SIZE_H) newX = -obs.width;
                    return { ...obs, x: newX };
                })
            );
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        
        // --- GOAL CHECK LOGIC ---
        const goalReached = 
            (crossingDirection === 'up' && playerPos.y === 0) ||
            (crossingDirection === 'down' && playerPos.y === GRID_SIZE_V - 1);

        if(goalReached) {
            setCrossings(c => c + 1);
            setCrossingDirection(dir => dir === 'up' ? 'down' : 'up');
        }

        // --- COLLISION CHECK LOGIC ---
        for (const obs of obstacles) {
            const carStart = Math.floor(obs.x);
            const carEnd = carStart + obs.width;
            if (playerPos.y === obs.y && playerPos.x >= carStart && playerPos.x < carEnd) {
                setGameState('gameOver');
                return;
            }
        }
    }, [playerPos, obstacles, gameState, crossingDirection]);


    return (
        <React.Fragment>
            <div className="game-wrapper">
                <div className="header">
                    <h1>Crossy Road</h1>
                    <p>Cross the road... and then cross back!</p>
                </div>
                <div className="game-board">
                    <div className={`safe-zone start-zone ${crossingDirection === 'down' ? 'goal-zone' : ''}`} />
                    <div className={`safe-zone end-zone ${crossingDirection === 'up' ? 'goal-zone' : ''}`} />
                    {roadLanes}
                    <Player pos={playerPos} />
                    {obstacles.map((obs, index) => (
                        <Obstacle key={index} obstacle={obs} />
                    ))}
                    <MessageOverlay status={gameState} onRestart={resetGame} score={crossings} />
                </div>
                <div className="game-info">
                    Crossings: {crossings}
                </div>
            </div>
        </React.Fragment>
    );
};

export default CrossyRoad;

