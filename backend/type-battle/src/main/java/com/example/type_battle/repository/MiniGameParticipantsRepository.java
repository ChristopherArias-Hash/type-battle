package com.example.type_battle.repository;

import com.example.type_battle.model.MiniGameParticipants;
import com.example.type_battle.model.MiniGameSession;
import com.example.type_battle.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MiniGameParticipantsRepository extends JpaRepository<MiniGameParticipants, Long> {
    Optional<MiniGameParticipants> findByMiniGameSessionAndUser(MiniGameSession miniGameSession, User user);

    List<MiniGameParticipants> findAllByMiniGameSession(MiniGameSession miniGameSession);
}
