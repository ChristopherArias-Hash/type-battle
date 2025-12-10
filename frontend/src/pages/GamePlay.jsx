import "./GamePlay.css";
import { useAuth } from "../utils/authContext";
import { useGameSession } from "../utils/useGameSession";
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import MiniGameScreen from "../components/mini-game-screen/MiniGameScreen";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/gameplay/typing-sentences/TypingSentences";
import useUserLeavingWarning from "../utils/useUserLeavingWarning";
import NumberAnimated from "../utils/animateNumber.jsx";

function GamePlay() {
  const { id: sessionId } = useParams();
  const [enableWarning, disableWarning] = useUserLeavingWarning();
  const { isUserLoggedIn, userInfo, logOutFirebase, loading, loadUserInfo } =
    useAuth();

  const {
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
    winnerInfo,
    readyUp,
  } = useGameSession(sessionId, userInfo.getDisplayName);

  const disableLogout = true;

  useEffect(() => {
    enableWarning();
  }, [enableWarning]);

  useEffect(() => {
    if (gameEnded) {
      disableWarning();
    }
  }, [gameEnded, disableWarning, loadUserInfo]);

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
  console.log(userInfo)
  console.log(players)
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
                <p className="win-list-player-name">
                  {p.displayName || p.firebaseUid}
                </p>
                <p className="win-list-player-score">
                  score:{" "}
                  <b className="win-list-player-score-number">
                    {" "}
                    <NumberAnimated n={p.score} />
                  </b>
                </p>
              </li>
            ))}
          </ul>
          <p className="user-wpm-text">
            Your wpm <b className="user-wpm-number">{wpm}</b>
          </p>
          {winnerInfo ? (
            <p className="winnerText">
              <span>{winnerInfo.prefix} </span>
              <span className="winner-name-blue">{winnerInfo.name}</span>
              <span> {winnerInfo.middle} </span>
              <span className="winner-score-blue">{winnerInfo.score}</span>
            </p>
          ) : (
            <p className="winnerText">{winnerText}</p>
          )}
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
        <ul className="lobby-list">
          {players.map((p, index) => (
            <li key={index} className={`lobby-list-section ${userInfo.getDisplayName === p.displayName ? "current-player-highlight" : ""}`}>
              <p className="lobby-list-username">
                {p.displayName || p.firebaseUid}
              </p>
              {gameStart && (
                <p
                  className={`lobby-list-score ${
                    !gameStart ? "" : "score-enter"
                  }`}
                >
                  Score: {p.score}
                </p>
              )}
              {!gameStart && (
                <p
                  className={`lobby-list-status ${
                    p.ready ? "status-ready" : "status-waiting"
                  }`}
                >
                  {p.ready ? "Ready" : "Waiting"}
                </p>
              )}
            </li>
          ))}
        </ul>
        {/* The button is only shown if the server says you are NOT ready */}
        {!playerReady && (
          <button
            className="ready-up-button"
            onClick={readyUp}
            // The button is disabled if you've just clicked it
            disabled={isSendingReady}
          >
            <span>{isSendingReady ? "Waiting..." : "Ready Up"}</span>
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
