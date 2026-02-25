import "./CrossyRoad.css";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { auth } from "../../../firebase";
import { Chicken, Mantis, Cow, Pig } from "./skins/PlayerSkins";
import MiniGameReadyUp from "../../mini-game-screen/mini-game-ready-up/MiniGameReadyUp";
import CrossyRoadTutorial from "../../mini-game-screen/mini-game-tutorials/crossy-road-tutorial/CrossyRoadTutorial";
import { sendCrossyRoadPosition, sendStackerPoints } from "../../../websocket";

/**
 *
 * Screen sizes
 *
 * GRID V & H depend on backend too
 */
const GRID_SIZE_V = 22;
const GRID_SIZE_H = 14;
const TILE_SIZE = 40;

const BOARD_W = GRID_SIZE_H * TILE_SIZE;
const BOARD_H = GRID_SIZE_V * TILE_SIZE;

/**
 *
 * Character Skins
 *
 * Skin you get depends on player list index [0, 1, 2, 3]
 */
const SKINS = [Chicken, Mantis, Cow, Pig];
const DEFAULT_SKIN = Chicken;

const Player = ({ pos, playerIndex, direction }) => {
  const SkinComponent = SKINS[playerIndex] || DEFAULT_SKIN;
  return (
    <div
      className="player-container"
      style={{
        left: pos.x * TILE_SIZE,
        top: pos.y * TILE_SIZE,
      }}
    >
      <SkinComponent direction={direction} />
    </div>
  );
};

/**
 *
 * Generated Cars
 *
 */
const Obstacle = ({ obstacle }) => {
  const directionClass = obstacle.speed > 0 ? "going-right" : "going-left";

  return (
    <div
      className={`obstacle ${obstacle.style} ${directionClass}`}
      style={{
        left: obstacle.x * TILE_SIZE,
        top: obstacle.y * TILE_SIZE + TILE_SIZE * 0.075,
        width: obstacle.width * TILE_SIZE,
      }}
    >
      {obstacle.type === "truck" ? (
        <div className="truck-body">
          <div className="truck-cab">
            <div className="truck-window"></div>
          </div>
          <div className="truck-trailer"></div>
          <div className="wheel-truck wheel-truck-left"></div>
          <div className="wheel-truck wheel-truck-left-2"></div>
          <div className="wheel-truck wheel-truck-right"></div>
          <div className="wheel-truck wheel-truck-right-2"></div>
        </div>
      ) : (
        <div className="vehicle-body">
          <div className="car-top">
            <div className="windshield"></div>
          </div>
          <div className="wheel wheel-left"></div>
          <div className="wheel wheel-right"></div>
        </div>
      )}
    </div>
  );
};

/**
 *
 * Non goal lanes
 *
 */
const RoadLane = ({ y }) => (
  <div className="road-lane" style={{ top: `${y * TILE_SIZE}px` }} />
);

const SafetyLane = ({ y }) => (
  <div className="safety-lane" style={{ top: `${y * TILE_SIZE}px` }} />
);

// --- Main App Component ---
const CrossyRoad = ({
  miniGamePlayers,
  miniGameId,
  miniGameStartSignal,
  lastMiniGameMessage,
}) => {
  const gameTitle = "CrossyRoad";
  const [playerPos, setPlayerPos] = useState(null);
  const [playerDirection, setPlayerDirection] = useState("up"); // Track local direction
  const [obstacles, setObstacles] = useState([]);
  const [gameState, setGameState] = useState("waiting");
  const [gameStartTime, setGameStartTime] = useState(null);

  const [crossings, setCrossings] = useState(() => {
    const saved = sessionStorage.getItem(`crossy-crossings-${miniGameId}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [crossingDirection, setCrossingDirection] = useState(() => {
    const saved = sessionStorage.getItem(`crossy-direction-${miniGameId}`);
    return saved || "up";
  });

  // Store other players' direction along with position
  const [otherPlayerPositions, setOtherPlayerPositions] = useState({});

  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Create a stable map of player UID to their index (0-3)
  const playerIndexMap = useMemo(() => {
    const map = new Map();
    // Use the miniGamePlayers array order as the source of truth
    // This is stable as long as the server sends the same order
    miniGamePlayers.forEach((player, index) => {
      if (player.firebaseUid) {
        map.set(player.firebaseUid, index % 4); // Use modulo 4 to be safe
      }
    });
    return map;
  }, [miniGamePlayers]);

  // Get the local player's index
  const localPlayerIndex = playerIndexMap.get(auth.currentUser?.uid) ?? 0;

  // Keeps track of crossing in session storage
  useEffect(() => {
    if (miniGameId) {
      sessionStorage.setItem(`crossy-crossings-${miniGameId}`, crossings);
      sessionStorage.setItem(
        `crossy-direction-${miniGameId}`,
        crossingDirection
      );
    }
  }, [crossings, crossingDirection, miniGameId]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const s = Math.min(width / BOARD_W, height / BOARD_H);
      setScale(Math.max(0.1, Math.min(s, 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Creates Road or Safety lanes
  const roadLanes = useMemo(() => {
    const lanes = [];
    for (let i = 1; i < GRID_SIZE_V - 1; i++) {
      if (i % 5 === 1 && i != 1) {
        lanes.push(<SafetyLane key={`lane-${i}`} y={i} />);
      } else {
        lanes.push(<RoadLane key={`lane-${i}`} y={i} />);
      }
    }
    return lanes;
  }, []);

  useEffect(() => {
    if (
      miniGameStartSignal &&
      miniGameStartSignal.type === "mini_game_start" &&
      gameState === "waiting"
    ) {
      console.log("🚀 CrossyRoad is starting...");

      const { obstacles: serverObstacles, initialPositions } =
        miniGameStartSignal;
      const currentUid = auth.currentUser?.uid;

      if (currentUid && initialPositions && initialPositions[currentUid]) {
        const initialX = initialPositions[currentUid].x;
        const initialY = crossingDirection === "up" ? GRID_SIZE_V - 1 : 0;
        setPlayerPos({ x: initialX, y: initialY });
      } else {
        setPlayerPos({ x: Math.floor(GRID_SIZE_H / 2), y: GRID_SIZE_V - 1 });
      }

      setPlayerDirection("up"); // Reset direction on start

      const processedObstacles = serverObstacles.map((obs) => ({
        ...obs,
        initialX: obs.x,
      }));

      setObstacles(processedObstacles);
      setGameStartTime(Date.now());
      setGameState("playing");
    }
  }, [miniGameStartSignal, gameState, crossingDirection]);

  useEffect(() => {
    if (
      !lastMiniGameMessage ||
      lastMiniGameMessage.type !== "crossy_road_position_update"
    ) {
      return;
    }

    const { data } = lastMiniGameMessage;
    const currentUid = auth.currentUser?.uid;

    if (data.uid !== currentUid) {
      // Update other players' positions AND calculate their direction
      setOtherPlayerPositions((prev) => {
        const oldPos = prev[data.uid];
        let newDirection = oldPos?.direction || "up"; // Default to "up"

        if (oldPos) {
          if (data.y < oldPos.y) newDirection = "up";
          else if (data.y > oldPos.y) newDirection = "down";
          // If Y is same, keep the old direction
        }

        return {
          ...prev,
          [data.uid]: { x: data.x, y: data.y, direction: newDirection },
        };
      });
    }
  }, [lastMiniGameMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (gameState !== "playing" || !playerPos) return;
      setPlayerPos((prev) => {
        const np = { ...prev };
        switch (e.key) {
          case "ArrowUp":
          case "w":
            np.y = Math.max(0, prev.y - 1);
            setPlayerDirection("up"); // Set local direction
            break;
          case "ArrowDown":
          case "s":
            np.y = Math.min(GRID_SIZE_V - 1, prev.y + 1);
            setPlayerDirection("down"); // Set local direction
            break;
          case "ArrowLeft":
          case "a":
            np.x = Math.max(0, prev.x - 1);
            // No direction change
            break;
          case "ArrowRight":
          case "d":
            np.x = Math.min(GRID_SIZE_H - 1, prev.x + 1);
            // No direction change
            break;
          default:
            return prev;
        }
        sendCrossyRoadPosition(miniGameId, np);
        return np;
      });
    },
    [gameState, miniGameId, playerPos]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  //Animation for cars, makes cars move
  useEffect(() => {
    if (gameState !== "playing" || !gameStartTime) return;

    let animationFrameId;
    const loop = () => {
      const elapsedTime = Date.now() - gameStartTime;
      setObstacles((currentObstacles) =>
        currentObstacles.map((obs) => {
          const totalDistance = obs.speed * elapsedTime;
          let newX = obs.initialX + totalDistance;

          const worldSpan = GRID_SIZE_H + obs.width;
          const shiftedStart = newX + obs.width;
          const wrappedShifted =
            ((shiftedStart % worldSpan) + worldSpan) % worldSpan;
          const finalX = wrappedShifted - obs.width;

          return { ...obs, x: finalX };
        })
      );
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, gameStartTime]);

  //Keeps track of crossing directions
  useEffect(() => {
    if (gameState !== "playing" || !playerPos) return;

    const goalReached =
      (crossingDirection === "up" && playerPos.y === 0) ||
      (crossingDirection === "down" && playerPos.y === GRID_SIZE_V - 1);

    if (goalReached) {
      setCrossings((c) => c + 1);
      const newDir = crossingDirection === "up" ? "down" : "up";
      setCrossingDirection(newDir);
      setPlayerDirection(newDir); // Point player in the new direction
    }

    for (const obs of obstacles) {
      const carStart = Math.floor(obs.x);
      const carEnd = carStart + obs.width;
      if (
        playerPos.y === obs.y &&
        playerPos.x >= carStart &&
        playerPos.x < carEnd
      ) {
        const respawnPos =
          crossingDirection === "up"
            ? { x: Math.floor(GRID_SIZE_H / 2), y: GRID_SIZE_V - 1 }
            : { x: Math.floor(GRID_SIZE_H / 2), y: 0 };

        setPlayerPos(respawnPos);
        setPlayerDirection(crossingDirection); // Reset direction on respawn
        sendCrossyRoadPosition(miniGameId, respawnPos);

        return;
      }
    }
  }, [playerPos, obstacles, gameState, crossingDirection, miniGameId]);

  //Tracks crossing, sends to backend
  useEffect(() => {
    if (crossings > 0) {
      sendStackerPoints(miniGameId, { highScore: crossings });
    }
  }, [crossings, miniGameId]);

  //Ready up lobby
  if (gameState === "waiting") {
    return (
      <div className="game-mini-crossy-road" ref={stageRef}>
        <MiniGameReadyUp
          gameTitle={gameTitle}
          miniGamePlayers={miniGamePlayers}
          miniGameId={miniGameId}
        />
        <CrossyRoadTutorial />
      </div>
    );
  }

  return (
    <div className="game-wrapper">
      <div className="stage" ref={stageRef}>
        <div className="board-scale" style={{ "--scale": scale }}>
          <div
            className="crossy-road-game-board"
            style={{ width: BOARD_W, height: BOARD_H }}
          >
            <div
              className={`spawn-zone start-zone ${
                crossingDirection === "down" ? "goal-zone" : ""
              }`}
            />
            <div
              className={`spawn-zone end-zone ${
                crossingDirection === "up" ? "goal-zone" : ""
              }`}
            />
            {roadLanes}

            {/* Render Local Player */}
            {playerPos && (
              <Player
                pos={playerPos}
                playerIndex={localPlayerIndex}
                direction={playerDirection}
              />
            )}

            {/* Render Other Players */}
            {Object.entries(otherPlayerPositions).map(([uid, posData]) => (
              <Player
                key={uid}
                pos={posData}
                playerIndex={playerIndexMap.get(uid) ?? 0}
                direction={posData.direction}
              />
            ))}

            {obstacles.map((obs, i) => (
              <Obstacle key={`obs-${i}`} obstacle={obs} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrossyRoad;
