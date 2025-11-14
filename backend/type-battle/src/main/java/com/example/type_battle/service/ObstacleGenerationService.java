// backend/type-battle/src/main/java/com/example/type_battle/service/ObstacleGenerationService.java

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

        /*
         *  Loop through each road lane (excluding start and end zones)
         *  Keep in mind array starts top to bottom
         */

        for (int i = 1; i < GRID_SIZE_V - 1; i++) {

            // Skip lanes 6, 11, 16 to create safe zones
            if (i % 5 == 1 && i != 1) {
                continue;
            }


            int carsInLane = random.nextInt(2) + 1; // 1 or 2 cars

            double originalSpeed = random.nextDouble() * 0.02 + 0.015;
            double speedInTilesPerMs = originalSpeed / 5.0;
            double speed = speedInTilesPerMs * (random.nextBoolean() ? 1 : -1);

            double baseX = random.nextDouble() * GRID_SIZE_H;
            double fixedOffset = GRID_SIZE_H / (double) carsInLane;

            VehicleType vehicleType = VEHICLE_TYPES.get(random.nextInt(VEHICLE_TYPES.size()));

            for (int j = 0; j < carsInLane; j++) {

                double x = baseX + (j * fixedOffset);

                obstacleData.add(new ObstacleData(
                        i,
                        x,
                        vehicleType.width, // Now all vehicles in this lane (i) have the same width
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