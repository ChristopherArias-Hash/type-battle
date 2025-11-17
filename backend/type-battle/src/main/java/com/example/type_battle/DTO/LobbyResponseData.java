package com.example.type_battle.DTO;

public class LobbyResponseData {
    private String status;
    private String lobbyCode;

    public LobbyResponseData(String status, String lobbyCode) {
        this.status = status;
        this.lobbyCode = lobbyCode;
    }

    public String getStatus() {
        return status;
    }

    public String getLobbyCode() {
        return lobbyCode;
    }
}
