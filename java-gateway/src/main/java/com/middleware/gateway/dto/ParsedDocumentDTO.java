package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedDocumentDTO {
    private String fileName;
    private String rawText;
    private String mimeType;
    private int characterCount;
    private Map<String, String> metadata;
}
