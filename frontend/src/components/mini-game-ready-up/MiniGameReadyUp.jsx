import { useEffect, useMemo, useState } from "react";
import { sendMiniGameReadyUp } from "../../websocket";
import { auth } from "../../firebase";

function MiniGameReadyUp({ miniGamePlayers = [], miniGameId, onReady }) {
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
      <h3>Players</h3>
      <ul>
        {miniGamePlayers.map((p, index) => (
          <li key={index}>
            {p.user?.displayName || p.user?.firebaseUid || "Unknown"} – Score:{" "}
            {p.score} | Ready: {p.is_ready ? "✅" : "❌"}
          </li>
        ))}
      </ul>
      {!isReadyFromServer ? (
        <button onClick={handleReadyUp} disabled={isSending}>
          {isSending ? "Waiting..." : "Ready Up"}
        </button>
      ) : (
        <div>You're ready. Waiting for others…</div>
      )}
    </div>
  );
}

export default MiniGameReadyUp;
