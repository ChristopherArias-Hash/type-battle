package com.example.type_battle.controller;

import com.example.type_battle.model.*;
import com.example.type_battle.repository.*;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.endpoints.internal.Value;

@Component
public class GameTimer {
    @Autowired private GameSessionsRepository sessionRepository;

    @Autowired private GameParticipantsRepository participantsRepository;

    @Autowired private MiniGamesRepository miniGamesRepository;

    @Autowired private MiniGameSessionRepository miniGameSessionRepository;

    @Autowired private MiniGameParticipantsRepository miniGameParticipantRepository;

    @Autowired private UserRepository userRepository;

    @Autowired private SimpMessagingTemplate messagingTemplate;



    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);
    private final Map<String, ScheduledFuture<?>> gameTimers = new ConcurrentHashMap<>();
    private final Map<String, Boolean> gamePaused = new ConcurrentHashMap<>();
    private final Map<String, Integer> remainingTimeBeforePause = new ConcurrentHashMap<>();
    private final Map<String, Set<Integer>> triggeredPausePoints = new ConcurrentHashMap<>();
    private final Set<Integer> pausePoints = Set.of(45, 30, 15);
    private final int PAUSE_DURATION = 100000;
    public void startGameTimer(String sessionId, int durationSeconds) {
        // Cancel existing timer if any
        stopGameTimer(sessionId);
        triggeredPausePoints.put(sessionId, new HashSet<>());

        // Start new timer
        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            if (gamePaused.getOrDefault(sessionId, false)) {
                return;
            }

            Optional<GameSessions> sessionOpt =
                    sessionRepository.findByLobbyCode(sessionId);
            if (sessionOpt.isEmpty()) {
                stopGameTimer(sessionId);
                return;
            }

            GameSessions session = sessionOpt.get();
            if (session.getGameStartTime() == null) {
                stopGameTimer(sessionId);
                return;
            }

            long currentTime = System.currentTimeMillis();
            long elapsedSeconds =
                    (currentTime - session.getGameStartTime()) / 1000; // 1 second
            int remainingTime = durationSeconds - (int) elapsedSeconds;

            Set<Integer> triggered = triggeredPausePoints.get(sessionId);

            if (pausePoints.contains(remainingTime) && triggered != null
                    && !triggered.contains(remainingTime)) {
                triggered.add(remainingTime); // Mark this point as used
                pauseGame(sessionId, remainingTime);
            } else if (remainingTime <= 0) {
                endGame(sessionId);
                stopGameTimer(sessionId);
            } else {
                Map<String, Object> timerUpdate = new HashMap<>();
                timerUpdate.put("remainingTime", remainingTime);
                timerUpdate.put("type", "timer_update");
                messagingTemplate.convertAndSend(
                        "/topic/game/" + sessionId, timerUpdate);
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

        long totalMiniGames = miniGamesRepository.count();
        if(totalMiniGames > 0) {
            long randomId = (long) (Math.random() * totalMiniGames) +1;
            Optional<MiniGames> miniGameOpt = miniGamesRepository.findById(randomId);
            if (miniGameOpt.isPresent()) {
                newMiniGameSession.setMiniGames(miniGameOpt.get());
            } else {
                System.out.println("[GameTimer] ERROR: Randomly selected mini-game ID " + randomId + " was not found.");
                return; // Stop if a game can't be assigned.
            }
        } else {
            // Log an error if no mini-games exist in the database.
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
        pauseMessage.put("miniGameSessionId", newMiniGameSession.getId());
        messagingTemplate.convertAndSend("/topic/game/" + sessionId, pauseMessage);

        scheduler.schedule(
                () -> resumeGame(sessionId), PAUSE_DURATION, TimeUnit.SECONDS);
    }

    private void resumeGame(String sessionId) {
        gamePaused.put(sessionId, false);
        int remainingTime = remainingTimeBeforePause.get(sessionId);

        Optional<GameSessions> sessionOpt =
                sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isPresent()) {
            GameSessions session = sessionOpt.get();
            long newStartTime = System.currentTimeMillis()
                    - ((long) (session.getGameDuration() - remainingTime) * 1000);
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
        triggeredPausePoints.remove(sessionId); // Add this line
    }

    private void endGame(String sessionId) {
        Optional<GameSessions> sessionOpt =
                sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty())
            return;

        GameSessions session = sessionOpt.get();
        session.setStatus("finished");
        sessionRepository.save(session);

        // Send game end message
        Map<String, Object> gameEndMessage = new HashMap<>();
        gameEndMessage.put("type", "game_end");
        gameEndMessage.put("message", "Time's up! Game ended.");
        System.out.println("[GameTimer] Game ended for session: " + sessionId);

        // Once game is over it checks everyones scores, whoever has the highest
        // score wins
        List<GameParticipants> allParticipantsScores =
                participantsRepository.findAllByGameSessions(session);

        // Calculate WPM and set WPM if higher then max
        List<Map<String, Object>> wpmData = new ArrayList<>();

        for (GameParticipants participants : allParticipantsScores) {
            User user = participants.getUser();

            // Logic to add +1 to user's games played db section
            int gamesPlayedByUser = user.getGamesPlayed();
            user.setGamesPlayed(gamesPlayedByUser + 1);
            userRepository.save(user);

            // Wpm logic
            int score = participants.getScore();
            int wpm = (score
                    / 5); // Assuming 1 min = 60 seconds, if time change we need diff val
            Map<String, Object> userWpm = new HashMap<>();
            userWpm.put("userId", user.getId());
            userWpm.put("displayName", user.getDisplayName());
            userWpm.put("wpm", wpm);
            wpmData.add(userWpm);

            if (user.getHighestWpm() < wpm) {
                user.setHighestWpm(wpm);
                userRepository.save(user);
            }
        }

        gameEndMessage.put("wpm_data", wpmData);
        Optional<GameParticipants> winner = allParticipantsScores.stream().max(
                Comparator.comparing(GameParticipants::getScore));

        // Grabs winner then grabs the winner user object, to add wins
        if (winner.isPresent()) {
            GameParticipants winnerParticipant = winner.get();
            User winnerUser = winnerParticipant.getUser();
            if (winnerUser != null) {
                int currentWins = winnerUser.getGamesWon();
                winnerUser.setGamesWon(currentWins + 1);
                userRepository.save(winnerUser);
                gameEndMessage.put("win_message",
                        "Winner is: " + winnerUser.getDisplayName() + " with a score of "
                                + winnerParticipant.getScore());
                System.out.println("[WebSocket] Winner is "
                        + winnerUser.getDisplayName()
                        + " with updated wins: " + winnerUser.getGamesWon());
            }
        }

        messagingTemplate.convertAndSend(
                "/topic/game/" + sessionId, gameEndMessage);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}