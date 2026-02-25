package com.example.type_battle.dto.mini_games;

import com.example.type_battle.model.MiniGameParticipants;
import com.example.type_battle.model.User;

public class MiniGamePlayerData {
    private final String firebaseUid;
    private final String displayName;
    private final String imageUrl;
    private final int score;
    private final boolean ready;

    public MiniGamePlayerData(MiniGameParticipants p) {
        User u = p.getUser();
        this.firebaseUid = (u != null) ? u.getFirebaseUid() : null;
        this.displayName = (u != null) ? u.getDisplayName() : null;
        this.imageUrl = (u != null) ? u.getImageUrl() : null;
        this.score = p.getScore();
        this.ready = p.isIs_ready();
    }


    public String getFirebaseUid() {
        return firebaseUid;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public int getScore() {
        return score;
    }

    public boolean isReady() {
        return ready;
    }
}
