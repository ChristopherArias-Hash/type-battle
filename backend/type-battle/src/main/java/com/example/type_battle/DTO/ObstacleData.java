package com.example.type_battle.DTO;

// A simple DTO to represent an obstacle's state for the client.
public class ObstacleData {
    private int y;          // The vertical lane index
    private double x;       // The initial horizontal position
    private int width;      // The width in tiles
    private String type;    // "car" or "truck"
    private String style;   // "car-red", "truck-green", etc.
    private double speed;   // The speed and direction

    public ObstacleData(int y, double x, int width, String type, String style, double speed) {
        this.y = y;
        this.x = x;
        this.width = width;
        this.type = type;
        this.style = style;
        this.speed = speed;
    }

    // Getters are required for JSON serialization
    public int getY() { return y; }
    public double getX() { return x; }
    public int getWidth() { return width; }
    public String getType() { return type; }
    public String getStyle() { return style; }
    public double getSpeed() { return speed; }
}