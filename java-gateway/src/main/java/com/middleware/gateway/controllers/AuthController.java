package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.LoginRequestDTO;
import com.middleware.gateway.dto.LoginResponseDTO;
import com.middleware.gateway.models.User;
import com.middleware.gateway.repositories.UserRepository;
import com.middleware.gateway.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO request) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        log.info("Processing login attempt for email: [{}]", email);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
            log.warn("Login failed: User not found or inactive for email [{}]", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Login failed: Password mismatch for email [{}]", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getId(),
                user.getRole(),
                user.getTenantId(),
                user.getDisplayName()
        );

        log.info("Login successful for user [{}] (role: {}, tenant: {})", user.getId(), user.getRole(), user.getTenantId());

        LoginResponseDTO response = LoginResponseDTO.builder()
                .token(token)
                .user(LoginResponseDTO.UserDTO.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getDisplayName())
                        .role(user.getRole())
                        .tenant(user.getTenantId())
                        .build())
                .build();

        return ResponseEntity.ok(response);
    }
}

