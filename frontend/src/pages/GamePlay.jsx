import "./GamePlay.css";
import MiniGameScreen from "../components/mini-game-screen/MiniGameScreen";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/typing-sentences/TypingSentences";
import useUserLeavingWarning from "../utils/useUserLeavingWarning";
import { useAuth } from "../utils/authContext";
import { useGameSession } from "../utils/useGameSession"
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

function GamePlay() {
  const { id: sessionId } = useParams();
  const [enableWarning, disableWarning] = useUserLeavingWarning();
  const { isUserLoggedIn, userInfo, logOutFirebase, loading } = useAuth();

  // Use the custom hook for all game session logic
  const {
    timer,
    playerReady,
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
  } = useGameSession(sessionId, userInfo.getDisplayName);

  const disableLogout = true;

  // Enable warning on mount, disable on game end
  useEffect(() => {
    enableWarning();
  }, [enableWarning]);

  useEffect(() => {
    if (gameEnded) {
      disableWarning();
    }
  }, [gameEnded, disableWarning]);

  // Track refresh vs actual navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem("isRefreshing", "true");
    };
    const handleLoad = () => {
      sessionStorage.removeItem("isRefreshing");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("load", handleLoad);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  if (loading || paragraphText === null) return <div>Loading...</div>;
  if (!isUserLoggedIn) return <Navigate to="/" replace />;

  if (gameEnded) {
    return (
      <>
        <NavBar
          userInfo={userInfo}
          isUserLoggedIn={isUserLoggedIn}
          logOut={logOutFirebase}
        />
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
          <p className="winnerText">{winnerText}</p>
          <p className="return-screen">
            Returning to main menu in 10 seconds...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        disableLogout={disableLogout}
        userInfo={userInfo}
        isUserLoggedIn={isUserLoggedIn}
        logOut={logOutFirebase}
      />
      <div className="lobby-container">
        <h2 className="lobby-info">
          Lobby {players.length}/4 (Game Session #
          <b
            className="session-id-text"
            onClick={() => navigator.clipboard.writeText(sessionId)}
          >
            {sessionId}
          </b>
          )
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
          <button
            className="ready-up-button"
            onClick={readyUp}
            disabled={playerReady}
          >
            {playerReady ? "Ready!" : "Ready Up"}
          </button>
        )}
      </div>

      {gameStart ? (
        <TypingSentences
          sessionId={sessionId}
          paragraphText={paragraphText}
          timer={timer}
          isPaused={isPaused}
        />
      ) : (
        <h2 className="please-ready-text">Please ready up to start the game</h2>
      )}

      {isPaused && (
        <MiniGameScreen
          miniGamePlayers={miniGamePlayers}
          lastMiniGameMessage={lastMiniGameMessage}
          miniGameId={miniGameId}
          miniGameTimer={miniGameTimer}
          miniGame={miniGame}
          miniGameStartSignal={miniGameStartSignal}
        />
      )}
    </>
  );
}

export default GamePlay;