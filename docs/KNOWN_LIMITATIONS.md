# KNOWN_LIMITATIONS.md — Architectural Boundaries & Future Work

To ensure intellectual honesty and academic integrity during capstone evaluation, this document outlines the current engineering boundaries, tradeoffs, and future work for the **Enterprise Semantic RAG Governance Platform**.

---

## 1. Architectural Boundaries

### A. Single-Node PostgreSQL Vector Scaling
- **Current State**: Vectors and relational data reside in a single PostgreSQL 16 container with `pgvector` HNSW indexes (`m=16, ef_construction=64`).
- **Boundary**: For datasets up to 100,000 chunks (~228 MB), query latency remains sub-10ms. At scale beyond 1,000,000 chunks, single-node RAM constraints may cause HNSW index swapping.
- **Future Direction**: Implement declarative table partitioning by `tenant_id` (`PARTITION BY LIST (tenant_id)`), ensuring each tenant maintains an independent, memory-resident HNSW index.

### B. CPU-Bound Cross-Encoder Collision Adjudication
- **Current State**: The DeBERTa-v3 cross-encoder runs on PyTorch CPU (`torch==2.6.0+cpu`).
- **Boundary**: Comparing candidate pairs takes ~28ms to 40ms per comparison. When an ingested document contains 20 conflicting chunks evaluated against 5 candidates each, sequential CPU inference takes ~2.8 to 4.0 seconds.
- **Future Direction**: Introduce batch cross-encoder tensor inference (`batch_size=32`) with optional CUDA GPU acceleration or ONNX Runtime quantization (INT8) to achieve sub-5ms pair inference.

### C. Pure Dense Vector Search vs. Hybrid Lexical Search
- **Current State**: RAG query retrieval relies exclusively on 384-dimensional dense semantic embeddings (`all-MiniLM-L6-v2`) via cosine distance.
- **Boundary**: Dense embeddings excel at conceptual paraphrases but can struggle with exact alphanumeric codes, SKU identifiers, or regulatory statutory citation numbers (e.g., "SEC Rule 17a-4(f)(2)(ii)(A)").
- **Future Direction**: Implement Reciprocal Rank Fusion (RRF) combining dense pgvector search with PostgreSQL full-text search (`tsvector` / BM25).

### D. Single-Instance Cache & Broker Topology
- **Current State**: Redis 7 and RabbitMQ 3.13 run as standalone single-node containers.
- **Boundary**: Suitable for departmental workloads and demonstrations; lacks multi-node high availability (HA) failover in the event of hardware host disruption.
- **Future Direction**: Deploy Redis Sentinel / Cluster and RabbitMQ Quorum Queues across three availability zones.

### E. OCR Capabilities in Apache Tika
- **Current State**: Apache Tika Server extracts text from native digital PDF, DOCX, XLSX, and TXT files.
- **Boundary**: Image-only scanned PDFs or photograph attachments without embedded text layers fail extraction and are routed to quarantine as `EMPTY_FILE` or `TIKA_EXTRACTION_FAILURE`.
- **Future Direction**: Integrate Tesseract OCR bindings into the Tika pipeline for automatic optical character recognition on rasterized scans.

### F. Presigned Upload Window & Multi-Part S3
- **Current State**: Single presigned PUT URLs with a 15-minute expiration window handle direct-to-cloud uploads.
- **Boundary**: Large media archives (> 1 GB) on high-latency mobile connections may exceed the 15-minute window or fail on dropped connections.
- **Future Direction**: Implement S3 Multi-Part Upload initiation and chunk completion endpoints for resumable file streaming.
