package com.example.type_battle.dto.main_game;

public class GameSessionData {
    private final Integer gameDuration;
    private final Long gameStartTime;
    private final String lobbyCode;
    private final int playersInLobby;
    private final String status;
    private final ParagraphData paragraph;
    private final HostUserData hostUser;

    public GameSessionData(
            Integer gameDuration,
            Long gameStartTime,
            String lobbyCode,
            int playersInLobby,
            String status,
            ParagraphData paragraph,
            HostUserData hostUser
    ) {
        this.gameDuration = gameDuration;
        this.gameStartTime = gameStartTime;
        this.lobbyCode = lobbyCode;
        this.playersInLobby = playersInLobby;
        this.status = status;
        this.paragraph = paragraph;
        this.hostUser = hostUser;
    }

    public Integer getGameDuration() {
        return gameDuration;
    }

    public Long getGameStartTime() {
        return gameStartTime;
    }

    public String getLobbyCode() {
        return lobbyCode;
    }

    public int getPlayersInLobby() {
        return playersInLobby;
    }

    public String getStatus() {
        return status;
    }

    public ParagraphData getParagraph() {
        return paragraph;
    }

    public HostUserData getHostUser() {
        return hostUser;
    }
}
