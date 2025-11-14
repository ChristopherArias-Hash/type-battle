package com.example.type_battle.service;

import com.example.type_battle.model.*;
import com.example.type_battle.repository.*;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

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
    private final Set<Long> processingMiniGames = ConcurrentHashMap.newKeySet();

    private final Map<String, Boolean> gamePaused = new ConcurrentHashMap<>();
    private final Map<String, Integer> remainingTimeBeforePause = new ConcurrentHashMap<>();
    private final Map<String, Set<Integer>> triggeredPausePoints = new ConcurrentHashMap<>();

    private final Set<Integer> pausePoints = Set.of(45, 30, 15);
    private final List<Integer> miniGameBonusPoints = List.of(45, 30, 15, 5);
    private final int PAUSE_DURATION = 90000; // Duration of the mini-game in seconds

    // NEW: Track dead participants per mini-game (MiniGameParticipants.id)
    private final Map<Long, Set<Long>> miniGameDeadParticipantIds = new ConcurrentHashMap<>();

    // NEW: Track ghost positions for dead players per mini-game (keyed by uid)
    private final Map<Long, Map<String, double[]>> miniGameDeadGhostPositions = new ConcurrentHashMap<>();

    // NEW: Track which mini-game IDs were already used per main game session (by lobbyCode)
    private final Map<String, Set<Long>> usedMiniGameIdsBySession = new ConcurrentHashMap<>();

    public void startGameTimer(String sessionId, int durationSeconds) {
        stopGameTimer(sessionId);
        triggeredPausePoints.put(sessionId, new HashSet<>());

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            if (gamePaused.getOrDefault(sessionId, false)) {
                return;
            }

            Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
            if (sessionOpt.isEmpty() || sessionOpt.get().getGameStartTime() == null) {
                stopGameTimer(sessionId);
                return;
            }

            GameSessions session = sessionOpt.get();
            long currentTime = System.currentTimeMillis();
            long elapsedSeconds = (currentTime - session.getGameStartTime()) / 1000;
            int remainingTime = durationSeconds - (int) elapsedSeconds;

            Set<Integer> triggered = triggeredPausePoints.get(sessionId);
            if (pausePoints.contains(remainingTime) && triggered != null && !triggered.contains(remainingTime)) {
                triggered.add(remainingTime);
                pauseGame(sessionId, remainingTime);
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
        }, 0, 1, TimeUnit.SECONDS);

        gameTimers.put(sessionId, future);
    }

    private void pauseGame(String sessionId, int remainingTime) {
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) {
            System.out.println("[GameTimer] ERROR: Could not find session " + sessionId + " to create a mini-game for.");
            return;
        }
        GameSessions mainSession = sessionOpt.get();

        MiniGameSession newMiniGameSession = new MiniGameSession();
        newMiniGameSession.setGameSessions(mainSession);
        newMiniGameSession.setTriggerTime(remainingTime);
        newMiniGameSession.setStatus("waiting");

        long randomId = 0;

        //Pick a mini-game that hasn't been used yet for this main session
        List<MiniGames> allGames = miniGamesRepository.findAll();
        if (allGames == null || allGames.isEmpty()) {
            System.out.println("[GameTimer] ERROR: No mini-games are available in the database to create a session.");
            return;
        }

        Set<Long> usedForThisSession = usedMiniGameIdsBySession
                .computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet());

        List<MiniGames> unused = new ArrayList<>();
        for (MiniGames g : allGames) {
            if (!usedForThisSession.contains(g.getId())) {
                unused.add(g);
            }
        }

        if (unused.isEmpty()) {
            // No unused mini-games left -> skip this pause, continue main game
            System.out.println("[GameTimer] INFO: All mini-games already used for session " + sessionId + ". Skipping mini-game at t=" + remainingTime + "s.");
            return;
        }

        // Choose a random unused mini-game
        MiniGames selected = unused.get((int) (Math.random() * unused.size()));
        randomId = selected.getId();
        newMiniGameSession.setMiniGames(selected);
        usedForThisSession.add(randomId);

        miniGameSessionRepository.save(newMiniGameSession);
        System.out.println("[GameTimer] Successfully created mini-game session " + newMiniGameSession.getId() + " (miniGameId=" + randomId + ")");

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
        pauseMessage.put("duration", PAUSE_DURATION);
        pauseMessage.put("miniGameId", randomId);
        pauseMessage.put("miniGameSessionId", newMiniGameSession.getId());
        pauseMessage.put ("miniGameId", randomId);

        messagingTemplate.convertAndSend("/topic/game/" + sessionId, pauseMessage);

    }

    public void startMiniGameTimer(Long miniGameSessionId) {
        ScheduledFuture<?> oldFuture = miniGameTimers.remove(miniGameSessionId);
        if (oldFuture != null) {
            oldFuture.cancel(true);
        }

        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        if (miniGameSessionOpt.isEmpty()) {
            System.err.println("[GameTimer] Error: MiniGameSession with ID " + miniGameSessionId + " not found to start timer.");
            return;
        }

        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        miniGameSession.setStatus("in_progress");
        miniGameSession.setStartTime(System.currentTimeMillis());
        miniGameSessionRepository.save(miniGameSession);
        System.out.println("[GameTimer] Mini-game " + miniGameSessionId + " started!");

        //initialize dead sets for this mini-game session
        miniGameDeadParticipantIds.put(miniGameSessionId, ConcurrentHashMap.newKeySet());
        miniGameDeadGhostPositions.put(miniGameSessionId, new ConcurrentHashMap<>());

        //Determine if this mini-game is the Island game (id == 3)
        final boolean isIslandGame = miniGameSession.getMiniGames() != null
                && Objects.equals(miniGameSession.getMiniGames().getId(), 3L);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            Optional<MiniGameSession> sessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
            if (sessionOpt.isEmpty() || sessionOpt.get().getStartTime() == null) {
                ScheduledFuture<?> currentFuture = miniGameTimers.remove(miniGameSessionId);
                if (currentFuture != null) currentFuture.cancel(true);
                return;
            }

            long startTime = sessionOpt.get().getStartTime();
            long elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000;
            int remainingTime = PAUSE_DURATION - (int) elapsedSeconds;

            // Fetch current participants
            List<MiniGameParticipants> participants = miniGameParticipantRepository.findAllByMiniGameSession(sessionOpt.get());
            if (isIslandGame) {
                //(island only): compute alive, award survival points, and compile dead lists incl. ghost positions
                Set<Long> deadSet = miniGameDeadParticipantIds.getOrDefault(miniGameSessionId, Collections.emptySet());
                Map<String, double[]> ghostMap = miniGameDeadGhostPositions.getOrDefault(miniGameSessionId, Map.of());

                List<String> deadUids = new ArrayList<>();
                List<Map<String, Object>> deadPlayers = new ArrayList<>();

                List<MiniGameParticipants> alive = new ArrayList<>();
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
                        p.setScore(p.getScore() + 1); // survival +1/sec (ISLAND ONLY)
                        alive.add(p);
                    }
                }
                if (!alive.isEmpty()) {
                    miniGameParticipantRepository.saveAll(alive);
                }

                // NEW (island only): If everyone is dead, end the mini-game early
                if (participants.isEmpty() || deadSet.size() >= participants.size()) {
                    System.out.println("[GameTimer] All players eliminated. Ending mini-game " + miniGameSessionId + " early.");
                    endMiniGame(miniGameSessionId);
                    return;
                }

                if (remainingTime <= 0) {
                    endMiniGame(miniGameSessionId);
                } else {
                    // NEW (island only): include deadUids + deadPlayers (with ghost positions)
                    Map<String, Object> update = new HashMap<>();
                    update.put("players", participants);
                    update.put("remainingTime", remainingTime);
                    update.put("deadUids", deadUids);
                    update.put("deadPlayers", deadPlayers);
                    messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, update);
                }
            } else {
                // Non-island mini-games: no survival points / no early-end-on-wipe logic
                if (remainingTime <= 0) {
                    endMiniGame(miniGameSessionId);
                } else {
                    Map<String, Object> update = new HashMap<>();
                    update.put("players", participants);
                    update.put("remainingTime", remainingTime);
                    messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, update);
                }
            }
        }, 0, 1, TimeUnit.SECONDS);

        miniGameTimers.put(miniGameSessionId, future);
    }

    private void endMiniGame(Long miniGameSessionId) {
        // Use the lock to ensure this logic only runs ONCE per mini-game.
        // If another thread is already in here for this ID, we exit immediately.
        if (!processingMiniGames.add(miniGameSessionId)) {
            return;
        }
        try {
            Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
            if (miniGameSessionOpt.isEmpty()) {
                System.err.println("[GameTimer] Error: MiniGameSession with ID " + miniGameSessionId + " not found to end.");
                return;
            }
            MiniGameSession miniGameSession = miniGameSessionOpt.get();
            if ("finished".equals(miniGameSession.getStatus())) {
                return;
            }
            String sessionId = miniGameSession.getGameSessions().getLobbyCode();
            processMiniGameResults(miniGameSessionId, sessionId);
            miniGameSession.setStatus("finished");
            miniGameSessionRepository.save(miniGameSession);
            resumeGame(sessionId);
        } finally {
            // IMPORTANT: Always remove the ID from the set when done, even if there's an error.
            processingMiniGames.remove(miniGameSessionId);
            //cleanup death tracking
            miniGameDeadParticipantIds.remove(miniGameSessionId);
            miniGameDeadGhostPositions.remove(miniGameSessionId);
        }
    }

    private void processMiniGameResults(Long miniGameSessionId, String sessionId) {
        ScheduledFuture<?> future = miniGameTimers.remove(miniGameSessionId);
        if (future != null) {
            future.cancel(true);
        }

        Optional<MiniGameSession> miniGameSessionOpt = miniGameSessionRepository.findById(miniGameSessionId);
        Optional<GameSessions> mainSessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (miniGameSessionOpt.isEmpty() || mainSessionOpt.isEmpty()) {
            System.out.println("Error: Could not find mini-game or main game session to process results.");
            return;
        }

        MiniGameSession miniGameSession = miniGameSessionOpt.get();
        GameSessions mainGameSession = mainSessionOpt.get();

        List<MiniGameParticipants> sortedMiniGamePs = miniGameParticipantRepository.findAllByMiniGameSession(miniGameSession)
                .stream()
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
                    participantsRepository.save(mainParticipant);
                }
            }
        }
        if (!participantsToUpdate.isEmpty()) {
            participantsRepository.saveAll(participantsToUpdate);
        }

        // 2. Fetch the complete, fresh list of ALL participants for the session.
        List<GameParticipants> allParticipants = participantsRepository.findAllByGameSessions(mainGameSession);

        // 3. Broadcast the updated list to all clients so their UI updates.
        messagingTemplate.convertAndSend("/topic/lobby/" + sessionId, allParticipants);
        System.out.println("[GameTimer] Broadcasted updated scores to /topic/lobby/" + sessionId);
    }

    private void resumeGame(String sessionId) {
        gamePaused.put(sessionId, false);
        int remainingTime = remainingTimeBeforePause.get(sessionId);

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
        if (future != null) {
            future.cancel(true);
        }
        gamePaused.remove(sessionId);
        remainingTimeBeforePause.remove(sessionId);
        triggeredPausePoints.remove(sessionId);

        // NEW: clear the used mini-game set for this main session so a new main game can reuse them
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
        gameEndMessage.put("message", "Time's up! Game ended.");

        System.out.println("[GameTimer] Game ended for session: " + sessionId);

        List<GameParticipants> allParticipantsScores = participantsRepository.findAllByGameSessions(session);
        List<Map<String, Object>> wpmData = new ArrayList<>();
        for (GameParticipants participants : allParticipantsScores) {
            User user = participants.getUser();
            int gamesPlayedByUser = user.getGamesPlayed();
            user.setGamesPlayed(gamesPlayedByUser + 1);
            int score = participants.getScore();
            int wpm = (score / 5);
            Map<String, Object> userWpm = new HashMap<>();
            userWpm.put("userId", user.getId());
            userWpm.put("displayName", user.getDisplayName());
            userWpm.put("wpm", wpm);
            wpmData.add(userWpm);
            if (user.getHighestWpm() < wpm) {
                user.setHighestWpm(wpm);
            }
            userRepository.save(user);
        }
        gameEndMessage.put("wpm_data", wpmData);

        Optional<GameParticipants> winner = allParticipantsScores.stream().max(Comparator.comparing(GameParticipants::getScore));
        if (winner.isPresent()) {
            GameParticipants winnerParticipant = winner.get();
            User winnerUser = winnerParticipant.getUser();
            if (winnerUser != null) {
                int currentWins = winnerUser.getGamesWon();
                winnerUser.setGamesWon(currentWins + 1);
                userRepository.save(winnerUser);
                gameEndMessage.put("win_message", "Winner is: " + winnerUser.getDisplayName() + " with a score of " + winnerParticipant.getScore());
                System.out.println("[WebSocket] Winner is " + winnerUser.getDisplayName() + " with updated wins: " + winnerUser.getGamesWon());
            }
        }

        messagingTemplate.convertAndSend("/topic/game/" + sessionId, gameEndMessage);
    }

    // NEW: mark a MiniGameParticipants row as dead (by ID) for this session.
    public void markMiniGameParticipantDead(Long miniGameSessionId, Long miniGameParticipantId) {
        miniGameDeadParticipantIds
                .computeIfAbsent(miniGameSessionId, k -> ConcurrentHashMap.newKeySet())
                .add(miniGameParticipantId);
    }

    // NEW: record ghost position for a dead player (by uid)
    public void recordMiniGameGhostPosition(Long miniGameSessionId, String uid, double x, double y) {
        miniGameDeadGhostPositions
                .computeIfAbsent(miniGameSessionId, k -> new ConcurrentHashMap<>())
                .put(uid, new double[]{x, y});
    }

    // NEW: check if dead
    public boolean isMiniGameParticipantDead(Long miniGameSessionId, Long miniGameParticipantId) {
        return miniGameDeadParticipantIds
                .getOrDefault(miniGameSessionId, Collections.emptySet())
                .contains(miniGameParticipantId);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}
