import "./Stacker.css";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  sendMiniGameReadyUp
} from "../../../websocket"
function Stacker({ miniGamePlayers, miniGameId }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState("waiting"); // 'waiting', 'playing', 'ended'
  const [isPerfectFlash, setIsPerfectFlash] = useState(false);
  const [playerIsReady, setPlayerIsReady] = useState(false)
  
  const handleReadyUp = () => {
    if (!playerIsReady && miniGameId) {
      sendMiniGameReadyUp(miniGameId); // 2. CALL the function on click
      setPlayerIsReady(true);
    }
  };

  // Ref to track gameState inside useCallback without adding it as a dependency
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Refs for game state values needed in the animation loop to avoid stale closures
  const stackRef = useRef([]);
  const currentBlockRef = useRef(null);
  const directionRef = useRef(1);
  const speedRef = useRef(2.5);
  const blockHeightRef = useRef(25);
  const baseUnitWidthRef = useRef(0);

  // Refs for Tone.js synths and animation frame
  const synthRef = useRef(null);
  const perfectSynthRef = useRef(null);
  const errorSynthRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  const setupSounds = useCallback(() => {
    try {
      if (window.Tone) {
        if (!synthRef.current) {
          synthRef.current = new window.Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
          }).toDestination();
        }
        if (!perfectSynthRef.current) {
          perfectSynthRef.current = new window.Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3 },
          }).toDestination();
        }
        if (!errorSynthRef.current) {
          errorSynthRef.current = new window.Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.5 },
          }).toDestination();
        }
      }
    } catch (e) {
      console.error("Audio setup failed. Game will continue without sound.", e);
    }
  }, []);

  // Set up sounds once when the component mounts
  useEffect(() => {
    setupSounds();
  }, [setupSounds]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(200, 200, 200, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += baseUnitWidthRef.current) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = canvas.height; y >= 0; y -= blockHeightRef.current) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const colorBands = [0, 60, 120, 180, 240, 300];

    // Draw stack
    stackRef.current.forEach((block, index) => {
      const bandIndex = Math.floor(index / 4) % colorBands.length;
      ctx.fillStyle = `hsl(${colorBands[bandIndex]}, 70%, 60%)`;
      ctx.fillRect(block.x, block.y, block.width, blockHeightRef.current);
    });

    // Draw current block
    if (gameStateRef.current === "playing" && currentBlockRef.current) {
      const currentBandIndex =
        Math.floor(stackRef.current.length / 4) % colorBands.length;
      ctx.fillStyle = `hsl(${colorBands[currentBandIndex]}, 90%, 70%)`;
      ctx.fillRect(
        currentBlockRef.current.x,
        currentBlockRef.current.y,
        currentBlockRef.current.width,
        blockHeightRef.current
      );
    }
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    let preferredWidth = Math.min(window.innerWidth * 0.9, 400);
    const baseUnits = 11;
    canvas.width = Math.floor(preferredWidth / baseUnits) * baseUnits;
    canvas.height = window.innerHeight * 0.8;

    baseUnitWidthRef.current = canvas.width / baseUnits;

    setScore(0);
    try {
      setHighScore(localStorage.getItem("stackerHighScore") || 0);
    } catch (e) {
      console.warn(
        "Could not access localStorage. High score will not be saved."
      );
      setHighScore(0);
    }

    directionRef.current = 1;
    speedRef.current = 2.5;

    const startingBlockWidth = baseUnitWidthRef.current * 3;
    const baseBlock = {
      x: baseUnitWidthRef.current * 4,
      y: canvas.height - blockHeightRef.current,
      width: startingBlockWidth,
    };
    stackRef.current = [baseBlock];

    currentBlockRef.current = {
      x: 0,
      y: canvas.height - 2 * blockHeightRef.current,
      width: startingBlockWidth,
    };

    setGameState("waiting");
    draw();
  }, [draw]);

  useEffect(() => {
    resetGame();
    window.addEventListener("resize", resetGame);
    return () => window.removeEventListener("resize", resetGame);
  }, [resetGame]);

  const gameLoop = useCallback(() => {
    const block = currentBlockRef.current;
    if (!block) return;

    block.x += directionRef.current * speedRef.current;

    const canvas = canvasRef.current;
    if (block.x + block.width > canvas.width || block.x < 0) {
      directionRef.current *= -1;
      block.x = Math.max(0, Math.min(block.x, canvas.width - block.width));
    }

    draw();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  const startGame = useCallback(async () => {
    try {
      if (window.Tone && window.Tone.context.state !== "running") {
        await window.Tone.start();
      }
      // Sounds are already set up, we just need to start the context
    } catch (e) {
      console.error(
        "Could not start audio. Game will continue without sound.",
        e
      );
    } finally {
      setGameState("playing");
    }
  }, []);

  const endGame = useCallback(() => {
    setGameState("ended");
    if (errorSynthRef.current)
      errorSynthRef.current.triggerAttackRelease("C3", "4n");
  }, []);

  useEffect(() => {
    if (gameState === "playing") {
      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === "ended") {
      if (score > highScore) {
        setHighScore(score);
        try {
          localStorage.setItem("stackerHighScore", score);
        } catch (e) {
          console.warn("Could not save high score to localStorage.", e);
        }
      }
    }
  }, [gameState, score, highScore]);

  const dropBlock = useCallback(() => {
    const perfectPlacementMargin = 2;
    const prevBlock = stackRef.current[stackRef.current.length - 1];
    const currentBlock = currentBlockRef.current;

    const isPerfect =
      Math.abs(currentBlock.x - prevBlock.x) <= perfectPlacementMargin;
    const overlap = Math.max(
      0,
      Math.min(
        currentBlock.x + currentBlock.width,
        prevBlock.x + prevBlock.width
      ) - Math.max(currentBlock.x, prevBlock.x)
    );

    let newBlock;
    let newWidth;

    if (isPerfect) {
      setScore((s) => s + 2);
      if (perfectSynthRef.current)
        perfectSynthRef.current.triggerAttackRelease("C5", "8n");
      setIsPerfectFlash(true);
      setTimeout(() => setIsPerfectFlash(false), 300);

      newWidth = prevBlock.width;
      newBlock = { x: prevBlock.x, y: currentBlock.y, width: newWidth };
    } else if (overlap > 0) {
      setScore((s) => s + 1);
      if (synthRef.current) synthRef.current.triggerAttackRelease("C4", "8n");

      const prevUnits = prevBlock.width / baseUnitWidthRef.current;
      const successfulUnits = [];
      for (let i = 0; i < prevUnits; i++) {
        const unitX = prevBlock.x + i * baseUnitWidthRef.current;
        const unitEnd = unitX + baseUnitWidthRef.current;
        const currentEnd = currentBlock.x + currentBlock.width;
        if (unitX < currentEnd && unitEnd > currentBlock.x) {
          successfulUnits.push(unitX);
        }
      }

      if (successfulUnits.length === 0) {
        endGame();
        return;
      }
      newWidth = successfulUnits.length * baseUnitWidthRef.current;
      newBlock = { x: successfulUnits[0], y: currentBlock.y, width: newWidth };
    } else {
      endGame();
      return;
    }

    stackRef.current.push(newBlock);

    if (
      stackRef.current.length * blockHeightRef.current >
      canvasRef.current.height * 0.75
    ) {
      stackRef.current.forEach((block) => (block.y += blockHeightRef.current));
    }

    currentBlockRef.current = {
      x: 0,
      y:
        stackRef.current[stackRef.current.length - 1].y -
        blockHeightRef.current,
      width: newWidth,
    };

    speedRef.current *= 1.035;
  }, [endGame]);

  const handleAction = useCallback(() => {
    if (gameState === "waiting") {
      startGame();
    } else if (gameState === "playing") {
      dropBlock();
    }
  }, [gameState, startGame, dropBlock]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  const getActionButtonText = () => {
    switch (gameState) {
      case "waiting":
        return "Start Game";
      case "playing":
        return "Drop Block";
      case "ended":
        return "Game Over";
      default:
        return "Start Game";
    }
  };
  return (
    <div className="mini-game-stacker">
      <h3>Stacker - WAITING ROOM</h3>
      <ul>
        {miniGamePlayers.map((p, index) => (
          <li key={index}>
            {p.user?.displayName || p.user?.firebaseUid} – Score: {p.score}
          </li>
        ))}
      </ul>
      <button onClick={handleReadyUp}>Ready</button>
      {playerIsReady && (
        <div className="game-wrapper">
          <div
            id="game-container"
            className={isPerfectFlash ? "perfect-flash" : ""}
          >
            <div id="ui-container">
              <div className="score-box">
                <div className="label">HIGH SCORE</div>
                <div className="value">{highScore}</div>
              </div>
              <div className="score-box">
                <div className="label">SCORE</div>
                <div className="value">{score}</div>
              </div>
            </div>

            <canvas ref={canvasRef}></canvas>

            <div id="controls">
              <button
                id="action-button"
                onClick={handleAction}
                disabled={gameState === "ended"}
              >
                {getActionButtonText()}
              </button>
            </div>

            {gameState === "ended" && (
              <div id="game-over-modal">
                <h2>Game Over</h2>
                <p id="final-score">Your Score: {score}</p>
                <p id="final-high-score">High Score: {highScore}</p>
                <button id="restart-button" onClick={resetGame}>
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Stacker;
