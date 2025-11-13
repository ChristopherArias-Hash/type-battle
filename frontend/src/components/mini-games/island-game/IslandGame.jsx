import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import "./IslandGame.css";
import MiniGameReadyUp from "../../mini-game-screen/mini-game-ready-up/MiniGameReadyUp";
import IslandGameTutorial from "../../mini-game-screen/mini-game-tutorials/Island-game-tutorial/IslandGameTutorial";
import {
  sendIslandGamePosition,
  sendIslandGameDeath,
} from "../../../websocket";
import { Castaway, Pirate, Viking, Explorer } from "./skins/PlayerSkins";
import { auth } from "../../../firebase";

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 30;
const TILE_SIZE = 35;
const PLAYER_SPEED = 0.2;
const CANNONBALL_SPEED = 0.1;
const CANNON_FIRE_INTERVAL = 2500;
const ISLAND_RADIUS = 12;
const BOARD_WIDTH = BOARD_SIZE * TILE_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * TILE_SIZE;

// --- Skin Selection Logic ---
const SKINS = [
  Castaway, // Player 1 (index 0)
  Explorer, // Player 2 (index 1)
  Pirate, // Player 3 (index 2)
  Viking, // Player 4 (index 3)
];
const DEFAULT_SKIN = Castaway;

// --- Player Component ---
const Player = ({ position, playerIndex, direction, walkFrame }) => {
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
};

// --- PlayerGhost Component ---
const PlayerGhost = ({ position, playerIndex }) => {
  const SkinComponent = SKINS[playerIndex] || DEFAULT_SKIN;
  const scale = 2;
  return (
    <div
      className="player"
      style={{
        left: position.x * TILE_SIZE,
        top: position.y * TILE_SIZE,
        opacity: 0.5, // Ghost transparency
        filter: "grayscale(100%) drop-shadow(0 0 2px white)", // Ghost effect
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 19,
      }}
    >
      <SkinComponent 
        scale={scale} 
        direction="front" 
        walkFrame={false} 
      />
    </div>
  );
};

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
    style={{ left: position.x * TILE_SIZE, top: position.y * TILE_SIZE }}
  />
);

const Island = () => (
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
);

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
  
  // Initialize position from storage if available (Anti-Refresh-Teleport Fix)
  const [playerPos, setPlayerPos] = useState(() => {
    if (!miniGameId) return { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
    const saved = sessionStorage.getItem(`islandPos-${miniGameId}`);
    return saved ? JSON.parse(saved) : { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };
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

  // --- Skin/Animation State ---
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
  const activeCannonRef = useRef(activeCannons);
  const cannonballsRef = useRef(cannonballs);
  const gameStateRef = useRef(gameState);
  
  const lastPositionSentRef = useRef(playerPos);

  // --- Player Index Mapping ---
  const playerIndexMap = useMemo(() => {
    const map = new Map();
    miniGamePlayers.forEach((player, index) => {
      if (player.user?.firebaseUid) {
        map.set(player.user.firebaseUid, index % 4); 
      }
    });
    return map;
  }, [miniGamePlayers]);

  const localPlayerIndex = playerIndexMap.get(auth.currentUser?.uid) ?? 0;

  // --- Persist Position continuously ---
  useEffect(() => {
    if (miniGameId && playerPos) {
      sessionStorage.setItem(`islandPos-${miniGameId}`, JSON.stringify(playerPos));
    }
  }, [playerPos, miniGameId]);

  // --- Broadcast on Mount (Fix for "Invisible on Refresh") ---
  useEffect(() => {
    // If we have a valid position and are effectively "playing" (even if waiting for start signal logic), broadcast.
    // But specifically if we just restored from storage.
    if (miniGameId && playerPos && !isDead) {
      sendIslandGamePosition(miniGameId, playerPos);
    }
  }, [miniGameId]); // Run once on mount

  // --- Remote walk frame animation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteWalkFrame((wf) => !wf);
    }, 200); 
    return () => clearInterval(interval);
  }, []);

  // --- Sync direction state to ref ---
  useEffect(() => {
    playerDirectionRef.current = playerDirection;
  }, [playerDirection]);

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
  useEffect(() => {
    isDeadRef.current = isDead;
  }, [isDead]);

  // Restore death state after refresh
  useEffect(() => {
    if (!miniGameId) return;
    const deadKey = `miniGameDead-${miniGameId}`;
    const ghostKey = `miniGameGhostPos-${miniGameId}`;
    const wasDead = sessionStorage.getItem(deadKey) === "true";
    if (wasDead) {
      setIsDead(true);
      setGameState("spectating");
      const savedGhost = sessionStorage.getItem(ghostKey);
      if (savedGhost) {
        try {
          const gp = JSON.parse(savedGhost);
          if (gp && typeof gp.x === "number" && typeof gp.y === "number") {
            setGhostPos(gp);
            const myUid = auth.currentUser?.uid;
            if (myUid) ghostsRef.current[myUid] = gp;
          }
        } catch {}
      }
    }
  }, [miniGameId]);

  // Handle incoming position updates
  useEffect(() => {
    if (
      lastMiniGameMessage &&
      lastMiniGameMessage.type === "island_game_position_update"
    ) {
      const { data } = lastMiniGameMessage;
      const currentUid = auth.currentUser?.uid;

      // Ignore updates for dead players
      if (deadUidsRef.current.has(data.uid)) return;

      if (data.uid !== currentUid) {
        let newDirection = "front";
        const oldPos = otherPlayersRef.current[data.uid];
        if (oldPos) {
          if (data.y < oldPos.y) newDirection = "back";
          else if (data.y > oldPos.y) newDirection = "front";
          else if (data.x < oldPos.x) newDirection = "left";
          else if (data.x > oldPos.x) newDirection = "right";
          else newDirection = oldPos.direction || "front";
        }

        otherPlayersRef.current = {
          ...otherPlayersRef.current,
          [data.uid]: { x: data.x, y: data.y, direction: newDirection },
        };
      }
    }

    // Handle immediate death broadcasts
    if (
      lastMiniGameMessage &&
      lastMiniGameMessage.type === "island_game_death"
    ) {
      const { uid, x, y } = lastMiniGameMessage;
      deadUidsRef.current.add(uid);
      
      // Add ghost
      if (typeof x === "number" && typeof y === "number") {
        ghostsRef.current[uid] = { x, y }; 
      }
      
      // Remove live sprite immediately
      if (otherPlayersRef.current[uid]) {
        const clone = { ...otherPlayersRef.current };
        delete clone[uid];
        otherPlayersRef.current = clone;
      }

      // Handle local player death
      const myUid = auth.currentUser?.uid;
      if (uid === myUid && !isDeadRef.current) {
        setIsDead(true);
        setGameState("spectating");
        if (typeof x === "number" && typeof y === "number") {
          setGhostPos({ x, y });
          sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
          sessionStorage.setItem(
            `miniGameGhostPos-${miniGameId}`,
            JSON.stringify({ x, y })
          );
        }
      }
    }
  }, [lastMiniGameMessage, miniGameId]);

  // Handle scaling
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

  const startGame = useCallback(
    (initialCannonsFromServer, options = { spectateOnly: false }) => {
      console.log(
        "[IslandGame] Starting game with cannons:",
        initialCannonsFromServer
      );
      
      // Reset game state logic
      setActiveCannons([]);
      setCannonballs([]);
      otherPlayersRef.current = {};
      keysDownRef.current = {};
      cannonballIdRef.current = 0;
      setPlayerDirection("front");
      setWalkFrame(false);
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
        walkIntervalRef.current = null;
      }
      deadUidsRef.current = new Set();
      ghostsRef.current = {};

      if (!initialCannonsFromServer || initialCannonsFromServer.length === 0) {
        console.error("[IslandGame] ERROR: No cannons received from server!");
        return;
      }

      if (options.spectateOnly) {
         setGameState("spectating");
      } else {
         // Alive start: Check if we have a saved position to restore (refresh scenario)
         const savedPos = sessionStorage.getItem(`islandPos-${miniGameId}`);
         if (savedPos) {
             setPlayerPos(JSON.parse(savedPos));
         } else {
             // Fresh start
             setPlayerPos({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
         }
         
         // Only clear death flags if we are truly starting alive
         sessionStorage.removeItem(`miniGameDead-${miniGameId}`);
         sessionStorage.removeItem(`miniGameGhostPos-${miniGameId}`);
         setIsDead(false);
         isDeadRef.current = false;
         setGhostPos(null);
         setGameState("playing");
      }

      allCannonsRef.current = initialCannonsFromServer.map((c) => ({
        id: c.id,
        pos: { x: c.x, y: c.y },
        angle: 0,
        lastShot: performance.now() + CANNON_FIRE_INTERVAL,
        spawnTime: c.spawnTime,
      }));
    },
    [miniGameId]
  );

  // Initialize game
  useEffect(() => {
    if (miniGameStartSignal && gameState === "waiting") {
      console.log(
        "[IslandGame] Received miniGameStartSignal:",
        miniGameStartSignal
      );
      if (miniGameStartSignal.cannons) {
        const deadFlag =
          miniGameId &&
          sessionStorage.getItem(`miniGameDead-${miniGameId}`) === "true";
        startGame(miniGameStartSignal.cannons, { spectateOnly: !!deadFlag });
      } else {
        console.error(
          "[IslandGame] ERROR: miniGameStartSignal has no cannons property!"
        );
      }
    }
  }, [miniGameStartSignal, gameState, startGame, miniGameId]);

  // Cannon Spawning
  useEffect(() => {
    if (
      (gameState !== "playing" && gameState !== "spectating") ||
      !allCannonsRef.current.length ||
      miniGameTimer === null 
    )
      return;

    const shouldBeActive = allCannonsRef.current.filter((c) => {
      return miniGameTimer <= c.spawnTime;
    });

    setActiveCannons((prevCannons) => {
      const prevMap = new Map(prevCannons.map((c) => [c.id, c]));
      const targetIds = new Set(shouldBeActive.map((c) => c.id));

      const newList = shouldBeActive.map((c) => {
        const existing = prevMap.get(c.id);
        return existing || { ...c };
      });

      const finalFilteredList = newList.filter((c) => targetIds.has(c.id));

      if (finalFilteredList.length !== prevCannons.length) {
        return finalFilteredList;
      }
      for (let i = 0; i < finalFilteredList.length; i++) {
        if (finalFilteredList[i].id !== prevCannons[i].id) {
          return finalFilteredList;
        }
      }

      return prevCannons; 
    });
  }, [miniGameTimer, gameState]); 

  // Server Snapshot Handling (Dead UIDs)
  useEffect(() => {
    if (lastMiniGameMessage && lastMiniGameMessage.players) {
      const deadUids = lastMiniGameMessage.deadUids || [];
      const deadPlayers = lastMiniGameMessage.deadPlayers || [];
      
      if (Array.isArray(deadUids)) {
        for (const uid of deadUids) {
          deadUidsRef.current.add(uid);
          // Ensure dead players are removed from the live sprite list
          if (otherPlayersRef.current[uid]) {
             const clone = { ...otherPlayersRef.current };
             delete clone[uid];
             otherPlayersRef.current = clone;
          }
        }
        
        const myUid = auth.currentUser?.uid;
        if (myUid && deadUidsRef.current.has(myUid)) {
          if (!isDeadRef.current) {
            setIsDead(true);
            isDeadRef.current = true;
            setGameState("spectating");
            const saved = sessionStorage.getItem(
              `miniGameGhostPos-${miniGameId}`
            );
            if (saved) {
              try {
                const gp = JSON.parse(saved);
                if (gp && typeof gp.x === "number") {
                  setGhostPos(gp);
                  ghostsRef.current[myUid] = gp;
                }
              } catch {}
            }
            sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
          }
        } else if (gameState === "waiting") {
          setGameState("playing");
        }
      }
      
      if (Array.isArray(deadPlayers)) {
        for (const dp of deadPlayers) {
          if (dp && typeof dp.uid === "string" && typeof dp.x === "number") {
            ghostsRef.current[dp.uid] = { x: dp.x, y: dp.y };
          }
        }
      }
    }
  }, [lastMiniGameMessage, miniGameId, gameState]);

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
      lastTimeRef.current = timestamp;

      // --- 1. Update Local Player (only if alive) ---
      if (!isDeadRef.current) {
        let newPos = { ...playerPosRef.current };
        let newDirection = playerDirectionRef.current;
        let moved = false;
        const speed = PLAYER_SPEED;

        let horizontalMove = 0;
        let verticalMove = 0;

        if (keysDownRef.current["ArrowLeft"] || keysDownRef.current["a"]) {
          horizontalMove = -1;
        } else if (
          keysDownRef.current["ArrowRight"] ||
          keysDownRef.current["d"]
        ) {
          horizontalMove = 1;
        }

        if (keysDownRef.current["ArrowUp"] || keysDownRef.current["w"]) {
          verticalMove = -1;
        } else if (
          keysDownRef.current["ArrowDown"] ||
          keysDownRef.current["s"]
        ) {
          verticalMove = 1;
        }

        if (verticalMove !== 0) {
          newPos.y += verticalMove * speed;
          moved = true;
          newDirection = verticalMove === -1 ? "back" : "front";
        }
        if (horizontalMove !== 0) {
          newPos.x += horizontalMove * speed;
          moved = true;
          if (verticalMove === 0) {
            newDirection = horizontalMove === -1 ? "left" : "right";
          }
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

        if (moved) {
          if (newDirection !== playerDirectionRef.current) {
            setPlayerDirection(newDirection);
          }

          if (!walkIntervalRef.current) {
            walkIntervalRef.current = setInterval(() => {
              setWalkFrame((wf) => !wf);
            }, 200); 
          }

          const lastPos = lastPositionSentRef.current;
          const distMoved = Math.sqrt(
            Math.pow(newPos.x - lastPos.x, 2) +
              Math.pow(newPos.y - lastPos.y, 2)
          );
          if (distMoved > 0.3) {
            setPlayerPos(newPos);
            sendIslandGamePosition(miniGameId, newPos);
            lastPositionSentRef.current = newPos;
          } else {
            setPlayerPos(newPos);
          }
        } else {
          if (walkIntervalRef.current) {
            clearInterval(walkIntervalRef.current);
            walkIntervalRef.current = null;
            setWalkFrame(false); 
          }
        }
      }

      // *** AIMER LOGIC ***
      const updatedCannonsFromRef = activeCannonRef.current.map((c) => {
        const allPlayerPos = { ...otherPlayersRef.current };

        for (const uid of deadUidsRef.current) {
          delete allPlayerPos[uid];
        }

        if (!isDeadRef.current && auth.currentUser?.uid) {
          allPlayerPos[auth.currentUser.uid] = playerPosRef.current;
        }

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
            (Math.atan2(closestPlayer.y - c.pos.y, closestPlayer.x - c.pos.x) *
              180) /
            Math.PI;
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

      const cannonsChanged = updatedCannonsFromRef.some(
        (c, i) =>
          c.angle !== activeCannonRef.current[i]?.angle ||
          c.lastShot !== activeCannonRef.current[i]?.lastShot
      );

      if (cannonsChanged) {
        setActiveCannons((prevCannons) => {
          const updatedMap = new Map(
            updatedCannonsFromRef.map((c) => [c.id, c])
          );
          return prevCannons.map((prevCannon) => {
            return updatedMap.get(prevCannon.id) || prevCannon;
          });
        });
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

      if (!isDeadRef.current && playerPosRef.current) {
        const localPlayerPos = playerPosRef.current;
        for (const ball of updatedBalls) {
          const dx = ball.pos.x - localPlayerPos.x;
          const dy = ball.pos.y - localPlayerPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
            setIsDead(true);
            isDeadRef.current = true;
            setGameState("spectating");
            setGhostPos(localPlayerPos);

            if (walkIntervalRef.current) {
              clearInterval(walkIntervalRef.current);
              walkIntervalRef.current = null;
              setWalkFrame(false);
            }

            const myUid = auth.currentUser?.uid;
            if (myUid) {
              ghostsRef.current[myUid] = localPlayerPos;
            }
            if (miniGameId) {
              sessionStorage.setItem(`miniGameDead-${miniGameId}`, "true");
              sessionStorage.setItem(
                `miniGameGhostPos-${miniGameId}`,
                JSON.stringify(localPlayerPos)
              );
            }
            sendIslandGameDeath(miniGameId, localPlayerPos);
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

  // Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
      }
      keysDownRef.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysDownRef.current[e.key] = false;
    };

    const handleBlur = () => {
      keysDownRef.current = {};
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
        walkIntervalRef.current = null;
        setWalkFrame(false); 
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    if (gameState === "playing" || gameState === "spectating") {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur); 
      cancelAnimationFrame(gameLoopRef.current);
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Render Data
  const otherPlayersArray = Object.entries(otherPlayersRef.current);
  const ghostEntries = Object.entries(ghostsRef.current);

  return (
    <div className="mini-game-island" ref={stageRef}>
      {gameState === "waiting" ? (
        <>
          <MiniGameReadyUp
            gameTitle={gameTitle}
            miniGamePlayers={miniGamePlayers}
            miniGameId={miniGameId}
          />
          <IslandGameTutorial />
        </>
      ) : (
        <>
          <div className="stage" ref={stageRef}>
            <div className="board-scale" style={{ "--scale": scale }}>
              <div
                className="game-board"
                style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
              >
                <Island />

                {/* Render Local Player */}
                {!isDead && (
                  <Player
                    position={playerPos}
                    playerIndex={localPlayerIndex}
                    direction={playerDirection}
                    walkFrame={walkFrame}
                  />
                )}

                {/* Render Remote Players */}
                {otherPlayersArray.map(([uid, posData]) => (
                  <Player
                    key={uid}
                    position={posData}
                    playerIndex={playerIndexMap.get(uid) ?? 0}
                    direction={posData.direction || "front"}
                    walkFrame={remoteWalkFrame}
                  />
                ))}

                {/* Ghosts for everyone (including my own) */}
                {ghostEntries.map(([uid, pos]) => (
                  <PlayerGhost 
                    key={`ghost-${uid}`} 
                    position={pos} 
                    playerIndex={playerIndexMap.get(uid) ?? 0} 
                  />
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