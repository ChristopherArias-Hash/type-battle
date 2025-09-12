package com.example.type_battle.controller;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.UserRepository;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.*;

@Component
public class GameTimer {

    @Autowired
    private GameSessionsRepository sessionRepository;

    @Autowired
    private GameParticipantsRepository participantsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final Map<String, ScheduledFuture<?>> gameTimers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);

    public void startGameTimer(String sessionId, int durationSeconds) {
        // Cancel existing timer if any
        stopGameTimer(sessionId);

        // Start new timer
        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
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
            long elapsedSeconds = (currentTime - session.getGameStartTime()) / 1000; //1 second
            int remainingTime = durationSeconds - (int) elapsedSeconds;


            if (remainingTime <= 0) {
                // Game over
                endGame(sessionId);
                stopGameTimer(sessionId);
            } else {
                // Send timer update
                Map<String, Object> timerUpdate = new HashMap<>();
                timerUpdate.put("remainingTime", remainingTime);
                timerUpdate.put("type", "timer_update");
                messagingTemplate.convertAndSend("/topic/game/" + sessionId, timerUpdate);
            }
        }, 0, 1, TimeUnit.SECONDS);

        gameTimers.put(sessionId, future);
    }

    public void stopGameTimer(String sessionId) {
        ScheduledFuture<?> future = gameTimers.remove(sessionId);
        if (future != null) {
            future.cancel(true);
        }
    }


    private void endGame(String sessionId) {
        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(sessionId);
        if (sessionOpt.isEmpty()) return;

        GameSessions session = sessionOpt.get();
        session.setStatus("finished");
        sessionRepository.save(session);

        // Send game end message
        Map<String, Object> gameEndMessage = new HashMap<>();
        gameEndMessage.put("type", "game_end");
        gameEndMessage.put("message", "Time's up! Game ended.");
        System.out.println("[GameTimer] Game ended for session: " + sessionId);

        //Once game is over it checks everyones scores, whoever has the highest score wins
        List<GameParticipants> allParticipantsScores = participantsRepository.findAllByGameSessions(session);

        //Calculate WPM and set WPM if higher then max
        List<Map<String, Object>> wpmData = new ArrayList<>();

        for (GameParticipants participants : allParticipantsScores) {
            User user = participants.getUser();

            //Logic to add +1 to user's games played db section
            int gamesPlayedByUser = user.getGamesPlayed();
            user.setGamesPlayed(gamesPlayedByUser + 1);
            userRepository.save(user);

            //Wpm logic
            int score = participants.getScore();
            int wpm = (score/5); //Assuming 1 min = 60 seconds, if time change we need diff val
            Map<String, Object> userWpm = new HashMap<>();
            userWpm.put("userId", user.getId());
            userWpm.put("displayName", user.getDisplayName());
            userWpm.put("wpm", wpm);
            wpmData.add(userWpm);

            if (user.getHighestWpm() < wpm){
                user.setHighestWpm(wpm);
                userRepository.save(user);
            }

        }

        gameEndMessage.put("wpm_data", wpmData);
        Optional<GameParticipants> winner = allParticipantsScores.stream()
                .max(Comparator.comparing(GameParticipants::getScore));

        //Grabs winner then grabs the winner user object, to add wins
        if (winner.isPresent()) {
            GameParticipants winnerParticipant = winner.get();
            User winnerUser = winnerParticipant.getUser();
            if (winnerUser != null) {
                int currentWins = winnerUser.getGamesWon();
                winnerUser.setGamesWon(currentWins + 1);
                userRepository.save(winnerUser);
                gameEndMessage.put("win_message", "Winner is: " + winnerUser.getDisplayName() + " with a score of " + winnerParticipant.getScore()) ;
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