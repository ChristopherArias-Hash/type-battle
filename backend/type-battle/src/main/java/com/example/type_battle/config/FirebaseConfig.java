package com.example.type_battle.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

@Component
public class FirebaseConfig {

    public void initFirebase() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            // Load the service account key from the resources folder
            InputStream serviceAccount = getClass()
                    .getClassLoader()
                    .getResourceAsStream("servicesAccountKey.json");

            if (serviceAccount == null) {
                throw new IOException("Firebase serviceAccountKey.json not found in resources");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
        }
    }
}