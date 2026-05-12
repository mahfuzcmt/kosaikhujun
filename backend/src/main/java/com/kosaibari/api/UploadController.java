package com.kosaibari.api;

import com.kosaibari.domain.User;
import com.kosaibari.security.UserContext;
import com.kosaibari.service.ButcherService;
import com.kosaibari.repository.ButcherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
@Slf4j
public class UploadController {

    private final ButcherService butcherService;
    private final ButcherRepository butcherRepo;

    @Value("${kosaibari.upload.dir:./uploads}")
    private String uploadDir;

    @PostMapping("/photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(@RequestParam("file") MultipartFile file) {
        User currentUser = UserContext.require();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "No file uploaded")
            ));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "Only image files are allowed")
            ));
        }

        try {
            // Create upload directory if not exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String extension = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + "." + extension;

            // Save file
            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());

            // Store path RELATIVE to API base. Frontend prepends API host when rendering.
            // This way the same DB row works across environments (localhost / IP / domain).
            String photoUrl = "/uploads/" + filename;

            // If user is a butcher, update their photo
            if (currentUser.getUserType() == User.UserType.BUTCHER) {
                var butcher = butcherRepo.findByUserId(currentUser.getId());
                if (butcher.isPresent()) {
                    butcherService.updatePhoto(butcher.get().getId(), photoUrl);
                }
            }

            return ResponseEntity.ok(Map.of(
                "data", Map.of(
                    "url", photoUrl,
                    "filename", filename
                )
            ));
        } catch (IOException e) {
            log.error("Failed to upload file: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "error", Map.of("message", "Failed to upload file")
            ));
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return "jpg";
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return "jpg";
        return filename.substring(dot + 1).toLowerCase();
    }
}
