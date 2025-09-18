import "./Stacker.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { sendMiniGameReadyUp } from "../../../websocket";

// Helper functions
function draw3DBlock(ctx, x, y, width, height, depth, baseColor) {
    const parsedLightness = parseInt(baseColor.match(/(\d+)%\)/)[1]);
    if (isNaN(parsedLightness)) return;
    const [hue, saturation] = baseColor.match(/\d+/g).map(Number);
    const topLightness = Math.min(100, parsedLightness + 15);
    const sideLightness = Math.max(0, parsedLightness - 15);
    const topColor = `hsl(${hue}, ${saturation}%, ${topLightness}%)`;
    const sideColor = `hsl(${hue}, ${saturation}%, ${sideLightness}%)`;
    const frontColor = `hsl(${hue}, ${saturation}%, ${parsedLightness}%)`;
    ctx.fillStyle = topColor;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth); ctx.lineTo(x + width + depth, y - depth); ctx.lineTo(x + width, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sideColor;
    ctx.beginPath(); ctx.moveTo(x + width, y); ctx.lineTo(x + width + depth, y - depth); ctx.lineTo(x + width + depth, y + height - depth); ctx.lineTo(x + width, y + height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = frontColor;
    ctx.fillRect(x, y, width, height);
}

function drawGhostBlock(ctx, x, y, width, height, depth) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth); ctx.lineTo(x + width + depth, y - depth); ctx.lineTo(x + width, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + width, y); ctx.lineTo(x + width + depth, y - depth); ctx.lineTo(x + width + depth, y + height - depth); ctx.lineTo(x + width, y + height); ctx.closePath(); ctx.fill();
    ctx.fillRect(x, y, width, height);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width + depth, y - depth); ctx.lineTo(x + depth, y - depth); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + width, y + height); ctx.lineTo(x + width + depth, y + height - depth); ctx.lineTo(x + width + depth, y - depth); ctx.stroke();
}

function drawGroundPlane(ctx, canvasWidth, canvasHeight, depth, yOffset = 0) {
    const planeY = canvasHeight - depth + yOffset;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, planeY); ctx.lineTo(canvasWidth, planeY); ctx.lineTo(canvasWidth + depth, planeY - depth); ctx.lineTo(depth, planeY - depth); ctx.closePath(); ctx.stroke();
}

function Stacker({ miniGamePlayers, miniGameId }) {
    const canvasRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const currentBlockRef = useRef(null);
    const directionRef = useRef(1);
    const speedRef = useRef(2.5);
    const groundOffsetRef = useRef(0);
    const gameInitializedRef = useRef(false);

    const [gameState, setGameState] = useState('waiting');
    const [playerIsReady, setPlayerIsReady] = useState(false);
    const [stack, setStack] = useState([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isPerfectFlash, setIsPerfectFlash] = useState(false);

    // Simple canvas setup - no complex resizing
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Fixed dimensions for consistency
        canvas.width = 352; // 32 * 11 for clean unit divisions
        canvas.height = 500; // Fixed height
    }, []);

    // Load saved game state
    useEffect(() => {
        if (!miniGameId) return;
        
        setupCanvas();
        setHighScore(parseInt(localStorage.getItem('stackerHighScore') || '0', 10));
        
        try {
            const savedState = sessionStorage.getItem(`stackerGameState-${miniGameId}`);
            if (savedState) {
                const data = JSON.parse(savedState);
                setGameState(data.gameState || 'waiting');
                setPlayerIsReady(data.playerIsReady || false);
                setStack(data.stack || []);
                setScore(data.score || 0);
                currentBlockRef.current = data.currentBlock;
                directionRef.current = data.direction || 1;
                speedRef.current = data.speed || 2.5;
                groundOffsetRef.current = data.groundOffset || 0;
            }
        } catch (error) {
            console.error("Error loading state:", error);
        }
    }, [miniGameId, setupCanvas]);

    // Save game state
    useEffect(() => {
        if (!miniGameId || gameState === 'ended') return;
        
        const stateToSave = {
            gameState,
            playerIsReady,
            stack,
            score,
            currentBlock: currentBlockRef.current,
            direction: directionRef.current,
            speed: speedRef.current,
            groundOffset: groundOffsetRef.current,
        };
        
        sessionStorage.setItem(`stackerGameState-${miniGameId}`, JSON.stringify(stateToSave));
    }, [gameState, playerIsReady, stack, score, miniGameId]);

    const handleReadyUp = () => {
        if (!playerIsReady && miniGameId) {
            sendMiniGameReadyUp(miniGameId);
            setPlayerIsReady(true);
        }
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const blockHeight = 25;
        const blockDepth = 10;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGroundPlane(ctx, canvas.width, canvas.height, blockDepth, groundOffsetRef.current);
        
        // Draw ghost block
        if (gameState === "playing" && stack.length > 0 && currentBlockRef.current) {
            const prevBlock = stack[stack.length - 1];
            drawGhostBlock(ctx, prevBlock.x, currentBlockRef.current.y, prevBlock.width, blockHeight, blockDepth);
        }
        
        // Draw stack
        const colorBands = [0, 60, 120, 180, 240, 300];
        stack.forEach((block, index) => {
            if (!block) return;
            const bandIndex = Math.floor(index / 4) % colorBands.length;
            const color = `hsl(${colorBands[bandIndex]}, 70%, 60%)`;
            draw3DBlock(ctx, block.x, block.y, block.width, blockHeight, blockDepth, color);
        });
        
        // Draw current block
        if (gameState === "playing" && currentBlockRef.current) {
            const currentBandIndex = Math.floor(stack.length / 4) % colorBands.length;
            const color = `hsl(${colorBands[currentBandIndex]}, 90%, 70%)`;
            draw3DBlock(ctx, currentBlockRef.current.x, currentBlockRef.current.y, currentBlockRef.current.width, blockHeight, blockDepth, color);
        }
    }, [stack, gameState]);

    // Initialize new game
    const startNewGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        setupCanvas(); // Ensure canvas is properly sized
        
        const baseUnits = 11;
        const baseUnitWidth = canvas.width / baseUnits;
        const blockHeight = 25;
        const blockDepth = 10;
        const startingBlockWidth = baseUnitWidth * 3;
        
        // Reset everything
        groundOffsetRef.current = 0;
        setScore(0);
        
        // Create base block at bottom center
        const baseBlock = {
            x: baseUnitWidth * 4, // Center position
            y: canvas.height - blockHeight - blockDepth,
            width: startingBlockWidth
        };
        setStack([baseBlock]);
        
        // Create moving block
        const startX = Math.random() < 0.5 ? 0 : canvas.width - startingBlockWidth;
        directionRef.current = startX === 0 ? 1 : -1;
        
        currentBlockRef.current = {
            x: startX,
            y: baseBlock.y - blockHeight,
            width: startingBlockWidth
        };
        
        speedRef.current = 2.5;
        setGameState("playing");
        gameInitializedRef.current = true;
    }, [setupCanvas]);
    
    const endGame = useCallback(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('stackerHighScore', score.toString());
        }
        if (miniGameId) {
            sessionStorage.removeItem(`stackerGameState-${miniGameId}`);
        }
        setGameState("ended");
        gameInitializedRef.current = false;
    }, [score, highScore, miniGameId]);

    // Start game when all players ready
    useEffect(() => {
        if (miniGamePlayers && miniGamePlayers.length > 0) {
            const allReady = miniGamePlayers.every(p => p.is_ready);
            if (allReady && gameState === 'waiting' && playerIsReady && !gameInitializedRef.current) {
                startNewGame();
            }
        }
    }, [miniGamePlayers, gameState, playerIsReady, startNewGame]);

    // Game loop
    const gameLoop = useCallback(() => {
        if (gameState === 'playing' && currentBlockRef.current) {
            const canvas = canvasRef.current;
            const block = currentBlockRef.current;
            
            if (block && canvas) {
                // Move block
                block.x += directionRef.current * speedRef.current;
                
                // Bounce off edges
                if (block.x + block.width >= canvas.width || block.x <= 0) {
                    directionRef.current *= -1;
                    block.x = Math.max(0, Math.min(block.x, canvas.width - block.width));
                }
                
                draw();
            }
        }
        
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, draw]);

    useEffect(() => {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [gameLoop]);

    // Drop block logic
    const dropBlock = useCallback(() => {
        const canvas = canvasRef.current;
        const blockToDrop = currentBlockRef.current;
        if (!canvas || !blockToDrop || stack.length === 0) return;

        const baseUnits = 11;
        const baseUnitWidth = canvas.width / baseUnits;
        const blockHeight = 25;
        const prevBlock = stack[stack.length - 1];

        // Calculate overlap
        const overlap = Math.max(0, 
            Math.min(blockToDrop.x + blockToDrop.width, prevBlock.x + prevBlock.width) - 
            Math.max(blockToDrop.x, prevBlock.x)
        );

        // Check if game over
        if (overlap < baseUnitWidth) {
            endGame();
            return;
        }

        // Perfect placement check
        const isPerfect = Math.abs(blockToDrop.x - prevBlock.x) <= 5;
        let newBlock;

        if (isPerfect) {
            setScore(s => s + 2);
            setIsPerfectFlash(true);
            setTimeout(() => setIsPerfectFlash(false), 300);
            newBlock = { 
                x: prevBlock.x, 
                y: blockToDrop.y, 
                width: prevBlock.width 
            };
        } else {
            setScore(s => s + 1);
            const startOverlap = Math.max(blockToDrop.x, prevBlock.x);
            const newWidth = Math.round(overlap / baseUnitWidth) * baseUnitWidth;
            const snappedX = Math.round(startOverlap / baseUnitWidth) * baseUnitWidth;
            newBlock = { 
                x: snappedX, 
                y: blockToDrop.y, 
                width: newWidth 
            };
        }

        let newStack = [...stack, newBlock];

        // Scroll if blocks get too high
        if (newStack.some(b => b.y < canvas.height * 0.3)) {
            newStack = newStack.map(b => ({ ...b, y: b.y + blockHeight }));
            groundOffsetRef.current += blockHeight;
        }

        setStack(newStack);
        speedRef.current *= 1.035;

        // Create next block
        const nextBlockY = newBlock.y - blockHeight;
        const startX = Math.random() < 0.5 ? 0 : canvas.width - newBlock.width;
        directionRef.current = startX === 0 ? 1 : -1;
        
        currentBlockRef.current = { 
            x: startX, 
            y: nextBlockY, 
            width: newBlock.width 
        };
    }, [stack, endGame]);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.code === "Space" || e.key === " ") && gameState === "playing") {
                e.preventDefault();
                dropBlock();
            }
        };

        const handleCanvasClick = () => {
            if (gameState === "playing") {
                dropBlock();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener("click", handleCanvasClick);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (canvas) {
                canvas.removeEventListener("click", handleCanvasClick);
            }
        };
    }, [gameState, dropBlock]);

    // Initial draw
    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <div className="mini-game-stacker">
            <h3>Stacker - {gameState.toUpperCase()}</h3>
            {gameState === 'waiting' && (
                <ul>
                    {miniGamePlayers.map((p, index) => (
                        <li key={index}>
                            {p.user?.displayName || p.user?.firebaseUid} – Score: {p.score} | Ready: {p.is_ready ? "✅" : "❌"}
                        </li>
                    ))}
                </ul>
            )}
            {!playerIsReady && gameState === 'waiting' && (
                <div>
                    <button onClick={handleReadyUp}>Ready Up</button>
                </div>
            )}
            {playerIsReady && (
                <div className="game-wrapper">
                    <div id="game-container">
                        <div id="ui-container" className={isPerfectFlash ? "perfect-flash-ui" : ""}>
                            <div className="score-box">
                                <div>HIGH SCORE</div>
                                <div>{highScore}</div>
                            </div>
                            <div className="score-box">
                                <div>SCORE</div>
                                <div>{score}</div>
                            </div>
                        </div>
                        <canvas ref={canvasRef}></canvas>
                        {gameState === "ended" && (
                            <div id="game-over-modal">
                                <h2>Game Over</h2>
                                <p>Your Score: {score}</p>
                                <p>High Score: {highScore}</p>
                                <button onClick={startNewGame}>Play Again</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Stacker; 