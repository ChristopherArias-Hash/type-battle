import "./IslandGame.css";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { auth } from "../../../firebase";
import { Castaway, Pirate, Viking, Explorer } from "./skins/PlayerSkins";
import MiniGameReadyUp from "../../mini-game-screen/mini-game-ready-up/MiniGameReadyUp";
import IslandGameTutorial from "../../mini-game-screen/mini-game-tutorials/Island-game-tutorial/IslandGameTutorial";
import {
  sendIslandGamePosition,
  sendIslandGameDeath,
} from "../../../websocket";

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 30;
const TILE_SIZE = 35;
const PLAYER_SPEED = 0.2;
const CANNONBALL_SPEED = 0.1;
const CANNON_FIRE_INTERVAL = 2500;
const ISLAND_RADIUS = 12;
const BOARD_WIDTH = BOARD_SIZE * TILE_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * TILE_SIZE;
const CANNON_ANGLE_THRESHOLD = 2; // degrees - prevents micro-adjustments
const POSITION_UPDATE_INTERVAL = 50; // ms

/**
 * Character Skins
 */
const SKINS = [Castaway, Explorer, Pirate, Viking];
const DEFAULT_SKIN = Castaway;

const Player = React.memo(({ position, playerIndex, direction, walkFrame }) => {
  const SkinComponent = SKINS[playerIndex] || DEFAULT_SKIN;
  const scale = 2;
  return (
    <div
      className="player"
      style={{
        left: position.x * TILE_SIZE,
        top: position.y * TILE_SIZE,
        transform: "translate(-50%, -50%)",
        border: "none",
        borderRadius: "100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <SkinComponent
        scale={scale}
        direction={direction}
        walkFrame={walkFrame}
      />
    </div>
  );
});

const PlayerGhost = React.memo(({ position, playerIndex }) => {
  const SkinComponent = SKINS[playerIndex] || DEFAULT_SKIN;
  const scale = 2;
  return (
    <div
      className="player"
      style={{
        left: position.x * TILE_SIZE,
        top: position.y * TILE_SIZE,
        opacity: 0.5,
        filter: "grayscale(100%) drop-shadow(0 0 2px white)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 19,
      }}
    >
      <SkinComponent scale={scale} direction="front" walkFrame={false} />
    </div>
  );
});

// Cannon Component - uses ref for rotation to avoid re-renders
const Cannon = React.memo(({ id, position, rotationRef }) => {
  return (
    <div
      className="cannon"
      ref={(el) => {
        if (rotationRef) rotationRef.current[id] = el;
      }}
      style={{
        left: position.x * TILE_SIZE,
        top: position.y * TILE_SIZE,
        // Initial transform, subsequent updates happen via direct DOM manipulation
        transform: `translate(-50%, -50%) rotate(0deg)`,
      }}
    >
      <div className="cannon-base"></div>
      <div className="cannon-barrel"></div>
    </div>
  );
});

// Island Background Component
const Island = React.memo(() => (
  <div className="island-container">
    <div className="water-background"></div>
    <div className="water-waves"></div> <div className="water-ripples"></div>
    <div
      className="island-shadow"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 60}px`,
      }}
    ></div>
    <div
      className="shallow-water"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE + 30}px`,
      }}
    ></div>
    <div
      className="island-sand"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
      }}
    ></div>
    <div
      className="sand-texture"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE}px`,
      }}
    ></div>
    <div
      className="island-grass-outer"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
      }}
    ></div>
    <div
      className="grass-texture"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 80}px`,
      }}
    ></div>
    <div
      className="island-grass-inner"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 160}px`,
      }}
    ></div>
    <div
      className="island-highlight"
      style={{
        width: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px`,
        height: `${ISLAND_RADIUS * 2 * TILE_SIZE - 200}px`,
      }}
    ></div>
  </div>
));

// --- MAIN GAME COMPONENT ---
const IslandGame = ({
  miniGamePlayers,
  miniGameId,
  miniGameStartSignal,
  miniGameTimer,
  lastMiniGameMessage,
}) => {
  const gameTitle = "Cannon Island Survival";
  const [gameState, setGameState] = useState("waiting");

  // Position State
  const [playerPos, setPlayerPos] = useState(() => {
    if (!miniGameId) return { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
    const saved = sessionStorage.getItem(`islandPos-${miniGameId}`);
    return saved ? JSON.parse(saved) : { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
  });

  // Only used for spawning/despawning - NOT for rotation updates
  const [activeCannons, setActiveCannons] = useState([]);
  const activeCannonsRef = useRef([]); // Added to prevent gameLoop tearing

  // Refs for Optimization
  const cannonRefs = useRef({});
  const canvasRef = useRef(null); // For drawing projectiles
  const allCannonsRef = useRef([]);
  const cannonballsRef = useRef([]); // Store balls in ref, not state

  const keysDownRef = useRef({});
  const gameLoopRef = useRef();
  const lastTimeRef = useRef();
  const cannonballIdRef = useRef(0);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  
  // Anti-flash sync ref
  const hasTimerSyncedRef = useRef(false);

  // Skin/Animation State
  const [playerDirection, setPlayerDirection] = useState("front");
  const playerDirectionRef = useRef("front");
  const [walkFrame, setWalkFrame] = useState(false);
  const walkIntervalRef = useRef(null);
  const [remoteWalkFrame, setRemoteWalkFrame] = useState(false);

  // Elimination & Ghost State
  const [isDead, setIsDead] = useState(false);
  const isDeadRef = useRef(false);
  const [ghostPos, setGhostPos] = useState(null);
  const deadUidsRef = useRef(new Set());
  const ghostsRef = useRef({});

  // Refs for game loop
  const playerPosRef = useRef(playerPos);
  const otherPlayersRef = useRef({});
  const gameStateRef = useRef(gameState);

  // Optimization Refs
  const lastPositionSentRef = useRef(playerPos);
  const lastPositionUpdateTime = useRef(0);

  // Server Sync Ref
  const serverStartTimeRef = useRef(null);

  // --- Player Index Mapping ---
  const playerIndexMap = useMemo(() => {
    const map = new Map();
    (miniGamePlayers || []).forEach((player, index) => {
      if (player.firebaseUid) {
        map.set(player.firebaseUid, index % 4);
      }
    });
    return map;
  }, [miniGamePlayers]);

  const localPlayerIndex = playerIndexMap.get(auth.currentUser?.uid) ?? 0;

  // --- Helpers ---
  const getDeterministicFireTime = (serverStartTime) => {
    if (!serverStartTime) return performance.now();
    const now = Date.now();
    const timeElapsed = now - serverStartTime;
    // Calculate how far we are into the current interval
    const progressInInterval = timeElapsed % CANNON_FIRE_INTERVAL;
    // We want the "last shot" to be exactly one interval ago relative to the next beat
    // effectively aligning the firing phase.
    return performance.now() - progressInInterval;
  };

  // --- Persist Position ---
  useEffect(() => {
    if (miniGameId && playerPos) {
      sessionStorage.setItem(
        `islandPos-${miniGameId}`,
        JSON.stringify(playerPos)
      );
    }
  }, [playerPos, miniGameId]);

  // --- Broadcast Initial Position (FIXED: Only fires when game is actually playing) ---
  useEffect(() => {
    if (miniGameId && playerPos && !isDead && gameState === "playing") {
      sendIslandGamePosition(miniGameId, playerPos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniGameId, gameState]);

  // --- Remote walk frame animation ---
  useEffect(() => {
    const interval = setInterval(() => setRemoteWalkFrame((wf) => !wf), 200);
    return () => clearInterval(interval);
  }, []);

  // --- Sync refs ---
  useEffect(() => {
    playerDirectionRef.current = playerDirection;
  }, [playerDirection]);
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    isDeadRef.current = isDead;
  }, [isDead]);

  // --- Restore State ---
  useEffect(() => {
    if (!miniGameId) return;
    const deadKey = `miniGameDead-${miniGameId}`;
    const ghostKey = `miniGameGhostPos-${miniGameId}`;
    if (sessionStorage.getItem(deadKey) === "true") {
      setIsDead(true);
      setGameState("spectating");
      const savedGhost = sessionStorage.getItem(ghostKey);
      if (savedGhost) {
        try {
          const gp = JSON.parse(savedGhost);
          if (gp?.x) {
            setGhostPos(gp);
            const myUid = auth.currentUser?.uid;
            if (myUid) ghostsRef.current[myUid] = gp;
          }
        } catch {}
      }
    }
  }, [miniGameId]);

  // --- WebSocket Handling ---
  useEffect(() => {
    if (!lastMiniGameMessage) return;

    if (lastMiniGameMessage.type === "island_game_position_update") {
      const { data } = lastMiniGameMessage;
      if (deadUidsRef.current.has(data.uid)) return;
      if (data.uid !== auth.currentUser?.uid) {
        let newDirection = "front";
        const oldPos = otherPlayersRef.current[data.uid];
        if (oldPos) {
          if (data.y < oldPos.y) newDirection = "back";
          else if (data.y > oldPos.y) newDirection = "front";
          else if (data.x < oldPos.x) newDirection = "left";
          else if (data.x > oldPos.x) newDirection = "right";
          else newDirection = oldPos.direction;
        }
        otherPlayersRef.current = {
          ...otherPlayersRef.current,
          [data.uid]: { x: data.x, y: data.y, direction: newDirection },
        };
      }
      
      // FIXED: Removed the auto-start logic here that caused the refresh bug in the lobby
    }

    if (lastMiniGameMessage.type === "island_game_death") {
      const { uid, x, y } = lastMiniGameMessage;
      deadUidsRef.current.add(uid);
      if (typeof x === "number") ghostsRef.current[uid] = { x, y };

      const clone = { ...otherPlayersRef.current };
      delete clone[uid];
      otherPlayersRef.current = clone;

      if (uid === auth.currentUser?.uid && !isDeadRef.current) {
        setIsDead(true);
        setGameState("spectating");
        setGhostPos({ x, y });
        sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
        sessionStorage.setItem(
          `miniGameGhostPos-${miniGameId}`,
          JSON.stringify({ x, y })
        );
      }
    }

    // Bulk update from server interval
    if (lastMiniGameMessage.type === "island_game_bulk_update" || (lastMiniGameMessage.players && lastMiniGameMessage.deadUids)) {
      const deadUids = lastMiniGameMessage.deadUids || [];
      const deadPlayers = lastMiniGameMessage.deadPlayers || [];
      deadUids.forEach((uid) => {
        deadUidsRef.current.add(uid);
        if (otherPlayersRef.current[uid]) {
          const c = { ...otherPlayersRef.current };
          delete c[uid];
          otherPlayersRef.current = c;
        }
      });
      deadPlayers.forEach((dp) => {
        if (dp.uid) ghostsRef.current[dp.uid] = { x: dp.x, y: dp.y };
      });

      // Auto-kill self if server says so (e.g. on refresh after death)
      if (
        auth.currentUser?.uid &&
        deadUidsRef.current.has(auth.currentUser.uid) &&
        !isDeadRef.current
      ) {
        setIsDead(true);
        setGameState("spectating");
      }
    }
  }, [lastMiniGameMessage, miniGameId, gameState]);

  // --- Resize Observer ---
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
    activeCannonsRef.current = [];
    cannonballsRef.current = [];
    otherPlayersRef.current = {};
    keysDownRef.current = {};
    cannonballIdRef.current = 0;
    setPlayerDirection("front");
    setWalkFrame(false);
    deadUidsRef.current = new Set();
    ghostsRef.current = {};
    hasTimerSyncedRef.current = false; // Reset the anti-flash timer
  }, []);

  const startGame = useCallback(
    (
      initialCannonsFromServer,
      serverStartTime,
      options = { spectateOnly: false }
    ) => {
      resetGame();
      serverStartTimeRef.current = serverStartTime || Date.now();

      // Determine sync start time for cannons
      const syncedLastShot = getDeterministicFireTime(
        serverStartTimeRef.current
      );

      if (options.spectateOnly) {
        setGameState("spectating");
      } else {
        const savedPos = sessionStorage.getItem(`islandPos-${miniGameId}`);
        if (savedPos) setPlayerPos(JSON.parse(savedPos));
        setGameState("playing");
      }

      // Initialize cannons with synced firing time
      allCannonsRef.current = initialCannonsFromServer.map((c) => ({
        id: c.id,
        pos: { x: c.x, y: c.y },
        angle: 0,
        lastShot: syncedLastShot,
        spawnTime: c.spawnTime,
      }));
    },
    [miniGameId, resetGame]
  );

  // --- Init Game ---
  useEffect(() => {
    if (
      miniGameStartSignal &&
      (gameState === "waiting" || activeCannons.length === 0)
    ) {
      if (miniGameStartSignal.cannons) {
        const deadFlag =
          sessionStorage.getItem(`miniGameDead-${miniGameId}`) === "true";
        startGame(miniGameStartSignal.cannons, miniGameStartSignal.startTime, {
          spectateOnly: !!deadFlag,
        });
      }
    }
  }, [miniGameStartSignal, gameState, startGame, miniGameId]);

  // --- Cannon Spawning Logic (React State: Low Frequency) ---
  useEffect(() => {
    // Validate that the timer has actually synced a real number from the server before spawning
    if (miniGameTimer > 0) {
      hasTimerSyncedRef.current = true;
    }

    if (
      (gameState !== "playing" && gameState !== "spectating") ||
      !allCannonsRef.current.length ||
      miniGameTimer === null ||
      !hasTimerSyncedRef.current // <-- FIXED: Prevents cannons flashing on screen when timer is 0 for a millisecond
    )
      return;

    const shouldBeActive = allCannonsRef.current.filter(
      (c) => miniGameTimer <= c.spawnTime
    );

    activeCannonsRef.current = shouldBeActive; // Keep the Ref synced for the game loop

    setActiveCannons((prev) => {
      const prevIds = new Set(prev.map((c) => c.id));
      const newIds = new Set(shouldBeActive.map((c) => c.id));
      if (
        prev.length === shouldBeActive.length &&
        [...newIds].every((id) => prevIds.has(id))
      ) {
        return prev;
      }
      return shouldBeActive; // Only update state if the LIST of cannons changes
    });
  }, [miniGameTimer, gameState]);


  // --- Strict Anti-Cheat Event Listeners (Triggers BEFORE thread pauses) ---
  useEffect(() => {
    const handleInstantAFK = () => {
      // Only penalize if they are actively playing
      if (!isDeadRef.current && gameStateRef.current === "playing") {
        setIsDead(true);
        setGameState("spectating");
        setGhostPos(playerPosRef.current);
        sendIslandGameDeath(miniGameId, playerPosRef.current);
        sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleInstantAFK();
      }
    };

    window.addEventListener("beforeunload", handleInstantAFK);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleInstantAFK);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [miniGameId]);


  // --- GAME LOOP (High Frequency) ---
  const gameLoop = useCallback(
    (timestamp) => {
      if (
        gameStateRef.current !== "playing" &&
        gameStateRef.current !== "spectating"
      ) {
        cancelAnimationFrame(gameLoopRef.current);
        return;
      }
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;

      // Calculate time passed since the last frame
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Fallback Pause Detection (In case they bypass the tab/refresh listeners via DevTools)
      if (deltaTime > 2000 && !isDeadRef.current && gameStateRef.current === "playing") {
        setIsDead(true);
        setGameState("spectating");
        setGhostPos(playerPosRef.current);
        sendIslandGameDeath(miniGameId, playerPosRef.current);
        sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
      }

      // 1. Player Movement
      if (!isDeadRef.current) {
        let newPos = { ...playerPosRef.current };
        let newDirection = playerDirectionRef.current;
        let moved = false;
        let hMove = 0,
          vMove = 0;

        if (keysDownRef.current["ArrowLeft"] || keysDownRef.current["a"])
          hMove = -1;
        else if (keysDownRef.current["ArrowRight"] || keysDownRef.current["d"])
          hMove = 1;
        if (keysDownRef.current["ArrowUp"] || keysDownRef.current["w"])
          vMove = -1;
        else if (keysDownRef.current["ArrowDown"] || keysDownRef.current["s"])
          vMove = 1;

        if (vMove !== 0) {
          newPos.y += vMove * PLAYER_SPEED;
          moved = true;
          newDirection = vMove === -1 ? "back" : "front";
        }
        if (hMove !== 0) {
          newPos.x += hMove * PLAYER_SPEED;
          moved = true;
          if (vMove === 0) newDirection = hMove === -1 ? "left" : "right";
        }

        // Boundary check (circle)
        const dist = Math.sqrt(
          Math.pow(newPos.x - BOARD_SIZE / 2, 2) +
            Math.pow(newPos.y - BOARD_SIZE / 2, 2)
        );
        if (dist > ISLAND_RADIUS - 0.5) {
          const angle = Math.atan2(
            newPos.y - BOARD_SIZE / 2,
            newPos.x - BOARD_SIZE / 2
          );
          newPos.x = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.cos(angle);
          newPos.y = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.sin(angle);
        }

        if (moved) {
          if (newDirection !== playerDirectionRef.current)
            setPlayerDirection(newDirection);
          if (!walkIntervalRef.current)
            walkIntervalRef.current = setInterval(
              () => setWalkFrame((w) => !w),
              200
            );

          if (
            timestamp - lastPositionUpdateTime.current >
            POSITION_UPDATE_INTERVAL
          ) {
            sendIslandGamePosition(miniGameId, newPos);
            lastPositionUpdateTime.current = timestamp;
          }
          setPlayerPos(newPos);
        } else {
          if (walkIntervalRef.current) {
            clearInterval(walkIntervalRef.current);
            walkIntervalRef.current = null;
            setWalkFrame(false);
          }
        }
      }

      // 2. Cannon Logic (Direct DOM & Ref updates)
      const active = allCannonsRef.current.filter((c) =>
        activeCannonsRef.current.some((ac) => ac.id === c.id)
      );

      active.forEach((c) => {
        // Targeting (Optimized: Removed expensive Math.hypot)
        let closest = null,
          minDistSq = Infinity;
        const playersToCheck = { ...otherPlayersRef.current };
        if (!isDeadRef.current && auth.currentUser?.uid)
          playersToCheck[auth.currentUser.uid] = playerPosRef.current;

        for (const uid in playersToCheck) {
          if (deadUidsRef.current.has(uid)) continue;
          const p = playersToCheck[uid];
          const dx = p.x - c.pos.x;
          const dy = p.y - c.pos.y;
          const dSq = dx * dx + dy * dy; // Faster than Math.hypot
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closest = p;
          }
        }

        if (closest) {
          const targetAngle =
            (Math.atan2(closest.y - c.pos.y, closest.x - c.pos.x) * 180) /
            Math.PI;
          if (Math.abs(targetAngle - c.angle) > CANNON_ANGLE_THRESHOLD) {
            c.angle = targetAngle;
            // Direct DOM update for rotation
            const el = cannonRefs.current[c.id];
            if (el)
              el.style.transform = `translate(-50%, -50%) rotate(${c.angle}deg)`;
          }
        }

        // Firing
        if (timestamp - c.lastShot > CANNON_FIRE_INTERVAL) {
          const rad = c.angle * (Math.PI / 180);
          cannonballsRef.current.push({
            id: cannonballIdRef.current++,
            pos: { ...c.pos },
            velocity: {
              x: Math.cos(rad) * CANNONBALL_SPEED,
              y: Math.sin(rad) * CANNONBALL_SPEED,
            },
          });
          c.lastShot = timestamp;
        }
      });

      // 3. Cannonball Logic (Canvas Rendering)
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = "black";
        
        // BATCH RENDERING: Start ONE path for ALL cannonballs
        ctx.beginPath();

        // Filter and update balls
        cannonballsRef.current = cannonballsRef.current.filter((b) => {
          b.pos.x += b.velocity.x;
          b.pos.y += b.velocity.y;

          // Draw
          const screenX = b.pos.x * TILE_SIZE;
          const screenY = b.pos.y * TILE_SIZE;
          
          // BATCH RENDERING: Move to the edge of the circle (prevents connecting lines) then draw arc
          ctx.moveTo(screenX + 6, screenY);
          ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);

          // Local Collision (Optimized: Removed Math.sqrt, 0.8 * 0.8 = 0.64)
          if (!isDeadRef.current && playerPosRef.current) {
            const pdx = b.pos.x - playerPosRef.current.x;
            const pdy = b.pos.y - playerPosRef.current.y;
            if (pdx * pdx + pdy * pdy < 0.64) {
              setIsDead(true);
              setGameState("spectating");
              setGhostPos(playerPosRef.current);
              sendIslandGameDeath(miniGameId, playerPosRef.current);
              sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
            }
          }

          // Remove if out of bounds
          return (
            b.pos.x > -2 &&
            b.pos.x < BOARD_SIZE + 2 &&
            b.pos.y > -2 &&
            b.pos.y < BOARD_SIZE + 2
          );
        });
        
        // BATCH RENDERING: Fill all the circles in a single graphics operation
        ctx.fill(); 
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [miniGameId] // REMOVED activeCannons from dependencies to prevent animation tearing
  );

  // --- Event Listeners ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysDownRef.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysDownRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    if (gameState === "playing" || gameState === "spectating") {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  return (
    <div className="mini-game-island" ref={stageRef}>
      {gameState === "waiting" ? (
        <>
          <MiniGameReadyUp
            gameTitle={gameTitle}
            miniGamePlayers={miniGamePlayers || []} // Added Fallback
            miniGameId={miniGameId}
          />
          <IslandGameTutorial />
        </>
      ) : (
        <div className="stage">
          <div className="board-scale" style={{ "--scale": scale }}>
            <div
              className="game-board"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
            >
              <Island />

              {/* Canvas for Projectiles */}
              <canvas
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                  zIndex: 15,
                }}
              />

              {/* Players */}
              {!isDead && (
                <Player
                  position={playerPos}
                  playerIndex={localPlayerIndex}
                  direction={playerDirection}
                  walkFrame={walkFrame}
                />
              )}
              {Object.entries(otherPlayersRef.current).map(([uid, posData]) => (
                <Player
                  key={uid}
                  position={posData}
                  playerIndex={playerIndexMap.get(uid) ?? 0}
                  direction={posData.direction || "front"}
                  walkFrame={remoteWalkFrame}
                />
              ))}
              {Object.entries(ghostsRef.current).map(([uid, pos]) => (
                <PlayerGhost
                  key={`ghost-${uid}`}
                  position={pos}
                  playerIndex={playerIndexMap.get(uid) ?? 0}
                />
              ))}

              {/* Cannons - DOM based but updated via Ref */}
              {activeCannons.map((c) => (
                <Cannon
                  key={c.id}
                  id={c.id}
                  position={c.pos}
                  rotationRef={cannonRefs}
                />
              ))}
            </div>
          </div>
          <div className="game-timer">
            Time: {Math.ceil(miniGameTimer < 0 ? 0 : miniGameTimer)}s
          </div>
        </div>
      )}
    </div>
  );
};

export default IslandGame;