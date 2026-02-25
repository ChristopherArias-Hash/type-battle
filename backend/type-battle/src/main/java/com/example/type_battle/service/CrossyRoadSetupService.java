package com.example.type_battle.service;

import com.example.type_battle.model.MiniGameParticipants;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class CrossyRoadSetupService {
    private static final int GRID_SIZE_H = 14; // Horizontal size of the board
    private static final int GRID_SIZE_V = 22; // Vertical size of the board

    public Map<String, Map<String, Integer>> generateInitialPositions(List<MiniGameParticipants> participants) {
        Map<String, Map<String, Integer>> initialPositions = new HashMap<>();
        // Create a list of available starting columns to avoid collisions
        List<Integer> availableColumns = new ArrayList<>();
        for (int i = 2; i < GRID_SIZE_H - 2; i++) { // Avoid spawning on the very edges
            availableColumns.add(i);
        }

        for (MiniGameParticipants participant : participants) {
            if (availableColumns.isEmpty()) {
                // Fallback if more than 10 players somehow join
                int randomX = ThreadLocalRandom.current().nextInt(GRID_SIZE_H);
                initialPositions.put(participant.getUser().getFirebaseUid(), Map.of("x", randomX, "y", GRID_SIZE_V - 1));
                continue;
            }

            // Pick a random available column and remove it from the list
            int randomIndex = ThreadLocalRandom.current().nextInt(availableColumns.size());
            int xPos = availableColumns.remove(randomIndex);

            initialPositions.put(participant.getUser().getFirebaseUid(), Map.of("x", xPos, "y", GRID_SIZE_V - 1));
        }
        return initialPositions;
    }
}
