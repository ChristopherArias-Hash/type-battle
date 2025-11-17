package com.example.type_battle.controller;

import com.example.type_battle.DTO.*;
import com.example.type_battle.model.*;
import com.example.type_battle.repository.*;
import com.example.type_battle.service.CrossyRoadSetupService;
import com.example.type_battle.service.GameTimerService;
import com.example.type_battle.service.IslandGameSetupService;
import com.example.type_battle.service.ObstacleGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.*;

@Controller
public class GameSessionWebSocketController {

    @Autowired
    private GameParticipantsRepository participantsRepository;
    @Autowired
    private GameSessionsRepository sessionRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ParagraphsRepository paragraphsRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private GameTimerService gameTimerService;

    // Function to grab UID, to test if user is auth
    private String resolveUid(SimpMessageHeaderAccessor headerAccessor) {
        String uid = (String) headerAccessor.getSessionAttributes().get("uid");
        if (uid == null) {
            Principal principal = headerAccessor.getUser();
            if (principal != null) {
                uid = principal.getName();
            }
        }
        return uid;
    }

    /**
     * Helper function to consistently send LobbyUpdateData DTO
     */
    private void sendLobbyUpdate(GameSessions session) {
        List<GameParticipants> participants = participantsRepository.findAllByGameSessions(session);

        List<LobbyParticipantData> lobbyParticipantData = participants.stream()
                .map(p -> new LobbyParticipantData(
                        p.getUser().getDisplayName(),
                        p.getUser().getImageUrl(),
                        p.getUser().getFirebaseUid(),
                        p.isReady(),
                        p.getScore()
                ))
                .toList();

        LobbyUpdateData lobbyUpdateData = new LobbyUpdateData(
                session.getLobbyCode(),
                lobbyParticipantData.size(),
                session.getHostUser().getFirebaseUid(),
                lobbyParticipantData
        );

        // --- FIX ADDED HERE: Send the data to the topic ---
        messagingTemplate.convertAndSend("/topic/lobby/" + session.getLobbyCode(), lobbyUpdateData);
        System.out.println("[WebSocket] Sent LobbyUpdateData to " + session.getLobbyCode());
    }

    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) return;

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);

        if (participantOpt.isEmpty()) {
            if (session.getPlayersInLobby() >= 4) return;

            session.setPlayersInLobby(session.getPlayersInLobby() + 1);
            sessionRepository.save(session);

            GameParticipants participant = new GameParticipants();
            participant.setReady(false);
            participant.setGameSessions(session);
            participant.setUser(user);
            participant.setScore(0);
            participantsRepository.save(participant);
        }

        // Send the update using the helper
        sendLobbyUpdate(session);

        // Send paragraph if applicable
        Paragraphs paragraph = session.getParagraph();
        if (paragraph != null) {
            messagingTemplate.convertAndSend("/topic/game/" + sessionId, new ParagraphData(paragraph.getText()));
        }
    }

    @MessageMapping("/ready_up/{sessionId}")
    public void handlePlayerReadyUp(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (sessionOpt.isEmpty() || userOpt.isEmpty()) return;

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);
        if (participantOpt.isEmpty()) return;

        GameParticipants participant = participantOpt.get();
        participant.setReady(true);
        participantsRepository.save(participant);

        // Send the update using the helper
        sendLobbyUpdate(session);

        // Check start condition
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        boolean everyoneReady = allParticipants.stream().allMatch(GameParticipants::isReady);
        if (everyoneReady) {
            session.setStatus("in_progress");
            session.setGameStartTime(System.currentTimeMillis());
            sessionRepository.save(session);

            gameTimerService.startGameTimer(sessionId, session.getGameDuration());
            Map<String, Object> gameStartMessage = new HashMap<>();
            gameStartMessage.put("type", "game_start");
            messagingTemplate.convertAndSend("/topic/game/" + sessionId, gameStartMessage);
        }
    }

    @MessageMapping("/strokes/{sessionId}")
    public void handleCorrectStrokes(@DestinationVariable String sessionId, @Payload StrokeData strokeData, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) return;

        GameSessions session = sessionOpt.get();
        if (!"in_progress".equals(session.getStatus())) return;

        User user = userOpt.get();
        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);

        if (participantOpt.isPresent()) {
            GameParticipants participant = participantOpt.get();
            participant.setScore(participant.getScore() + strokeData.getCount());
            participantsRepository.save(participant);

            // Send the update using the helper
            sendLobbyUpdate(session);
        }
    }


}