package com.middleware.gateway.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMqPublisherService {

    private final RabbitTemplate rabbitTemplate;
    private final RabbitAdmin rabbitAdmin;
    private final ObjectMapper objectMapper;

    public static final String RAW_DOC_QUEUE = "raw-document-queue";
    public static final String RAW_DOC_DLX = "raw-document-dlx";
    public static final String RAW_DOC_DLQ = "raw-document-dlq";
    public static final String TELEMETRY_QUEUE = "telemetry-queue";

    @PostConstruct
    public void setupQueues() {
        try {
            // DLQ
            Queue dlq = QueueBuilder.durable(RAW_DOC_DLQ).build();
            rabbitAdmin.declareQueue(dlq);

            DirectExchange dlx = new DirectExchange(RAW_DOC_DLX, true, false);
            rabbitAdmin.declareExchange(dlx);
            rabbitAdmin.declareBinding(BindingBuilder.bind(dlq).to(dlx).with(RAW_DOC_DLQ));

            // Main ingestion queue with Dead-Letter-Exchange
            Queue mainQueue = QueueBuilder.durable(RAW_DOC_QUEUE)
                    .withArgument("x-dead-letter-exchange", RAW_DOC_DLX)
                    .withArgument("x-dead-letter-routing-key", RAW_DOC_DLQ)
                    .build();
            rabbitAdmin.declareQueue(mainQueue);

            // Telemetry queue
            Queue telemetryQueue = QueueBuilder.durable(TELEMETRY_QUEUE).build();
            rabbitAdmin.declareQueue(telemetryQueue);

            log.info("RabbitMQ Queues successfully verified/declared: [{}] with DLX [{}], and [{}]",
                    RAW_DOC_QUEUE, RAW_DOC_DLX, TELEMETRY_QUEUE);
        } catch (Exception e) {
            log.warn("RabbitMQ queues could not be pre-declared at startup (Broker may be offline): {}", e.getMessage());
        }
    }

    public void publishIngestionJob(String jobId, String tenantId, String objectKey) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "jobId", jobId,
                    "tenantId", tenantId,
                    "objectKey", objectKey
            ));
            rabbitTemplate.convertAndSend(RAW_DOC_QUEUE, payload);
            log.info("Dispatched ingestion task to [{}]: Job [{}] for Tenant [{}] (Key: {})",
                    RAW_DOC_QUEUE, jobId, tenantId, objectKey);
        } catch (Exception e) {
            log.error("Failed to publish ingestion job [{}] to RabbitMQ: {}", jobId, e.getMessage(), e);
            throw new RuntimeException("RabbitMQ publish failed: " + e.getMessage(), e);
        }
    }
}
