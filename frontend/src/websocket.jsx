// websocket.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let stompClient = null;

export function connectWebSocket(sessionId, firebaseToken, onPlayerListUpdate) {
  const socket = new SockJS("http://localhost:8080/ws");

  stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    onConnect: () => {
      console.log("[WebSocket] Connected");

      // Subscribe to the session's lobby topic
      stompClient.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedPlayers = JSON.parse(message.body);
        console.log("[WebSocket] Player list update:", updatedPlayers);
        onPlayerListUpdate(updatedPlayers);
      });

      // Tell server we joined the lobby
      stompClient.publish({
        destination: `/app/join/${sessionId}`,
        headers: {
          uid: firebaseToken, // This is used in the backend controller header
        },
        body: "", // No message body needed
      });
    },
    onStompError: (frame) => {
      console.error("[WebSocket] STOMP error:", frame.headers["message"]);
    },
  });

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
    console.log("[WebSocket] Disconnected");
  }
}
