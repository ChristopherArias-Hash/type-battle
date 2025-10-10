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

    // A new cannon becomes eligible every 8 seconds -> ~7-8 cannons per game
    private static final int SPAWN_INTERVAL = 8;

    private static final double ISLAND_RADIUS = 12.0;

    // --- New: enforce spacing so cannons don't overlap (in board tiles) ---
    private static final double MIN_CANNON_SEPARATION = 2.5; // ~2.5 tiles apart
    private static final int MAX_TRIES_PER_CANNON = 1000;

    public List<IslandGameStateData.CannonData> generateInitialCannons() {
        List<IslandGameStateData.CannonData> cannons = new ArrayList<>();
        Random random = new Random();

        int numCannons = Math.max(1, GAME_DURATION / SPAWN_INTERVAL);
        System.out.println("[IslandGameSetup] Generating " + numCannons + " cannons every " + SPAWN_INTERVAL + "s.");

        for (int i = 0; i < numCannons; i++) {
            int spawnTime = GAME_DURATION - (i * SPAWN_INTERVAL);

            boolean placed = false;
            for (int attempt = 0; attempt < MAX_TRIES_PER_CANNON; attempt++) {
                double angle = random.nextDouble() * Math.PI * 2.0;
                double x = BOARD_SIZE / 2.0 + ISLAND_RADIUS * Math.cos(angle);
                double y = BOARD_SIZE / 2.0 + ISLAND_RADIUS * Math.sin(angle);

                if (isFarEnough(x, y, cannons)) {
                    cannons.add(new IslandGameStateData.CannonData(i, x, y, 0, spawnTime));
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                // Fallback: spread evenly if random attempts failed (very unlikely),
                // with a tiny outward jitter to guarantee separation.
                double angle = (2.0 * Math.PI) * (i / (double) numCannons);
                double r = ISLAND_RADIUS + 0.75 + random.nextDouble() * 0.5;
                double x = BOARD_SIZE / 2.0 + r * Math.cos(angle);
                double y = BOARD_SIZE / 2.0 + r * Math.sin(angle);
                cannons.add(new IslandGameStateData.CannonData(i, x, y, 0, spawnTime));
            }
        }

        System.out.println("[IslandGameSetup] Generated " + cannons.size() + " cannons total.");
        return cannons;
    }

    private boolean isFarEnough(double x, double y, List<IslandGameStateData.CannonData> existing) {
        for (IslandGameStateData.CannonData c : existing) {
            double dx = x - c.getX();
            double dy = y - c.getY();
            double dist = Math.hypot(dx, dy);
            if (dist < MIN_CANNON_SEPARATION) return false;
        }
        return true;
    }
}
