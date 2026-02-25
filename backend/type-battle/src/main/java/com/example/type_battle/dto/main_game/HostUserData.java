package com.example.type_battle.dto.main_game;

public class HostUserData {
    private final String displayName;
    private final String firebaseUid;
    private final String imageUrl;


    public HostUserData(String displayName, String firebaseUid, String imageUrl) {
        this.displayName = displayName;
        this.firebaseUid = firebaseUid;
        this.imageUrl = imageUrl;

    }

    public String getDisplayName() {
        return displayName;
    }

    public String getFirebaseUid() {
        return firebaseUid;
    }

    public String getImageUrl() {
        return imageUrl;
    }


}
