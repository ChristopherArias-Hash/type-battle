// backend/type-battle/src/main/java/com/example/type_battle/service/IslandGameSetupService.java
package com.example.type_battle.service;

import com.example.type_battle.DTO.IslandGameStateData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class IslandGameSetupService {
    private static final int BOARD_SIZE = 30;
    private static final int GAME_DURATION = 60;
    private static final int ROUNDS = 8;
    private static final double ROUND_INTERVAL = (double) GAME_DURATION / ROUNDS; // Should be 7.5
    private static final double ISLAND_RADIUS = 12.0;

    public List<IslandGameStateData.CannonData> generateInitialCannons() {
        List<IslandGameStateData.CannonData> cannons = new ArrayList<>();
        Random random = new Random();

        for (int i = 0; i < ROUNDS; i++) {
            double angle = random.nextDouble() * Math.PI * 2;
            double x = BOARD_SIZE / 2.0 + ISLAND_RADIUS * Math.cos(angle);
            double y = BOARD_SIZE / 2.0 + ISLAND_RADIUS * Math.sin(angle);

            // Calculate spawn time based on the round interval
            int spawnTime = GAME_DURATION - (int)Math.floor(i * ROUND_INTERVAL);
            cannons.add(new IslandGameStateData.CannonData(i, x, y, 0, spawnTime));
        }
        return cannons;
    }
}