package com.example.type_battle.controller;

import com.example.type_battle.DTO.LobbyResponse;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.Paragraphs;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.ParagraphsRepository;
import com.example.type_battle.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/protected")
public class UserController {

    @Autowired
    //Connects DB to backend
    private UserRepository userRepository;


    @Autowired
    private GameSessionsRepository sessionRepository;

    @Autowired
    private ParagraphsRepository paragraphsRepository;
    //Adding users, checks for uid, then adds it to DB
    @PostMapping("/users")
    public ResponseEntity<?> registerUser(HttpServletRequest request, @RequestBody User newUserData) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<User> existingUser = userRepository.findByFirebaseUid(uid);
        if (existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists");
        }
        User user = new User();

        user.setFirebaseUid(uid);
        user.setDisplayName(newUserData.getDisplayName());
        user.setEmail(newUserData.getEmail());
        user.setImageUrl(newUserData.getImageUrl());

        userRepository.save(user);
        return ResponseEntity.ok("User registered successfully");
    }

   //When user logs in this verifys token from frontend to makesure its a real auth user
    @PostMapping("/verify-token")
    public ResponseEntity<String> verifyToken(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");
        return ResponseEntity.ok("Token valid. UID: " + uid);
    }
    //Grabs user info, checks for uid first.
    @GetMapping("/user")
    public ResponseEntity<?> getUser(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);

        if (userOpt.isPresent()) {
            return ResponseEntity.ok(userOpt.get());

        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

    }

    @PostMapping("/lobbies")
    public ResponseEntity<?> createLobby(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }

        String lobbyCode;
        do {
            lobbyCode = RandomStringUtils.randomAlphanumeric(6).toUpperCase();
        } while (sessionRepository.existsByLobbyCode(lobbyCode)); // Ensure it's unique

        GameSessions newSession = new GameSessions();
        newSession.setHostUser(userOpt.get());
        newSession.setStatus("started");
        newSession.setLobbyCode(lobbyCode);

        // ASSIGN PARAGRAPH HERE:
        long totalParagraphs = paragraphsRepository.count();
        if (totalParagraphs > 0) {
            long randomId = (long) (Math.random() * totalParagraphs) + 1;
            Optional<Paragraphs> paragraphOpt = paragraphsRepository.findById(randomId);
            paragraphOpt.ifPresent(newSession::setParagraph);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Paragraph not found");
        }

        GameSessions savedSession = sessionRepository.save(newSession);

        return ResponseEntity.ok(new LobbyResponse(savedSession.getId(), savedSession.getStatus(), savedSession.getLobbyCode()));
    }




}