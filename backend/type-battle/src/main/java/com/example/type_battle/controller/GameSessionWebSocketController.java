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
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
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


    @MessageMapping("/stroke/{sessionId}")
    public void handleCorrectStroke(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = (String) headerAccessor.getSessionAttributes().get("uid");

        if (uid == null) {
            Principal principal = headerAccessor.getUser();
            if (principal != null) {
                uid = principal.getName();
            }
        }

        if (uid == null) {
            System.out.println("[WebSocket] handleCorrectStroke called with no UID available!");
            return;
        }

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) {
            System.out.println("[WebSocket] Session or user not found!");
            return;
        }

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        Optional<GameParticipants> participantOpt  = participantsRepository.findByGameSessionsAndUser(session, user);
        if (participantOpt.isEmpty()) {
            System.out.println("[WebSocket] Participant not found!");
            return;
        }

        GameParticipants participant = participantOpt.get();
        participant.setScore(participant.getScore() + 1);
        participantsRepository.save(participant);
        System.out.println("[WebSocket] Updated score for " + user.getDisplayName() + " to " + participant.getScore());

        //Send score to all clients
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, participantsRepository.findAllByGameSessions(session));

    }
    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {

        // Try to get UID from session attributes first (set by interceptor)
        String uid = (String) headerAccessor.getSessionAttributes().get("uid");

        // Fallback to principal if available
        if (uid == null) {
            Principal principal = headerAccessor.getUser();
            if (principal != null) {
                uid = principal.getName();
            }
        }

        if (uid == null) {
            System.out.println("[WebSocket] joinGame called with no UID available!");
            return;
        }

        System.out.println("[WebSocket] joinGame called with UID: " + uid + " for session: " + sessionId);

        // Debug: Check if session exists
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: Game session " + sessionId + " not found in database!");
            return;


        }
        // Debug: Check if user exists
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: User with UID " + uid + " not found in database!");
            return;
        }

        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        System.out.println("[WebSocket] Found session: " + session.getId() + ", Found user: " + user.getDisplayName());

        boolean alreadyJoined = participantsRepository.existsByGameSessionsAndUser(session, user);
        if (!alreadyJoined) {
            GameParticipants participant = new GameParticipants();
            participant.setGameSessions(session);
            participant.setUser(user);
            participant.setScore(0);
            participantsRepository.save(participant);
            System.out.println("[WebSocket] User " + user.getDisplayName() + " joined game session " + sessionId);

        } else {
            System.out.println("[WebSocket] User " + user.getDisplayName() + " already in game session " + sessionId);
        }

        //Creates list of people in lobby and sends it to everyone
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        messagingTemplate.convertAndSend( "/topic/lobby/" + sessionId, allParticipants);
        System.out.println("[WebSocket] Sent updated participant list to lobby " + sessionId + " (" + allParticipants.size() + " participants)");

        //Grabs paragraph from session then sits it into the game lobby
        System.out.println(session.getParagraph());
        Paragraphs paragraph = session.getParagraph();
        if (paragraph != null) {
            messagingTemplate.convertAndSend("/topic/game/" + sessionId, paragraph);
        } else {
            System.out.println("[WebSocket] WARNING: Session has no paragraph assigned.");
        }


    }
}