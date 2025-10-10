package com.example.type_battle.DTO;

public class LeaderBoardData {
    private String displayName;
    private int gamesWon;

    public LeaderBoardData(String displayName, int gamesWon) {
        this.displayName = displayName;
        this.gamesWon = gamesWon;
    }

    public String getDisplayName() {
        return displayName;

    }
    public int getGamesWon() {
        return gamesWon;
    }
}
