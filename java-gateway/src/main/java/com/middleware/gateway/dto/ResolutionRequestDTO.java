package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolutionRequestDTO {
    private String choice; // "KEEP_A" (Existing) or "ACCEPT_B" (New)
    private String mergedText; // Optional manual merge content
}
