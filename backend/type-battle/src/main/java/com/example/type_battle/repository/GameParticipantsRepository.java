package com.example.type_battle.repository;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameParticipantsRepository extends JpaRepository<GameParticipants, Long> {
    List<GameParticipants> findAllByGameSessions(GameSessions session);

    List<GameParticipants> findAllByGameSessionsId(Long id);

    boolean existsByGameSessionsAndUser(GameSessions session, User user);

    Optional<GameParticipants> findByGameSessionsAndUser(GameSessions session, User user);

    List<GameParticipants> findAllByUser(User user);

    List<GameParticipants> findByUserAndGameSessions_Status(User user, String status);}
