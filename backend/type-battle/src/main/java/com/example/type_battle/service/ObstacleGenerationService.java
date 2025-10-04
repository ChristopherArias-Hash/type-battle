package com.example.type_battle.service;

import com.example.type_battle.DTO.ObstacleData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ObstacleGenerationService {

    private static final int GRID_SIZE_V = 22;
    private static final int GRID_SIZE_H = 14;

    private static final List<VehicleType> VEHICLE_TYPES = List.of(
            new VehicleType("car", 2, "car-red"),
            new VehicleType("truck", 3, "truck-green"),
            new VehicleType("car", 2, "car-blue"),
            new VehicleType("car", 2, "car-purple")
    );

    public List<ObstacleData> generateObstacles() {
        List<ObstacleData> obstacleData = new ArrayList<>();
        Random random = ThreadLocalRandom.current();

        // Loop through each road lane (excluding start and end zones)
        for (int i = 1; i < GRID_SIZE_V - 1; i++) {
            int carsInLane = random.nextInt(2) + 1; // 1 or 2 cars
            // Using the original speed range but dividing by a smaller number finds a good middle ground.
            // Change "/ 10.0" to a smaller number (e.g., / 8.0) for FASTER cars.
            // Change it to a larger number (e.g., / 12.0) for SLOWER cars.
            double originalSpeed = random.nextDouble() * 0.03 + 0.02;
            double speedInTilesPerMs = originalSpeed / 5.0; // Adjusted for a balanced speed
            double speed = speedInTilesPerMs * (random.nextBoolean() ? 1 : -1);

            for (int j = 0; j < carsInLane; j++) {
                VehicleType vehicleType = VEHICLE_TYPES.get(random.nextInt(VEHICLE_TYPES.size()));
                double x = random.nextDouble() * GRID_SIZE_H + (j * (GRID_SIZE_H / (double) carsInLane));

                obstacleData.add(new ObstacleData(
                        i,
                        x,
                        vehicleType.width,
                        vehicleType.type,
                        vehicleType.style,
                        speed
                ));
            }
        }
        return obstacleData;
    }

    // Helper inner class for vehicle types
    private static class VehicleType {
        String type;
        int width;
        String style;

        VehicleType(String type, int width, String style) {
            this.type = type;
            this.width = width;
            this.style = style;
        }
    }
}