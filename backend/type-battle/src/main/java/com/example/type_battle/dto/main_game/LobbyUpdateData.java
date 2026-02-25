// LobbyUpdateDTO.java
package com.example.type_battle.dto.main_game;

import java.util.List;

public class LobbyUpdateData {
    private String lobbyCode;
    private int playerCount;
    private String hostUid;
    private List<LobbyParticipantData> participants;


    public LobbyUpdateData(String lobbyCode, int playerCount, String hostUid, List<LobbyParticipantData> participants) {
        this.lobbyCode = lobbyCode;
        this.playerCount = playerCount;
        this.hostUid = hostUid;
        this.participants = participants;
    }

    public List<LobbyParticipantData> getParticipants() {
        return participants;
    }

    public String getHostUid() {
        return hostUid;
    }

    public int getPlayerCount() {
        return playerCount;
    }

    public String getLobbyCode() {
        return lobbyCode;
    }
}
