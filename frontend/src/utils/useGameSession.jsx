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

  // Core states
  const [players, setPlayers] = useState([]);
  const [isSendingReady, setIsSendingReady] = useState(false);

  const [timer, setTimer] = useState(
    () => JSON.parse(sessionStorage.getItem(`timer-${sessionId}`)) || 60,
  );
  
  // NEW: Transition Timer State
  const [transitionTime, setTransitionTime] = useState(
    () => JSON.parse(sessionStorage.getItem(`transitionTime-${sessionId}`)) || null,
  );

  const [paragraphText, setParagraphText] = useState(null);
  const [gameStart, setGameStart] = useState(
    () => JSON.parse(sessionStorage.getItem(`gameStart-${sessionId}`)) || false,
  );
  const [gameEnded, setGameEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(
    () => JSON.parse(sessionStorage.getItem(`isPaused-${sessionId}`)) || false,
  );
  const [wpm, setWpm] = useState(0);
  const [winnerText, setWinnerText] = useState("");
  const [winnerInfo, setWinnerInfo] = useState(null);

  const [miniGameId, setMiniGameId] = useState(() => {
    const savedId = sessionStorage.getItem(`miniGameId-${sessionId}`);
    return savedId && savedId !== "null" ? savedId : null;
  });

  const [miniGame, setMiniGame] = useState(() => {
    const saved = sessionStorage.getItem(`miniGame-${sessionId}`);
    return saved ? JSON.parse(saved) : null;
  });
  const miniGameIdRef = useRef(miniGameId);
  const [miniGamePlayers, setMiniGamePlayers] = useState([]);
  const [lastMiniGameMessage, setLastMiniGameMessage] = useState(null);
  const [miniGameStartSignal, setMiniGameStartSignal] = useState(() => {
    const saved = sessionStorage.getItem(`miniGameStartSignal-${sessionId}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [miniGameTimer, setMiniGameTimer] = useState(null);
  const miniGameSubRef = useRef(null);

  const currentUser = auth.currentUser;
  const currentPlayerFromServer = players.find(
    (p) => (p.firebaseUid || p.user?.firebaseUid) === currentUser?.uid,
  );
  const playerReady = currentPlayerFromServer?.ready || false;

  useEffect(() => {
    if (playerReady) setIsSendingReady(false);
  }, [playerReady]);

  const readyUp = useCallback(() => {
    setIsSendingReady(true);
    sendReadyUp(sessionId);
  }, [sessionId]);

  // Persist session state
  useEffect(() => {
    sessionStorage.setItem(`timer-${sessionId}`, JSON.stringify(timer));
    sessionStorage.setItem(`isPaused-${sessionId}`, JSON.stringify(isPaused));
    sessionStorage.setItem(`gameStart-${sessionId}`, JSON.stringify(gameStart));
    
    // NEW: Persist transition time
    sessionStorage.setItem(`transitionTime-${sessionId}`, JSON.stringify(transitionTime));

    if (miniGameId !== null) {
      sessionStorage.setItem(`miniGameId-${sessionId}`, miniGameId.toString());
    } else {
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
    }

    sessionStorage.setItem(
      `miniGameStartSignal-${sessionId}`,
      JSON.stringify(miniGameStartSignal),
    );
    sessionStorage.setItem(`miniGame-${sessionId}`, JSON.stringify(miniGame));
  }, [
    timer,
    isPaused,
    gameStart,
    miniGameId,
    sessionId,
    miniGameStartSignal,
    miniGame,
    transitionTime, // Added to deps
  ]);

  // Keep ref synced
  useEffect(() => {
    miniGameIdRef.current = miniGameId || null;
  }, [miniGameId]);

  const cleanupMiniGameStorage = useCallback(
    (completedMiniGameId) => {
      sessionStorage.removeItem(`stackerGameState-${completedMiniGameId}`);
      sessionStorage.removeItem(`stackerHighScore-${completedMiniGameId}`);
      sessionStorage.removeItem(`miniGame-${sessionId}`);
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
      sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      if (completedMiniGameId) {
        sessionStorage.removeItem(`miniGameDead-${completedMiniGameId}`);
        sessionStorage.removeItem(`miniGameGhostPos-${completedMiniGameId}`);
      }
    },
    [sessionId],
  );

  const handleMiniGameSubscription = useCallback((miniGameSessionId) => {
    if (miniGameSubRef.current) {
      try {
        miniGameSubRef.current.unsubscribe();
      } catch (_) {}
      miniGameSubRef.current = null;
    }
    setLastMiniGameMessage(null);
    const sub = subscribeToMiniGameLobby(miniGameSessionId, (miniGameData) => {
      setLastMiniGameMessage(miniGameData);
      if (miniGameData && miniGameData.type === "mini_game_start") {
        setMiniGameStartSignal(miniGameData);
        return;
      }
      if (Array.isArray(miniGameData)) {
        setMiniGamePlayers(miniGameData);
      } else if (miniGameData && miniGameData.players) {
        setMiniGamePlayers(miniGameData.players);
        if (miniGameData.remainingTime !== undefined) {
          setMiniGameTimer(miniGameData.remainingTime);
        }
      }
    });
    miniGameSubRef.current = sub;
  }, []);

  const handleGamePause = useCallback(
    (data) => {
      const newMiniGameId = data.miniGameSessionId;
      const newMiniGame = data.miniGameId;
      setMiniGameId(newMiniGameId);
      setIsPaused(true);
      setMiniGameTimer(data.duration);
      setMiniGame(newMiniGame);
      setLastMiniGameMessage(null);
      if (newMiniGameId) {
        handleMiniGameSubscription(newMiniGameId);
      }
    },
    [handleMiniGameSubscription],
  );

  // NEW: Handle the transition ticks
  const handleTransitionTime = useCallback((data) => {
    setTransitionTime(data.remainingTime);
  }, []);

  const handleGameResume = useCallback(() => {
    const completedMiniGameId = miniGameIdRef.current;
    if (miniGameSubRef.current) {
      try {
        miniGameSubRef.current.unsubscribe();
      } catch (_) {}
      miniGameSubRef.current = null;
    }
    setIsPaused(false);
    setTransitionTime(null); // Reset transition timer when game officially resumes
    setMiniGamePlayers([]);
    setMiniGameId(null);
    setMiniGameStartSignal(null);
    setLastMiniGameMessage(null);
    setMiniGameTimer(null);
    
    if (completedMiniGameId) {
      cleanupMiniGameStorage(completedMiniGameId);
    }
  }, [cleanupMiniGameStorage]);

  const handleGameEnd = useCallback(
    (data) => {
      setGameEnded(true);
      setGameStart(false);
      setWinnerText(data.win_message || "");

      if (
        data["text-prefix"] &&
        data.name &&
        data["text-middle"] &&
        data.score !== undefined
      ) {
        setWinnerInfo({
          prefix: data["text-prefix"],
          name: data.name,
          middle: data["text-middle"],
          score: data.score,
        });
      } else {
        setWinnerInfo(null);
      }
      const currentUserWpm = data.wpm_data?.find(
        (entry) => entry.displayName === userDisplayName,
      );
      if (currentUserWpm) setWpm(currentUserWpm.wpm);
      if (miniGameSubRef.current) {
        try {
          miniGameSubRef.current.unsubscribe();
        } catch (_) {}
        miniGameSubRef.current = null;
      }
      
      // Cleanup all storage
      sessionStorage.removeItem(`timer-${sessionId}`);
      sessionStorage.removeItem(`transitionTime-${sessionId}`);
      sessionStorage.removeItem(`isPaused-${sessionId}`);
      sessionStorage.removeItem(`gameStart-${sessionId}`);
      sessionStorage.removeItem(`playerReady-${sessionId}`);
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
      sessionStorage.removeItem(`miniGame-${sessionId}`);
      sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      const completedMiniGameId = miniGameIdRef.current;
      if (completedMiniGameId) {
        sessionStorage.removeItem(`miniGameDead-${completedMiniGameId}`);
        sessionStorage.removeItem(`miniGameGhostPos-${completedMiniGameId}`);
      }
    },
    [userDisplayName, sessionId],
  );

  const handleGameDataReceived = useCallback(
    (data) => {
      switch (data.type) {
        case "game_start":
          setGameStart(true);
          break;
        case "transition_tick":
          handleTransitionTime(data); // Will update transitionTime state
          break;
        case "game_pause":
          handleGamePause(data);
          break;
        case "game_resume":
          handleGameResume();
          break;
        case "game_tick":
          setTimer(data.remainingTime);
          if (data.isPaused === false && isPaused) {
            handleGameResume();
          }
          break;
        case "game_end":
          handleGameEnd(data);
          break;
        default:
          if (data.text) {
            setParagraphText(data.text);
          }
      }
    },
    [handleGamePause, handleTransitionTime, handleGameResume, handleGameEnd, isPaused],
  );

  const restoreMiniGameSession = useCallback(() => {
    const restoredMiniGameId = miniGameIdRef.current;
    const isRestoredPaused = JSON.parse(
      sessionStorage.getItem(`isPaused-${sessionId}`),
    );

    if (
      isRestoredPaused &&
      restoredMiniGameId &&
      restoredMiniGameId !== "null"
    ) {
      if (miniGameSubRef.current) {
        try {
          miniGameSubRef.current.unsubscribe();
        } catch (_) {}
        miniGameSubRef.current = null;
      }
      handleMiniGameSubscription(restoredMiniGameId);
    }
  }, [sessionId, handleMiniGameSubscription]);

  useEffect(() => {
    const validateAndConnect = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/protected/game-session?lobbyCode=${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        navigate("/");
        return;
      }
      const session = await response.json();
      if (session.status === "finished") {
        alert("Cannot join a finished session.");
        navigate("/");
        return;
      }
      connectWebSocket(
        sessionId,
        token,
        setPlayers,
        handleGameDataReceived,
        restoreMiniGameSession,
      );
    };
    validateAndConnect();
    return () => {
      if (miniGameSubRef.current) {
        try {
          miniGameSubRef.current.unsubscribe();
        } catch (_) {}
        miniGameSubRef.current = null;
      }
      disconnectWebSocket();
    };
  }, [sessionId, navigate, handleGameDataReceived, restoreMiniGameSession]);

  useEffect(() => {
    if (players.length > 0) {
      const currentUserId = auth.currentUser?.uid;
      const isInLobby = players.some(
        (p) => (p.firebaseUid || p.user?.firebaseUid) === currentUserId,
      );
    
      if (!isInLobby && players.length >= 4) {
        navigate("/");
        alert("Cannot join: lobby is full.");
      }
    }
  }, [players, navigate]);

  useEffect(() => {
    return () => {
      const isRefreshing = sessionStorage.getItem("isRefreshing");
      if (!isRefreshing) {
        sessionStorage.removeItem(`timer-${sessionId}`);
        sessionStorage.removeItem(`transitionTime-${sessionId}`);
        sessionStorage.removeItem(`isPaused-${sessionId}`);
        sessionStorage.removeItem(`gameStart-${sessionId}`);
        sessionStorage.removeItem(`playerReady-${sessionId}`);
        sessionStorage.removeItem(`miniGameId-${sessionId}`);
        sessionStorage.removeItem(`miniGame-${sessionId}`);
        sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      }
    };
  }, [sessionId]);

  return {
    timer,
    transitionTime, // NEW: Now exported for your GamePlay.jsx to use!
    playerReady,
    isSendingReady,
    paragraphText,
    players,
    gameStart,
    gameEnded,
    isPaused,
    wpm,
    winnerText,
    miniGameId,
    miniGame,
    miniGamePlayers,
    lastMiniGameMessage,
    miniGameStartSignal,
    miniGameTimer,
    winnerInfo,
    readyUp,
  };
}