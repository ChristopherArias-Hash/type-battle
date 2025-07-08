import "./GamePlay.css";
import NavBar from "../components/navbar/NavBar";
import TypingSentences from "../components/typing-sentences/TypingSentences";
import { useAuth } from "../utils/authContext";
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { connectWebSocket, disconnectWebSocket } from "../websocket";
import { auth } from "../firebase";
function GamePlay() {
  const { id: sessionId } = useParams(); // Grab the :id param and rename it to sessionId
  const [timer, setTimer] = useState(() => {      //Timer gets set from sessionStorage to avoid sync issues 
    const saved = sessionStorage.getItem(`typing-timer-${sessionId}`);
    if (saved) {
      const data = JSON.parse(saved);
      console.log("✅ Initial timer from sessionStorage:", data);
      return data.timer || 60;
    }
    return 60;
  });
  const { isUserLoggedIn, userInfo, logOutFirebase, loading } = useAuth();
  const [paragraphText, setParagraphText] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!paragraphText || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [paragraphText, timer]);

  useEffect(() => {
    sessionStorage.setItem(
      `typing-timer-${sessionId}`,
      JSON.stringify({ timer })
    );
  }, [timer]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`typing-timer-${sessionId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setTimer(data.timer || 60);
      console.log("✅ Restored timer from sessionStorage:", data);
    }
  }, [sessionId]);

  useEffect(() => {
    const connect = async () => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        connectWebSocket(
          sessionId,
          token,
          (playerList) => {
            setPlayers(playerList);
          },
          (sentence) => {
            setParagraphText(sentence);
          }
        );
      }
    };
    connect();
    return () => {
      disconnectWebSocket();
    };
  }, [sessionId]);

  if (loading || paragraphText === null) {
    return <div>Loading...</div>;
  }

  if (!isUserLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <NavBar
        userInfo={userInfo}
        isUserLoggedIn={isUserLoggedIn}
        logOut={logOutFirebase}
      />

      <div className="lobby">
        <h2>
          Lobby (Game Session #{sessionId}) Time left: {timer}
        </h2>
        <ul>
          {players.map((p, index) => (
            <li key={index}>
              {p.user?.displayName || p.user?.firebaseUid} - Score: {p.score}
            </li>
          ))}
        </ul>
      </div>

      <TypingSentences
        sessionId={sessionId}
        paragraphText={paragraphText}
        timer={timer}
      />
    </>
  );
}

export default GamePlay;
