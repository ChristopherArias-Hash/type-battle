import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  connectWebSocket,
  disconnectWebSocket,
  sendReadyUp,
  subscribeToMiniGameLobby,
} from "../websocket";
import { auth } from "../firebase";

export function useGameSession(sessionId, userDisplayName) {
  const navigate = useNavigate();

  // Main game state
  const [timer, setTimer] = useState(
    () => JSON.parse(sessionStorage.getItem(`timer-${sessionId}`)) || 60
  );
  const [playerReady, setPlayerReady] = useState(
    () => JSON.parse(sessionStorage.getItem(`playerReady-${sessionId}`)) || false
  );
  const [paragraphText, setParagraphText] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStart, setGameStart] = useState(
    () => JSON.parse(sessionStorage.getItem(`gameStart-${sessionId}`)) || false
  );
  const [gameEnded, setGameEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(
    () => JSON.parse(sessionStorage.getItem(`isPaused-${sessionId}`)) || false
  );
  const [wpm, setWpm] = useState(0);
  const [winnerText, setWinnerText] = useState("");

  // Mini game state
  const [miniGameId, setMiniGameId] = useState(null);
  const [miniGame, setMiniGame] = useState(() => {
    const saved = sessionStorage.getItem(`miniGame-${sessionId}`);
    return saved ? JSON.parse(saved) : null;
  });
  const miniGameIdRef = useRef(miniGameId);
  const [miniGamePlayers, setMiniGamePlayers] = useState([]);
  const [miniGamePlayerPositions, setMiniGamePlayerPositions] = useState({});
  const [miniGameStartSignal, setMiniGameStartSignal] = useState(() => {
    const saved = sessionStorage.getItem(`miniGameStartSignal-${sessionId}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [miniGameTimer, setMiniGameTimer] = useState(
    () => JSON.parse(sessionStorage.getItem(`miniGameTimer-${sessionId}`)) || null
  );

  // Restore miniGameId from sessionStorage if we were in a mini-game
  useEffect(() => {
    const savedMiniGameId = sessionStorage.getItem(`miniGameId-${sessionId}`);
    if (savedMiniGameId && isPaused) {
      setMiniGameId(savedMiniGameId);
    }
  }, [sessionId, isPaused]);

  // Sets mini game in session storage
  useEffect(() => {
    miniGameIdRef.current = miniGameId;
    if (miniGameId) {
      sessionStorage.setItem(`miniGameId-${sessionId}`, miniGameId);
    }
  }, [miniGameId, sessionId]);

  // Session Storage for timers, game state, and mini game state
  useEffect(() => {
    sessionStorage.setItem(`timer-${sessionId}`, JSON.stringify(timer));
    sessionStorage.setItem(`isPaused-${sessionId}`, JSON.stringify(isPaused));
    sessionStorage.setItem(`gameStart-${sessionId}`, JSON.stringify(gameStart));
    sessionStorage.setItem(`playerReady-${sessionId}`, JSON.stringify(playerReady));
    sessionStorage.setItem(`miniGameTimer-${sessionId}`, JSON.stringify(miniGameTimer));
    sessionStorage.setItem(`miniGameStartSignal-${sessionId}`, JSON.stringify(miniGameStartSignal));
    sessionStorage.setItem(`miniGame-${sessionId}`, JSON.stringify(miniGame));
  }, [timer, isPaused, gameStart, playerReady, miniGameTimer, sessionId, miniGameStartSignal, miniGame]);

  /**
   * Handles all mini-game WebSocket messages and updates state accordingly
   * Processes: position updates, start signals, and player list updates
   */
  const handleMiniGameSubscription = useCallback((miniGameSessionId) => {
    subscribeToMiniGameLobby(miniGameSessionId, (miniGameData) => {
      // Handle Crossy Road position updates
      if (miniGameData.type === "crossy_road_position_update") {
        setMiniGamePlayerPositions((prev) => ({
          ...prev,
          [miniGameData.data.uid]: {
            x: miniGameData.data.x,
            y: miniGameData.data.y,
          },
        }));
        return;
      }

      // Handle mini-game start signal (when all players are ready)
      if (miniGameData && miniGameData.type === "mini_game_start") {
        console.log(`🏁 Received mini-game start signal for ${miniGameSessionId}!`);
        setMiniGameStartSignal(true);
      }

      // Handle player list updates
      if (Array.isArray(miniGameData)) {
        setMiniGamePlayers(miniGameData);
      } else if (miniGameData && miniGameData.players) {
        setMiniGamePlayers(miniGameData.players);
        if (miniGameData.remainingTime !== undefined) {
          setMiniGameTimer(miniGameData.remainingTime);
        }
      }
    });
  }, []);

  /**
   * Cleans up session storage for a completed mini-game
   */
  const cleanupMiniGameStorage = useCallback((completedMiniGameId) => {
    console.log(`🧹 Cleaning up session storage for completed mini-game: ${completedMiniGameId}`);
    sessionStorage.removeItem(`stackerGameState-${completedMiniGameId}`);
    sessionStorage.removeItem(`stackerHighScore-${completedMiniGameId}`);
    sessionStorage.removeItem(`miniGameTimer-${sessionId}`);
    sessionStorage.removeItem(`miniGame-${sessionId}`);
    sessionStorage.removeItem(`miniGameId-${sessionId}`);
  }, [sessionId]);

  /**
   * Handles the main game pause event when a mini-game starts
   */
  const handleGamePause = useCallback((data) => {
    console.log("Game paused for mini-game:", data);
    const newMiniGameId = data.miniGameSessionId;
    const newMiniGameTimer = data.duration;
    const newMiniGame = data.miniGameId;
    
    setMiniGameId(newMiniGameId);
    setIsPaused(true);
    setMiniGameTimer(newMiniGameTimer);
    setMiniGame(newMiniGame);

    if (newMiniGameId) {
      handleMiniGameSubscription(newMiniGameId);
    }
  }, [handleMiniGameSubscription]);

  /**
   * Handles the main game resume event when a mini-game ends
   */
  const handleGameResume = useCallback(() => {
    const completedMiniGameId = miniGameIdRef.current;
    
    setIsPaused(false);
    setMiniGamePlayers([]);
    setMiniGameId(null);
    setMiniGameStartSignal(false);

    if (completedMiniGameId) {
      cleanupMiniGameStorage(completedMiniGameId);
    }
  }, [cleanupMiniGameStorage]);

  /**
   * Handles the game end event and cleanup
   */
  const handleGameEnd = useCallback((data) => {
    setGameEnded(true);
    setGameStart(false);
    setWinnerText(data.win_message);
    
    const currentUserWpm = data.wpm_data?.find(
      (entry) => entry.displayName === userDisplayName
    );
    if (currentUserWpm) setWpm(currentUserWpm.wpm);
    
    // Clean up all session storage
    sessionStorage.removeItem(`timer-${sessionId}`);
    sessionStorage.removeItem(`isPaused-${sessionId}`);
    sessionStorage.removeItem(`gameStart-${sessionId}`);
    sessionStorage.removeItem(`playerReady-${sessionId}`);
    sessionStorage.removeItem(`miniGameId-${sessionId}`);
    sessionStorage.removeItem(`miniGameTimer-${sessionId}`);
    
    setTimeout(() => navigate("/"), 10000);
  }, [userDisplayName, sessionId, navigate]);

  /**
   * Routes incoming WebSocket game data to appropriate handlers
   */
  const handleGameDataReceived = useCallback((data) => {
    switch (data.type) {
      case "game_start":
        setGameStart(true);
        break;
      case "game_pause":
        handleGamePause(data);
        break;
      case "game_resume":
        handleGameResume();
        break;
      case "timer_update":
        setTimer(data.remainingTime);
        break;
      case "game_end":
        handleGameEnd(data);
        break;
      default:
        if (data.text) {
          setParagraphText(data.text);
        }
    }
  }, [handleGamePause, handleGameResume, handleGameEnd]);

  /**
   * Re-subscribes to an active mini-game session after WebSocket reconnection
   * This is called when the WebSocket reconnects and detects the player was
   * in a mini-game (e.g., after a page refresh during a mini-game)
   */
  const restoreMiniGameSession = useCallback(() => {
    const restoredMiniGameId = sessionStorage.getItem(`miniGameId-${sessionId}`);
    const isRestoredPaused = JSON.parse(sessionStorage.getItem(`isPaused-${sessionId}`));

    if (isRestoredPaused && restoredMiniGameId) {
      console.log(`[Re-Subscribing] Found existing mini-game ${restoredMiniGameId} on reconnect.`);
      handleMiniGameSubscription(restoredMiniGameId);
    }
  }, [sessionId, handleMiniGameSubscription]);

  /**
   * Ready up function for the main game
   */
  const readyUp = useCallback(() => {
    setPlayerReady(true);
    sendReadyUp(sessionId);
  }, [sessionId]);

  /**
   * Validates the game session and establishes WebSocket connection
   */
  useEffect(() => {
    const validateAndConnect = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Validate session exists and is joinable
      const response = await fetch(
        `http://localhost:8080/protected/game-session?lobbyCode=${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("Session not found or unauthorized.");
        navigate("/");
        return;
      }

      const session = await response.json();
      if (session.status === "finished") {
        alert("Cannot join a finished session.");
        navigate("/");
        return;
      }

      // Establish WebSocket connection
      connectWebSocket(
        sessionId,
        token,
        setPlayers,
        handleGameDataReceived,
        restoreMiniGameSession
      );
    };

    validateAndConnect();

    return () => {
      disconnectWebSocket();
    };
  }, [sessionId, navigate, handleGameDataReceived, restoreMiniGameSession]);

  /**
   * Validates lobby capacity and kicks player if full
   */
  useEffect(() => {
    if (players.length > 0) {
      const currentUserId = auth.currentUser?.uid;
      const isInLobby = players.some((p) => p.user?.firebaseUid === currentUserId);
      
      if (!isInLobby && players.length >= 4) {
        alert("Cannot join: lobby is full.");
        navigate("/");
      }
    }
  }, [players, navigate]);

  /**
   * Cleans up session storage on component unmount (except during refresh)
   */
  useEffect(() => {
    return () => {
      const isRefreshing = sessionStorage.getItem("isRefreshing");
      if (!isRefreshing) {
        sessionStorage.removeItem(`timer-${sessionId}`);
        sessionStorage.removeItem(`isPaused-${sessionId}`);
        sessionStorage.removeItem(`gameStart-${sessionId}`);
        sessionStorage.removeItem(`playerReady-${sessionId}`);
        sessionStorage.removeItem(`miniGameId-${sessionId}`);
        sessionStorage.removeItem(`miniGameTimer-${sessionId}`);
        sessionStorage.removeItem(`miniGame-${sessionId}`);
      }
    };
  }, [sessionId]);

  return {
    // Main game state
    timer,
    playerReady,
    paragraphText,
    players,
    gameStart,
    gameEnded,
    isPaused,
    wpm,
    winnerText,
    // Mini game state
    miniGameId,
    miniGame,
    miniGamePlayers,
    miniGamePlayerPositions,
    miniGameStartSignal,
    miniGameTimer,
    // Functions
    readyUp,
  };
}