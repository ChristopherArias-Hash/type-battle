package com.example.type_battle.dto.mini_games.crossy_road;

public class CrossyRoadPositionData {
    private String uid;
    private int x;
    private int y;

    public CrossyRoadPositionData(){

    }
    CrossyRoadPositionData(String uid, int x, int y) {
        this.uid = uid;
        this.x = x;
        this.y = y;
    }
    public String getUid() {
        return uid;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }
}
