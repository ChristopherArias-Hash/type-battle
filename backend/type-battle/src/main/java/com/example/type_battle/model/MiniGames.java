package com.example.type_battle.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mini_games")
public class MiniGames {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mini_game_name")
    private String miniGameName;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMiniGameName() {
        return miniGameName;
    }

    public void setMiniGameName(String miniGameName) {
        this.miniGameName = miniGameName;
    }

}
