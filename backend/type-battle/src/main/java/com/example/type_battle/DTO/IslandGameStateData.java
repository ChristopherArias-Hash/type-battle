// backend/type-battle/src/main/java/com/example/type_battle/DTO/IslandGameStateData.java
package com.example.type_battle.DTO;

import java.util.List;
import java.util.Map;

public class IslandGameStateData {

    public static class CannonData {
        public long id;
        public double x;
        public double y;
        public double angle;
        public int spawnTime; // Time (in seconds remaining) when this cannon should appear

        public CannonData(long id, double x, double y, double angle, int spawnTime) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.spawnTime = spawnTime;
        }
    }
    // ... rest of the file is the same
}