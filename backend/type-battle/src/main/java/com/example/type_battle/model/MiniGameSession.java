package com.example.type_battle.model;

import jakarta.persistence.*;


@Entity
@Table(name = "mini_game_sessions")
public class MiniGameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name="game_session_id")
    private GameSessions gameSessions;

    @Column(name="start_time")
    private Long startTime;

    @ManyToOne
    @JoinColumn(name="mini_game_id")
    private MiniGames miniGames;

    @Column(name="trigger_time")
    private int triggerTime;

    @Column(name="status")
    private String status;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public GameSessions getGameSessions() {
        return gameSessions;
    }

    public void setGameSessions(GameSessions gameSessions) {
        this.gameSessions = gameSessions;
    }

    public MiniGames getMiniGames() {
        return miniGames;
    }

    public void setMiniGames(MiniGames miniGames) {
        this.miniGames = miniGames;
    }

    public int getTriggerTime() {
        return triggerTime;
    }

    public void setTriggerTime(int triggerTime) {
        this.triggerTime = triggerTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public Long getStartTime() {
        return startTime;
    }

    public void setStartTime(Long startTime) {
        this.startTime = startTime;
    }
}
