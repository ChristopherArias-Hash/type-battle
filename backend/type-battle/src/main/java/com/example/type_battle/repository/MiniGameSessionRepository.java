package com.example.type_battle.repository;

import com.example.type_battle.model.MiniGameSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MiniGameSessionRepository extends JpaRepository<MiniGameSession, Long> {
}
