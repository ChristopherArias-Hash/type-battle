import "./GamePlay.css";
import { useAuth } from "../utils/authContext";
import { useGameSession } from "../utils/useGameSession";
import { useEffect, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import MiniGameScreen from "../components/mini-game-screen/MiniGameScreen";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/gameplay/typing-sentences/TypingSentences";
import useUserLeavingWarning from "../utils/useUserLeavingWarning";
import NumberAnimated from "../utils/animateNumber.jsx";

function GamePlay() {
  const usernameRef = useRef(null);

  const { id: sessionId } = useParams();
  const [enableWarning, disableWarning] = useUserLeavingWarning();
  const { isUserLoggedIn, userInfo, logOutFirebase, loading, loadUserInfo, isUserInDb, isUserVerified} =
    useAuth();

  const {
    timer,
    playerReady,
    isSendingReady,
    paragraphText,
    players,
    gameStart,
    transitionTime,
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
  const singlePlayer = players.length === 1;

  const sortPlayersByScore = [...players].sort((a, b) => b.score - a.score);
  

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

  if (loading || paragraphText === null) return <div className="loading-text">LOADING...</div>;
  if (!isUserLoggedIn) return <Navigate to="/" replace />;
  console.log(players[0].score)
  if (gameEnded) {
    return (
      <>
        <NavBar
        disableLogout={disableLogout}
        userInfo={userInfo}
        isUserLoggedIn={isUserLoggedIn}
        logOut={logOutFirebase}
        isUserInDb={isUserInDb}
        isUserVerified={isUserVerified}
        />
        <div className="game-ended-container">
          <h2 className="game-over">Game Over!</h2>
          <h3 className="final-scores">Final Scores</h3>
          <ul className="win-list">
            {sortPlayersByScore.map((p, index) => (
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
            Returning to main menu in 60 seconds...
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
        isUserInDb={isUserInDb}
        isUserVerified={isUserVerified}
      />
      <div className="lobby-container">
        {transitionTime !== null && (
          <div className="transition-overlay">
            <div className="transition-modal">
              <h1 className="transition-title">GET READY!</h1>
              <h2 className="transition-count">{transitionTime}</h2>
            </div>
          </div>
        )}
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
            <li
              key={index}
              className={`lobby-list-section ${userInfo.getDisplayName === p.displayName ? "current-player-highlight" : ""}`}
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt="Profile"
                  className="lobby-list-profile-pic"
                />
              )}
              <p
                ref={usernameRef}
                className="lobby-list-username"
                onMouseLeave={() => {
                  if (usernameRef.current) {
                    usernameRef.current.scrollLeft = 0;
                  }
                }}
              >
                {p.displayName || "Unknown Player"}
              </p>
              {/* Show score if game has started, otherwise show ready status */}
              {gameStart && (
                <p
                  className={`lobby-list-score ${
                    !gameStart ? "" : "score-enter"
                  }`}
                >
                  Score {p.score}
                </p>
              )}
              {!gameStart && (
                <p
                  className={`lobby-list-status ${
                    p.ready ? "status-ready" : "status-waiting"
                  }`}
                >
                  {p.ready ? "READY" : "WAITING"}
                </p>
              )}
            </li>
          ))}
        </ul>
        {singlePlayer && !playerReady && (
          <p className="single-player-text">
            <b>Single player games do not count toward stats!</b>
          </p>
        )}

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

      {isPaused && transitionTime == null && (
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
