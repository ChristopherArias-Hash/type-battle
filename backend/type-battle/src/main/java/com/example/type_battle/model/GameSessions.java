package com.example.type_battle.model;

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

    // =========================================================================
    // NEW: THE CASCADE LISTS (This tells Hibernate about the children)
    // =========================================================================

    // Deletes all participants when the lobby is deleted
    @OneToMany(mappedBy = "gameSessions", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GameParticipants> participants = new ArrayList<>();

    // Deletes all mini-games when the lobby is deleted
    @OneToMany(mappedBy = "gameSessions", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MiniGameSession> miniGameSessions = new ArrayList<>();


    // =========================================================================
    // GETTERS AND SETTERS
    // =========================================================================

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

    // Getters and setters for the new lists (Good practice to have them)
    public List<GameParticipants> getParticipants() {
        return participants;
    }

    public void setParticipants(List<GameParticipants> participants) {
        this.participants = participants;
    }

    public List<MiniGameSession> getMiniGameSessions() {
        return miniGameSessions;
    }

    public void setMiniGameSessions(List<MiniGameSession> miniGameSessions) {
        this.miniGameSessions = miniGameSessions;
    }
}