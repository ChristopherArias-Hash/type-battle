package com.example.type_battle.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "game_session")
public class GameSessions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "paragraph_id")
    private Paragraphs paragraph;

    @ManyToOne
    @JoinColumn(name = "host_user_id", nullable = false)
    private User hostUser;

    @Column(name = "status")
    private String status = "waiting";

    @Column(name = "lobby_code", unique = true, nullable = false)
    private String lobbyCode;

    @Column(name = "game_start_time")
    private Long gameStartTime;

    @Column(name = "game_duration")
    private Integer gameDuration = 60; // 60 seconds default

    @Column(name = "players_in_lobby")
    private Integer playersInLobby = 0; // 0 default, 4 is max.

    @JsonIgnore
    @OneToMany(mappedBy = "gameSessions", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MiniGameSession> miniGameSessions = new ArrayList<>();

    // You likely also need this for participants and events!
    @JsonIgnore
    @OneToMany(mappedBy = "gameSessions", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GameParticipants> gameParticipants = new ArrayList<>();


    public List<MiniGameSession> getMiniGameSessions() {
        return miniGameSessions;
    }

    public void setMiniGameSessions(List<MiniGameSession> miniGameSessions) {
        this.miniGameSessions = miniGameSessions;
    }

    public List<GameParticipants> getGameParticipants() {
        return gameParticipants;
    }

    public void setGameParticipants(List<GameParticipants> gameParticipants) {
        this.gameParticipants = gameParticipants;
    }

    public Integer getPlayersInLobby() {
        return playersInLobby;
    }

    public void setPlayersInLobby(Integer playersInLobby) {
        this.playersInLobby = playersInLobby;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Paragraphs getParagraph() {
        return paragraph;
    }

    public void setParagraph(Paragraphs paragraph) {
        this.paragraph = paragraph;
    }

    public User getHostUser() {
        return hostUser;
    }

    public void setHostUser(User hostUser) {
        this.hostUser = hostUser;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getLobbyCode() {
        return lobbyCode;
    }

    public void setLobbyCode(String lobbyCode) {
        this.lobbyCode = lobbyCode;
    }

    public Long getGameStartTime() {
        return gameStartTime;
    }

    public void setGameStartTime(Long gameStartTime) {
        this.gameStartTime = gameStartTime;
    }

    public Integer getGameDuration() {
        return gameDuration;
    }

    public void setGameDuration(Integer gameDuration) {
        this.gameDuration = gameDuration;
    }


}