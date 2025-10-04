package com.example.type_battle.DTO;

public class LobbyResponseData {
    private Long id;
    private String status;
    private String lobbyCode;

    public LobbyResponseData(Long id, String status, String lobbyCode) {
        this.id = id;
        this.status = status;
        this.lobbyCode = lobbyCode;
    }

    public Long getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public String getLobbyCode() {
        return lobbyCode;
    }
}
