package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadTicketResponseDTO {
    private String ticketId;
    private String uploadUrl;
    private String objectKey;
    private String bucketName;
    private String tenantId;
    private long expiresInSeconds;
}
