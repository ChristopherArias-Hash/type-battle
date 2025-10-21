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

  // Core state
  const [players, setPlayers] = useState([]);
  const [isSendingReady, setIsSendingReady] = useState(false);

  const [timer, setTimer] = useState(
    () => JSON.parse(sessionStorage.getItem(`timer-${sessionId}`)) || 60
  );
  const [paragraphText, setParagraphText] = useState(null);
  const [gameStart, setGameStart] = useState(
    () => JSON.parse(sessionStorage.getItem(`gameStart-${sessionId}`)) || false
  );
  const [gameEnded, setGameEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(
    () => JSON.parse(sessionStorage.getItem(`isPaused-${sessionId}`)) || false
  );
  const [wpm, setWpm] = useState(0);
  const [winnerText, setWinnerText] = useState("");

  // FIX: Initialize miniGameId from sessionStorage
  const [miniGameId, setMiniGameId] = useState(() => {
    const savedId = sessionStorage.getItem(`miniGameId-${sessionId}`);
    // Ensure we don't return the string "null", just the value or actual null
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

  // FIX: Don't initialize from session storage - let server be the source of truth
  const [miniGameTimer, setMiniGameTimer] = useState(null);
  const miniGameSubRef = useRef(null);

  const currentUser = auth.currentUser;
  const currentPlayerFromServer = players.find(
    (p) => p.user?.firebaseUid === currentUser?.uid
  );
  const playerReady = currentPlayerFromServer?.ready || false;

  useEffect(() => {
    if (playerReady) setIsSendingReady(false);
  }, [playerReady]);

  const readyUp = useCallback(() => {
    setIsSendingReady(true);
    sendReadyUp(sessionId);
  }, [sessionId]);

  // Persist session state (but NOT miniGameTimer - that's server-driven)
  useEffect(() => {
    sessionStorage.setItem(`timer-${sessionId}`, JSON.stringify(timer));
    sessionStorage.setItem(`isPaused-${sessionId}`, JSON.stringify(isPaused));
    sessionStorage.setItem(`gameStart-${sessionId}`, JSON.stringify(gameStart));

    // FIX: Only store miniGameId if it's not null
    if (miniGameId !== null) {
      sessionStorage.setItem(`miniGameId-${sessionId}`, miniGameId.toString());
    } else {
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
    }

    sessionStorage.setItem(
      `miniGameStartSignal-${sessionId}`,
      JSON.stringify(miniGameStartSignal)
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
  ]);

  // Keep ref synced
  useEffect(() => {
    miniGameIdRef.current = miniGameId || null;
  }, [miniGameId]);

  const cleanupMiniGameStorage = useCallback(
    (completedMiniGameId) => {
      console.log(
        `🧹 Cleaning up session storage for completed mini-game: ${completedMiniGameId}`
      );
      sessionStorage.removeItem(`stackerGameState-${completedMiniGameId}`);
      sessionStorage.removeItem(`stackerHighScore-${completedMiniGameId}`);
      // REMOVED: miniGameTimer cleanup - it's not stored anymore
      sessionStorage.removeItem(`miniGame-${sessionId}`);
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
      sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      if (completedMiniGameId) {
        sessionStorage.removeItem(`miniGameDead-${completedMiniGameId}`);
        sessionStorage.removeItem(`miniGameGhostPos-${completedMiniGameId}`);
      }
    },
    [sessionId]
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
        console.log(`🏁 Received mini-game start signal for ${miniGameSessionId}!`);
        setMiniGameStartSignal(miniGameData);
        return;
      }
      if (Array.isArray(miniGameData)) {
        setMiniGamePlayers(miniGameData);
      } else if (miniGameData && miniGameData.players) {
        setMiniGamePlayers(miniGameData.players);
        // FIX: This is the ONLY place miniGameTimer should be updated
        if (miniGameData.remainingTime !== undefined) {
          setMiniGameTimer(miniGameData.remainingTime);
        }
      }
    });
    miniGameSubRef.current = sub;
  }, []);

  const handleGamePause = useCallback(
    (data) => {
      console.log("Game paused for mini-game:", data);
      const newMiniGameId = data.miniGameSessionId;
      const newMiniGame = data.miniGameId;
      setMiniGameId(newMiniGameId);
      setIsPaused(true);
      // FIX: Don't set timer from pause message - let server updates handle it
      setMiniGame(newMiniGame);
      setLastMiniGameMessage(null);
      if (newMiniGameId) {
        handleMiniGameSubscription(newMiniGameId);
      }
    },
    [handleMiniGameSubscription]
  );

  const handleGameResume = useCallback(() => {
    const completedMiniGameId = miniGameIdRef.current;
    if (miniGameSubRef.current) {
      try {
        miniGameSubRef.current.unsubscribe();
      } catch (_) {}
      miniGameSubRef.current = null;
    }
    setIsPaused(false);
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
      setWinnerText(data.win_message);
      const currentUserWpm = data.wpm_data?.find(
        (entry) => entry.displayName === userDisplayName
      );
      if (currentUserWpm) setWpm(currentUserWpm.wpm);
      if (miniGameSubRef.current) {
        try {
          miniGameSubRef.current.unsubscribe();
        } catch (_) {}
        miniGameSubRef.current = null;
      }
      sessionStorage.removeItem(`timer-${sessionId}`);
      sessionStorage.removeItem(`isPaused-${sessionId}`);
      sessionStorage.removeItem(`gameStart-${sessionId}`);
      sessionStorage.removeItem(`playerReady-${sessionId}`);
      sessionStorage.removeItem(`miniGameId-${sessionId}`);
      // REMOVED: miniGameTimer cleanup - it's not stored anymore
      sessionStorage.removeItem(`miniGame-${sessionId}`);
      sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      const completedMiniGameId = miniGameIdRef.current;
      if (completedMiniGameId) {
        sessionStorage.removeItem(`miniGameDead-${completedMiniGameId}`);
        sessionStorage.removeItem(`miniGameGhostPos-${completedMiniGameId}`);
      }
      setTimeout(() => navigate("/"), 10000);
    },
    [userDisplayName, sessionId, navigate]
  );

  const handleGameDataReceived = useCallback(
    (data) => {
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
        case "game_tick":
          setTimer(data.remainingTime);
          if (data.isPaused === false && isPaused) {
            console.warn(
              "State mismatch detected: Forcing game resume to sync with server."
            );
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
    [handleGamePause, handleGameResume, handleGameEnd, isPaused]
  );

  const restoreMiniGameSession = useCallback(() => {
    // NOW, because miniGameId is initialized from storage, this value should be correct
    const restoredMiniGameId = miniGameIdRef.current;
    const isRestoredPaused = JSON.parse(
      sessionStorage.getItem(`isPaused-${sessionId}`)
    );

    // FIX: Use the ref 'miniGameIdRef.current' which is synced from the state
    // The state itself was initialized from session storage.
    if (isRestoredPaused && restoredMiniGameId && restoredMiniGameId !== "null") {
      console.log(
        `[Re-Subscribing] Found existing mini-game ${restoredMiniGameId} on reconnect.`
      );
      if (miniGameSubRef.current) {
        try {
          miniGameSubRef.current.unsubscribe();
        } catch (_) {}
        miniGameSubRef.current = null;
      }
      // Re-subscribe and let server updates set the timer
      handleMiniGameSubscription(restoredMiniGameId);
    } else {
      console.log(
        `[Re-Subscribing] Skipping - (Paused: ${isRestoredPaused}, ID: ${restoredMiniGameId})`
      );
    }
  }, [sessionId, handleMiniGameSubscription]); // Removed miniGameId from deps, use ref

  useEffect(() => {
    const validateAndConnect = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
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
        (p) => p.user?.firebaseUid === currentUserId
      );
      if (!isInLobby && players.length >= 4) {
        alert("Cannot join: lobby is full.");
        navigate("/");
      }
    }
  }, [players, navigate]);

  useEffect(() => {
    return () => {
      const isRefreshing = sessionStorage.getItem("isRefreshing");
      if (!isRefreshing) {
        sessionStorage.removeItem(`timer-${sessionId}`);
        sessionStorage.removeItem(`isPaused-${sessionId}`);
        sessionStorage.removeItem(`gameStart-${sessionId}`);
        sessionStorage.removeItem(`playerReady-${sessionId}`);
        sessionStorage.removeItem(`miniGameId-${sessionId}`);
        // REMOVED: miniGameTimer cleanup - it's not stored anymore
        sessionStorage.removeItem(`miniGame-${sessionId}`);
        sessionStorage.removeItem(`miniGameStartSignal-${sessionId}`);
      }
    };
  }, [sessionId]);

  return {
    timer,
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
    readyUp,
  };
}