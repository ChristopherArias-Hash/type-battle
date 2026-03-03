package com.example.type_battle.repository;

import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GameParticipantsRepository extends JpaRepository<GameParticipants, Long> {
    List<GameParticipants> findAllByGameSessions(GameSessions session);

    List<GameParticipants> findAllByGameSessionsId(Long id);

    boolean existsByGameSessionsAndUser(GameSessions session, User user);

    Optional<GameParticipants> findByGameSessionsAndUser(GameSessions session, User user);

    List<GameParticipants> findAllByUser(User user);

    List<GameParticipants> findByUserAndGameSessions_Status(User user, String status);

    //  JOIN FETCH. This grabs the Participant AND the Session in exactly 1 query.
    @Query("SELECT p FROM GameParticipants p JOIN FETCH p.gameSessions s WHERE p.user = :user AND s.status IN :activeStatuses")
    List<GameParticipants> findActiveParticipations(@Param("user") User user, @Param("activeStatuses") List<String> activeStatuses);
}