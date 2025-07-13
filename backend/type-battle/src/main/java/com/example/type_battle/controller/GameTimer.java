package com.example.type_battle.controller;

import com.example.type_battle.model.GameSessions;
import com.example.type_battle.repository.GameSessionsRepository;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;

@Component
public class GameTimer {

    @Autowired
    private GameSessionsRepository sessionRepository;

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
            long elapsedSeconds = (currentTime - session.getGameStartTime()) / 1000;
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
        messagingTemplate.convertAndSend("/topic/game/" + sessionId, gameEndMessage);

        System.out.println("[GameTimer] Game ended for session: " + sessionId);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}