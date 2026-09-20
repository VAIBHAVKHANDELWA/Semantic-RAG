package com.middleware.gateway.services;

import com.middleware.gateway.models.TelemetryEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class SseConnectionManager {

    // 30 Minutes SSE Connection Timeout
    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L;

    // Thread-safe map of active SseEmitters per tenantId
    private final Map<String, List<SseEmitter>> tenantEmittersMap = new ConcurrentHashMap<>();

    /**
     * Registers a new SseEmitter for a specific tenant scope with lifecycle callbacks.
     */
    public SseEmitter addEmitter(String tenantId) {
        String sanitizedTenant = (tenantId == null || tenantId.isBlank()) ? "GLOBAL" : tenantId.trim().toUpperCase();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        tenantEmittersMap.computeIfAbsent(sanitizedTenant, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("Registered new SseEmitter for Tenant [{}]. Total tenant emitters: {}",
                sanitizedTenant, tenantEmittersMap.get(sanitizedTenant).size());

        // Lifecycle Callbacks to prevent memory leaks in Spring container
        emitter.onCompletion(() -> removeEmitter(sanitizedTenant, emitter, "Completion"));
        emitter.onTimeout(() -> removeEmitter(sanitizedTenant, emitter, "Timeout"));
        emitter.onError(e -> removeEmitter(sanitizedTenant, emitter, "Error: " + e.getMessage()));

        // Initial Connection Handshake Event
        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to Semantic RAG Telemetry Stream for Tenant: " + sanitizedTenant));
        } catch (IOException e) {
            log.warn("Failed sending INIT handshake to SseEmitter for Tenant [{}]: {}", sanitizedTenant, e.getMessage());
            removeEmitter(sanitizedTenant, emitter, "Init failure");
        }

        return emitter;
    }

    /**
     * Dispatches real-time telemetry events to all active browser SSE streams matching tenantId.
     */
    public void dispatchToTenant(TelemetryEvent event) {
        if (event == null) return;

        String tenantId = (event.getTenantId() != null) ? event.getTenantId().toUpperCase() : "GLOBAL";
        log.debug("Dispatching SSE TelemetryEvent [{}] to Tenant [{}]", event.getJobId(), tenantId);

        // Gather target emitters (Tenant specific + Global listeners)
        List<SseEmitter> targetEmitters = new ArrayList<>();
        List<SseEmitter> tenantEmitters = tenantEmittersMap.get(tenantId);
        if (tenantEmitters != null) targetEmitters.addAll(tenantEmitters);

        if (!"GLOBAL".equals(tenantId)) {
            List<SseEmitter> globalEmitters = tenantEmittersMap.get("GLOBAL");
            if (globalEmitters != null) targetEmitters.addAll(globalEmitters);
        }

        if (targetEmitters.isEmpty()) {
            log.debug("No active SSE listeners registered for Tenant [{}]", tenantId);
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();

        for (SseEmitter emitter : targetEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("TELEMETRY")
                        .data(event));
            } catch (Exception e) {
                log.warn("Dead SseEmitter detected during dispatch for Tenant [{}]. Marking for removal.", tenantId);
                deadEmitters.add(emitter);
            }
        }

        // Clean up broken/disconnected emitters
        for (SseEmitter deadEmitter : deadEmitters) {
            removeEmitter(tenantId, deadEmitter, "Disconnected during dispatch");
        }
    }

    private void removeEmitter(String tenantId, SseEmitter emitter, String reason) {
        List<SseEmitter> emitters = tenantEmittersMap.get(tenantId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                tenantEmittersMap.remove(tenantId);
            }
            log.info("Evicted SseEmitter for Tenant [{}] (Reason: {}). Remaining: {}",
                    tenantId, reason, emitters.size());
        }
    }
}
