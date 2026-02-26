import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;

export function connectWebSocket(
  sessionId,
  firebaseToken,
  onPlayerListUpdate,
  onGameDataReceived,
  onSuccessfulConnect, 
) {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
  }

  const socket = new SockJS(`${import.meta.env.VITE_BACKEND_URL}/ws`);

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    connectHeaders: {
      Authorization: `Bearer ${firebaseToken}`,
    },
    onConnect: () => {
      stompClient.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const data = JSON.parse(message.body);
        const updatedPlayers = data.participants || data;
        onPlayerListUpdate(updatedPlayers);
      });

      stompClient.subscribe(`/topic/game/${sessionId}`, (message) => {
        const data = JSON.parse(message.body);
        onGameDataReceived(data);
      });

      stompClient.publish({
        destination: `/app/join/${sessionId}`,
        body: "",
      });

      if (onSuccessfulConnect) {
        onSuccessfulConnect();
      }
    },
    onStompError: (_frame) => {},
    onWebSocketError: (_event) => {},
    onDisconnect: () => {},
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
  }
  stompClient = null;
}

/**
 *
 * MAIN GAME DATA SENDING FUNCTIONS
 *
 */
export function sendCorrectStrokesOptimized(sessionId, count) {
  if (!stompClient || !stompClient.connected || count <= 0) {
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
  }
}

/**
 *
 * MINI GAME DATA SENDING FUNCTIONS
 *
 */

export function subscribeToMiniGameLobby(
  miniGameSessionId,
  onMiniGameDataUpdate,
) {
  if (!stompClient || !stompClient.connected) {
    return null; // Return null or handle error
  }

  const subscription = stompClient.subscribe(
    `/topic/mini-game-lobby/${miniGameSessionId}`,
    (message) => {
      const miniGameData = JSON.parse(message.body);
      onMiniGameDataUpdate(miniGameData); // Pass data to the callback
    },
  );

  //Immediately request the current list after subscribing
  stompClient.publish({
    destination: `/app/mini-game/request-state/${miniGameSessionId}`,
    body: "",
  });

  return subscription; // Return the subscription object so it can be unsubscribed later
}

// Request the current mini-game state from the server
export function requestMiniGameState(miniGameSessionId) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini-game/request-state/${miniGameSessionId}`,
      body: "",
    });
  }
}

export function sendMiniGameReadyUp(miniGameSessionId) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/ready_up/${miniGameSessionId}`,
      body: "",
    });
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

// Send death + ghost position so all clients can render it
export function sendIslandGameDeath(miniGameSessionId, positionData) {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: `/app/mini_game/island_game/death/${miniGameSessionId}`,
      body: JSON.stringify(positionData || {}),
    });
  }
}
