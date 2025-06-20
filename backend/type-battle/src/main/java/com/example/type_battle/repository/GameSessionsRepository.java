package com.example.type_battle.repository;

import com.example.type_battle.model.GameSessions;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameSessionsRepository extends JpaRepository<GameSessions, Long> {
}
