package com.example.type_battle.controller;

import com.example.type_battle.model.User;
import com.example.type_battle.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
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


}