package com.example.type_battle.dto.home;

public class UserData {
    private final String displayName;
    private final int gamesPlayed;
    private final int gamesWon;
    private final double highestWpm;
    private final String imageUrl;

    public UserData(String displayName, int gamesPlayed, int gamesWon, double highestWpm,  String imageUrl) {
        this.displayName = displayName;
        this.gamesPlayed = gamesPlayed;
        this.gamesWon = gamesWon;
        this.highestWpm = highestWpm;
        this.imageUrl = imageUrl;

    }
    public String getDisplayName() {
        return displayName;
    }

    public int getGamesPlayed() {
        return gamesPlayed;
    }

    public int getGamesWon() {
        return gamesWon;
    }

    public double getHighestWpm() {
        return highestWpm;
    }

    public String getImageUrl() {
        return imageUrl;
    }



}
