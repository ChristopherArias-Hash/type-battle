package com.example.type_battle.config;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        // Only process CONNECT commands
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                try {
                    FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                    String uid = decodedToken.getUid();

                    System.out.println("[WebSocketAuth] ✅ Authenticated UID: " + uid);

                    // Store UID in session attributes so we can use it later
                    accessor.getSessionAttributes().put("uid", uid);

                    // Attach a Principal so Spring Security and others can access it
                    accessor.setUser(new FirebaseUserPrincipal(uid));

                } catch (Exception e) {
                    System.err.println("[WebSocketAuth] ❌ Firebase token verification failed: " + e.getMessage());
                    return null; // Reject the connection
                }
            } else {
                System.err.println("[WebSocketAuth] ❌ Missing or invalid Authorization header");
                return null; // Reject the connection
            }
        }

        return message;
    }

    private static class FirebaseUserPrincipal implements Principal {
        private final String uid;

        public FirebaseUserPrincipal(String uid) {
            this.uid = uid;
        }

        @Override
        public String getName() {
            return uid;
        }
    }
}
