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
// [FIX REVERTED] Playable radius removed.
const BOARD_WIDTH = BOARD_SIZE * TILE_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * TILE_SIZE;

// --- [NEW] Skin Selection Logic ---
const SKINS = [
  Castaway, // Player 1 (index 0)
  Explorer, // Player 2 (index 1)
  Pirate, // Player 3 (index 2)
  Viking, // Player 4 (index 3)
];
const DEFAULT_SKIN = Castaway;

// --- [FIXED] Player Component ---
// Renders a scaled SVG inside the base .player div
const Player = ({ position, playerIndex, direction, walkFrame }) => {
  const SkinComponent = SKINS[playerIndex] || DEFAULT_SKIN;
  const scale = 2; // Set desired scale
  return (
    <div
      className="player" // This class defines base size (32x32) and transform
      style={{
        left: position.x * TILE_SIZE,
        top: position.y * TILE_SIZE,
        // Override CSS to make container transparent
        backgroundColor: "red",
        transform: "translate(-50%, -50%)", // center hitbox visually
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

// --- [FIXED] PlayerGhost Component ---
// Reverted to original implementation.
const PlayerGhost = ({ position }) => (
  <div
    className="player"
    style={{
      left: position.x * TILE_SIZE,
      top: position.y * TILE_SIZE,
      opacity: 0.35,
      filter: "grayscale(100%)",
      borderStyle: "dashed",
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
    <div className="cannon-base"></div>
    <div className="cannon-barrel"></div>{" "}
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
    <div className="water-background"></div>
    <div className="water-waves"></div> <div className="water-ripples"></div>{" "}
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
  const gameTitle = "Cannon Island Survival";
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

  // --- [NEW] Skin/Animation State ---
  const [playerDirection, setPlayerDirection] = useState("front");
  const playerDirectionRef = useRef("front"); // Ref for game loop
  const [walkFrame, setWalkFrame] = useState(false);
  const walkIntervalRef = useRef(null);
  const [remoteWalkFrame, setRemoteWalkFrame] = useState(false);

  // NEW: elimination & ghost state
  const [isDead, setIsDead] = useState(false);
  const isDeadRef = useRef(false);
  const [ghostPos, setGhostPos] = useState(null); // {x,y}
  const deadUidsRef = useRef(new Set()); // track other dead players
  const ghostsRef = useRef({}); // uid -> {x, y}

  // Use refs for values that change often inside the game loop to prevent re-renders
  const playerPosRef = useRef(playerPos);
  const otherPlayersRef = useRef({}); // Store other players in ref only
  const activeCannonRef = useRef(activeCannons);
  const cannonballsRef = useRef(cannonballs);
  const gameStateRef = useRef(gameState);
  const lastPositionSentRef = useRef({
    x: BOARD_SIZE / 2,
    y: BOARD_SIZE / 2,
  });

  // --- [NEW] Player Index Mapping ---
  const playerIndexMap = useMemo(() => {
    const map = new Map();
    miniGamePlayers.forEach((player, index) => {
      if (player.user?.firebaseUid) {
        map.set(player.user.firebaseUid, index % 4); // Modulo 4 for safety
      }
    });
    return map;
  }, [miniGamePlayers]);

  const localPlayerIndex = playerIndexMap.get(auth.currentUser?.uid) ?? 0;

  // --- [NEW] Remote walk frame animation ---
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteWalkFrame((wf) => !wf);
    }, 200); // Toggle every 200ms
    return () => clearInterval(interval);
  }, []);

  // --- [NEW] Sync direction state to ref ---
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

  // Restore death state after refresh for this mini-game
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
            // make sure everyone (this client) tracks their own ghost too
            const myUid = auth.currentUser?.uid;
            if (myUid) ghostsRef.current[myUid] = gp;
          }
        } catch {}
      }
    }
  }, [miniGameId]);

  // Handle incoming position updates for other players !
  useEffect(() => {
    if (
      lastMiniGameMessage &&
      lastMiniGameMessage.type === "island_game_position_update"
    ) {
      const { data } = lastMiniGameMessage;
      const currentUid = auth.currentUser?.uid;

      // ignore updates for dead players
      if (deadUidsRef.current.has(data.uid)) return;

      if (data.uid !== currentUid) {
        // --- [MODIFIED] Calculate and store direction ---
        let newDirection = "front";
        const oldPos = otherPlayersRef.current[data.uid];
        if (oldPos) {
          // Prioritize vertical direction
          if (data.y < oldPos.y) newDirection = "back";
          else if (data.y > oldPos.y) newDirection = "front";
          // Only use horizontal if no vertical change
          else if (data.x < oldPos.x) newDirection = "left";
          else if (data.x > oldPos.x) newDirection = "right";
          else newDirection = oldPos.direction || "front"; // Keep old direction if no move
        }

        otherPlayersRef.current = {
          ...otherPlayersRef.current,
          [data.uid]: { x: data.x, y: data.y, direction: newDirection },
        };
      }
    }

    // React to immediate death broadcasts from server (with ghost position)
    if (
      lastMiniGameMessage &&
      lastMiniGameMessage.type === "island_game_death"
    ) {
      const { uid, x, y } = lastMiniGameMessage;
      deadUidsRef.current.add(uid);
      if (typeof x === "number" && typeof y === "number") {
        ghostsRef.current[uid] = { x, y }; // NEW: show ghost for everyone
      }
      // stop rendering that remote player
      if (otherPlayersRef.current[uid]) {
        const clone = { ...otherPlayersRef.current };
        delete clone[uid];
        otherPlayersRef.current = clone;
      }
      // If this is me, ensure I switch to spectating without overlay
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

    // [NEW] Reset animation/direction state
    setPlayerDirection("front");
    setWalkFrame(false);
    if (walkIntervalRef.current) {
      clearInterval(walkIntervalRef.current);
      walkIntervalRef.current = null;
    }

    deadUidsRef.current = new Set();
    ghostsRef.current = {};
  }, []);

  // Start in play OR spectate-only mode
  const startGame = useCallback(
    (initialCannonsFromServer, options = { spectateOnly: false }) => {
      console.log(
        "[IslandGame] Starting game with cannons:",
        initialCannonsFromServer
      );
      resetGame();

      if (!initialCannonsFromServer || initialCannonsFromServer.length === 0) {
        console.error("[IslandGame] ERROR: No cannons received from server!");
        return;
      }

      // If spectating (after death), DO NOT clear death flags
      if (!options.spectateOnly && miniGameId) {
        sessionStorage.removeItem(`miniGameDead-${miniGameId}`); // clear only for real fresh start
        sessionStorage.removeItem(`miniGameGhostPos-${miniGameId}`);
        setIsDead(false);
        isDeadRef.current = false;
        setGhostPos(null);
      }

      // Store all cannons with their spawn times
      allCannonsRef.current = initialCannonsFromServer.map((c) => ({
        id: c.id,
        pos: { x: c.x, y: c.y },
        angle: 0,
        lastShot: performance.now() + CANNON_FIRE_INTERVAL,
        spawnTime: c.spawnTime,
      }));

      setActiveCannons([]);
      setGameState(options.spectateOnly ? "spectating" : "playing");
    },
    [resetGame, miniGameId]
  );

  // Initialize game when start signal is received
  useEffect(() => {
    if (miniGameStartSignal && gameState === "waiting") {
      console.log(
        "[IslandGame] Received miniGameStartSignal:",
        miniGameStartSignal
      );
      if (miniGameStartSignal.cannons) {
        // NEW: if we were already marked dead (e.g., page refresh), start in spectateOnly
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

  // **DETERMINISTIC CANNON SPAWNING - Based on server timer counting DOWN**
  useEffect(() => {
    if (
      (gameState !== "playing" && gameState !== "spectating") ||
      !allCannonsRef.current.length ||
      miniGameTimer === null // <-- FIX 1: Keep this check
    )
      return;

    // As timer counts DOWN, spawn cannons when we reach their spawnTime
    const shouldBeActive = allCannonsRef.current.filter((c) => {
      return miniGameTimer <= c.spawnTime;
    });

    // *** FIX 2 (SPAWNER): Use a functional update to add/remove cannons ***
    // This logic correctly preserves the state of existing cannons (like their angle)
    // while adding new ones or removing old ones.
    setActiveCannons((prevCannons) => {
      const prevMap = new Map(prevCannons.map((c) => [c.id, c]));
      const targetIds = new Set(shouldBeActive.map((c) => c.id));

      // Re-create the list, preserving existing cannons' properties
      const newList = shouldBeActive.map((c) => {
        const existing = prevMap.get(c.id);
        // If it exists, use its current state. If not, add the clean copy.
        return existing || { ...c };
      });

      // (This filter is technically redundant if shouldBeActive is correct, but is safe)
      const finalFilteredList = newList.filter((c) => targetIds.has(c.id));

      // Check if lists are different
      if (finalFilteredList.length !== prevCannons.length) {
        return finalFilteredList;
      }
      for (let i = 0; i < finalFilteredList.length; i++) {
        // This handles if the list is the same length but different cannons
        if (finalFilteredList[i].id !== prevCannons[i].id) {
          return finalFilteredList;
        }
      }

      return prevCannons; // No change
    });
  }, [miniGameTimer, gameState]); // <-- Dependency array is correct

  // NEW: consume periodic server snapshot to lock death after refresh and update ghosts for everyone
  useEffect(() => {
    // { players, remainingTime, deadUids, deadPlayers }
    if (lastMiniGameMessage && lastMiniGameMessage.players) {
      const deadUids = lastMiniGameMessage.deadUids || [];
      const deadPlayers = lastMiniGameMessage.deadPlayers || [];
      if (Array.isArray(deadUids)) {
        for (const uid of deadUids) deadUidsRef.current.add(uid);
        const myUid = auth.currentUser?.uid;
        if (myUid && deadUidsRef.current.has(myUid)) {
          if (!isDeadRef.current) {
            setIsDead(true);
            isDeadRef.current = true;
            setGameState("spectating");
            // keep ghost at last known position (from storage if present)
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
          // If I'm not dead and we have updates, ensure we are in playing state so loop runs
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
      // Keep sim running even while spectating so others/cannons animate
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
        // --- [MODIFIED] Add direction and animation logic ---
        let newDirection = playerDirectionRef.current; // Start with current direction
        let moved = false;
        const speed = PLAYER_SPEED;

        let horizontalMove = 0;
        let verticalMove = 0;

        // --- [FIX 2: DIRECTION LOGIC] ---
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
          // Only set horizontal direction if vertical is not being set
          if (verticalMove === 0) {
            newDirection = horizontalMove === -1 ? "left" : "right";
          }
        }
        // --- [END FIX 2] ---

        // [FIX 1: REVERTED CLAMPING] Clamp to ISLAND_RADIUS
        const distFromCenter = Math.sqrt(
          Math.pow(newPos.x - BOARD_SIZE / 2, 2) +
            Math.pow(newPos.y - BOARD_SIZE / 2, 2)
        );
        // We subtract 0.5 (half a tile) to account for the player's center
        if (distFromCenter > ISLAND_RADIUS - 0.5) {
          const angle = Math.atan2(
            newPos.y - BOARD_SIZE / 2,
            newPos.x - BOARD_SIZE / 2
          );
          newPos.x = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.cos(angle);
          newPos.y = BOARD_SIZE / 2 + (ISLAND_RADIUS - 0.5) * Math.sin(angle);
        }

        // --- [MODIFIED] Handle state updates for animation/direction ---
        if (moved) {
          // Update direction state if it changed
          if (newDirection !== playerDirectionRef.current) {
            setPlayerDirection(newDirection);
          }

          // Handle walk animation
          if (!walkIntervalRef.current) {
            walkIntervalRef.current = setInterval(() => {
              setWalkFrame((wf) => !wf);
            }, 200); // 200ms animation toggle
          }

          // Only send position updates if moved significantly (throttle network traffic)
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
          // Not moving
          if (walkIntervalRef.current) {
            clearInterval(walkIntervalRef.current);
            walkIntervalRef.current = null;
            setWalkFrame(false); // Reset to non-walk frame
          }
        }
      }

      // *** AIMER LOGIC ***
      const updatedCannonsFromRef = activeCannonRef.current.map((c) => {
        // Build target set = all alive players (others alive + maybe local)
        const allPlayerPos = { ...otherPlayersRef.current };

        // Remove dead uids from consideration
        for (const uid of deadUidsRef.current) {
          delete allPlayerPos[uid];
        }

        // Add local if alive
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
          // Update cannonballs state directly (this is fine, it's a separate state)
          cannonballsRef.current = [...cannonballsRef.current, newBall];
          setCannonballs(cannonballsRef.current);
          return { ...c, angle: newAngle, lastShot: timestamp };
        }

        return { ...c, angle: newAngle };
      });

      // Check if any properties actually changed
      const cannonsChanged = updatedCannonsFromRef.some(
        (c, i) =>
          c.angle !== activeCannonRef.current[i]?.angle ||
          c.lastShot !== activeCannonRef.current[i]?.lastShot
      );

      // We MUST use a functional update here to prevent stomping the spawner
      if (cannonsChanged) {
        setActiveCannons((prevCannons) => {
          // 'prevCannons' is the "true" state from React (e.g., [C1, C2, C3, C4])
          // 'updatedCannonsFromRef' is the list from *this* frame (e.g., [C1', C2', C3'])

          const updatedMap = new Map(
            updatedCannonsFromRef.map((c) => [c.id, c])
          );

          // Create the new list by merging
          // This applies updates to cannons that exist in both lists,
          // and preserves new cannons (from spawner) that aren't in the update list.
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

      // Collision ONLY if local is alive
      if (!isDeadRef.current && playerPosRef.current) {
        const localPlayerPos = playerPosRef.current;
        for (const ball of updatedBalls) {
          const dx = ball.pos.x - localPlayerPos.x;
          const dy = ball.pos.y - localPlayerPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 0.8) {
            // Eliminated on hit; do NOT respawn. Save ghost + persist. NO overlay.
            setIsDead(true);
            isDeadRef.current = true;
            setGameState("spectating");
            setGhostPos(localPlayerPos);

            // [NEW] Stop walk animation on death
            if (walkIntervalRef.current) {
              clearInterval(walkIntervalRef.current);
              walkIntervalRef.current = null;
              setWalkFrame(false);
            }

            // NEW: register my ghost locally and send to server so everyone sees it
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

  // Effect to start/stop the game loop
  useEffect(() => {
    const handleKeyDown = (e) => {
      // [NEW] Prevent arrow keys from scrolling the page
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

    // [FIX 2] Add blur event listener to stop movement
    const handleBlur = () => {
      keysDownRef.current = {};
      // Also stop walk animation if it's running
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
        walkIntervalRef.current = null;
        setWalkFrame(false); // Reset to non-walk frame
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur); // <-- ADDED

    if (gameState === "playing" || gameState === "spectating") {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur); // <-- ADDED
      cancelAnimationFrame(gameLoopRef.current);
      // [NEW] Clear walk interval on unmount
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Render other players from ref (no state needed)
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
                {/* NOTE: Death overlay removed per request. Spectate silently. */}

                <Island />

                {/* --- [MODIFIED] Render local player skin --- */}
                {!isDead && (
                  <Player
                    position={playerPos}
                    playerIndex={localPlayerIndex}
                    direction={playerDirection}
                    walkFrame={walkFrame}
                  />
                )}

                {/* --- [MODIFIED] Render remote player skins --- */}
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
                  <PlayerGhost key={`ghost-${uid}`} position={pos} />
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
