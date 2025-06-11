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

    public static class UnsupportedMediaTypeException extends RuntimeException {
        public UnsupportedMediaTypeException(String msg) { super(msg); }
    }

    public static class FileUploadException extends RuntimeException {
        public FileUploadException(String msg, Throwable cause) { super(msg, cause); }
    }

    public String uploadFile(MultipartFile file, String uid) {
        // 1. Resolve filename and content type
        String original = Optional.ofNullable(file.getOriginalFilename())
                .orElseThrow(() -> new UnsupportedMediaTypeException("Filename is missing"))
                .toLowerCase();

        String contentType = Optional.ofNullable(file.getContentType())
                .orElseThrow(() -> new UnsupportedMediaTypeException("Content-Type is unknown"));

        // 2. Decide folder by extension
        String ext = getFileExtension(original);
        String categoryFolder = switch (ext) {
            case "jpg", "jpeg", "png", "gif" -> "images";
            case "mp4", "mov"                -> "videos";
            case "pdf", "doc", "docx", "txt" -> "documents";
            default -> throw new UnsupportedMediaTypeException("Unsupported file type: " + contentType);
        };

        // 3. Build key: uid/category/uuid-originalfilename
        String key = String.format("%s/%s/%s-%s", uid, categoryFolder, UUID.randomUUID(), original);

        // 4. Prepare and send S3 PutObject
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
