package com.example.type_battle.repository;

import com.example.type_battle.model.GameSessions;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GameSessionsRepository extends JpaRepository<GameSessions, Long> {
    boolean existsByLobbyCode(String lobbyCode);

    Optional<GameSessions> findByLobbyCode(String lobbyCode);

}
