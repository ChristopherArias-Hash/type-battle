package com.example.type_battle.model;

import jakarta.persistence.*;

@Entity
@Table(name="game_participants")
public class GameParticipants {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "game_session_id", nullable = false)
    private GameSessions gameSessions;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "score")
    private int score;

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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }


}



