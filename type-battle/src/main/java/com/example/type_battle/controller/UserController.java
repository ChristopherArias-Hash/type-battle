package com.example.type_battle.controller;

import com.example.type_battle.model.User;
import com.example.type_battle.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/protected")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/users")
    User newUser(@RequestBody User newUser, HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");
        newUser.setFirebaseUid(uid);
        return userRepository.save(newUser);

    }

    @CrossOrigin(origins = "http://localhost:5173")
    @PostMapping("/verify-token")
    public ResponseEntity<String> verifyToken(HttpServletRequest request) {
        String uid = (String) request.getAttribute("uid");
        return ResponseEntity.ok("Token valid. UID: "+ uid);
    }
}
