package com.example.type_battle.controller;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.Paragraphs;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.ParagraphsRepository;
import com.example.type_battle.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.type_battle.DTO.StrokeData;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

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
    private GameTimer gameTimer;

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
    @MessageMapping("/ready_up/{sessionId}")
    public void handlePlayerReadyUp(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);

        if (uid == null) {
            System.out.println("[WebSocket] handlePlayerReadyUp called with no UID available!");
            return;
        }

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) {
            System.out.println("[WebSocket] User or Session not available");
            return;
        }

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();
        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);

        if("finished".equals(session.getStatus())) {
            System.out.println("[WebSocket] session has ended");
        }

        if (participantOpt.isEmpty()) {
            System.out.println("[WebSocket] Participant not available");
            return;
        }

        GameParticipants participant = participantOpt.get();
        participant.setReady(true);
        participantsRepository.save(participant);

        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);

        boolean everyoneReady = allParticipants.stream()
                .allMatch(GameParticipants::isReady);

        if (everyoneReady) {
            session.setStatus("in_progress");
            session.setGameStartTime(System.currentTimeMillis());
            sessionRepository.save(session);
            System.out.println("All players are ready! Starting the game...");

            // Start the game timer
            gameTimer.startGameTimer(sessionId, session.getGameDuration());

            allParticipants = participantsRepository.findAllByGameSessions(session);
        }

        // Send updated participant list to all clients
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
    }

    @MessageMapping("/strokes/{sessionId}")
    public void handleCorrectStrokes(@DestinationVariable String sessionId, @Payload StrokeData strokeData, SimpMessageHeaderAccessor headerAccessor) {
        //Checking for auth user
        String uid = resolveUid(headerAccessor);

        if (uid == null) {
            System.out.println("[WebSocket] handleCorrectStrokes called with no UID available!");
            return;
        }

        //Checking if session and user exists
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) {
            System.out.println("[WebSocket] Session or user not found!");
            return;
        }

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        // Check if game is still in progress
        if (!"in_progress".equals(session.getStatus())) {
            System.out.println("[WebSocket] Game is not in progress, ignoring strokes");
            return;
        }

        //Makes sure to check if the participant is actually in the session.
        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);
        if (participantOpt.isEmpty()) {
            System.out.println("[WebSocket] Participant not found!");
            return;
        }

        GameParticipants participant = participantOpt.get();

        // Add the batch count to the score of participant
        int strokeCount = strokeData.getCount();
        participant.setScore(participant.getScore() + strokeCount);
        participantsRepository.save(participant);

        System.out.println("[WebSocket] Updated score for " + user.getDisplayName() + " by +" + strokeCount + " to " + participant.getScore());

        // Send updated scores to all clients
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, participantsRepository.findAllByGameSessions(session));
    }

    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        //Check for auth user
        String uid = resolveUid(headerAccessor);

        if (uid == null) {
            System.out.println("[WebSocket] joinGame called with no UID available!");
            return;
        }

        System.out.println("[WebSocket] joinGame called with UID: " + uid + " for session: " + sessionId);

        //Check if session exists
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: Game session " + sessionId + " not found in database!");
            return;
        }

        //Check if user exists
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: User with UID " + uid + " not found in database!");
            return;
        }

        //Grab session and user object info
        GameSessions session = sessionOpt.get();
        User user = userOpt.get();
        System.out.println("[WebSocket] Found session: " + session.getId() + ", Found user: " + user.getDisplayName());

        //Check if user is in game session, if not then edit participant db.
        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);
        if (participantOpt.isEmpty()) {
            GameParticipants participant = new GameParticipants();
            participant.setReady(false);
            participant.setGameSessions(session);
            participant.setUser(user);
            participant.setScore(0);
            participantsRepository.save(participant);
            System.out.println("[WebSocket] User " + user.getDisplayName() + " joined game session " + sessionId);
        } else {
            System.out.println("[WebSocket] User " + user.getDisplayName() + " already in game session " + sessionId);
        }

        // Creates list of people in lobby and sends it to everyone
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
        System.out.println("[WebSocket] Sent updated participant list to lobby " + sessionId + " (" + allParticipants.size() + " participants)");

        // Grabs paragraph from session then sends it to the game lobby
        System.out.println(session.getParagraph());
        Paragraphs paragraph = session.getParagraph();
        if (paragraph != null) {
            messagingTemplate.convertAndSend("/topic/game/" + sessionId, paragraph);
        } else {
            System.out.println("[WebSocket] WARNING: Session has no paragraph assigned.");
        }
    }
}