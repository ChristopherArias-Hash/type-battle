package com.example.type_battle.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value; // Import @Value
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream; // Import for converting string to InputStream
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets; // Import for character encoding

@Component
public class FirebaseConfig {

    @Value("${FIREBASE_SERVICE_ACCOUNT_KEY_JSON:}") // Inject the environment variable
    private String firebaseServiceAccountKeyJson;

    public void initFirebase() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            if (firebaseServiceAccountKeyJson == null || firebaseServiceAccountKeyJson.isEmpty()) {
                throw new IOException("FIREBASE_SERVICE_ACCOUNT_KEY_JSON environment variable not set.");
            }

            InputStream serviceAccount = new ByteArrayInputStream(firebaseServiceAccountKeyJson.getBytes(StandardCharsets.UTF_8));

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
        }
    }
}