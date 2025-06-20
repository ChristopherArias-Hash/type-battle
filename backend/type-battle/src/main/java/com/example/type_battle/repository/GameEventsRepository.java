package com.example.type_battle.repository;

import com.example.type_battle.model.GameEvents;
import org.springframework.data.repository.CrudRepository;

public interface GameEventsRepository extends CrudRepository<GameEvents, Long> {
}
