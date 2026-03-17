package com.example.type_battle.cron_jobs;

import com.google.firebase.auth.ExportedUserRecord;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.ListUsersPage;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class FirebaseUserRegistration {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseUserRegistration.class);

    // Runs every 2 hours (at minute 0, second 0, every 2nd hour)
    @Scheduled(cron = "0 0 */2 * * *")
    public void firebaseUserRegistration() {
        logger.info("Starting scheduled task: Cleaning up unverified Firebase users...");

        try {
            FirebaseAuth auth = FirebaseAuth.getInstance();

            // Calculate the timestamp for exactly 2 hours ago
            long twoHoursAgoMillis = Instant.now().minus(2, ChronoUnit.HOURS).toEpochMilli();

            // Fetch the first page of users (null means start from the beginning)
            ListUsersPage page = auth.listUsers(null);

            while (page != null) {
                for (ExportedUserRecord user : page.getValues()) {
                    long creationTime = user.getUserMetadata().getCreationTimestamp();
                    boolean isVerified = user.isEmailVerified();

                    // Check if account is older than 2 hours AND is NOT verified
                    if (!isVerified && creationTime < twoHoursAgoMillis) {
                        try {
                            auth.deleteUser(user.getUid());
                            logger.info("Deleted old, unverified user: {}", user.getUid());

                        } catch (FirebaseAuthException e) {
                            logger.error("Failed to delete user {}: {}", user.getUid(), e.getMessage());
                        }
                    }
                }
                // Move to the next page of users
                page = page.getNextPage();
            }

            logger.info("Finished cleaning up unverified Firebase users.");

        } catch (FirebaseAuthException e) {
            logger.error("Error fetching Firebase users: {}", e.getMessage());
        }
    }
}