package com.example.type_battle.r2_storage;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {
    private final S3Client s3Client;

    @Value("${cloudflare.r2.bucket}")
    private String bucket;

    //EXCEPTIONS
    public static class UnsupportedMediaTypeException extends RuntimeException {
        public UnsupportedMediaTypeException(String msg) { super(msg); }
    }

    public static class FileUploadException extends RuntimeException {
        public FileUploadException(String msg, Throwable cause) { super(msg, cause); }
    }
    private boolean isAllowedImageExtension(String ext) {
        return ext.equals("png") || ext.equals("jpg") || ext.equals("jpeg") || ext.equals("gif");
    }

    public String uploadFile(MultipartFile file, String uid) {
        String original = Optional.ofNullable(file.getOriginalFilename())
                .orElseThrow(() -> new UnsupportedMediaTypeException("Filename is missing"))
                .toLowerCase();

        String contentType = Optional.ofNullable(file.getContentType())
                .orElseThrow(() -> new UnsupportedMediaTypeException("Content-Type is unknown"));

        //Enforce image only MIME types
        if (!contentType.startsWith("image/")) {
            throw new UnsupportedMediaTypeException("Only image files are allowed.");
        }

        //Enforce image file extensions
        String ext = getFileExtension(original);
        if (!isAllowedImageExtension(ext)) {
            throw new UnsupportedMediaTypeException("Only .png, .jpg, .jpeg, .gif files are allowed.");
        }

        //file size limit (5MB)
        long MAX_SIZE = 5 * 1024 * 1024;
        if (file.getSize() > MAX_SIZE) {
            throw new FileUploadException("File exceeds maximum allowed size of 5 MB", null);
        }

        // Save under 'images' folder only
        String key = String.format("%s/images/%s-%s", uid, UUID.randomUUID(), original);

        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        try {
            s3Client.putObject(req, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new FileUploadException("File upload to Cloudflare R2 failed", e);
        }

        return key;
    }


    private String getFileExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx < 0 || idx == filename.length() - 1) {
            throw new IllegalArgumentException("Invalid file extension in filename: " + filename);
        }
        return filename.substring(idx + 1);
    }
}
