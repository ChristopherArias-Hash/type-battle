import "./Stacker.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { sendMiniGameReadyUp } from "../../../websocket";

// Helper functions (draw3DBlock, drawGhostBlock, drawGroundPlane) remain the same...
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
    const hasInitializedRef = useRef(false);
    const groundOffsetRef = useRef(0);

    const [gameState, setGameState] = useState('waiting');
    const [playerIsReady, setPlayerIsReady] = useState(false);
    const [stack, setStack] = useState([]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isPerfectFlash, setIsPerfectFlash] = useState(false);

    const initializeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const baseUnits = 11;
        // --- UPDATED: Reverted to non-stretching, capped width ---
        let preferredWidth = Math.min(window.innerWidth * 0.9, 400);
        canvas.width = Math.floor(preferredWidth / baseUnits) * baseUnits;
        canvas.height = window.innerHeight * 0.8;
    }, []);

    // Session storage useEffects remain the same...
    useEffect(() => {
        if (!miniGameId || hasInitializedRef.current) return;
        initializeCanvas();
        try {
            const savedState = sessionStorage.getItem(`stackerGameState-${miniGameId}`);
            if (savedState) {
                const data = JSON.parse(savedState);
                setGameState(data.gameState); setPlayerIsReady(data.playerIsReady);
                setStack(data.stack || []); setScore(data.score);
                currentBlockRef.current = data.currentBlock; directionRef.current = data.direction;
                speedRef.current = data.speed;
            }
        } catch (error) { console.error("❗️ Error loading state:", error); }
        finally { hasInitializedRef.current = true; }
        setHighScore(localStorage.getItem('stackerHighScore') || 0);
    }, [miniGameId, initializeCanvas]);
    useEffect(() => {
        if (!miniGameId || !hasInitializedRef.current || gameState === 'ended') return;
        sessionStorage.setItem(`stackerGameState-${miniGameId}`, JSON.stringify({
            gameState, playerIsReady, stack, score,
            currentBlock: currentBlockRef.current,
            direction: directionRef.current,
            speed: speedRef.current,
        }));
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
        if (gameState === "playing" && stack.length > 0 && currentBlockRef.current) {
            const prevBlock = stack[stack.length - 1];
            drawGhostBlock(ctx, prevBlock.x, currentBlockRef.current.y, prevBlock.width, blockHeight, blockDepth);
        }
        const colorBands = [0, 60, 120, 180, 240, 300];
        (stack || []).forEach((block, index) => {
            if (!block) return;
            const bandIndex = Math.floor(index / 4) % colorBands.length;
            const color = `hsl(${colorBands[bandIndex]}, 70%, 60%)`;
            draw3DBlock(ctx, block.x, block.y, block.width, blockHeight, blockDepth, color);
        });
        if (gameState === "playing" && currentBlockRef.current) {
            const currentBandIndex = Math.floor((stack || []).length / 4) % colorBands.length;
            const color = `hsl(${colorBands[currentBandIndex]}, 90%, 70%)`;
            draw3DBlock(ctx, currentBlockRef.current.x, currentBlockRef.current.y, currentBlockRef.current.width, blockHeight, blockDepth, color);
        }
    }, [stack, gameState]);

    const initializeGame = useCallback((isNewGame) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (isNewGame || !stack || stack.length === 0) {
            const baseUnits = 11;
            const baseUnitWidth = canvas.width / baseUnits;
            const blockHeight = 25;
            const blockDepth = 10;
            const startingBlockWidth = baseUnitWidth * 3;
            groundOffsetRef.current = 0;
            const baseBlock = { x: baseUnitWidth * 4, y: canvas.height - blockHeight - blockDepth, width: startingBlockWidth };
            setScore(0);
            setStack([baseBlock]);

            // --- UPDATED: Randomize first block's spawn ---
            let startX;
            if (Math.random() < 0.5) {
                startX = 0;
                directionRef.current = 1;
            } else {
                startX = canvas.width - startingBlockWidth;
                directionRef.current = -1;
            }
            currentBlockRef.current = { x: startX, y: canvas.height - 2 * blockHeight - blockDepth, width: startingBlockWidth };
            
            speedRef.current = 2.5;
        }
        setGameState("playing");
    }, [stack]);
    
    const endGame = useCallback(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('stackerHighScore', score);
        }
        if (miniGameId) {
            sessionStorage.removeItem(`stackerGameState-${miniGameId}`);
        }
        setGameState("ended");
    }, [score, highScore, miniGameId]);

    // Game loop, resize handling, etc. remain the same...
    useEffect(() => {
        if (!hasInitializedRef.current) return;
        if (miniGamePlayers && miniGamePlayers.length > 0) {
            const allReady = miniGamePlayers.every(p => p.is_ready);
            if (allReady && gameState === 'waiting' && playerIsReady) { initializeGame(true); }
        }
    }, [miniGamePlayers, gameState, playerIsReady, initializeGame]);
    useEffect(() => {
        initializeCanvas();
        draw();
        const handleResize = () => { initializeCanvas(); draw(); };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [draw, initializeCanvas]);
    const gameLoop = useCallback(() => {
        if (gameState === 'playing') {
            const block = currentBlockRef.current;
            const canvas = canvasRef.current;
            if (block && canvas) {
                block.x += directionRef.current * speedRef.current;
                if (block.x + block.width > canvas.width || block.x < 0) {
                    directionRef.current *= -1;
                    block.x += directionRef.current * speedRef.current;
                }
                draw();
            }
        }
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }, [draw, gameState]);
    useEffect(() => {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameIdRef.current);
    }, [gameLoop]);

    const startGame = useCallback(() => { initializeGame(true); }, [initializeGame]);
    
    const dropBlock = useCallback(() => {
        const canvas = canvasRef.current;
        const blockToDrop = currentBlockRef.current;
        if (!canvas || !blockToDrop || !stack || stack.length === 0) return;

        const baseUnits = 11;
        const baseUnitWidth = canvas.width / baseUnits;
        const blockHeight = 25;
        const perfectPlacementMargin = 5;
        const prevBlock = stack[stack.length - 1];

        const isPerfect = Math.abs(blockToDrop.x - prevBlock.x) <= perfectPlacementMargin;
        const overlap = Math.max(0, Math.min(blockToDrop.x + blockToDrop.width, prevBlock.x + prevBlock.width) - Math.max(blockToDrop.x, prevBlock.x));

        let newBlock;
        let newWidth;

        if (isPerfect) {
            setScore(s => s + 2); setIsPerfectFlash(true); setTimeout(() => setIsPerfectFlash(false), 300);
            newWidth = prevBlock.width;
            newBlock = { x: prevBlock.x, y: blockToDrop.y, width: newWidth };
        } else if (overlap >= baseUnitWidth) {
            setScore(s => s + 1);
            const startOverlap = Math.max(blockToDrop.x, prevBlock.x);
            newWidth = Math.round(overlap / baseUnitWidth) * baseUnitWidth;
            const snappedX = Math.round(startOverlap / baseUnitWidth) * baseUnitWidth;
            newBlock = { x: snappedX, y: blockToDrop.y, width: newWidth };
        } else {
            endGame();
            startGame(); 
            return;
        }

        let newStack = [...stack, newBlock];
        if (newStack.some(b => b.y < canvas.height * 0.4)) {
            newStack = newStack.map(b => ({ ...b, y: b.y + blockHeight }));
            groundOffsetRef.current += blockHeight;
        }
        setStack(newStack);

        speedRef.current *= 1.035;

        // --- UPDATED: Randomize the next block's spawn ---
        const nextBlockY = newBlock.y - blockHeight;
        let startX;
        if (Math.random() < 0.5) {
            startX = 0;
            directionRef.current = 1;
        } else {
            startX = canvas.width - newWidth;
            directionRef.current = -1;
        }
        currentBlockRef.current = { x: startX, y: nextBlockY, width: newWidth };

    }, [stack, endGame]);

    const handleAction = useCallback(() => { if (gameState === "playing") { dropBlock(); } }, [gameState, dropBlock]);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); handleAction(); } };
        const handleCanvasClick = () => { handleAction(); };
        window.addEventListener("keydown", handleKeyDown);
        const canvas = canvasRef.current;
        if(canvas) { canvas.addEventListener("click", handleCanvasClick) }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if(canvas) { canvas.removeEventListener("click", handleCanvasClick); }
        }
    }, [handleAction]);

    return (
        <div className="mini-game-stacker">
            <h3>Stacker - {gameState.toUpperCase()}</h3>
            {gameState === 'waiting' && (
                 <ul>{miniGamePlayers.map((p, index) => (<li key={index}>{p.user?.displayName || p.user?.firebaseUid} – Score: {p.score} | Ready: {p.is_ready ? "✅" : "❌"}</li>))}</ul>
            )}
            {!playerIsReady && gameState === 'waiting' && ( <div><button onClick={handleReadyUp}>Ready Up</button></div> )}
            {playerIsReady && (
                <div className="game-wrapper">
                    <div id="game-container">
                        <div id="ui-container" className={isPerfectFlash ? "perfect-flash-ui" : ""}>
                            <div className="score-box"><div>HIGH SCORE</div><div>{highScore}</div></div>
                            <div className="score-box"><div>SCORE</div><div>{score}</div></div>
                        </div>
                        <canvas ref={canvasRef}></canvas>
                        {gameState === "ended" && (
                            <div id="game-over-modal">
                                <h2>Game Over</h2> <p>Your Score: {score}</p> <p>High Score: {highScore}</p>
                                <button onClick={startGame}>Play Again</button>
                            </div>
                        )}
                         {gameState === "waiting" && miniGamePlayers.every(p => p.is_ready) && (
                            <div id="game-over-modal"><h2>Ready!</h2><p>The game will start automatically.</p></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Stacker;