import "./CrossyRoad.css";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import MiniGameReadyUp from "../../mini-game-ready-up/MiniGameReadyUp";
import CrossyRoadTutorial from "../../mini-game-tutorials/crossy-road-tutorial/CrossyRoadTutorial.jsx";
import { sendCrossyRoadPosition, sendStackerPoints } from "../../../websocket";
import { auth } from "../../../firebase";

const GRID_SIZE_V = 22;
const GRID_SIZE_H = 14;
const TILE_SIZE = 40; // px

const BOARD_W = GRID_SIZE_H * TILE_SIZE;
const BOARD_H = GRID_SIZE_V * TILE_SIZE;

// --- React Components ---

const Player = ({ pos }) => (
  <div
    className="player-container"
    key={`${pos.x}-${pos.y}`} // Re-triggers animation
    style={{
      left: pos.x * TILE_SIZE,
      top: pos.y * TILE_SIZE,
    }}
  >
    <svg viewBox="0 0 100 100" className="player-svg">
      <g>
        <ellipse
          cx="50"
          cy="50"
          rx="30"
          ry="40"
          fill="#f1c40f"
          stroke="#e67e22"
          strokeWidth="4"
        />
        <path d="M 35 30 C 20 40, 20 60, 35 70" fill="#e67e22" />
        <path d="M 65 30 C 80 40, 80 60, 65 70" fill="#e67e22" />
        <circle
          cx="50"
          cy="15"
          r="15"
          fill="#f1c40f"
          stroke="#e67e22"
          strokeWidth="3"
        />
        <circle cx="43" cy="15" r="3" fill="#2c3e50" />
        <circle cx="57" cy="15" r="3" fill="#2c3e50" />
        <path
          d="M 45 0 C 42 -5, 50 -8, 50 0 C 50 -8, 58 -5, 55 0 Z"
          fill="#e74c3c"
        />
      </g>
    </svg>
  </div>
);

const Obstacle = ({ obstacle }) => {
  return (
    <div
      className={`obstacle ${obstacle.style}`}
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
        </div>
      ) : (
        <div className="vehicle-body">
          <div className="car-top">
            <div className="windshield"></div>
          </div>
          <div className="headlight headlight-left"></div>
          <div className="headlight headlight-right"></div>
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

  const [otherPlayerPositions, setOtherPlayerPositions] = useState({});
  const [gameStartTime, setGameStartTime] = useState(null);

  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

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
        const initialY =
          crossingDirection === "up" ? GRID_SIZE_V - 1 : 0;
        setPlayerPos({ x: initialX, y: initialY });
      } else {
        setPlayerPos({ x: Math.floor(GRID_SIZE_H / 2), y: GRID_SIZE_V - 1 });
      }

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
      setOtherPlayerPositions((prev) => ({
        ...prev,
        [data.uid]: { x: data.x, y: data.y },
      }));
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
            break;
          case "ArrowDown":
          case "s":
            np.y = Math.min(GRID_SIZE_V - 1, prev.y + 1);
            break;
          case "ArrowLeft":
          case "a":
            np.x = Math.max(0, prev.x - 1);
            break;
          case "ArrowRight":
          case "d":
            np.x = Math.min(GRID_SIZE_H - 1, prev.x + 1);
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
      setCrossingDirection((d) => (d === "up" ? "down" : "up"));
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
      <div className="game-wrapper" ref={stageRef}>
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
            className="game-board"
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
            {playerPos && <Player pos={playerPos} />}
            {Object.entries(otherPlayerPositions).map(([uid, pos]) => (
              <Player key={uid} pos={pos} />
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