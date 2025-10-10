package com.example.type_battle.controller;

import com.example.type_battle.DTO.CrossyRoadPositionData;
import com.example.type_battle.DTO.IslandGamePositionData;
import com.example.type_battle.model.*;
import com.example.type_battle.repository.*;
import com.example.type_battle.service.CrossyRoadSetupService;
import com.example.type_battle.service.GameTimerService;
import com.example.type_battle.service.IslandGameSetupService;
import com.example.type_battle.service.ObstacleGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.type_battle.DTO.StrokeData;
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
    private MiniGameSessionRepository miniGameSessionRepository;

    @Autowired
    private MiniGameParticipantsRepository miniGameParticipantRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameTimerService gameTimerService;

    @Autowired
    private ObstacleGenerationService obstacleGenerationService;

    @Autowired
    private IslandGameSetupService islandGameSetupService;

    @Autowired
    private CrossyRoadSetupService crossyRoadSetupService;

    //Function to grab UID, to test if user is auth
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

    @MessageMapping("mini_game/ready_up/{miniGameSessionId}")
    public void readyUp(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);

        if (uid == null) {
            System.out.println("[WebSocket] handlePlayerReadyUp called with no UID available!");
            return;
        }
        Optional<MiniGameSession> sessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (sessionOpt.isEmpty() || userOpt.isEmpty()) {
            System.out.println("[WebSocket] User or Session not available");
            return;
        }
        MiniGameSession miniGameSession = sessionOpt.get();
        User user = userOpt.get();

        Optional<MiniGameParticipants> participantOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(miniGameSession, user);

        if (participantOpt.isEmpty()) {
            System.out.println("[WebSocket] Participant not available");
            return;
        }
        MiniGameParticipants miniGameParticipant = participantOpt.get();

        miniGameParticipant.setIs_ready(true);
        miniGameParticipantRepository.save(miniGameParticipant);

        List<MiniGameParticipants> allParticipants = miniGameParticipantRepository.findAllByMiniGameSession(miniGameSession);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, allParticipants);

        boolean everyoneReady = allParticipants.stream().allMatch(MiniGameParticipants::isIs_ready);

        if (everyoneReady) {
            miniGameSession.setStatus("in_progress");
            miniGameSessionRepository.save(miniGameSession);
            System.out.println("All players ready! Starting mini-game: " + miniGameSession.getId());
            gameTimerService.startMiniGameTimer(miniGameSessionId);

            Map<String, Object> gameStartMessage = new HashMap<>();
            gameStartMessage.put("type", "mini_game_start");
            gameStartMessage.put("startTime", System.currentTimeMillis());

            // **FIX:** Always send setup data for ALL games to allow for flexible frontend testing.
            gameStartMessage.put("cannons", islandGameSetupService.generateInitialCannons());
            gameStartMessage.put("obstacles", obstacleGenerationService.generateObstacles());
            gameStartMessage.put("initialPositions", crossyRoadSetupService.generateInitialPositions(allParticipants));

            messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, gameStartMessage);
        }
    }


    @MessageMapping("/mini_game/crossy_road/position/{miniGameSessionId}")
    public void handleCrossyRoadPosition(@DestinationVariable Long miniGameSessionId, @Payload CrossyRoadPositionData positionData, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) {
            return;
        }
        positionData.setUid(uid);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId,
                Map.of("type", "crossy_road_position_update", "data", positionData));
    }

    @MessageMapping("/mini_game/island_game/position/{miniGameSessionId}")
    public void handleIslandGamePosition(@DestinationVariable Long miniGameSessionId, @Payload IslandGamePositionData positionData, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) {
            return;
        }
        positionData.setUid(uid);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId,
                Map.of("type", "island_game_position_update", "data", positionData));
    }

    //Listener that handles ready up of all users.
    @MessageMapping("/ready_up/{sessionId}")
    public void handlePlayerReadyUp(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);

        if (uid == null) {
            System.out.println("[WebSocket] handlePlayerReadyUp called with no UID available!");
            return;
        }

        //Check if session or user is real
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) {
            System.out.println("[WebSocket] User or Session not available");
            return;
        }

        //find participant by using session and user
        GameSessions session = sessionOpt.get();
        User user = userOpt.get();

        //Check if participant is real
        Optional<GameParticipants> participantOpt = participantsRepository.findByGameSessionsAndUser(session, user);

        if ("finished".equals(session.getStatus())) {
            System.out.println("[WebSocket] session has ended");
        }

        if (participantOpt.isEmpty()) {
            System.out.println("[WebSocket] Participant not available");
            return;
        }

        //Once found set ready to true
        GameParticipants participant = participantOpt.get();
        participant.setReady(true);
        participantsRepository.save(participant);

        //Grab list of everyone, check if all ready. if everyone ready start game.
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(session);
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
        boolean everyoneReady = allParticipants.stream()
                .allMatch(GameParticipants::isReady);

        if (everyoneReady) {
            session.setStatus("in_progress");
            session.setGameStartTime(System.currentTimeMillis());
            sessionRepository.save(session);
            System.out.println("All players are ready! Starting the game...");

            // Start the game timer
            gameTimerService.startGameTimer(sessionId, session.getGameDuration());

            Map<String, Object> gameStartMessage = new HashMap<>();
            gameStartMessage.put("type", "game_start");
            messagingTemplate.convertAndSend("/topic/game/" + sessionId, gameStartMessage);


        }

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

    @MessageMapping("/stacker_points/{miniGameSessionId}")
    public void hanldeStackerPoints(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor, @Payload Map<String, Object> stackerPointsData) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) {
            System.out.println("[WebSocket] handleStackerPoints called with no UID available!");
            return;
        }
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            System.out.println("[WebSocket] User not found!");
            return;

        }
        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        if (miniGameSessionOpt.isEmpty()) {
            System.out.println("[WebSocket] MiniGameSession not found!");
            return;

        }

        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        User user = userOpt.get();
        Optional<MiniGameParticipants> miniGameParticipantsOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(miniGameSession, user);

        if (miniGameParticipantsOpt.isEmpty()) {
            System.out.println("[WebSocket] MiniGameParticipants not found!");
            return;

        }
        Integer pointsToAdd = (Integer) stackerPointsData.get("highScore");

        if (pointsToAdd == null) {
            System.out.println("[WebSocket] Stacker points data is null!");
            return;
        }
        MiniGameParticipants miniGameParticipants = miniGameParticipantsOpt.get();
        miniGameParticipants.setScore(pointsToAdd);
        miniGameParticipantRepository.save(miniGameParticipants);
        System.out.println("[WebSocket] Stacker point sent to DB");

    }

    @MessageMapping("/join/{sessionId}")
    public void joinGame(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        //Check for auth user
        String uid = resolveUid(headerAccessor);
        int maxParticipantAmount = 4;

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
            if (session.getPlayersInLobby() == maxParticipantAmount) {
                System.out.println("[WebSocket] Lobby is full 4/4");
                return;
            } else {
                session.setPlayersInLobby(session.getPlayersInLobby() + 1);
                sessionRepository.save(session);
                System.out.println("[WebSocket] Lobby is at " + session.getPlayersInLobby() + " /4");
            }
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

    @MessageMapping("/join-mini-game/{sessionId}")
    public void joinMiniGame(@DestinationVariable String sessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
    }
}