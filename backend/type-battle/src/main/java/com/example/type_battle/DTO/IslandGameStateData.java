// backend/type-battle/src/main/java/com/example/type_battle/DTO/IslandGameStateData.java
package com.example.type_battle.DTO;

import java.util.List;
import java.util.Map;

public class IslandGameStateData {

    public static class CannonData {
        public long id;
        public double x;
        public double y;

        public long getId() {
            return id;
        }

        public void setId(long id) {
            this.id = id;
        }

        public double getX() {
            return x;
        }

        public void setX(double x) {
            this.x = x;
        }

        public double getY() {
            return y;
        }

        public void setY(double y) {
            this.y = y;
        }

        public double getAngle() {
            return angle;
        }

        public void setAngle(double angle) {
            this.angle = angle;
        }

        public int getSpawnTime() {
            return spawnTime;
        }

        public void setSpawnTime(int spawnTime) {
            this.spawnTime = spawnTime;
        }

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