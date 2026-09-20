package com.middleware.gateway.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryEvent implements Serializable {

    private String jobId;
    private String tenantId;
    private String status; // "PROCESSING", "THROTTLED", "COMPLETED", "CONFLICT_DETECTED"
    private Integer progressPercentage;
    private String message;
    private String timestamp;

    public static TelemetryEvent create(String jobId, String tenantId, String status, Integer progressPercentage, String message) {
        return TelemetryEvent.builder()
                .jobId(jobId)
                .tenantId(tenantId != null ? tenantId.toUpperCase() : "GLOBAL")
                .status(status)
                .progressPercentage(progressPercentage)
                .message(message)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
    }
}
