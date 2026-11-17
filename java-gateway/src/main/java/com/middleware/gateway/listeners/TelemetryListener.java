package com.middleware.gateway.listeners;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.middleware.gateway.models.TelemetryEvent;
import com.middleware.gateway.services.SseConnectionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TelemetryListener {

    private final SseConnectionManager sseConnectionManager;
    private final ObjectMapper objectMapper;

    /**
     * AMQP Queue Declaration for telemetry-queue
     */
    @Bean
    public Queue telemetryQueue() {
        return new Queue("telemetry-queue", true);
    }

    /**
     * RabbitMQ Telemetry Event Listener
     */
    @RabbitListener(queues = "telemetry-queue")
    public void receiveTelemetryEvent(org.springframework.amqp.core.Message message) {
        try {
            String payload = new String(message.getBody(), java.nio.charset.StandardCharsets.UTF_8);
            log.info("Received telemetry message from RabbitMQ: {}", payload);
            TelemetryEvent event = objectMapper.readValue(payload, TelemetryEvent.class);
            sseConnectionManager.dispatchToTenant(event);
        } catch (Exception e) {
            log.error("Failed to parse RabbitMQ telemetry event message: {}", e.getMessage(), e);
        }
    }
}
