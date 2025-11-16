package com.example.type_battle.controller;

import com.example.type_battle.DTO.LeaderBoardData;
import com.example.type_battle.DTO.LobbyResponseData;
import com.example.type_battle.DTO.UserData;
import com.example.type_battle.model.GameParticipants;
import com.example.type_battle.model.GameSessions;
import com.example.type_battle.model.Paragraphs;
import com.example.type_battle.model.User;
import com.example.type_battle.repository.GameParticipantsRepository;
import com.example.type_battle.repository.GameSessionsRepository;
import com.example.type_battle.repository.ParagraphsRepository;
import com.example.type_battle.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/protected")
public class UserController {

    @Autowired
    //Connects DB to backend
    private UserRepository userRepository;

    @Autowired
    private GameParticipantsRepository participantsRepository;

    @Autowired
    private GameSessionsRepository sessionRepository;

    @Autowired
    private ParagraphsRepository paragraphsRepository;

    //When user logs in this verifys token from frontend to makesure its a real auth user
    @PostMapping("/verify-token")
    public ResponseEntity<String> verifyToken(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");
        return ResponseEntity.ok("Token valid. UID: " + uid);
    }

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

    //Creates lobby, sets host user, sets creates random lobby code, picks random paragraph from db.
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
        newSession.setStatus("waiting");
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

        return ResponseEntity.ok(new LobbyResponseData(savedSession.getId(), savedSession.getStatus(), savedSession.getLobbyCode()));
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
            User user = userOpt.get();

            //Send data to DTO
            UserData userData = new UserData(
                    user.getDisplayName(),
                    user.getGamesPlayed(),
                    user.getGamesWon(),
                    user.getHighestWpm(),
                    user.getImageUrl()
            );

            return ResponseEntity.ok(userData);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

    }

    //Checks if game session is real, if so then frontend user gets sent in.
    @GetMapping("/game-session")
    public ResponseEntity<?> getGameSession(HttpServletRequest request, @RequestParam String lobbyCode) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        User user = userOpt.get();

        Optional<GameSessions> sessionOpt = sessionRepository.findByLobbyCode(lobbyCode);
        if (sessionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Session not found");
        }

        GameSessions session = sessionOpt.get();

        // Allow re join if user is already in this session
        List<GameParticipants> existingParticipants = participantsRepository.findAllByGameSessions(session);
        boolean isAlreadyParticipant = existingParticipants.stream()
                .anyMatch(p -> p.getUser().getId().equals(user.getId()));

        if (!Objects.equals(session.getStatus(), "waiting") && !isAlreadyParticipant) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Session already started");
        }

        return ResponseEntity.ok(session);
    }


    //Grabs list of all users, sorts by leaderboard wins.
    @GetMapping("leader-board")
    public ResponseEntity<List<LeaderBoardData>> leaderboard(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<LeaderBoardData> leaderboard = userRepository.findAll().stream()
                .sorted(Comparator.comparingInt(User::getGamesWon).reversed())
                .limit(10) //limits list size
                .map(user -> new LeaderBoardData(user.getDisplayName(), user.getGamesWon()))
                .collect(Collectors.toList());

        if (leaderboard.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(leaderboard);
    }


}