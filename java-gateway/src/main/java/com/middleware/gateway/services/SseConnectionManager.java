package com.middleware.gateway.services;

import com.middleware.gateway.models.TelemetryEvent;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class SseConnectionManager {

    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L;
    private final Map<String, List<SseEmitter>> tenantEmittersMap = new ConcurrentHashMap<>();
    private ScheduledExecutorService heartbeatExecutor;

    @PostConstruct
    public void startHeartbeat() {
        heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeatToAll, 15, 15, TimeUnit.SECONDS);
        log.info("SSE Heartbeat scheduler started (15s interval)");
    }

    @PreDestroy
    public void stopHeartbeat() {
        if (heartbeatExecutor != null && !heartbeatExecutor.isShutdown()) {
            heartbeatExecutor.shutdown();
        }
    }

    private void sendHeartbeatToAll() {
        tenantEmittersMap.forEach((tenant, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (Exception e) {
                    removeEmitter(tenant, emitter, "Heartbeat failed");
                }
            }
        });
    }

    public SseEmitter addEmitter(String tenantId) {
        if (tenantId == null || tenantId.isBlank() || "GLOBAL".equalsIgnoreCase(tenantId) || "ALL".equalsIgnoreCase(tenantId)) {
            throw new IllegalArgumentException("Tenant ID required for SSE subscription.");
        }
        String sanitizedTenant = tenantId.trim().toUpperCase();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        tenantEmittersMap.computeIfAbsent(sanitizedTenant, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.info("Registered SseEmitter for Tenant [{}]. Total: {}", sanitizedTenant, tenantEmittersMap.get(sanitizedTenant).size());

        emitter.onCompletion(() -> removeEmitter(sanitizedTenant, emitter, "Completion"));
        emitter.onTimeout(() -> removeEmitter(sanitizedTenant, emitter, "Timeout"));
        emitter.onError(e -> removeEmitter(sanitizedTenant, emitter, "Error: " + e.getMessage()));

        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to Semantic RAG Stream for Tenant: " + sanitizedTenant));
        } catch (IOException e) {
            removeEmitter(sanitizedTenant, emitter, "Init failure");
        }

        return emitter;
    }

    public void broadcast(String tenantId, String eventName, Object data) {
        if (tenantId == null) return;
        String sanitizedTenant = tenantId.toUpperCase();
        List<SseEmitter> emitters = tenantEmittersMap.get(sanitizedTenant);
        if (emitters == null || emitters.isEmpty()) return;

        List<SseEmitter> failed = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                failed.add(emitter);
            }
        }
        failed.forEach(emitter -> removeEmitter(sanitizedTenant, emitter, "Broadcast failed"));
    }

    public void dispatchToTenant(TelemetryEvent event) {
        if (event == null || event.getTenantId() == null) return;
        broadcast(event.getTenantId(), "TELEMETRY", event);
    }

    private void removeEmitter(String tenantId, SseEmitter emitter, String reason) {
        List<SseEmitter> emitters = tenantEmittersMap.get(tenantId);
        if (emitters != null) {
            emitters.remove(emitter);
            log.debug("Removed SseEmitter for Tenant [{}] due to {}. Remaining: {}", tenantId, reason, emitters.size());
        }
    }
}
