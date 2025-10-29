import { useEffect, useMemo, useState } from "react";
import { sendMiniGameReadyUp } from "../../websocket";
import { auth } from "../../firebase";
import "./MiniGameReadyUp.css";

function MiniGameReadyUp({ miniGamePlayers = [], miniGameId, onReady }) {
  console.log("test" + miniGamePlayers)
  const uid = auth.currentUser?.uid;
  const me = useMemo(
    () => miniGamePlayers.find((p) => p?.user?.firebaseUid === uid),
    [miniGamePlayers, uid]
  );
  const isReadyFromServer = !!me?.is_ready;
  const [isSending, setIsSending] = useState(false);

  // Stop waiting once the server confirms we're ready
  useEffect(() => {
    if (isSending && isReadyFromServer) setIsSending(false);
  }, [isSending, isReadyFromServer]);

  const handleReadyUp = () => {
    if (!miniGameId || isReadyFromServer || isSending) return;
    setIsSending(true);
    sendMiniGameReadyUp(miniGameId);
    if (onReady) onReady();
  };

  return (
    <div className="mini-game-ready-section">
      <ul>
        {miniGamePlayers.map((p, index) => (
          <li key={index}>
            {p.user?.displayName || p.user?.firebaseUid || "Unknown"} | Ready: {p.is_ready ? "✅" : "❌"}
          </li>
        ))}
      </ul>
      {!isReadyFromServer ? (
        <button className="mini-game-ready-up-button" onClick={handleReadyUp} disabled={isSending}>
              <span className="letter-enter"> {isSending ? "Waiting..." : "Ready Up"}</span>
        </button>
      ) : (
        <div>You're ready. Waiting for others…</div>
      )}
    </div>
  );
}

export default MiniGameReadyUp;
