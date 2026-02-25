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
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadImage(HttpServletRequest request, @RequestParam("file") MultipartFile file) {
        String uid = (String) request.getAttribute("uid");

        if (uid == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File exceeds 5MB limit.");
        }

        // Check Mime Type (Only allow images)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("Only image files are allowed.");
        }
        // Upload file
        String key = mediaService.uploadFile(file, uid);

        String imageUrl = "https://media.christopher-arias.com/" + key;


        // Fetch user from DB
        Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setImageUrl(imageUrl);
            userRepository.save(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        return ResponseEntity.ok(key);
    }
}