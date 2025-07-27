package com.example.type_battle;

import com.example.type_battle.config.FirebaseConfig;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
//test
@SpringBootApplication
public class 	TypeBattleApplication {

	@Autowired
	private FirebaseConfig firebaseConfig;
	public static void main(String[] args) {
		SpringApplication.run(TypeBattleApplication.class, args);
	}
	@PostConstruct
	public void init() throws IOException {
		firebaseConfig.initFirebase();

	}
}



