package com.example.type_battle.controller;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class GameSessionWebSocketController {

    @Autowired
    private GameParticipantsRepository participantsRepository;

    @Autowired
    private GameSessionsRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable Long sessionId, @Header("uid") String uid) {
        GameSessions session = sessionRepository.findById(sessionId).orElseThrow();
        User user = userRepository.findByFirebaseUid(uid).orElseThrow();

        boolean alreadyJoined = participantsRepository.existsByGameSessionsAndUser(session, user);

        GameParticipants participant = new GameParticipants();

        if (!alreadyJoined) {
                participant.setGameSessions(session);
                participant.setUser(user);
                participant.setScore(0);
            participantsRepository.save(participant);
            }
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
    }
}
