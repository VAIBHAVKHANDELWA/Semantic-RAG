package com.middleware.gateway.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Slf4j
@Configuration
public class S3Config {

    @Value("${cloud.s3.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${cloud.s3.access-key:minioadmin}")
    private String accessKey;

    @Value("${cloud.s3.secret-key:minioadmin}")
    private String secretKey;

    @Value("${cloud.s3.bucket-name:semantic-rag-uploads}")
    private String bucketName;

    @Value("${cloud.s3.region:us-east-1}")
    private String region;

    @Bean
    public S3Client s3Client() {
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        );

        S3Client client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .forcePathStyle(true)
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider)
                .build();

        initializeBucketIfAbsent(client);

        return client;
    }

    @Bean
    public S3Presigner s3Presigner() {
        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        );

        S3Configuration s3Configuration = S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build();

        return S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .serviceConfiguration(s3Configuration)
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider)
                .build();
    }

    private void initializeBucketIfAbsent(S3Client client) {
        try {
            client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            log.info("S3 MinIO Bucket [{}] already exists and is ready.", bucketName);
        } catch (NoSuchBucketException e) {
            log.info("S3 MinIO Bucket [{}] does not exist. Initializing new bucket...", bucketName);
            try {
                client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                log.info("Successfully created S3 MinIO Bucket [{}]", bucketName);
            } catch (S3Exception ex) {
                log.warn("Could not auto-create MinIO bucket [{}]: {}", bucketName, ex.awsErrorDetails().errorMessage());
            }
        } catch (Exception e) {
            log.warn("MinIO S3 endpoint [{}] not currently reachable on startup. Deferred connection.", endpoint);
        }
    }
}
