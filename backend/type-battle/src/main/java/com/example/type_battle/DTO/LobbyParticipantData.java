// LobbyParticipantDTO.java
package com.example.type_battle.DTO;

public class LobbyParticipantData {
    private String displayName;
    private String imageUrl;
    private String firebaseUid;
    private boolean ready;
    private int score;


    public LobbyParticipantData(String displayName, String imageUrl, String firebaseUid, boolean ready, int score) {
        this.displayName = displayName;
        this.imageUrl = imageUrl;
        this.firebaseUid = firebaseUid;
        this.ready = ready;
        this.score = score;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getFirebaseUid() {
        return firebaseUid;
    }

    public boolean isReady() {
        return ready;
    }

    public int getScore() {
        return score;
    }

}
