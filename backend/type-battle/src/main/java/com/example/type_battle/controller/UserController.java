package com.example.type_battle.controller;

import com.example.type_battle.model.User;
import com.example.type_battle.r2_storage.MediaService;
import com.example.type_battle.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@RestController
@RequestMapping("/protected")
public class UserController {

    @Autowired
    private UserRepository userRepository;


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

    @CrossOrigin(origins = "http://localhost:5173")
    @PostMapping("/verify-token")
    public ResponseEntity<String> verifyToken(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");
        return ResponseEntity.ok("Token valid. UID: " + uid);
    }

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