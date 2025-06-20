package com.example.type_battle.repository;

import com.example.type_battle.model.GameParticipants;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameParticipantsRepository extends JpaRepository<GameParticipants, Long> {
}
