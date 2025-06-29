import "./GamePlay.css"
import NavBar from "../components/navbar/NavBar"
import TypingSentences from "../components/typing-sentences/TypingSentences";
import { useAuth } from "../utils/authContext"
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { connectWebSocket, disconnectWebSocket } from "../websocket";
import { auth } from "../firebase";
function GamePlay(){
    const { id: sessionId } = useParams(); // Grab the :id param and rename it to sessionId

    const {isUserLoggedIn, userInfo, logOutFirebase, loading} = useAuth();
    const [paragraphText, setParagraphText] = useState(null);    
    const [players, setPlayers] = useState([])
    
    useEffect(() => {
        const connect = async () => {
            const user = auth.currentUser
            if (user){
                const token = await user.getIdToken();
                connectWebSocket(sessionId, token, (playerList) => {
                  setPlayers(playerList)
                },(sentence) =>{
                  setParagraphText(sentence)
                } )
            }
        };
        connect();
       
        return () => {
            disconnectWebSocket();
        };
    }, [sessionId])

   
    if (loading || paragraphText === null) {
        return <div>Loading...</div>;
    }
    
    if (!isUserLoggedIn){
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
        <h2>Lobby (Game Session #{sessionId})</h2>
        <ul>
          {players.map((p, index) => (
            <li key={index}>
              {p.user?.displayName || p.user?.firebaseUid} - Score: {p.score}
            </li>
          ))}
        </ul>
      </div>

      <TypingSentences 
      paragraphText={paragraphText}
    
      />
    </>
  );
}

export default GamePlay