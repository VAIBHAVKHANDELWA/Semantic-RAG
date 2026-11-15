package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictResolutionRequestDTO {
    private String action; // PROMOTED_INCOMING, KEEP_EXISTING, REJECT_INCOMING, MANUALLY_MERGED
    private String mergedText;
}
