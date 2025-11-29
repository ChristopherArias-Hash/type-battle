package com.example.type_battle.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.example.type_battle.dto.mini_games.MiniGameLobbyState;
import com.example.type_battle.dto.mini_games.MiniGamePlayerData;
import com.example.type_battle.dto.mini_games.crossy_road.CrossyRoadPositionData;
import com.example.type_battle.dto.mini_games.island_game.IslandGamePositionData;
import com.example.type_battle.model.MiniGameParticipants;
import com.example.type_battle.model.MiniGameSession;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.MiniGameParticipantsRepository;
import com.example.type_battle.repository.MiniGameSessionRepository;
import com.example.type_battle.repository.ParagraphsRepository;
import com.example.type_battle.repository.UserRepository;
import com.example.type_battle.service.CrossyRoadSetupService;
import com.example.type_battle.service.GameTimerService;
import com.example.type_battle.service.IslandGameSetupService;
import com.example.type_battle.service.ObstacleGenerationService;

@Controller
public class MiniGameSessionWebSocketController {

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

    @MessageMapping("/mini-game/request-state/{miniGameSessionId}")
    public void handleMiniGameStateRequest(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;
        Optional<MiniGameSession> sessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        if (sessionOpt.isEmpty()) return;

        List<MiniGameParticipants> allParticipants = miniGameParticipantRepository.findAllByMiniGameSession(sessionOpt.get());
        
        List<MiniGamePlayerData> flatPlayers = allParticipants.stream()
                .map(MiniGamePlayerData::new)
                .toList();
        
        MiniGameLobbyState state = new MiniGameLobbyState(flatPlayers, 0);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, state);
    }

    @MessageMapping("mini_game/ready_up/{miniGameSessionId}")
    public void readyUp(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<MiniGameSession> sessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (sessionOpt.isEmpty() || userOpt.isEmpty()) return;

        MiniGameSession miniGameSession = sessionOpt.get();
        User user = userOpt.get();
        Optional<MiniGameParticipants> participantOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(miniGameSession, user);

        if (participantOpt.isEmpty()) return;

        MiniGameParticipants miniGameParticipant = participantOpt.get();
        miniGameParticipant.setIs_ready(true);
        miniGameParticipantRepository.save(miniGameParticipant);

        List<MiniGameParticipants> allParticipants = miniGameParticipantRepository.findAllByMiniGameSession(miniGameSession);
        
        List<MiniGamePlayerData> flatPlayers = allParticipants.stream()
                .map(MiniGamePlayerData::new)
                .toList();
        
        MiniGameLobbyState state = new MiniGameLobbyState(flatPlayers, 0);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, state);

        boolean everyoneReady = allParticipants.stream().allMatch(MiniGameParticipants::isIs_ready);
        if (everyoneReady) {
            miniGameSession.setStatus("in_progress");
            miniGameSessionRepository.save(miniGameSession);
            gameTimerService.startMiniGameTimer(miniGameSessionId);

            Map<String, Object> gameStartMessage = new HashMap<>();
            gameStartMessage.put("type", "mini_game_start");
            gameStartMessage.put("startTime", System.currentTimeMillis());

            gameStartMessage.put("cannons", islandGameSetupService.generateInitialCannons());
            gameStartMessage.put("obstacles", obstacleGenerationService.generateObstacles());
            gameStartMessage.put("initialPositions", crossyRoadSetupService.generateInitialPositions(allParticipants));
            messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, gameStartMessage);
        }
    }

    @MessageMapping("/mini_game/crossy_road/position/{miniGameSessionId}")
    public void handleCrossyRoadPosition(@DestinationVariable Long miniGameSessionId, @Payload CrossyRoadPositionData positionData, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;
        positionData.setUid(uid);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, Map.of("type", "crossy_road_position_update", "data", positionData));
    }

    @MessageMapping("/mini_game/island_game/position/{miniGameSessionId}")
    public void handleIslandGamePosition(@DestinationVariable Long miniGameSessionId, @Payload IslandGamePositionData positionData, SimpMessageHeaderAccessor headerAccessor) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<MiniGameSession> mgSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (mgSessionOpt.isEmpty() || userOpt.isEmpty()) return;

        Optional<MiniGameParticipants> mgpOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(mgSessionOpt.get(), userOpt.get());
        if (mgpOpt.isPresent()) {
            MiniGameParticipants mgp = mgpOpt.get();
            if (gameTimerService.isMiniGameParticipantDead(miniGameSessionId, mgp.getId())) {
                return;
            }
        }

        positionData.setUid(uid);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, Map.of("type", "island_game_position_update", "data", positionData));
    }

    @MessageMapping("/mini_game/island_game/death/{miniGameSessionId}")
    public void handleIslandGameDeath(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor, @Payload Map<String, Object> payload) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);

        if (userOpt.isEmpty() || miniGameSessionOpt.isEmpty()) return;

        User user = userOpt.get();
        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        Optional<MiniGameParticipants> miniGameParticipantsOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(miniGameSession, user);

        if (miniGameParticipantsOpt.isEmpty()) return;

        MiniGameParticipants miniGameParticipants = miniGameParticipantsOpt.get();
        gameTimerService.markMiniGameParticipantDead(miniGameSessionId, miniGameParticipants.getId());

        double x = 0.0;
        double y = 0.0;
        if (payload != null) {
            try {
                Number nx = (Number) payload.get("x");
                Number ny = (Number) payload.get("y");
                if (nx != null && ny != null) {
                    x = nx.doubleValue();
                    y = ny.doubleValue();
                    gameTimerService.recordMiniGameGhostPosition(miniGameSessionId, user.getFirebaseUid(), x, y);
                }
            } catch (Exception ignored) {}
        }

        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "island_game_death");
        msg.put("uid", user.getFirebaseUid());
        msg.put("x", x);
        msg.put("y", y);
        messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, msg);
    }

    @MessageMapping("/stacker_points/{miniGameSessionId}")
    public void hanldeStackerPoints(@DestinationVariable Long miniGameSessionId, SimpMessageHeaderAccessor headerAccessor, @Payload Map<String, Object> stackerPointsData) {
        String uid = resolveUid(headerAccessor);
        if (uid == null) return;

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);

        if (userOpt.isEmpty() || miniGameSessionOpt.isEmpty()) return;

        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        User user = userOpt.get();
        Optional<MiniGameParticipants> miniGameParticipantsOpt = miniGameParticipantRepository.findByMiniGameSessionAndUser(miniGameSession, user);

        if (miniGameParticipantsOpt.isEmpty()) return;

        Integer pointsToAdd = (Integer) stackerPointsData.get("highScore");
        if (pointsToAdd == null) return;

        MiniGameParticipants miniGameParticipants = miniGameParticipantsOpt.get();
        miniGameParticipants.setScore(pointsToAdd);
        miniGameParticipantRepository.save(miniGameParticipants);
    }


}

