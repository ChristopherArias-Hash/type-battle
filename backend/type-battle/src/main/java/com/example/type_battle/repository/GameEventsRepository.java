package com.example.type_battle.repository;

import com.example.type_battle.model.GameEvents;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;

public interface GameEventsRepository extends JpaRepository<GameEvents, Long> {
}
