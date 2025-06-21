package com.example.type_battle.repository;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameParticipantsRepository extends JpaRepository<GameParticipants, Long> {
    List<GameParticipants> findAllByGameSessions(GameSessions session);
    boolean existsByGameSessionsAndUser(GameSessions session, User user);
}
