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

        if (accessor != null) {
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String authHeader = accessor.getFirstNativeHeader("Authorization");

                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);

                    try {
                        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                        String uid = decodedToken.getUid();

                        System.out.println("[WebSocketAuth] UID set: " + uid + " (command: " + accessor.getCommand() + ")");

                        // Store UID in session attributes
                        accessor.getSessionAttributes().put("uid", uid);

                        // Create a Principal and set it
                        Principal principal = new FirebaseUserPrincipal(uid);
                        accessor.setUser(principal);

                    } catch (Exception e) {
                        System.err.println("[WebSocketAuth] Token verification failed: " + e.getMessage());
                        return null; // Reject the connection
                    }
                } else {
                    System.err.println("[WebSocketAuth] No valid Authorization header found");
                    return null; // Reject the connection
                }
            }
        }

        return message;
    }

    // Simple Principal implementation for Firebase UID
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