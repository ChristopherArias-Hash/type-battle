import "./GamePlay.css";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/typing-sentences/TypingSentences";
import useUserLeavingWarning from "../utils/useUserLeavingWarning";
import { useAuth } from "../utils/authContext";
import { useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import {
  connectWebSocket,
  disconnectWebSocket,
  sendReadyUp,
} from "../websocket";
import { auth } from "../firebase";

function GamePlay() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams(); //Grabs session id from url
  const [enableWarning, disableWarning] = useUserLeavingWarning(); //Warning for refresh page
  const { isUserLoggedIn, userInfo, logOutFirebase, loading } = useAuth(); //User state

  //Game functions
  const [timer, setTimer] = useState(60);
  const [playerReady, setPlayerReady] = useState(false);
  const [paragraphText, setParagraphText] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStart, setGameStart] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [winnerText, setWinnerText] = useState("");

  const disableLogout = true; //Disables logout function navbar during gameplay

  //Ready up user and sends info to websocket server
  const ready_up = () => {
    setPlayerReady(true);
    sendReadyUp(sessionId);
  };

  //Checks first user in list, if they ready up, switches status to in_progress then starts game.
  useEffect(() => {
    if (
      players.length > 0 &&
      players[0].gameSessions.status === "in_progress"
    ) {
      setGameStart(true);
    }
  }, [players]);

  //Watches players and kicks if lobby full and user not in lobby
  useEffect(() => {
    if (players.length > 0) {
      const currentUserId = auth.currentUser?.uid;

      const isInLobby = players.some(
        (p) => p.user?.firebaseUid === currentUserId
      );

      if (!isInLobby && players.length >= 4) {
        disableWarning();
        alert("Cannot join: lobby is full.");
        navigate("/");
      }
    }
  }, [players, navigate]);
  
  //Connnects web socket components, and verfies if game is avaible
  useEffect(() => {
    enableWarning();

    const connect = async () => {
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();

        // Check game status before connecting
        const response = await fetch(
          `http://localhost:8080/protected/game-session?lobbyCode=${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          console.error("Session not found or unauthorized.");
          navigate("/"); // redirect home
          return;
        }

        const session = await response.json();

        if (session.status === "finished") {
          alert("Cannot join a finished session.");
          navigate("/"); // redirect home
          return;
        }
        connectWebSocket(
          sessionId,
          token,
          (playerList) => {
            setPlayers(playerList);
          },
          (data) => {
            if (typeof data === "string") {
              setParagraphText(data);
            } else if (data.type === "timer_update") {
              setTimer(data.remainingTime);
            } else if (data.type === "game_end") {
              setGameEnded(true);
              disableWarning();
              setGameStart(false);
              setWinnerText(data.win_message);

              const currentUserWpm = data.wpm_data?.find(
                //Loops through wpm data inside the object, checks if current user id matches wpm object

                (entry) => entry.displayName === userInfo.getDisplayName
              );

              if (currentUserWpm) {
                setWpm(currentUserWpm.wpm);
              }
              setTimeout(() => {
                navigate("/");
              }, 10000);
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
  }, [sessionId, navigate]);

  if (loading || paragraphText === null) {
    return <div>Loading...</div>;
  }

  if (!isUserLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (gameEnded) {
    return (
      <>
        <NavBar
          userInfo={userInfo}
          isUserLoggedIn={isUserLoggedIn}
          logOut={logOutFirebase}
        />
        <div className="game-ended">
          <h1>Game Over!</h1>
          <h2>Final Scores:</h2>

          <ul>
            {players.map((p, index) => (
              <li key={index}>
                {p.user?.displayName || p.user?.firebaseUid} - Score: {p.score}
              </li>
            ))}
          </ul>
          <p>Your wpm {wpm}</p>
          <p>{winnerText}</p>

          <p>Returning to main menu in 10 seconds...</p>
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

      <div className="lobby">
        <h2>
          Lobby {players.length}/4 (Game Session #{sessionId}) Time left:{" "}
          {timer}s
        </h2>
        {!gameStart && (
          <button onClick={() => ready_up()} disabled={playerReady}>
            {playerReady ? "Ready!" : "Ready Up"}
          </button>
        )}
        <ul>
          {players.map((p, index) => (
            <li key={index}>
              {p.user?.displayName || p.user?.firebaseUid} - Score: {p.score} |
              Is ready: {p.ready ? "yes" : "no"}
            </li>
          ))}
        </ul>
      </div>
      {gameStart ? (
        <TypingSentences
          sessionId={sessionId}
          paragraphText={paragraphText}
          timer={timer}
        />
      ) : (
        <h2>Please ready up to start the game</h2>
      )}
    </>
  );
}

export default GamePlay;
