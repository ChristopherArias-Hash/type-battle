package com.example.type_battle.DTO;

public class IslandGamePositionData {
    private String uid;
    private double x;
    private double y;

    public IslandGamePositionData() {}

    public IslandGamePositionData(String uid, double x, double y) {
        this.uid = uid;
        this.x = x;
        this.y = y;
    }

    // Getters and Setters
    public String getUid() { return uid; }
    public void setUid(String uid) { this.uid = uid; }
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }
    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
}