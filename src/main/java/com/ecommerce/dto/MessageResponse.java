package com.ecommerce.dto;

/**
 * Simple message response DTO.
 * Path: src/main/java/com/ecommerce/dto/MessageResponse.java
 */
public class MessageResponse {
    private String message;

    public MessageResponse(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
