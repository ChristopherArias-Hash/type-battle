package com.example.type_battle.model;

import jakarta.persistence.*;

@Entity
@Table(name ="game_session")
public class GameSessions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "paragraph_id", nullable = false)
    private Paragraphs paragraph;

    @Column(name="status")
    private String status; // e.g., "waiting", "in_progress", "finished"

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }


}
