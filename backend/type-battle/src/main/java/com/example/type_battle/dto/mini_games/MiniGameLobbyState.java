package com.example.type_battle.dto.mini_games;

import java.util.List;

public class MiniGameLobbyState {
    private final List<MiniGamePlayerData> players;
    private final int remainingTime;

    public MiniGameLobbyState(List<MiniGamePlayerData> players, int remainingTime) {
        this.players = players;
        this.remainingTime = remainingTime;
    }

    public List<MiniGamePlayerData> getPlayers() {
        return players;
    }

    public int getRemainingTime() {
        return remainingTime;
    }
}
