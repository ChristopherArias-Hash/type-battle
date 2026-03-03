package com.example.type_battle.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.example.type_battle.dto.mini_games.MiniGameLobbyState;
import com.example.type_battle.dto.mini_games.MiniGamePlayerData;
import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.MiniGameParticipants;
import com.example.type_battle.model.MiniGameSession;
import com.example.type_battle.model.MiniGames;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.MiniGameParticipantsRepository;
import com.example.type_battle.repository.MiniGameSessionRepository;
import com.example.type_battle.repository.MiniGamesRepository;
import com.example.type_battle.repository.UserRepository;

import jakarta.annotation.PreDestroy;

@Component
public class GameTimerService {

    @Autowired
    private GameSessionsRepository sessionRepository;
    @Autowired
    private GameParticipantsRepository participantsRepository;
    @Autowired
    private MiniGamesRepository miniGamesRepository;
    @Autowired
    private MiniGameSessionRepository miniGameSessionRepository;
    @Autowired
    private MiniGameParticipantsRepository miniGameParticipantRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);
    private final Map<String, ScheduledFuture<?>> gameTimers = new ConcurrentHashMap<>();
    private final Map<Long, ScheduledFuture<?>> miniGameTimers = new ConcurrentHashMap<>();

    // NEW: Transition Timers
    private final Map<String, ScheduledFuture<?>> transitionTimers = new ConcurrentHashMap<>();
    private final Map<String, Integer> localTransitionClocks = new ConcurrentHashMap<>();

    private final Set<Long> processingMiniGames = ConcurrentHashMap.newKeySet();

    private final Map<String, Boolean> gamePaused = new ConcurrentHashMap<>();
    private final Map<String, Integer> remainingTimeBeforePause = new ConcurrentHashMap<>();
    private final Map<String, Set<Integer>> triggeredPausePoints = new ConcurrentHashMap<>();

    private final Map<String, Integer> localGameClocks = new ConcurrentHashMap<>();
    private final Map<Long, Integer> localMiniGameClocks = new ConcurrentHashMap<>();

    // NEW: Cache participants in memory to stop DB spam during live score updates
    private final Map<Long, List<MiniGameParticipants>> activeMiniGameParticipants = new ConcurrentHashMap<>();

    private final Set<Integer> pausePoints = Set.of(44, 29, 14);
    private final List<Integer> miniGameBonusPoints = List.of(100, 75, 50, 25);
    private final int LONG_GAME = 60;
    private final int SHORT_GAME = 30;

    private final Map<Long, Set<Long>> miniGameDeadParticipantIds = new ConcurrentHashMap<>();
    private final Map<Long, Map<String, double[]>> miniGameDeadGhostPositions = new ConcurrentHashMap<>();
    private final Map<String, Set<Long>> usedMiniGameIdsBySession = new ConcurrentHashMap<>();

    public void startGameTimer(String sessionId, int durationSeconds) {
        stopGameTimer(sessionId);
        triggeredPausePoints.put(sessionId, new HashSet<>());
        localGameClocks.put(sessionId, durationSeconds);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            if (gamePaused.getOrDefault(sessionId, false)) return;

            int remainingTime = localGameClocks.getOrDefault(sessionId, 0) - 1;
            localGameClocks.put(sessionId, remainingTime);

            Set<Integer> triggered = triggeredPausePoints.get(sessionId);

            if (pausePoints.contains(remainingTime) && triggered != null && !triggered.contains(remainingTime)) {
                Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
                if (sessionOpt.isPresent()) {
                    triggered.add(remainingTime);
                    pauseGame(sessionId, remainingTime);
                }
            } else if (remainingTime <= 0) {
                endGame(sessionId);
                stopGameTimer(sessionId);
            } else {
                Map<String, Object> timerUpdate = new HashMap<>();
                timerUpdate.put("remainingTime", remainingTime);
                timerUpdate.put("type", "game_tick");
                timerUpdate.put("isPaused", false);
                messagingTemplate.convertAndSend("/topic/game/" + sessionId, timerUpdate);
            }
        }, 1, 1, TimeUnit.SECONDS);

        gameTimers.put(sessionId, future);
    }

    private void pauseGame(String sessionId, int remainingTime) {
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) return;

        GameSessions mainSession = sessionOpt.get();

        MiniGameSession newMiniGameSession = new MiniGameSession();
        newMiniGameSession.setGameSessions(mainSession);
        newMiniGameSession.setTriggerTime(remainingTime);
        newMiniGameSession.setStatus("waiting");

        long randomMiniGameId = 0;
        List<MiniGames> allGames = miniGamesRepository.findAll();
        if (allGames == null || allGames.isEmpty()) return;

        Set<Long> usedForThisSession = usedMiniGameIdsBySession.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet());

        List<MiniGames> unused = new ArrayList<>();
        for (MiniGames g : allGames) {
            if (!usedForThisSession.contains(g.getId())) unused.add(g);
        }

        if (unused.isEmpty()) return;

        MiniGames selected = unused.get((int) (Math.random() * unused.size()));
        randomMiniGameId = selected.getId();
        newMiniGameSession.setMiniGames(selected);
        usedForThisSession.add(randomMiniGameId);

        miniGameSessionRepository.save(newMiniGameSession);

        List<GameParticipants> mainSessionParticipants = participantsRepository.findAllByGameSessions(mainSession);
        for (GameParticipants participant : mainSessionParticipants) {
            MiniGameParticipants miniGameParticipant = new MiniGameParticipants();
            miniGameParticipant.setScore(0);
            miniGameParticipant.setUser(participant.getUser());
            miniGameParticipant.setIs_ready(false);
            miniGameParticipant.setMiniGameSession(newMiniGameSession);
            miniGameParticipantRepository.save(miniGameParticipant);
        }

        gamePaused.put(sessionId, true);
        remainingTimeBeforePause.put(sessionId, remainingTime);

        Map<String, Object> pauseMessage = new HashMap<>();
        pauseMessage.put("type", "game_pause");
        if (randomMiniGameId == 1) {
            pauseMessage.put("duration", SHORT_GAME);
        } else {
            pauseMessage.put("duration", LONG_GAME);
        }
        pauseMessage.put("miniGameId", randomMiniGameId);
        pauseMessage.put("miniGameSessionId", newMiniGameSession.getId());

        messagingTemplate.convertAndSend("/topic/game/" + sessionId, pauseMessage);
    }

    public void startMiniGameTimer(Long miniGameSessionId) {
        ScheduledFuture<?> oldFuture = miniGameTimers.remove(miniGameSessionId);
        if (oldFuture != null) oldFuture.cancel(true);

        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        if (miniGameSessionOpt.isEmpty()) return;

        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        miniGameSession.setStatus("in_progress");
        miniGameSession.setStartTime(System.currentTimeMillis());
        miniGameSessionRepository.save(miniGameSession);

        // Load participants into MEMORY CACHE
        List<MiniGameParticipants> initialParticipants = miniGameParticipantRepository.findAllByMiniGameSession(miniGameSession);
        activeMiniGameParticipants.put(miniGameSessionId, initialParticipants);

        miniGameDeadParticipantIds.put(miniGameSessionId, ConcurrentHashMap.newKeySet());
        miniGameDeadGhostPositions.put(miniGameSessionId, new ConcurrentHashMap<>());

        Long gameId = miniGameSession.getMiniGames() != null ? miniGameSession.getMiniGames().getId() : 0L;
        final boolean isIslandGame = Objects.equals(gameId, 3L);
        final int duration = (gameId == 1L) ? SHORT_GAME : LONG_GAME;

        localMiniGameClocks.put(miniGameSessionId, duration);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            int remainingTime = localMiniGameClocks.getOrDefault(miniGameSessionId, 0) - 1;
            localMiniGameClocks.put(miniGameSessionId, remainingTime);

            // Fetch from IN-MEMORY CACHE (No DB Query!)
            List<MiniGameParticipants> participants = activeMiniGameParticipants.getOrDefault(miniGameSessionId, Collections.emptyList());

            if (isIslandGame) {
                Set<Long> deadSet = miniGameDeadParticipantIds.getOrDefault(miniGameSessionId, Collections.emptySet());
                Map<String, double[]> ghostMap = miniGameDeadGhostPositions.getOrDefault(miniGameSessionId, Map.of());

                List<String> deadUids = new ArrayList<>();
                List<Map<String, Object>> deadPlayers = new ArrayList<>();

                for (MiniGameParticipants p : participants) {
                    if (deadSet.contains(p.getId())) {
                        if (p.getUser() != null) {
                            String uid = p.getUser().getFirebaseUid();
                            deadUids.add(uid);
                            double[] pos = ghostMap.get(uid);
                            if (pos != null && pos.length == 2) {
                                Map<String, Object> dp = new HashMap<>();
                                dp.put("uid", uid);
                                dp.put("x", pos[0]);
                                dp.put("y", pos[1]);
                                deadPlayers.add(dp);
                            }
                        }
                    } else {
                        // Increment score IN MEMORY ONLY (No DB Save)
                        p.setScore(p.getScore() + 1);
                    }
                }

                if (participants.isEmpty() || deadSet.size() >= participants.size()) {
                    endMiniGame(miniGameSessionId);
                    return;
                }

                if (remainingTime <= 0) {
                    endMiniGame(miniGameSessionId);
                } else {
                    List<MiniGamePlayerData> flatPlayers = participants.stream().map(MiniGamePlayerData::new).toList();
                    Map<String, Object> update = new HashMap<>();
                    update.put("players", flatPlayers);
                    update.put("remainingTime", remainingTime);
                    update.put("deadUids", deadUids);
                    update.put("deadPlayers", deadPlayers);
                    messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, update);
                }
            } else {
                if (remainingTime <= 0) {
                    endMiniGame(miniGameSessionId);
                } else {
                    List<MiniGamePlayerData> flatPlayers = participants.stream().map(MiniGamePlayerData::new).toList();
                    MiniGameLobbyState state = new MiniGameLobbyState(flatPlayers, remainingTime);
                    messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, state);
                }
            }
        }, 1, 1, TimeUnit.SECONDS);

        miniGameTimers.put(miniGameSessionId, future);
    }

    private void endMiniGame(Long miniGameSessionId) {
        if (!processingMiniGames.add(miniGameSessionId)) return;
        try {
            Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
            if (miniGameSessionOpt.isEmpty()) return;

            MiniGameSession miniGameSession = miniGameSessionOpt.get();
            if ("finished".equals(miniGameSession.getStatus())) return;

            // BULK SAVE Final Scores from Memory to DB
            List<MiniGameParticipants> finalParticipants = activeMiniGameParticipants.get(miniGameSessionId);
            if (finalParticipants != null) {
                miniGameParticipantRepository.saveAll(finalParticipants);
            }

            String sessionId = miniGameSession.getGameSessions().getLobbyCode();
            processMiniGameResults(miniGameSessionId, sessionId);
            miniGameSession.setStatus("finished");
            miniGameSessionRepository.save(miniGameSession);

            // NEW: Instead of resuming instantly, start the transition timer!
            startTransitionTimer(sessionId);

        } finally {
            processingMiniGames.remove(miniGameSessionId);
            miniGameDeadParticipantIds.remove(miniGameSessionId);
            miniGameDeadGhostPositions.remove(miniGameSessionId);
            localMiniGameClocks.remove(miniGameSessionId);
            activeMiniGameParticipants.remove(miniGameSessionId); // Clean up memory
        }
    }

    private void processMiniGameResults(Long miniGameSessionId, String sessionId) {
        ScheduledFuture<?> future = miniGameTimers.remove(miniGameSessionId);
        if (future != null) future.cancel(true);

        Optional<GameSessions> mainSessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (mainSessionOpt.isEmpty()) return;
        GameSessions mainGameSession = mainSessionOpt.get();

        // Get sorted results directly from memory cache instead of DB
        List<MiniGameParticipants> participants = activeMiniGameParticipants.getOrDefault(miniGameSessionId, Collections.emptyList());
        List<MiniGameParticipants> sortedMiniGamePs = participants.stream()
                .sorted(Comparator.comparingInt(MiniGameParticipants::getScore).reversed())
                .toList();

        List<GameParticipants> participantsToUpdate = new ArrayList<>();
        for (int i = 0; i < sortedMiniGamePs.size(); i++) {
            if (i < miniGameBonusPoints.size()) {
                MiniGameParticipants miniParticipant = sortedMiniGamePs.get(i);
                int bonus = miniGameBonusPoints.get(i);
                User user = miniParticipant.getUser();
                Optional<GameParticipants> mainParticipantOpt = participantsRepository.findByGameSessionsAndUser(mainGameSession, user);
                if (mainParticipantOpt.isPresent()) {
                    GameParticipants mainParticipant = mainParticipantOpt.get();
                    mainParticipant.setScore(mainParticipant.getScore() + bonus);
                    participantsToUpdate.add(mainParticipant);
                }
            }
        }
        if (!participantsToUpdate.isEmpty()) {
            participantsRepository.saveAll(participantsToUpdate);
        }

        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(mainGameSession);
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
    }

    public void updateMiniGameScoreInMemory(Long miniGameSessionId, String firebaseUid, int newScore) {
        List<MiniGameParticipants> participants = activeMiniGameParticipants.get(miniGameSessionId);
        if (participants != null) {
            for (MiniGameParticipants p : participants) {
                if (p.getUser() != null && p.getUser().getFirebaseUid().equals(firebaseUid)) {
                    if (newScore > p.getScore()) {
                        p.setScore(newScore);
                    }
                    break;
                }
            }
        }
    }
    // The 5-Second Transition Timer
    private void startTransitionTimer(String sessionId) {
        localTransitionClocks.put(sessionId, 10);

        Map<String, Object> startMsg = new HashMap<>();
        startMsg.put("type", "transition_tick");
        startMsg.put("remainingTime", 10);
        messagingTemplate.convertAndSend("/topic/game/" + sessionId, startMsg);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            int remainingTime = localTransitionClocks.getOrDefault(sessionId, 0) - 1;
            localTransitionClocks.put(sessionId, remainingTime);

            if (remainingTime <= 0) {
                ScheduledFuture<?> tFuture = transitionTimers.remove(sessionId);
                if (tFuture != null) tFuture.cancel(true);
                localTransitionClocks.remove(sessionId);

                resumeGame(sessionId);
            } else {
                Map<String, Object> tickMsg = new HashMap<>();
                tickMsg.put("type", "transition_tick");
                tickMsg.put("remainingTime", remainingTime);
                messagingTemplate.convertAndSend("/topic/game/" + sessionId, tickMsg);
            }
        }, 1, 1, TimeUnit.SECONDS);

        transitionTimers.put(sessionId, future);
    }

    private void resumeGame(String sessionId) {
        gamePaused.put(sessionId, false);
        int remainingTime = remainingTimeBeforePause.get(sessionId)+ 1;
        localGameClocks.put(sessionId, remainingTime);

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isPresent()) {
            GameSessions session = sessionOpt.get();
            long newStartTime = System.currentTimeMillis() - ((long) (session.getGameDuration() - remainingTime) * 1000);
            session.setGameStartTime(newStartTime);
            sessionRepository.save(session);
        }

        Map<String, Object> resumeMessage = new HashMap<>();
        resumeMessage.put("type", "game_resume");
        messagingTemplate.convertAndSend("/topic/game/" + sessionId, resumeMessage);
    }

    public void stopGameTimer(String sessionId) {
        ScheduledFuture<?> future = gameTimers.remove(sessionId);
        if (future != null) future.cancel(true);

        // Ensure transition timer stops too!
        ScheduledFuture<?> tFuture = transitionTimers.remove(sessionId);
        if (tFuture != null) tFuture.cancel(true);

        localTransitionClocks.remove(sessionId);
        localGameClocks.remove(sessionId);
        gamePaused.remove(sessionId);
        remainingTimeBeforePause.remove(sessionId);
        triggeredPausePoints.remove(sessionId);
        usedMiniGameIdsBySession.remove(sessionId);
    }

    private void endGame(String sessionId) {
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) return;

        GameSessions session = sessionOpt.get();
        session.setStatus("finished");
        sessionRepository.save(session);

        Map<String, Object> gameEndMessage = new HashMap<>();
        gameEndMessage.put("type", "game_end");

        List<GameParticipants> allParticipantsScores = participantsRepository.findAllByGameSessions(session);
        List<Map<String, Object>> wpmData = new ArrayList<>();
        for (GameParticipants participants : allParticipantsScores) {
            User user = participants.getUser();
            int score = participants.getScore();
            int wpm = (score / 5);
            Map<String, Object> userWpm = new HashMap<>();
            userWpm.put("userId", user.getId());
            userWpm.put("displayName", user.getDisplayName());
            userWpm.put("wpm", wpm);
            wpmData.add(userWpm);
            if (allParticipantsScores.size() != 1){
                user.setGamesPlayed(user.getGamesPlayed() + 1);
                if (user.getHighestWpm() < wpm) user.setHighestWpm(wpm);
                userRepository.save(user);
            }
        }
        gameEndMessage.put("wpm_data", wpmData);

        Optional<GameParticipants> winner = allParticipantsScores.stream().max(Comparator.comparing(GameParticipants::getScore));
        if (winner.isPresent()) {
            GameParticipants winnerParticipant = winner.get();
            User winnerUser = winnerParticipant.getUser();
            if (winnerUser != null) {
                if (allParticipantsScores.size() != 1) {
                    winnerUser.setGamesWon(winnerUser.getGamesWon() + 1);
                    userRepository.save(winnerUser);
                }
                gameEndMessage.put("text-prefix", "Winner is: ");
                gameEndMessage.put("name", winnerUser.getDisplayName());
                gameEndMessage.put("text-middle", " with a score of ");
                gameEndMessage.put("score", winnerParticipant.getScore());
            }
        }

        messagingTemplate.convertAndSend("/topic/game/" + sessionId, gameEndMessage);
    }

    public void markMiniGameParticipantDead(Long miniGameSessionId, Long miniGameParticipantId) {
        miniGameDeadParticipantIds.computeIfAbsent(miniGameSessionId, k -> ConcurrentHashMap.newKeySet()).add(miniGameParticipantId);
    }

    public void recordMiniGameGhostPosition(Long miniGameSessionId, String uid, double x, double y) {
        miniGameDeadGhostPositions.computeIfAbsent(miniGameSessionId, k -> new ConcurrentHashMap<>()).put(uid, new double[]{x, y});
    }

    public boolean isMiniGameParticipantDead(Long miniGameSessionId, Long miniGameParticipantId) {
        return miniGameDeadParticipantIds.getOrDefault(miniGameSessionId, Collections.emptySet()).contains(miniGameParticipantId);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}