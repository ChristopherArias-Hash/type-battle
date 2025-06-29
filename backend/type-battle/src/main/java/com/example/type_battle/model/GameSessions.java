package com.example.type_battle.model;

import jakarta.persistence.*;

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

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Paragraphs getParagraph() { return paragraph; }
    public void setParagraph(Paragraphs paragraph) { this.paragraph = paragraph; }

    public User getHostUser() { return hostUser; }
    public void setHostUser(User hostUser) { this.hostUser = hostUser; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLobbyCode() { return lobbyCode; }
    public void setLobbyCode(String lobbyCode) { this.lobbyCode = lobbyCode; }
}
