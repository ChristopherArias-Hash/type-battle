import "./Stacker.css";
import { useEffect, useState, useRef, useCallback } from "react";
import * as Tone from "tone"; // 🎵 Import Tone.js
import { sendStackerPoints } from "../../../websocket";
import MiniGameReadyUp from "../../mini-game-ready-up/MiniGameReadyUp";
import StackerTutorial from "../../mini-game-tutorials/StackerTutorial";

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
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.lineTo(x + width + depth, y + height - depth);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = frontColor;
  ctx.fillRect(x, y, width, height);
}
function drawGhostBlock(ctx, x, y, width, height, depth) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.lineTo(x + width + depth, y + height - depth);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x, y, width, height);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.lineTo(x + depth, y - depth);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width, y + height);
  ctx.lineTo(x + width + depth, y + height - depth);
  ctx.lineTo(x + width + depth, y - depth);
  ctx.stroke();
}
function drawGroundPlane(ctx, canvasWidth, canvasHeight, depth, yOffset = 0) {
  const planeY = canvasHeight - depth + yOffset;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, planeY);
  ctx.lineTo(canvasWidth, planeY);
  ctx.lineTo(canvasWidth + depth, planeY - depth);
  ctx.lineTo(depth, planeY - depth);
  ctx.closePath();
  ctx.stroke();
}

function Stacker({ miniGamePlayers, miniGameId, miniGameStartSignal }) {
  const gameTitle = "STACKER";
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const currentBlockRef = useRef(null);
  const directionRef = useRef(1);
  const speedRef = useRef(2.5);
  const hasInitializedRef = useRef(false);
  const groundOffsetRef = useRef(0);
  const isResizingRef = useRef(false);

  // 🎵 Refs for sound synthesizers and to track if audio is started
  const synthsRef = useRef(null);
  const audioStartedRef = useRef(false);

  const [gameState, setGameState] = useState("waiting");
  const [stack, setStack] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPerfectFlash, setIsPerfectFlash] = useState(false);

  // 🎵 Effect to initialize synths once on component mount
  useEffect(() => {
    synthsRef.current = {
      synth: new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
      }).toDestination(),
      perfectSynth: new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3 },
      }).toDestination(),
      errorSynth: new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.5 },
      }).toDestination(),
    };
  }, []);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { width: 0, height: 0 };
    const containerRect = container.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const uiHeight = 60;
    const availableHeight = containerHeight - uiHeight;
    const baseUnits = 11;
    const oldWidth = canvas.width || 0;
    const oldHeight = canvas.height || 0;
    const newWidth = baseUnits * 25;
    let newHeight = Math.max(400, availableHeight - 20);
    canvas.width = newWidth;
    canvas.height = newHeight;
    return { oldWidth, oldHeight, newWidth, newHeight };
  }, []);

  const rescaleForCanvasChange = useCallback((oldW, oldH, newW, newH) => {
    if (!oldW || !oldH || !newW || !newH || (oldW === newW && oldH === newH))
      return;
    const baseUnits = 11;
    const oldBUW = oldW / baseUnits;
    const newBUW = newW / baseUnits;
    const blockHeight = 25;
    const blockDepth = 10;
    setStack((prev) => {
      if (!prev || prev.length === 0) return prev;
      return prev.map((block, index) => {
        const widthInUnits = Math.round(block.width / oldBUW);
        const newWidth = Math.max(newBUW, widthInUnits * newBUW);
        const xInUnits = Math.round(block.x / oldBUW);
        let newX = xInUnits * newBUW;
        if (newX + newWidth > newW) {
          newX = Math.max(0, newW - newWidth);
        }
        let newY;
        if (index === 0) {
          newY = newH - blockHeight - blockDepth + groundOffsetRef.current;
        } else {
          const bottomPosition = oldH - block.y;
          newY = newH - bottomPosition;
        }
        return { ...block, x: newX, y: newY, width: newWidth };
      });
    });
    if (currentBlockRef.current) {
      const block = currentBlockRef.current;
      const widthInUnits = Math.round(block.width / oldBUW);
      const newWidth = Math.max(newBUW, widthInUnits * newBUW);
      const xInUnits = Math.round(block.x / oldBUW);
      let newX = xInUnits * newBUW;
      if (newX + newWidth > newW) {
        newX = Math.max(0, newW - newWidth);
      }
      const bottomPosition = oldH - block.y;
      const newY = newH - bottomPosition;
      currentBlockRef.current = { ...block, x: newX, y: newY, width: newWidth };
    }
  }, []);

  useEffect(() => {
    if (!miniGameId || hasInitializedRef.current) return;
    initializeCanvas();
    try {
      const savedState = sessionStorage.getItem(
        `stackerGameState-${miniGameId}`
      );
      if (savedState) {
        const data = JSON.parse(savedState);
        setGameState(data.gameState);
        setStack(data.stack || []);
        setScore(data.score);
        currentBlockRef.current = data.currentBlock;
        directionRef.current = data.direction;
        speedRef.current = data.speed;
        groundOffsetRef.current = data.groundOffset || 0;
      }
    } catch (error) {
      console.error("❗️ Error loading state:", error);
    } finally {
      hasInitializedRef.current = true;
    }
    parseInt(
      sessionStorage.getItem(`stackerHighScore-${miniGameId}`) || "0",
      10
    );
  }, [miniGameId, initializeCanvas]);

  useEffect(() => {
    if (!miniGameId || !hasInitializedRef.current || gameState === "ended")
      return;
    sessionStorage.setItem(
      `stackerGameState-${miniGameId}`,
      JSON.stringify({
        gameState,
        stack,
        score,
        currentBlock: currentBlockRef.current,
        direction: directionRef.current,
        speed: speedRef.current,
        groundOffset: groundOffsetRef.current,
      })
    );
  }, [gameState, stack, score, miniGameId]);

  const handleReadyUp = () => {
    console.log("✅ Player readied up in Stacker!");
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const blockHeight = 25;
    const blockDepth = 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGroundPlane(
      ctx,
      canvas.width,
      canvas.height,
      blockDepth,
      groundOffsetRef.current
    );
    if (
      gameState === "playing" &&
      stack.length > 0 &&
      currentBlockRef.current
    ) {
      const prevBlock = stack[stack.length - 1];
      drawGhostBlock(
        ctx,
        prevBlock.x,
        currentBlockRef.current.y,
        prevBlock.width,
        blockHeight,
        blockDepth
      );
    }
    const colorBands = [0, 60, 120, 180, 240, 300];
    (stack || []).forEach((block, index) => {
      if (!block) return;
      const bandIndex = Math.floor(index / 4) % colorBands.length;
      const color = `hsl(${colorBands[bandIndex]}, 70%, 60%)`;
      draw3DBlock(
        ctx,
        block.x,
        block.y,
        block.width,
        blockHeight,
        blockDepth,
        color
      );
    });
    if (gameState === "playing" && currentBlockRef.current) {
      const currentBandIndex =
        Math.floor((stack || []).length / 4) % colorBands.length;
      const color = `hsl(${colorBands[currentBandIndex]}, 90%, 70%)`;
      draw3DBlock(
        ctx,
        currentBlockRef.current.x,
        currentBlockRef.current.y,
        currentBlockRef.current.width,
        blockHeight,
        blockDepth,
        color
      );
    }
  }, [stack, gameState]);

  const initializeGame = useCallback(
    (isNewGame) => {
      console.log("🎯 initializeGame called, isNewGame:", isNewGame);

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("❌ Canvas not found!");
        return;
      }
      const { newWidth, newHeight } = initializeCanvas();
      if (canvas.width === 0 || canvas.height === 0) {
        console.error(
          "Canvas dimensions are invalid:",
          canvas.width,
          canvas.height
        );
        return;
      }
      if (isNewGame || !stack || stack.length === 0) {
        const baseUnits = 11;
        const baseUnitWidth = canvas.width / baseUnits;
        const blockHeight = 25;
        const blockDepth = 10;
        const startingBlockWidth = baseUnitWidth * 3;
        groundOffsetRef.current = 0;
        const baseBlock = {
          x: baseUnitWidth * 4,
          y: canvas.height - blockHeight - blockDepth,
          width: startingBlockWidth,
        };
        setScore(0);
        setStack([baseBlock]);
        let startX;
        if (Math.random() < 0.5) {
          startX = 0;
          directionRef.current = 1;
        } else {
          startX = canvas.width - startingBlockWidth;
          directionRef.current = -1;
        }
        currentBlockRef.current = {
          x: startX,
          y: baseBlock.y - blockHeight,
          width: startingBlockWidth,
        };
        speedRef.current = 2.5;
      }
      console.log("✅ Game initialized successfully!");
    },
    [stack, initializeCanvas]
  );

  const endGame = useCallback(() => {
    // 🎵 Play game over sound
    synthsRef.current?.errorSynth.triggerAttackRelease("C3", "4n");

    if (score > highScore) {
      setHighScore(score);
      sessionStorage.setItem(`stackerHighScore-${miniGameId}`, score);
    }
    if (miniGameId) {
      sessionStorage.removeItem(`stackerGameState-${miniGameId}`);
    }
    initializeGame(true);
  }, [score, highScore, miniGameId, initializeGame]);

  useEffect(() => {
    if (score > 0 && score > highScore) {
      console.log(`✨ New High Score: ${score}`);
      setHighScore(score);
      localStorage.setItem("stackerHighScore", score);
      sendStackerPoints(miniGameId, { highScore: score });
    }
  }, [score, highScore, miniGameId]);

  // 🎮 MODIFIED: Listen to gameStartSignal and set state to playing
  useEffect(() => {
    console.log("🔍 Game start check:", {
      hasInitialized: hasInitializedRef.current,
      miniGameStartSignal,
      gameState,
    });

    if (!hasInitializedRef.current) {
      console.log("⏸️ Not initialized yet, skipping game start");
      return;
    }

    if (miniGameStartSignal && gameState === "waiting") {
      console.log("🎮 Setting game state to playing!");
      setGameState("playing");
    }
  }, [miniGameStartSignal, gameState]);

  useEffect(() => {
    if (gameState === "playing" && canvasRef.current && stack.length === 0) {
      console.log("🎯 Canvas is ready, initializing game!");
      initializeGame(true);
    }
  }, [gameState, initializeGame, stack.length]);

  useEffect(() => {
    initializeCanvas();
    draw();
    const handleResize = () => {
      if (isResizingRef.current || gameState === "waiting") return;
      isResizingRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) {
        isResizingRef.current = false;
        return;
      }
      const oldW = canvas.width;
      const oldH = canvas.height;
      const { newWidth: newW, newHeight: newH } = initializeCanvas();
      if (
        gameState === "playing" &&
        stack.length > 0 &&
        (oldW !== newW || oldH !== newH)
      ) {
        rescaleForCanvasChange(oldW, oldH, newW, newH);
      }
      setTimeout(() => {
        draw();
        isResizingRef.current = false;
      }, 50);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw, initializeCanvas, rescaleForCanvasChange, gameState, stack.length]);

  const gameLoop = useCallback(() => {
    if (gameState === "playing" && !isResizingRef.current) {
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
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameLoop]);

  const dropBlock = useCallback(() => {
    const canvas = canvasRef.current;
    const blockToDrop = currentBlockRef.current;
    if (!canvas || !blockToDrop || !stack || stack.length === 0) return;
    const baseUnits = 11;
    const baseUnitWidth = canvas.width / baseUnits;
    const blockHeight = 25;
    const perfectPlacementMargin = 5;
    const prevBlock = stack[stack.length - 1];
    const isPerfect =
      Math.abs(blockToDrop.x - prevBlock.x) <= perfectPlacementMargin;
    const overlap = Math.max(
      0,
      Math.min(
        blockToDrop.x + blockToDrop.width,
        prevBlock.x + prevBlock.width
      ) - Math.max(blockToDrop.x, prevBlock.x)
    );
    let newBlock;
    let newWidth;
    if (isPerfect) {
      // 🎵 Play perfect placement sound
      synthsRef.current?.perfectSynth.triggerAttackRelease("C5", "8n");
      setScore((s) => s + 2);
      setIsPerfectFlash(true);
      setTimeout(() => setIsPerfectFlash(false), 300);
      newWidth = prevBlock.width;
      newBlock = { x: prevBlock.x, y: blockToDrop.y, width: newWidth };
    } else if (overlap >= baseUnitWidth) {
      // 🎵 Play normal placement sound
      synthsRef.current?.synth.triggerAttackRelease("C4", "8n");
      setScore((s) => s + 1);
      const startOverlap = Math.max(blockToDrop.x, prevBlock.x);
      newWidth = Math.round(overlap / baseUnitWidth) * baseUnitWidth;
      const snappedX = Math.round(startOverlap / baseUnitWidth) * baseUnitWidth;
      newBlock = { x: snappedX, y: blockToDrop.y, width: newWidth };
    } else {
      endGame();
      return;
    }
    let newStack = [...stack, newBlock];
    if (canvas && newStack.length > 0) {
      const highestBlock = newStack.reduce((highest, block) =>
        block.y < highest.y ? block : highest
      );
      if (highestBlock.y < canvas.height * 0.3) {
        const shiftAmount = blockHeight;
        newStack = newStack.map((block) => ({
          ...block,
          y: block.y + shiftAmount,
        }));
        groundOffsetRef.current += shiftAmount;
        if (currentBlockRef.current) {
          currentBlockRef.current.y += shiftAmount;
        }
      }
    }
    setStack(newStack);
    speedRef.current *= 1.035;
    const placedBlock = newStack[newStack.length - 1];
    const nextBlockY = placedBlock.y - blockHeight;
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

  const handleAction = useCallback(() => {
    // 🎵 Start audio context on the first user gesture
    if (!audioStartedRef.current) {
      Tone.start();
      audioStartedRef.current = true;
    }
    if (gameState === "playing") {
      dropBlock();
    }
  }, [gameState, dropBlock]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleAction();
      }
    };
    const handleCanvasClick = () => {
      handleAction();
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
  }, [handleAction]);

  return (
    <div className="mini-game-stacker" ref={containerRef}>
      {gameState === "waiting" ? (
        <>
        <MiniGameReadyUp
          gameTitle={gameTitle}
          miniGamePlayers={miniGamePlayers}
          miniGameId={miniGameId}
          onReady={handleReadyUp}
        />
        <StackerTutorial/>
        </>
      ) : (
        <div className="game-wrapper">
          <div id="game-container">
            <div
              id="ui-container"
              className={isPerfectFlash ? "perfect-flash-ui" : ""}
            >
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
          </div>
        </div>
      )}
    </div>
  );
}

export default Stacker;
