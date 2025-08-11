package com.example.type_battle.websocket;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class WebSocketDisconnectListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameParticipantsRepository participantsRepository;

    @Autowired
    private GameSessionsRepository sessionRepository;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String uid = (String) headerAccessor.getSessionAttributes().get("uid");
        if (uid == null && headerAccessor.getUser() != null) {
            uid = headerAccessor.getUser().getName(); // fallback
        }
        if (uid == null) {
            System.out.println("[WebSocket] Disconnect event received but no UID found.");
            return;
        }

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            System.out.println("[WebSocket] Disconnect event received but no user found.");
            return;
        }

        User user = userOpt.get();

        // Find any active participant entries for this user
        List<GameParticipants> participantList = participantsRepository.findAllByUser(user);

        if (participantList.isEmpty()) {
            System.out.println("[WebSocket] Disconnecting user is not in any session");
            return;
        }

        for (GameParticipants participant : participantList) {
            GameSessions session = participant.getGameSessions();

            // Remove the participant from database only if they are not ready
            if (Objects.equals(session.getStatus(), "waiting")){
                participantsRepository.delete(participant);

                // Decrease lobby player count
                int currentPlayers = session.getPlayersInLobby() != null ? session.getPlayersInLobby() : 0;
                session.setPlayersInLobby(Math.max(0, currentPlayers - 1));
                sessionRepository.save(session);

                // Check if lobby is now empty
                List<GameParticipants> remainingParticipants = participantsRepository.findAllByGameSessions(session);
                if (remainingParticipants.isEmpty()) {
                    System.out.println("[WebSocket] Lobby " + session.getLobbyCode() + " is now empty. Deleting...");
                    sessionRepository.delete(session);
                } else {
                    System.out.println("[WebSocket] Remaining players in lobby " + session.getLobbyCode() + ": " + remainingParticipants.size());
                    messagingTemplate.convertAndSend(
                            "/topic/lobby/" + session.getLobbyCode(),
                            remainingParticipants);
                }
            }
            }

    }

}
