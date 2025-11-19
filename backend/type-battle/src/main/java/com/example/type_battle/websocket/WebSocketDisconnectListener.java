package com.example.type_battle.websocket;

import com.example.type_battle.dto.main_game.LobbyParticipantData;
import com.example.type_battle.dto.main_game.LobbyUpdateData;
import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.orm.jpa.JpaObjectRetrievalFailureException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
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
            uid = headerAccessor.getUser().getName();
        }
        if (uid == null) {
            return;
        }

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();

        try {
            List<GameParticipants> participantList = participantsRepository.findByUserAndGameSessions_Status(user, "waiting");

            if (participantList.isEmpty()) {
                return;
            }

            for (GameParticipants participant : participantList) {
                GameSessions session = participant.getGameSessions();

                if (session != null) {
                    participantsRepository.delete(participant);

                    int currentLobbyPlayers = session.getPlayersInLobby() != null ? session.getPlayersInLobby() : 0;
                    session.setPlayersInLobby(Math.max(0, currentLobbyPlayers - 1));
                    sessionRepository.save(session);

                    List<GameParticipants> remainingParticipants = participantsRepository.findAllByGameSessions(session);

                    if (remainingParticipants.isEmpty()) {
                        System.out.println("[WebSocket] Lobby " + session.getLobbyCode() + " is now empty. Deleting...");
                        sessionRepository.delete(session);
                    } else {
                        System.out.println("[WebSocket] Remaining players in lobby " + session.getLobbyCode() + ": " + remainingParticipants.size());

                        // Map to DTO (Consistency Fix)
                        List<LobbyParticipantData> participantDataList = remainingParticipants.stream()
                                .map(p -> new LobbyParticipantData(
                                        p.getUser().getDisplayName(),
                                        p.getUser().getImageUrl(),
                                        p.getUser().getFirebaseUid(),
                                        p.isReady(),
                                        p.getScore()
                                ))
                                .toList();

                        LobbyUpdateData updateData = new LobbyUpdateData(
                                session.getLobbyCode(),
                                participantDataList.size(),
                                session.getHostUser().getFirebaseUid(),
                                participantDataList
                        );

                        messagingTemplate.convertAndSend(
                                "/topic/lobby/" + session.getLobbyCode(),
                                updateData);
                    }
                }
            }
        } catch (JpaObjectRetrievalFailureException | EntityNotFoundException e) {
            System.out.println("[WebSocket] Disconnect cleanup skipped: Session entity not found (likely already deleted).");
        } catch (Exception e) {
            System.err.println("[WebSocket] Error handling disconnect: " + e.getMessage());
        }
    }
}