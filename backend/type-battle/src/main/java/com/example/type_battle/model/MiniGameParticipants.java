package com.example.type_battle.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mini_game_participants")
public class MiniGameParticipants {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "mini_game_session_id")
    private MiniGameSession miniGameSession;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "score")
    private int score = 0;


    @Column(name = "is_ready")
    private boolean is_ready = false;

    public boolean isIs_ready() {
        return is_ready;
    }

    public void setIs_ready(boolean is_ready) {
        this.is_ready = is_ready;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public MiniGameSession getMiniGameSession() {
        return miniGameSession;
    }

    public void setMiniGameSession(MiniGameSession miniGameSession) {
        this.miniGameSession = miniGameSession;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


}
