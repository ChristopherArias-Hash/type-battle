import React, { useState, useEffect, useCallback, useRef } from "react";
import "./IslandGame.css";
import MiniGameReadyUp from "../../mini-game-ready-up/MiniGameReadyUp";
import { sendIslandGamePosition } from "../../../websocket";
import { auth } from "../../../firebase";

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 30;
const TILE_SIZE = 30;
const PLAYER_SPEED = 0.2;
const CANNONBALL_SPEED = 0.15;
const CANNON_FIRE_INTERVAL = 2500;
const ISLAND_RADIUS = 12;

const BOARD_WIDTH = BOARD_SIZE * TILE_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * TILE_SIZE;

// --- GAME COMPONENTS (Unchanged) ---
const Player = ({ position, isLocalPlayer }) => (
  <div
    className="player"
    style={{
      left: position.x * TILE_SIZE,
      top: position.y * TILE_SIZE,
      backgroundColor: isLocalPlayer ? "#3b82f6" : "#f59e0b",
      borderColor: isLocalPlayer ? "#1d4ed8" : "#b45309",
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
    {" "}
    <div className="cannon-base"></div> <div className="cannon-barrel"></div>{" "}
  </div>
);
const Cannonball = ({ position }) => (
  <div
    className="cannonball"
    style={{ left: position.x * TILE_SIZE, top: position.y * TILE_SIZE }}
  />
);
const Island = () => (
  <div className="island-container">
    {" "}
    <div className="water-background"></div> <div className="water-waves"></div>{" "}
    <div className="water-ripples"></div>{" "}
    <div
      className="island-shadow"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px`,
      }}
    ></div>{" "}
    <div
      className="shallow-water"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px`,
      }}
    ></div>{" "}
    <div
      className="island-sand"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
      }}
    ></div>{" "}
    <div
      className="sand-texture"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
      }}
    ></div>{" "}
    <div
      className="island-grass-outer"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
      }}
    ></div>{" "}
    <div
      className="grass-texture"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
      }}
    ></div>{" "}
    <div
      className="island-grass-inner"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px`,
      }}
    ></div>{" "}
    <div
      className="island-highlight"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px`,
      }}
    ></div>{" "}
  </div>
);

// --- MAIN GAME COMPONENT ---
const IslandGame = ({
  miniGamePlayers,
  miniGameId,
  miniGameStartSignal,
  miniGameTimer,
  lastMiniGameMessage,
}) => {
  const [gameState, setGameState] = useState("waiting");
  const [playerPos, setPlayerPos] = useState({
    x: BOARD_SIZE / 2,
    y: BOARD_SIZE / 2,
  });
  const [activeCannons, setActiveCannons] = useState([]);
  const [cannonballs, setCannonballs] = useState([]);

  const allCannonsRef = useRef([]);
  const keysDownRef = useRef({});
  const gameLoopRef = useRef();
  const lastTimeRef = useRef();
  const cannonballIdRef = useRef(0);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Use refs for values that change often inside the game loop to prevent re-renders
  const playerPosRef = useRef(playerPos);
  const otherPlayersRef = useRef({}); // Store other players in ref only
  const activeCannonRef = useRef(activeCannons);
  const cannonballsRef = useRef(cannonballs);
  const gameStateRef = useRef(gameState);
  const lastPositionSentRef = useRef({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });

  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);
  useEffect(() => {
    activeCannonRef.current = activeCannons;
  }, [activeCannons]);
  useEffect(() => {
    cannonballsRef.current = cannonballs;
  }, [cannonballs]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Handle incoming position updates for other players - NO setState here!
  useEffect(() => {
    if (
      lastMiniGameMessage &&
      lastMiniGameMessage.type === "island_game_position_update"
    ) {
      const { data } = lastMiniGameMessage;
      const currentUid = auth.currentUser?.uid;
      if (data.uid !== currentUid) {
        // Update ref directly, no setState
        otherPlayersRef.current = {
          ...otherPlayersRef.current,
          [data.uid]: { x: data.x, y: data.y },
        };
      }
    }
  }, [lastMiniGameMessage]);

  // Handle scaling of the game board
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const s = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT);
      setScale(Math.max(0.1, Math.min(s, 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetGame = useCallback(() => {
    setPlayerPos({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
    setActiveCannons([]);
    setCannonballs([]);
    otherPlayersRef.current = {};
    keysDownRef.current = {};
    cannonballIdRef.current = 0;
  }, []);

  const startGame = useCallback(
    (initialCannonsFromServer) => {
      console.log(
        "[IslandGame] Starting game with cannons:",
        initialCannonsFromServer
      );
      resetGame();

      if (!initialCannonsFromServer || initialCannonsFromServer.length === 0) {
        console.error("[IslandGame] ERROR: No cannons received from server!");
        return;
      }

      // Store all cannons with their spawn times
      allCannonsRef.current = initialCannonsFromServer.map((c) => ({
        id: c.id,
        pos: { x: c.x, y: c.y },
        angle: 0,
        lastShot: performance.now() + CANNON_FIRE_INTERVAL,
        spawnTime: c.spawnTime,
      }));

      console.log("[IslandGame] Stored cannons:", allCannonsRef.current);
      console.log(
        "[IslandGame] Spawn times:",
        allCannonsRef.current.map((c) => c.spawnTime)
      );
      setActiveCannons([]);
      setGameState("playing");
    },
    [resetGame]
  );

  // Initialize game when start signal is received
  useEffect(() => {
    if (miniGameStartSignal && gameState === "waiting") {
      console.log(
        "[IslandGame] Received miniGameStartSignal:",
        miniGameStartSignal
      );
      if (miniGameStartSignal.cannons) {
        startGame(miniGameStartSignal.cannons);
      } else {
        console.error(
          "[IslandGame] ERROR: miniGameStartSignal has no cannons property!"
        );
      }
    }
  }, [miniGameStartSignal, gameState, startGame]);

  // **DETERMINISTIC CANNON SPAWNING - Based on server timer counting DOWN**
  useEffect(() => {
    if (gameState !== "playing" || !allCannonsRef.current.length) return;

    // As timer counts DOWN, spawn cannons when we reach their spawnTime
    const shouldBeActive = allCannonsRef.current.filter((c) => {
      return miniGameTimer <= c.spawnTime;
    });

    console.log(
      `[IslandGame] Timer: ${miniGameTimer}s, Active cannons: ${shouldBeActive.length}/${allCannonsRef.current.length}`
    );

    // Only update state if the number changed
    if (shouldBeActive.length !== activeCannons.length) {
      console.log(
        "[IslandGame] Spawning new cannons! Total active:",
        shouldBeActive.length
      );
      setActiveCannons(shouldBeActive);
    }
  }, [miniGameTimer, gameState, activeCannons.length]);

  const gameLoop = useCallback(
    (timestamp) => {
      if (gameStateRef.current !== "playing") {
        cancelAnimationFrame(gameLoopRef.current);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;

      // --- 1. Update Local Player ---
      let newPos = { ...playerPosRef.current };
      let moved = false;
      const speed = PLAYER_SPEED;
      if (keysDownRef.current["ArrowUp"] || keysDownRef.current["w"]) {
        newPos.y -= speed;
        moved = true;
      }
      if (keysDownRef.current["ArrowDown"] || keysDownRef.current["s"]) {
        newPos.y += speed;
        moved = true;
      }
      if (keysDownRef.current["ArrowLeft"] || keysDownRef.current["a"]) {
        newPos.x -= speed;
        moved = true;
      }
      if (keysDownRef.current["ArrowRight"] || keysDownRef.current["d"]) {
        newPos.x += speed;
        moved = true;
      }

      const distFromCenter = Math.sqrt(
        Math.pow(newPos.x - BOARD_SIZE / 2, 2) +
          Math.pow(newPos.y - BOARD_SIZE / 2, 2)
      );
      if (distFromCenter > ISLAND_RADIUS - 0.5) {
        const angle = Math.atan2(
          newPos.y - BOARD_SIZE / 2,
          newPos.x - BOARD_SIZE / 2
        );
        newPos.x = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.cos(angle);
        newPos.y = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.sin(angle);
      }

      // Only send position updates if moved significantly (throttle network traffic)
      if (moved) {
        const lastPos = lastPositionSentRef.current;
        const distMoved = Math.sqrt(
          Math.pow(newPos.x - lastPos.x, 2) + Math.pow(newPos.y - lastPos.y, 2)
        );

        if (distMoved > 0.3) {
          // Only send if moved more than 0.3 tiles
          setPlayerPos(newPos);
          sendIslandGamePosition(miniGameId, newPos);
          lastPositionSentRef.current = newPos;
        } else {
          // Update local position but don't broadcast
          setPlayerPos(newPos);
        }
      }

      // --- 2. Update Cannons (Aiming & Firing) ---
      const updatedCannons = activeCannonRef.current.map((c) => {
        const allPlayerPos = {
          ...otherPlayersRef.current,
          [auth.currentUser.uid]: playerPosRef.current,
        };
        let closestPlayer = null;
        let minDistance = Infinity;
        for (const uid in allPlayerPos) {
          const pos = allPlayerPos[uid];
          if (!pos) continue;
          const distance = Math.sqrt(
            Math.pow(pos.x - c.pos.x, 2) + Math.pow(pos.y - c.pos.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestPlayer = pos;
          }
        }

        let newAngle = c.angle;
        if (closestPlayer) {
          newAngle =
            Math.atan2(closestPlayer.y - c.pos.y, closestPlayer.x - c.pos.x) *
            (180 / Math.PI);
        }

        if (timestamp - c.lastShot > CANNON_FIRE_INTERVAL) {
          const angleRad = newAngle * (Math.PI / 180);
          const velocity = {
            x: Math.cos(angleRad) * CANNONBALL_SPEED,
            y: Math.sin(angleRad) * CANNONBALL_SPEED,
          };
          const newBall = {
            id: cannonballIdRef.current++,
            pos: { ...c.pos },
            velocity,
          };
          cannonballsRef.current = [...cannonballsRef.current, newBall];
          setCannonballs(cannonballsRef.current);
          return { ...c, angle: newAngle, lastShot: timestamp };
        }
        return { ...c, angle: newAngle };
      });

      // Only update cannons if something actually changed
      const cannonsChanged = updatedCannons.some(
        (c, i) =>
          c.angle !== activeCannonRef.current[i]?.angle ||
          c.lastShot !== activeCannonRef.current[i]?.lastShot
      );
      if (cannonsChanged) {
        setActiveCannons(updatedCannons);
      }

      // --- 3. Update Cannonballs and Check Collisions ---
      const updatedBalls = cannonballsRef.current
        .map((ball) => ({
          ...ball,
          pos: {
            x: ball.pos.x + ball.velocity.x,
            y: ball.pos.y + ball.velocity.y,
          },
        }))
        .filter(
          (ball) =>
            ball.pos.x > 0 &&
            ball.pos.x < BOARD_SIZE &&
            ball.pos.y > 0 &&
            ball.pos.y < BOARD_SIZE
        );

      const localPlayerPos = playerPosRef.current;
      if (localPlayerPos) {
        for (const ball of updatedBalls) {
          const dx = ball.pos.x - localPlayerPos.x;
          const dy = ball.pos.y - localPlayerPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
            const respawnPos = { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
            setPlayerPos(respawnPos);
            sendIslandGamePosition(miniGameId, respawnPos);
            lastPositionSentRef.current = respawnPos;
            break;
          }
        }
      }

      cannonballsRef.current = updatedBalls;
      setCannonballs(updatedBalls);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [miniGameId]
  );

  // Effect to start/stop the game loop
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysDownRef.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysDownRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    if (gameState === "playing") {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  // Render other players from ref (no state needed)
  const otherPlayersArray = Object.entries(otherPlayersRef.current);

  return (
    <div className="game-wrapper island-game">
      <h1 className="game-title">Cannon Island Survival</h1>
      {gameState === "waiting" ? (
        <MiniGameReadyUp
          miniGamePlayers={miniGamePlayers}
          miniGameId={miniGameId}
        />
      ) : (
        <>
          <div className="stage" ref={stageRef}>
            <div className="board-scale" style={{ "--scale": scale }}>
              <div
                className="game-board"
                style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
              >
                {gameState === "playing" && miniGameTimer <= 0 && (
                  <div className="game-overlay">
                    <div className="game-modal">
                      <h2 className="modal-title won">You Survived!</h2>
                      <p className="modal-text">
                        Congratulations, you won the game!
                      </p>
                    </div>
                  </div>
                )}
                <Island />
                <Player position={playerPos} isLocalPlayer={true} />
                {otherPlayersArray.map(([uid, pos]) => (
                  <Player key={uid} position={pos} isLocalPlayer={false} />
                ))}
                {activeCannons.map((c) => (
                  <Cannon key={c.id} position={c.pos} rotation={c.angle} />
                ))}
                {cannonballs.map((b) => (
                  <Cannonball key={b.id} position={b.pos} />
                ))}
              </div>
            </div>
          </div>
          <div className="game-timer">
            Time: {Math.ceil(miniGameTimer < 0 ? 0 : miniGameTimer)}s | Cannons:{" "}
            {activeCannons.length}/{allCannonsRef.current.length}
          </div>
        </>
      )}
    </div>
  );
};

export default IslandGame;
