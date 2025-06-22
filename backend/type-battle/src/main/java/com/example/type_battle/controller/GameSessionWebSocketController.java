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



    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable Long sessionId, SimpMessageHeaderAccessor headerAccessor) {

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
        Optional<GameSessions> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: Game session " + sessionId + " not found in database!");


        }
        // Debug: Check if user exists
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            System.out.println("[WebSocket] ERROR: User with UID " + uid + " not found in database!");
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

        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        messagingTemplate.convertAndSend( "/topic/lobby/" + sessionId, allParticipants);
        System.out.println("[WebSocket] Sent updated participant list to lobby " + sessionId + " (" + allParticipants.size() + " participants)");
        System.out.println(session.getParagraph());
        if(session.getParagraph() != null){
            long totalParagraphs = paragraphsRepository.count();
            if(totalParagraphs > 0){
                long randomId = (long) (Math.random() * totalParagraphs) + 1;
                Optional<Paragraphs> paragraphOpt = paragraphsRepository.findById(randomId);
                if(paragraphOpt.isPresent()){
                    Paragraphs paragraph = paragraphOpt.get();
                    session.setParagraph(paragraph);
                    sessionRepository.save(session);
                    messagingTemplate.convertAndSend("/topic/game/" + sessionId, paragraph);
                    System.out.println("[WebSocket] Sent paragraph to game session " + sessionId);

                }else{
                    System.out.println("[WebSocket] ERROR: Paragraph " + randomId + " not found in database!");
                }
            }else{
                System.out.println("[WebSocket] ERROR: No paragraphs available in DB.");

            }
        }else{
            System.out.println("paragraph found");
        }
    }
}