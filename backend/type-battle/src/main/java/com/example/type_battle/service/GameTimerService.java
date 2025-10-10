// File: christopherarias-hash/type-battle/type-battle-f3f7c56cfb197d3f3293465c8f22cfe580bd9cae/backend/type-battle/src/main/java/com/example/type_battle/controller/GameTimer.java
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
    private final int PAUSE_DURATION = 60; // Duration of the mini-game in seconds

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
                timerUpdate.put("type", "timer_update");
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
        long totalMiniGames = miniGamesRepository.count();
        if (totalMiniGames > 0) {
            randomId = (long) (Math.random() * totalMiniGames) + 1;
            Optional<MiniGames> miniGameOpt = miniGamesRepository.findById(randomId);
            if (miniGameOpt.isPresent()) {
                newMiniGameSession.setMiniGames(miniGameOpt.get());
            } else {
                System.out.println("[GameTimer] ERROR: Randomly selected mini-game ID " + randomId + " was not found.");
                return;
            }
        } else {
            System.out.println("[GameTimer] ERROR: No mini-games are available in the database to create a session.");
            return;
        }
        miniGameSessionRepository.save(newMiniGameSession);
        System.out.println("[GameTimer] Successfully created mini-game session " + newMiniGameSession.getId());

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

            if (remainingTime <= 0) {
                endMiniGame(miniGameSessionId);
            } else {
                List<MiniGameParticipants> participants = miniGameParticipantRepository.findAllByMiniGameSession(sessionOpt.get());
                Map<String, Object> update = new HashMap<>();
                update.put("players", participants);
                update.put("remainingTime", remainingTime);
                messagingTemplate.convertAndSend("/topic/mini-game-lobby/" + miniGameSessionId, update);
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
                Optional<GameParticipants> mainParticipantOpt =
                        participantsRepository.findByGameSessionsAndUser(mainGameSession, user);

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

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}