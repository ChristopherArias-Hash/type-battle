import "./GamePlay.css";
import MiniGameScreen from "../components/mini-game-screen/MiniGameScreen";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/typing-sentences/TypingSentences";
import useUserLeavingWarning from "../utils/useUserLeavingWarning";
import { useAuth } from "../utils/authContext";
import { useEffect, useState, useRef } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import {
  connectWebSocket,
  disconnectWebSocket,
  sendReadyUp,
  subscribeToMiniGameLobby,
} from "../websocket";

import { auth } from "../firebase";

function GamePlay() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();
  const [miniGameId, setMiniGameId] = useState(null);
  const miniGameIdRef = useRef(miniGameId); 
  const [miniGamePlayers, setMiniGamePlayers] = useState([]);
  const [enableWarning, disableWarning] = useUserLeavingWarning();
  const { isUserLoggedIn, userInfo, logOutFirebase, loading } = useAuth();
  const [timer, setTimer] = useState(() => JSON.parse(sessionStorage.getItem(`timer-${sessionId}`)) || 60);
  const [playerReady, setPlayerReady] = useState(() => JSON.parse(sessionStorage.getItem(`playerReady-${sessionId}`)) || false);
  const [paragraphText, setParagraphText] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStart, setGameStart] = useState(() => JSON.parse(sessionStorage.getItem(`gameStart-${sessionId}`)) || false);
  const [gameEnded, setGameEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(() => JSON.parse(sessionStorage.getItem(`isPaused-${sessionId}`)) || false);
  const [wpm, setWpm] = useState(0);
  const [winnerText, setWinnerText] = useState("");

  const disableLogout = true;
    
  const sleep = (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    };
  // Restore miniGameId from sessionStorage if we were in a mini-game
  useEffect(() => {
    const savedMiniGameId = sessionStorage.getItem(`miniGameId-${sessionId}`);
    if (savedMiniGameId && isPaused) {
      setMiniGameId(savedMiniGameId);
      // Don't subscribe here - wait for WebSocket connection
    }
  }, [sessionId, isPaused]);

  useEffect(() => {
    miniGameIdRef.current = miniGameId;
    // Save miniGameId to sessionStorage
    if (miniGameId) {
      sessionStorage.setItem(`miniGameId-${sessionId}`, miniGameId);
    }
  }, [miniGameId, sessionId]);
  
  const ready_up = async () => {
    setPlayerReady(true);
    sendReadyUp(sessionId);
  };

  useEffect(() => {
    if (players.length > 0 && players[0].gameSessions.status === "in_progress") {
      setGameStart(true);
    }
  }, [players]);

  useEffect(() => {
    if (players.length > 0) {
      const currentUserId = auth.currentUser?.uid;
      const isInLobby = players.some(p => p.user?.firebaseUid === currentUserId);
      if (!isInLobby && players.length >= 4) {
        disableWarning();
        alert("Cannot join: lobby is full.");
        navigate("/");
      }
    }
  }, [players, navigate]);

  useEffect(() => {
    sessionStorage.setItem(`timer-${sessionId}`, JSON.stringify(timer));
    sessionStorage.setItem(`isPaused-${sessionId}`, JSON.stringify(isPaused));
    sessionStorage.setItem(`gameStart-${sessionId}`, JSON.stringify(gameStart));
    sessionStorage.setItem(`playerReady-${sessionId}`, JSON.stringify(playerReady));
  }, [timer, isPaused, gameStart, playerReady, sessionId]);

  useEffect(() => {
    enableWarning();
    const connect = async () => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        const response = await fetch(`http://localhost:8080/protected/game-session?lobbyCode=${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
          (playerList) => setPlayers(playerList),
          (data) => {
            if (data.type === "game_pause") {
              const newMiniGameId = data.miniGameSessionId;
              setMiniGameId(newMiniGameId);
              setIsPaused(true);
              if (newMiniGameId) {
                subscribeToMiniGameLobby(newMiniGameId, (updatedMiniGamePlayers) => {
                  setMiniGamePlayers(updatedMiniGamePlayers);
                });
              }
            } else if (data.type === "game_resume") {
              // Only clean up sessionStorage after we've successfully resumed
              const completedMiniGameId = miniGameIdRef.current;
              
              setIsPaused(false);
              setMiniGamePlayers([]);
              setMiniGameId(null);
              
              // Clean up sessionStorage for the completed mini-game
              if (completedMiniGameId) {
                console.log(`🧹 Cleaning up session storage for completed mini-game: ${completedMiniGameId}`);
                sessionStorage.removeItem(`stackerGameState-${completedMiniGameId}`);
              }
              // Clean up the miniGameId from main game sessionStorage
              sessionStorage.removeItem(`miniGameId-${sessionId}`);
              
            } else if (data.type === "timer_update") {
              setTimer(data.remainingTime);
            } else if (data.type === "game_end") {
              setGameEnded(true);
              disableWarning();
              setGameStart(false);
              setWinnerText(data.win_message);
              const currentUserWpm = data.wpm_data?.find(entry => entry.displayName === userInfo.getDisplayName);
              if (currentUserWpm) setWpm(currentUserWpm.wpm);
              
              // Clean up ALL sessionStorage when game ends
              sessionStorage.removeItem(`timer-${sessionId}`);
              sessionStorage.removeItem(`isPaused-${sessionId}`);
              sessionStorage.removeItem(`gameStart-${sessionId}`);
              sessionStorage.removeItem(`playerReady-${sessionId}`);
              sessionStorage.removeItem(`miniGameId-${sessionId}`);
              
              setTimeout(() => navigate("/"), 10000);
            } else if (data.text) {
              setParagraphText(data.text);
            }
          }
        );
      }
    };
    connect();
    return () => {
      disconnectWebSocket();
      disableWarning();
    };
  }, [sessionId, navigate, userInfo.getDisplayName]);

  // Clean up sessionStorage when component unmounts (but not when refreshing)
  useEffect(() => {
    return () => {
      // Only clean up if we're actually leaving (not refreshing)
      const isRefreshing = sessionStorage.getItem('isRefreshing');
      if (!isRefreshing) {
        sessionStorage.removeItem(`timer-${sessionId}`);
        sessionStorage.removeItem(`isPaused-${sessionId}`);
        sessionStorage.removeItem(`gameStart-${sessionId}`);
        sessionStorage.removeItem(`playerReady-${sessionId}`);
        sessionStorage.removeItem(`miniGameId-${sessionId}`);
      }
    };
  }, [sessionId]);

  // Track refresh vs actual navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('isRefreshing', 'true');
    };
    
    const handleLoad = () => {
      sessionStorage.removeItem('isRefreshing');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  if (loading || paragraphText === null) return <div>Loading...</div>;
  if (!isUserLoggedIn) return <Navigate to="/" replace />;

  if (gameEnded) {
    return (
      <>
        <NavBar userInfo={userInfo} isUserLoggedIn={isUserLoggedIn} logOut={logOutFirebase} />
        <div className="game-ended-container">
          <h2 className="game-over">Game Over!</h2>
          <h3 className="final-scores">Final Scores</h3>
          <ul className="win-list">
            {players.map((p, index) => (
              <li key={index}>
                {p.user?.displayName || p.user?.firebaseUid} - Score: {p.score}
              </li>
            ))}
          </ul>
          <p className="user-wpm">Your wpm {wpm}</p>
          <p className="winner-text">{winnerText}</p>
          <p className="return-screen">Returning to main menu in 10 seconds...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar disableLogout={disableLogout} userInfo={userInfo} isUserLoggedIn={isUserLoggedIn} logOut={logOutFirebase} />
      <div className="lobby-container">
        <h2 className="lobby-info">
          Lobby {players.length}/4 (Game Session #
          <b className="session-id-text" onClick={() => navigator.clipboard.writeText(sessionId)}>
            {sessionId}
          </b>)
        </h2>
        <ul>
          {players.map((p, index) => (
            <li key={index}>
              {p.user?.displayName || p.user?.firebaseUid} – Score: {p.score}
              {!gameStart && <> | Is ready: {p.ready ? "🟢" : "🔴"} </>}
            </li>
          ))}
        </ul>
        {!playerReady && (
          <button className="ready-up-button" onClick={ready_up} disabled={playerReady}>
            {playerReady ? "Ready!" : "Ready Up"}
          </button>
        )}
      </div>
      {gameStart ? (
        <TypingSentences sessionId={sessionId} paragraphText={paragraphText} timer={timer} isPaused={isPaused} />
      ) : (
        <h2 className="please-ready-text">Please ready up to start the game</h2>
      )}
      {isPaused && <MiniGameScreen miniGamePlayers={miniGamePlayers} miniGameId={miniGameId} />}
    </>
  );
}

export default GamePlay;