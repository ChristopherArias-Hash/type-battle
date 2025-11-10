import "./CrossyRoad.css";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import MiniGameReadyUp from "../../mini-game-screen/mini-game-ready-up/MiniGameReadyUp";
import CrossyRoadTutorial from "../../mini-game-screen/mini-game-tutorials/crossy-road-tutorial/CrossyRoadTutorial";
import { sendCrossyRoadPosition, sendStackerPoints } from "../../../websocket";
import { auth } from "../../../firebase";

const GRID_SIZE_V = 22;
const GRID_SIZE_H = 14;
const TILE_SIZE = 40; // px

const BOARD_W = GRID_SIZE_H * TILE_SIZE;
const BOARD_H = GRID_SIZE_V * TILE_SIZE;

// --- Animal Sprite Components ---

const ChickenUp = () => (
  <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
    <g>
      <ellipse
        cx="50"
        cy="60"
        rx="28"
        ry="35"
        fill="#f1c40f"
        stroke="#e67e22"
        strokeWidth="3"
      />
      <path
        d="M 25 55 C 20 60, 20 75, 30 75"
        fill="#e67e22"
        stroke="#d68910"
        strokeWidth="2"
      />
      <path
        d="M 75 55 C 80 60, 80 75, 70 75"
        fill="#e67e22"
        stroke="#d68910"
        strokeWidth="2"
      />
      <path
        d="M 50 85 Q 40 92, 38 98"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 50 85 Q 50 95, 50 100"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 50 85 Q 60 92, 62 98"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="16"
        ry="14"
        fill="#f1c40f"
        stroke="#e67e22"
        strokeWidth="3"
      />
      <path
        d="M 45 18 Q 48 12, 50 18 Q 52 12, 55 18"
        fill="#e74c3c"
        stroke="#c0392b"
        strokeWidth="2"
      />
    </g>
  </svg>
);
const ChickenDown = () => (
  <svg
    viewBox="0 0 100 100"
    style={{ width: "100%", height: "100%", transform: "rotate(180deg)" }}
  >
    <g>
      <ellipse
        cx="50"
        cy="60"
        rx="28"
        ry="35"
        fill="#f1c40f"
        stroke="#e67e22"
        strokeWidth="3"
      />
      <path
        d="M 25 55 C 20 60, 20 75, 30 75"
        fill="#e67e22"
        stroke="#d68910"
        strokeWidth="2"
      />
      <path
        d="M 75 55 C 80 60, 80 75, 70 75"
        fill="#e67e22"
        stroke="#d68910"
        strokeWidth="2"
      />
      <path
        d="M 50 85 Q 40 92, 38 98"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 50 85 Q 50 95, 50 100"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 50 85 Q 60 92, 62 98"
        stroke="#e67e22"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="16"
        ry="14"
        fill="#f1c40f"
        stroke="#e67e22"
        strokeWidth="3"
      />
      <path
        d="M 45 18 Q 48 12, 50 18 Q 52 12, 55 18"
        fill="#e74c3c"
        stroke="#c0392b"
        strokeWidth="2"
      />
    </g>
  </svg>
);
const CowUp = () => (
  <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
    <g>
      <ellipse
        cx="50"
        cy="62"
        rx="30"
        ry="36"
        fill="#ffffff"
        stroke="#2c3e50"
        strokeWidth="3"
      />
      <ellipse cx="38" cy="55" rx="9" ry="12" fill="#2c3e50" />
      <ellipse cx="60" cy="68" rx="11" ry="14" fill="#2c3e50" />
      <ellipse cx="48" cy="80" rx="7" ry="10" fill="#2c3e50" />
      <path
        d="M 50 90 Q 52 96, 48 100"
        stroke="#2c3e50"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="48" cy="100" r="3" fill="#2c3e50" />
      <ellipse
        cx="50"
        cy="26"
        rx="18"
        ry="16"
        fill="#ffffff"
        stroke="#2c3e50"
        strokeWidth="3"
      />
      <ellipse
        cx="34"
        cy="22"
        rx="6"
        ry="10"
        fill="#ffb6c1"
        stroke="#2c3e50"
        strokeWidth="2"
      />
      <ellipse
        cx="66"
        cy="22"
        rx="6"
        ry="10"
        fill="#ffb6c1"
        stroke="#2c3e50"
        strokeWidth="2"
      />
      <path
        d="M 35 16 Q 30 10, 32 6"
        stroke="#d4a574"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 65 16 Q 70 10, 68 6"
        stroke="#d4a574"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  </svg>
);
const CowDown = () => (
  <svg
    viewBox="0 0 100 100"
    style={{ width: "100%", height: "100%", transform: "rotate(180deg)" }}
  >
    <g>
      <ellipse
        cx="50"
        cy="62"
        rx="30"
        ry="36"
        fill="#ffffff"
        stroke="#2c3e50"
        strokeWidth="3"
      />
      <ellipse cx="38" cy="55" rx="9" ry="12" fill="#2c3e50" />
      <ellipse cx="60" cy="68" rx="11" ry="14" fill="#2c3e50" />
      <ellipse cx="48" cy="80" rx="7" ry="10" fill="#2c3e50" />
      <path
        d="M 50 90 Q 52 96, 48 100"
        stroke="#2c3e50"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="48" cy="100" r="3" fill="#2c3e50" />
      <ellipse
        cx="50"
        cy="26"
        rx="18"
        ry="16"
        fill="#ffffff"
        stroke="#2c3e50"
        strokeWidth="3"
      />
      <ellipse
        cx="34"
        cy="22"
        rx="6"
        ry="10"
        fill="#ffb6c1"
        stroke="#2c3e50"
        strokeWidth="2"
      />
      <ellipse
        cx="66"
        cy="22"
        rx="6"
        ry="10"
        fill="#ffb6c1"
        stroke="#2c3e50"
        strokeWidth="2"
      />
      <path
        d="M 35 16 Q 30 10, 32 6"
        stroke="#d4a574"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 65 16 Q 70 10, 68 6"
        stroke="#d4a574"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  </svg>
);
const PigUp = () => (
  <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
    <g>
      <ellipse
        cx="50"
        cy="62"
        rx="30"
        ry="35"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="3"
      />
      <path
        d="M 50 88 Q 54 90, 52 93 Q 50 96, 52 98"
        stroke="#e91e63"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="17"
        ry="15"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="3"
      />
      <path
        d="M 34 22 L 28 14 L 34 26 Z"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="2"
      />
      <path
        d="M 66 22 L 72 14 L 66 26 Z"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="2"
      />
    </g>
  </svg>
);
const PigDown = () => (
  <svg
    viewBox="0 0 100 100"
    style={{ width: "100%", height: "100%", transform: "rotate(180deg)" }}
  >
    <g>
      <ellipse
        cx="50"
        cy="62"
        rx="30"
        ry="35"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="3"
      />
      <path
        d="M 50 88 Q 54 90, 52 93 Q 50 96, 52 98"
        stroke="#e91e63"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="17"
        ry="15"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="3"
      />
      <path
        d="M 34 22 L 28 14 L 34 26 Z"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="2"
      />
      <path
        d="M 66 22 L 72 14 L 66 26 Z"
        fill="#ffb6c1"
        stroke="#e91e63"
        strokeWidth="2"
      />
    </g>
  </svg>
);
const MantisUp = () => (
  <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
    <g>
      <ellipse
        cx="50"
        cy="70"
        rx="14"
        ry="22"
        fill="#7cb342"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <line
        x1="42"
        y1="62"
        x2="58"
        y2="62"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="42"
        y1="70"
        x2="58"
        y2="70"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="42"
        y1="78"
        x2="58"
        y2="78"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <ellipse
        cx="50"
        cy="45"
        rx="15"
        ry="20"
        fill="#8bc34a"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <path
        d="M 38 30 L 50 18 L 62 30 L 60 34 L 40 34 Z"
        fill="#9ccc65"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <path
        d="M 44 26 Q 40 20, 36 14"
        stroke="#558b2f"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 56 26 Q 60 20, 64 14"
        stroke="#558b2f"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 38 38 L 28 36 L 24 42 L 20 40"
        stroke="#558b2f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 62 38 L 72 36 L 76 42 L 80 40"
        stroke="#558b2f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <line x1="24" y1="40" x2="22" y2="38" stroke="#558b2f" strokeWidth="2" />
      <line x1="24" y1="42" x2="22" y2="43" stroke="#558b2f" strokeWidth="2" />
      <line x1="76" y1="40" x2="78" y2="38" stroke="#558b2f" strokeWidth="2" />
      <line x1="76" y1="42" x2="78" y2="43" stroke="#558b2f" strokeWidth="2" />
      <path
        d="M 42 54 L 34 60 L 30 66"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 58 54 L 66 60 L 70 66"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 44 80 L 36 86 L 32 92"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 56 80 L 64 86 L 68 92"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  </svg>
);
const MantisDown = () => (
  <svg
    viewBox="0 0 100 100"
    style={{ width: "100%", height: "100%", transform: "rotate(180deg)" }}
  >
    <g>
      <ellipse
        cx="50"
        cy="70"
        rx="14"
        ry="22"
        fill="#7cb342"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <line
        x1="42"
        y1="62"
        x2="58"
        y2="62"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="42"
        y1="70"
        x2="58"
        y2="70"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="42"
        y1="78"
        x2="58"
        y2="78"
        stroke="#558b2f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <ellipse
        cx="50"
        cy="45"
        rx="15"
        ry="20"
        fill="#8bc34a"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <path
        d="M 38 30 L 50 18 L 62 30 L 60 34 L 40 34 Z"
        fill="#9ccc65"
        stroke="#558b2f"
        strokeWidth="2"
      />
      <path
        d="M 44 26 Q 40 20, 36 14"
        stroke="#558b2f"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 56 26 Q 60 20, 64 14"
        stroke="#558b2f"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M 38 38 L 28 36 L 24 42 L 20 40"
        stroke="#558b2f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 62 38 L 72 36 L 76 42 L 80 40"
        stroke="#558b2f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <line x1="24" y1="40" x2="22" y2="38" stroke="#558b2f" strokeWidth="2" />
      <line x1="24" y1="42" x2="22" y2="43" stroke="#558b2f" strokeWidth="2" />
      <line x1="76" y1="40" x2="78" y2="38" stroke="#558b2f" strokeWidth="2" />
      <line x1="76" y1="42" x2="78" y2="43" stroke="#558b2f" strokeWidth="2" />
      <path
        d="M 42 54 L 34 60 L 30 66"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 58 54 L 66 60 L 70 66"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 44 80 L 36 86 L 32 92"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M 56 80 L 64 86 L 68 92"
        stroke="#558b2f"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  </svg>
);

// --- Skin Mapping ---
const SKIN_MAP = [
  { up: <ChickenUp />, down: <ChickenDown /> }, // Player 1 (index 0)
  { up: <MantisUp />, down: <MantisDown /> },   // Player 2 (index 1)
  { up: <CowUp />, down: <CowDown /> },       // Player 3 (index 2)
  { up: <PigUp />, down: <PigDown /> },       // Player 4 (index 3)
];
const DEFAULT_SKIN = SKIN_MAP[0]; // Default to Chicken

// --- React Components ---

const Player = ({ pos, playerIndex, direction }) => {
  // Get the skin set (up/down) based on the player's index
  const skin = SKIN_MAP[playerIndex] || DEFAULT_SKIN;
  // Select the correct sprite based on the direction
  const sprite = direction === "down" ? skin.down : skin.up;

  return (
    <div
      className="player-container"
      key={`${pos.x}-${pos.y}`} // Re-triggers animation
      style={{
        left: pos.x * TILE_SIZE,
        top: pos.y * TILE_SIZE,
      }}
    >
      {/* Render the chosen sprite */}
      {sprite}
    </div>
  );
};

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
const RoadLane = ({ y }) => (
  <div className="road-lane" style={{ top: `${y * TILE_SIZE}px` }} />
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
  const [gameStartTime, setGameStartTime] = useState(null);

  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Create a stable map of player UID to their index (0-3)
  const playerIndexMap = useMemo(() => {
    const map = new Map();
    // Use the miniGamePlayers array order as the source of truth
    // This is stable as long as the server sends the same order
    miniGamePlayers.forEach((player, index) => {
      if (player.user?.firebaseUid) {
        map.set(player.user.firebaseUid, index % 4); // Use modulo 4 to be safe
      }
    });
    return map;
  }, [miniGamePlayers]);

  // Get the local player's index
  const localPlayerIndex = playerIndexMap.get(auth.currentUser?.uid) ?? 0;

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

  const roadLanes = useMemo(() => {
    const lanes = [];
    for (let i = 1; i < GRID_SIZE_V - 1; i++)
      lanes.push(<RoadLane key={`lane-${i}`} y={i} />);
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

  useEffect(() => {
    if (crossings > 0) {
      sendStackerPoints(miniGameId, { highScore: crossings });
    }
  }, [crossings, miniGameId]);

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
              className={`safe-zone start-zone ${
                crossingDirection === "down" ? "goal-zone" : ""
              }`}
            />
            <div
              className={`safe-zone end-zone ${
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