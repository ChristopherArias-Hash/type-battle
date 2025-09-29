import { useState } from "react";
import { sendMiniGameReadyUp } from "../../websocket";

function MiniGameReadyUp({ miniGamePlayers, miniGameId, onReady }) {
  const [playerIsReady, setPlayerIsReady] = useState(false);

  const handleReadyUp = () => {
    if (!playerIsReady && miniGameId) {
      sendMiniGameReadyUp(miniGameId);
      setPlayerIsReady(true);
      if (onReady) onReady(); // Optional callback for parent component
    }
  };

  return (
    <div className="mini-game-ready-section">
      <h3>Players</h3>
      <ul>
        {miniGamePlayers.map((p, index) => (
          <li key={index}>
            {p.user?.displayName || p.user?.firebaseUid} – Score: {p.score} |
            Ready: {p.is_ready ? "✅" : "❌"}
          </li>
        ))}
      </ul>
      {!playerIsReady && (
        <div>
          <button onClick={handleReadyUp}>Ready Up</button>
        </div>
      )}
    </div>
  );
}

export default MiniGameReadyUp;