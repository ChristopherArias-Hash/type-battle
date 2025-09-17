import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;
export function connectWebSocket(sessionId, firebaseToken, onPlayerListUpdate, onGameDataReceived) {
  // Disconnect existing connection if any
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

    // where we send the Firebase token for authentication
    connectHeaders: {
      Authorization: `Bearer ${firebaseToken}`,
    },

    onConnect: () => {
      console.log("[WebSocket] Connected to session " + sessionId);

      // Subscribe to lobby topic for player list
      stompClient.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedPlayers = JSON.parse(message.body);
        console.log("[WebSocket] Player list update:", updatedPlayers);
        onPlayerListUpdate(updatedPlayers);
      });

      // Subscribe to game topic for paragraphs, timer updates, and game end
      stompClient.subscribe(`/topic/game/${sessionId}`, (message) => {
        const data = JSON.parse(message.body);
        console.log("[WebSocket] Game data received:", data);
        onGameDataReceived(data);
      });

      // Join the game after subscribing
      console.log("[WebSocket] Sending join request for session " + sessionId);
      stompClient.publish({
        destination: `/app/join/${sessionId}`,
        body: "",
      });
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

// NEW: Send multiple strokes at once
export function sendCorrectStrokesOptimized(sessionId, count) {
  if (!stompClient || !stompClient.connected || count <= 0) {
    console.warn(`[WebSocket] Cannot send strokes – not connected or invalid count: ${count}`);
    return;
  }

  // For very large batches, split them up to avoid overwhelming the backend
  const maxBatchSize = 50;
  let remaining = count;
  
  while (remaining > 0) {
    const batchSize = Math.min(remaining, maxBatchSize);
    
    stompClient.publish({
      destination: `/app/strokes/${sessionId}`,
      body: JSON.stringify({ count: batchSize }),
    });
    
    remaining -= batchSize;
    console.log(`[WebSocket] Sent batch of ${batchSize} strokes (${remaining} remaining)`);
    
    // Small delay between large batches to prevent overwhelming
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


export function subscribeToMiniGameLobby(miniGameSessionId, onMiniGamePlayerListUpdate) {
  if (!stompClient || !stompClient.connected) {
    console.error("[WebSocket] Cannot subscribe to mini-game, client not connected.");
    return null;
  }

  console.log(`[WebSocket] Subscribing to mini-game lobby: /topic/mini-game-lobby/${miniGameSessionId}`);

  // Subscribe to the new topic and pass the handler function
  return stompClient.subscribe(`/topic/mini-game-lobby/${miniGameSessionId}`, (message) => {
    const updatedPlayers = JSON.parse(message.body);
    onMiniGamePlayerListUpdate(updatedPlayers);
  });
}

export function sendMiniGameReadyUp(miniGameSessionId) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/ready_up/${miniGameSessionId}`,
      body: "",
    });
    console.log(`[WebSocket] Sent ready_up to /app/mini_game/ready_up/${miniGameSessionId}`);
  } else {
    console.log("[WebSocket] Mini_game ready_up not sent, client not connected.");
  }
}