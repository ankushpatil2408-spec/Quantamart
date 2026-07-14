package com.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for Login Request.
 * Path: src/main/java/com/ecommerce/dto/LoginRequest.java
 */
public class LoginRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
