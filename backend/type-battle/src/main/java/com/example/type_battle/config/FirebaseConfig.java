package com.example.type_battle.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
public class FirebaseConfig {

    public void initFirebase() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {

            String firebaseEnvStr = System.getenv("FIREBASE_CREDENTIALS");
            InputStream serviceAccount;

            if (firebaseEnvStr != null && !firebaseEnvStr.isEmpty()) {
                // Heroku production: Read from Heroku Config Vars
                serviceAccount = new ByteArrayInputStream(firebaseEnvStr.getBytes(StandardCharsets.UTF_8));
            } else {
                // Local development fallback: Read from resources folder
                serviceAccount = getClass().getClassLoader().getResourceAsStream("servicesAccountKey.json");
            }

            if (serviceAccount == null) {
                throw new IOException("Firebase credentials not found in ENV or resources");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
        }
    }
}