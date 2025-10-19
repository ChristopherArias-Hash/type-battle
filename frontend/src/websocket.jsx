import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;

export function connectWebSocket(
  sessionId,
  firebaseToken,
  onPlayerListUpdate,
  onGameDataReceived,
  onSuccessfulConnect // ✨ 1. ADD THE NEW PARAMETER
) {
  if (stompClient && stompClient.active) {
    console.log("[WebSocket] Disconnecting existing connection");
    stompClient.deactivate();
  }

  const socket = new SockJS("http://localhost:8080/ws");

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    connectHeaders: {
      Authorization: `Bearer ${firebaseToken}`,
    },
    onConnect: () => {
      console.log("[WebSocket] Connected to session " + sessionId);

      stompClient.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedPlayers = JSON.parse(message.body);
        console.log("[WebSocket] Player list update:", updatedPlayers);
        onPlayerListUpdate(updatedPlayers);
      });

      stompClient.subscribe(`/topic/game/${sessionId}`, (message) => {
        const data = JSON.parse(message.body);
        console.log("[WebSocket] Game data received:", data);
        onGameDataReceived(data);
      });

      console.log("[WebSocket] Sending join request for session " + sessionId);
      stompClient.publish({
        destination: `/app/join/${sessionId}`,
        body: "",
      });

      // ✨ 2. CALL THE NEW CALLBACK AFTER EVERYTHING IS SET UP
      if (onSuccessfulConnect) {
        onSuccessfulConnect();
      }
    },
    onStompError: (frame) => {
      console.error("[WebSocket] STOMP error:", frame.headers["message"]);
      console.error("[WebSocket] Error details:", frame.body);
    },
    onWebSocketError: (event) => {
      console.error("[WebSocket] WebSocket error:", event);
    },
    onDisconnect: () => {
      console.log("[WebSocket] Disconnected");
    },
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
    console.log("[WebSocket] Disconnected");
  }
  stompClient = null;
}

export function sendCorrectStrokesOptimized(sessionId, count) {
  if (!stompClient || !stompClient.connected || count <= 0) {
    console.warn(
      `[WebSocket] Cannot send strokes – not connected or invalid count: ${count}`
    );
    return;
  }
  const maxBatchSize = 50;
  let remaining = count;
  while (remaining > 0) {
    const batchSize = Math.min(remaining, maxBatchSize);
    stompClient.publish({
      destination: `/app/strokes/${sessionId}`,
      body: JSON.stringify({ count: batchSize }),
    });
    remaining -= batchSize;
    console.log(
      `[WebSocket] Sent batch of ${batchSize} strokes (${remaining} remaining)`
    );
    if (remaining > 0) {
      setTimeout(() => {}, 10);
    }
  }
}

export function sendReadyUp(sessionId) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/ready_up/${sessionId}`,
      body: "",
    });
    console.log(`[WebSocket] Sent ready_up to /app/ready_up/${sessionId}`);
  } else {
    console.log("[WebSocket] ready_up not sent");
  }
}

export function subscribeToMiniGameLobby(
  miniGameSessionId,
  onMiniGamePlayerListUpdate
) {
  if (!stompClient || !stompClient.connected) {
    console.error(
      "[WebSocket] Cannot subscribe to mini-game, client not connected."
    );
  }
  console.log(
    `[WebSocket] Subscribing to mini-game lobby: /topic/mini-game-lobby/${miniGameSessionId}`
  );

  return stompClient.subscribe(
    `/topic/mini-game-lobby/${miniGameSessionId}`,
    (message) => {
      const miniGameData = JSON.parse(message.body);
      onMiniGamePlayerListUpdate(miniGameData);
    }
  );
}

export function sendMiniGameReadyUp(miniGameSessionId) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/ready_up/${miniGameSessionId}`,
      body: "",
    });
    console.log(
      `[WebSocket] Sent ready_up to /app/mini_game/ready_up/${miniGameSessionId}`
    );
  } else {
    console.log(
      "[WebSocket] Mini_game ready_up not sent, client not connected."
    );
  }
}

export function sendStackerPoints(miniGameSessionId, scoreData) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/stacker_points/${miniGameSessionId}`,
      body: JSON.stringify(scoreData),
    });
  }
}

export function sendCrossyRoadPosition(miniGameSessionId, positionData) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/crossy_road/position/${miniGameSessionId}`,
      body: JSON.stringify(positionData),
    });
  }
}

export function sendIslandGamePosition(miniGameSessionId, positionData) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/island_game/position/${miniGameSessionId}`,
      body: JSON.stringify(positionData),
    });
  }
}

// NEW: send death + ghost position so all clients can render it
export function sendIslandGameDeath(miniGameSessionId, positionData) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/island_game/death/${miniGameSessionId}`,
      body: JSON.stringify(positionData || {}),
    });
    console.log(
      `[WebSocket] Sent death event to /app/mini_game/island_game/death/${miniGameSessionId}`
    );
  }
}
