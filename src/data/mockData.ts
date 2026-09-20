import type { Tenant, IngestionItem, QuarantineConflict, DbscanCluster, SystemTelemetry, NotificationItem, AuditLogEntry, ChunkMetadata } from '../types';

export const INITIAL_ARCHIVED_CHUNKS: ChunkMetadata[] = [
  {
    id: 'chk-hr-2020-01',
    docName: 'COVID_Remote_Policy_2020.pdf',
    docYear: 2020,
    author: 'Legacy Benefits Team',
    uploadDate: '2020-04-01',
    effectiveDate: '2020-04-01 to 2022-03-13',
    temporalStatus: 'Archived',
    tenantId: 'HR',
    embeddingId: 'vec-77a8-4491-b00',
    vectorPreview: [0.040, -0.190, 0.880, 0.125, -0.400, 0.605],
    tokenCount: 210,
    text: 'Section 4.1 - Mandatory Remote Stipend:\nDuring emergency remote operations, all personnel are entitled to a tax-free stipend of $500 per month for home workstation setup.'
  },
  {
    id: 'chk-fin-2019-03',
    docName: 'Travel_Expense_Policy_2019.pdf',
    docYear: 2019,
    author: 'Finance Ops 2019',
    uploadDate: '2019-01-15',
    effectiveDate: '2019-01-15 to 2022-11-04',
    temporalStatus: 'Archived',
    tenantId: 'FINANCE',
    embeddingId: 'vec-44e1-9012-f00',
    vectorPreview: [0.120, -0.650, 0.330, 0.895, -0.010, 0.435],
    tokenCount: 185,
    text: 'Section 2.3 - Meal Allowance:\nPer diem meal expenses cap at $75/day worldwide without receipts required.'
  },
  {
    id: 'chk-leg-2018-09',
    docName: 'EU_GDPR_Compliance_Baseline_2018.pdf',
    docYear: 2018,
    author: 'EU Legal Council',
    uploadDate: '2018-05-25',
    effectiveDate: '2018-05-25 to 2025-12-31',
    temporalStatus: 'Archived',
    tenantId: 'LEGAL',
    embeddingId: 'vec-11b3-3392-a00',
    vectorPreview: [-0.300, 0.535, 0.001, -0.885, 0.220, 0.100],
    tokenCount: 320,
    text: 'Article 5 - Data Subject Retention:\nPersonal data shall be stored for a maximum of 3 years following account closure unless required by tax statute.'
  }
];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't-hr',
    name: 'HR & People Operations',
    code: 'HR',
    isolationLevel: 'Hardware Isolated',
    activeConflictsCount: 2,
    totalIngestedDocs: 1420,
    rateLimitReqPerMin: 600,
    storageUsedGb: 14.8
  },
  {
    id: 't-legal',
    name: 'Legal & Regulatory Compliance',
    code: 'LEGAL',
    isolationLevel: 'Encrypted Tenant Context',
    activeConflictsCount: 1,
    totalIngestedDocs: 890,
    rateLimitReqPerMin: 400,
    storageUsedGb: 22.4
  },
  {
    id: 't-finance',
    name: 'Finance & Procurement',
    code: 'FINANCE',
    isolationLevel: 'Logical Namespace',
    activeConflictsCount: 1,
    totalIngestedDocs: 2150,
    rateLimitReqPerMin: 800,
    storageUsedGb: 18.2
  },
  {
    id: 't-eng',
    name: 'Engineering & Architecture',
    code: 'ENGINEERING',
    isolationLevel: 'Logical Namespace',
    activeConflictsCount: 1,
    totalIngestedDocs: 3410,
    rateLimitReqPerMin: 1200,
    storageUsedGb: 45.6
  }
];

export const INITIAL_INGESTION_QUEUE: IngestionItem[] = [
  {
    id: 'ing-101',
    fileName: 'Global_Remote_Work_Framework_2026.pdf',
    department: 'HR',
    author: 'Sarah Jenkins (VP People)',
    uploadTimestamp: '2026-09-07 18:42:10',
    fileSize: '4.2 MB',
    modality: 'NATIVE_TEXT',
    stage: 'QUARANTINED',
    progressPercentage: 85,
    chunkCount: 28,
    vectorDbStatus: 'FLAGGED'
  },
  {
    id: 'ing-102',
    fileName: 'Scanned_IP_Assignment_Addendum_EU.pdf',
    department: 'LEGAL',
    author: 'Marcus Vance (Chief Legal Counsel)',
    uploadTimestamp: '2026-09-07 19:01:15',
    fileSize: '12.8 MB',
    modality: 'OCR_TESSERACT',
    stage: 'COLLISION_CHECK',
    progressPercentage: 72,
    chunkCount: 42,
    vectorDbStatus: 'PROCESSING'
  },
  {
    id: 'ing-103',
    fileName: 'Corporate_Travel_Per_Diem_Caps_Q3.docx',
    department: 'FINANCE',
    author: 'Elena Rostova (Head of Finance)',
    uploadTimestamp: '2026-09-07 19:10:04',
    fileSize: '1.8 MB',
    modality: 'NATIVE_TEXT',
    stage: 'EMBEDDING',
    progressPercentage: 45,
    chunkCount: 14,
    vectorDbStatus: 'PROCESSING'
  },
  {
    id: 'ing-104',
    fileName: 'SRE_Severity_1_Incident_Playbook_v4.pdf',
    department: 'ENGINEERING',
    author: 'David Chen (Principal SRE)',
    uploadTimestamp: '2026-09-07 19:14:30',
    fileSize: '3.1 MB',
    modality: 'NATIVE_TEXT',
    stage: 'CHUNK_ADAPTIVE',
    progressPercentage: 28,
    chunkCount: 19,
    vectorDbStatus: 'PROCESSING'
  },
  {
    id: 'ing-105',
    fileName: 'Legacy_Parental_Leave_Guide_2020.pdf',
    department: 'HR',
    author: 'Archived Benefits Team',
    uploadTimestamp: '2026-09-07 17:30:00',
    fileSize: '2.4 MB',
    modality: 'NATIVE_TEXT',
    stage: 'IN_VECTOR_DB',
    progressPercentage: 100,
    chunkCount: 31,
    vectorDbStatus: 'SYNCED'
  }
];

export const INITIAL_QUARANTINE_CONFLICTS: QuarantineConflict[] = [
  {
    id: 'conf-8901',
    similarityScore: 0.894,
    department: 'HR',
    verdictType: 'CONTRADICTORY',
    contradictionExplanation: 'Incoming 2026 policy caps remote monthly internet allowance at $150/mo and requires receipts, directly contradicting existing 2022 policy offering flat $300/mo unverified stipend.',
    temporalSummary: 'Incoming Chunk B (2026) is 4 years newer than Existing Chunk A (2022).',
    createdAt: '2026-09-07 18:42:15',
    status: 'PENDING',
    existingChunk: {
      id: 'chk-hr-2022-04',
      docName: 'HR_Remote_Policy_2022.pdf',
      docYear: 2022,
      author: 'Legacy HR Dept',
      uploadDate: '2022-03-14',
      effectiveDate: '2022-03-14 to Present',
      temporalStatus: 'Active',
      tenantId: 'HR',
      embeddingId: 'vec-77a8-4491-b01',
      vectorPreview: [0.042, -0.192, 0.884, 0.129, -0.402, 0.611],
      tokenCount: 248,
      text: 'Section 4.2 - Home Office Allowance:\nAll full-time remote employees will receive an automatic, unverified flat stipend of $300 per month included in standard payroll to cover high-speed internet, electricity, and ergonomic furniture.',
      highlightedDiffRanges: [
        { type: 'removed', text: 'automatic, unverified flat stipend of $300 per month' },
        { type: 'unchanged', text: ' included in standard payroll to cover high-speed internet, electricity, and ergonomic furniture.' }
      ]
    },
    incomingChunk: {
      id: 'chk-hr-2026-14',
      docName: 'Global_Remote_Work_Framework_2026.pdf',
      docYear: 2026,
      author: 'Sarah Jenkins (VP People)',
      uploadDate: '2026-09-07',
      effectiveDate: '2026-09-07 (Pending Promotion)',
      temporalStatus: 'Quarantined',
      tenantId: 'HR',
      embeddingId: 'vec-99f2-1088-c44',
      vectorPreview: [0.045, -0.188, 0.871, 0.135, -0.410, 0.598],
      tokenCount: 262,
      text: 'Section 4.2 - Home Office Reimbursement:\nRemote employees may submit itemized monthly expense receipts up to a maximum cap of $150 per month for verified broadband internet usage. Stipends are no longer disbursed automatically via payroll.',
      highlightedDiffRanges: [
        { type: 'added', text: 'submit itemized monthly expense receipts up to a maximum cap of $150 per month' },
        { type: 'unchanged', text: ' for verified broadband internet usage. Stipends are no longer disbursed automatically via payroll.' }
      ]
    }
  },
  {
    id: 'conf-8902',
    similarityScore: 0.942,
    department: 'LEGAL',
    verdictType: 'SUPERSIDING_POLICY',
    contradictionExplanation: 'Incoming 2026 document voids post-employment 1-year non-compete clauses for EU software engineers to comply with EU Directive 2025/119, overriding the 2021 global boilerplate agreement.',
    temporalSummary: 'Incoming Chunk B (2026) supersedes Existing Chunk A (2021) by 5 years.',
    createdAt: '2026-09-07 19:01:20',
    status: 'PENDING',
    existingChunk: {
      id: 'chk-leg-2021-09',
      docName: 'Standard_Global_IP_NonCompete_2021.pdf',
      docYear: 2021,
      author: 'Legal Ops Group',
      uploadDate: '2021-01-10',
      effectiveDate: '2021-01-10 to Present',
      temporalStatus: 'Active',
      tenantId: 'LEGAL',
      embeddingId: 'vec-11b3-3392-a08',
      vectorPreview: [-0.312, 0.541, 0.002, -0.891, 0.224, 0.109],
      tokenCount: 310,
      text: 'Clause 12.1 - Post-Employment Restriction:\nEmployee agrees that for a period of twelve (12) months following termination of employment for any reason, Employee shall not directly or indirectly engage with any competing software entity globally.',
      highlightedDiffRanges: [
        { type: 'removed', text: 'for a period of twelve (12) months following termination... shall not directly or indirectly engage' },
        { type: 'unchanged', text: ' with any competing software entity globally.' }
      ]
    },
    incomingChunk: {
      id: 'chk-leg-2026-02',
      docName: 'Scanned_IP_Assignment_Addendum_EU.pdf',
      docYear: 2026,
      author: 'Marcus Vance (Chief Legal Counsel)',
      uploadDate: '2026-09-07',
      effectiveDate: '2026-09-07 (Pending Promotion)',
      temporalStatus: 'Quarantined',
      tenantId: 'LEGAL',
      embeddingId: 'vec-11b3-3392-a12',
      vectorPreview: [-0.309, 0.539, 0.005, -0.885, 0.230, 0.104],
      tokenCount: 295,
      text: 'Clause 12.1 - Post-Employment Restriction (EU Amendment):\nIn accordance with EU Directive 2025/119, post-employment non-compete covenants are hereby rendered null and void for European Union personnel. IP invention assignments remain fully effective.',
      highlightedDiffRanges: [
        { type: 'added', text: 'post-employment non-compete covenants are hereby rendered null and void for European Union personnel.' },
        { type: 'unchanged', text: ' IP invention assignments remain fully effective.' }
      ]
    }
  },
  {
    id: 'conf-8903',
    similarityScore: 0.918,
    department: 'FINANCE',
    verdictType: 'PARTIAL_UPDATE',
    contradictionExplanation: 'Flight upgrade policy threshold reduced from 8 hours continuous flight time down to 5 hours for transatlantic travel.',
    temporalSummary: 'Incoming Chunk B (2026) updates Existing Chunk A (2022).',
    createdAt: '2026-09-07 19:10:10',
    status: 'PENDING',
    existingChunk: {
      id: 'chk-fin-2022-18',
      docName: 'Corporate_Travel_Policy_2022.pdf',
      docYear: 2022,
      author: 'Finance Audit Team',
      uploadDate: '2022-11-05',
      effectiveDate: '2022-11-05 to Present',
      temporalStatus: 'Active',
      tenantId: 'FINANCE',
      embeddingId: 'vec-44e1-9012-f04',
      vectorPreview: [0.128, -0.661, 0.334, 0.901, -0.012, 0.441],
      tokenCount: 190,
      text: 'Section 3.1 - Commercial Air Travel:\nBusiness Class booking is strictly restricted to continuous long-haul flights exceeding 8 flight hours. All shorter domestic and international flights must be booked in Economy Class.',
      highlightedDiffRanges: [
        { type: 'removed', text: 'exceeding 8 flight hours' }
      ]
    },
    incomingChunk: {
      id: 'chk-fin-2026-07',
      docName: 'Corporate_Travel_Per_Diem_Caps_Q3.docx',
      docYear: 2026,
      author: 'Elena Rostova (Head of Finance)',
      uploadDate: '2026-09-07',
      effectiveDate: '2026-09-07 (Pending Promotion)',
      temporalStatus: 'Quarantined',
      tenantId: 'FINANCE',
      embeddingId: 'vec-44e1-9012-f19',
      vectorPreview: [0.131, -0.658, 0.329, 0.898, -0.015, 0.448],
      tokenCount: 204,
      text: 'Section 3.1 - Commercial Air Travel (2026 Revision):\nBusiness Class booking is permitted for continuous international flights exceeding 5 flight hours. Premium Economy is mandatory for domestic flights over 3 hours.',
      highlightedDiffRanges: [
        { type: 'added', text: 'exceeding 5 flight hours' }
      ]
    }
  },
  {
    id: 'conf-8904',
    similarityScore: 0.876,
    department: 'ENGINEERING',
    verdictType: 'CONTRADICTORY',
    contradictionExplanation: 'Sev-1 incident response SLA changed from 15 minutes down to 5 minutes with mandatory automated PagerDuty escalation.',
    temporalSummary: 'Incoming Chunk B (2026) is 3 years newer than Existing Chunk A (2023).',
    createdAt: '2026-09-07 19:14:35',
    status: 'PENDING',
    existingChunk: {
      id: 'chk-eng-2023-01',
      docName: 'SRE_OnCall_Playbook_2023.pdf',
      docYear: 2023,
      author: 'Infra Operations',
      uploadDate: '2023-05-19',
      effectiveDate: '2023-05-19 to Present',
      temporalStatus: 'Active',
      tenantId: 'ENGINEERING',
      embeddingId: 'vec-8812-3301-c88',
      vectorPreview: [-0.198, 0.412, -0.771, 0.055, 0.339, 0.812],
      tokenCount: 215,
      text: 'SLA Rule 1: Severity 1 (Outage) Acknowledgment:\nOn-call primary engineers must acknowledge Sev-1 PagerDuty incidents within 15 minutes. Secondary escalation triggers automatically after 30 minutes of silence.',
      highlightedDiffRanges: [
        { type: 'removed', text: 'within 15 minutes' }
      ]
    },
    incomingChunk: {
      id: 'chk-eng-2026-09',
      docName: 'SRE_Severity_1_Incident_Playbook_v4.pdf',
      docYear: 2026,
      author: 'David Chen (Principal SRE)',
      uploadDate: '2026-09-07',
      effectiveDate: '2026-09-07 (Pending Promotion)',
      temporalStatus: 'Quarantined',
      tenantId: 'ENGINEERING',
      embeddingId: 'vec-8812-3301-c99',
      vectorPreview: [-0.194, 0.418, -0.765, 0.051, 0.342, 0.805],
      tokenCount: 230,
      text: 'SLA Rule 1: Severity 1 (Outage) SLA (Strict 2026 Target):\nPrimary SRE must acknowledge Sev-1 incidents within 5 minutes. Voice call escalation to VP of Engineering triggers automatically at minute 10.',
      highlightedDiffRanges: [
        { type: 'added', text: 'within 5 minutes' }
      ]
    }
  }
];

export const INITIAL_DBSCAN_CLUSTERS: DbscanCluster[] = [
  {
    id: 'cls-01',
    name: 'Remote Work & Equipment Allowance',
    category: 'HR Policies',
    coordX: -45,
    coordY: 35,
    radius: 42,
    sampleCount: 148,
    avgSimilarity: 0.912,
    density: 'High',
    description: 'Auto-discovered cluster around home office stipends, internet receipts, and hybrid schedule rules.',
    conflictIds: ['conf-8901']
  },
  {
    id: 'cls-02',
    name: 'IP Assignment & EU Non-Compete Clauses',
    category: 'Legal Governance',
    coordX: 55,
    coordY: 60,
    radius: 38,
    sampleCount: 92,
    avgSimilarity: 0.945,
    density: 'Critical',
    description: 'Jurisdiction-specific legal overrides voiding legacy non-competes post EU 2025 regulatory changes.',
    conflictIds: ['conf-8902']
  },
  {
    id: 'cls-03',
    name: 'Air Travel & Per Diem Thresholds',
    category: 'Finance & Expense',
    coordX: 20,
    coordY: -50,
    radius: 50,
    sampleCount: 215,
    avgSimilarity: 0.898,
    density: 'Medium',
    description: 'Commercial flight upgrades, business class flight-hour thresholds, and corporate card meal limits.',
    conflictIds: ['conf-8903']
  },
  {
    id: 'cls-04',
    name: 'SRE Outage SLAs & Escalation Timelines',
    category: 'Engineering SRE',
    coordX: -65,
    coordY: -40,
    radius: 35,
    sampleCount: 180,
    avgSimilarity: 0.884,
    density: 'High',
    description: 'Incident response SLAs, Sev-1 MTTR targets, and automated paging escalation ladders.',
    conflictIds: ['conf-8904']
  },
  {
    id: 'cls-05',
    name: 'Security Clearance & SOC2 Audit Evidence',
    category: 'Compliance',
    coordX: 70,
    coordY: -20,
    radius: 30,
    sampleCount: 64,
    avgSimilarity: 0.962,
    density: 'Medium',
    description: 'Vendor risk assessments, key rotation policies, and encrypted data retention mandates.',
    conflictIds: []
  }
];

export const INITIAL_TELEMETRY: SystemTelemetry = {
  gatewayLatencyMs: 14,
  rabbitMqRate: 1240,
  rabbitMqLatencyMs: 4.2,
  pythonGpuLoad: 64.8,
  llmCircuitBreakerStatus: 'CLOSED',
  tokensPerSec: 14850,
  exactDuplicatesPruned: 342100,
  redisCacheHits: 1892040,
  totalChunksProcessed: 1482910,
  vectorRamSavedGb: 4.28,
  llmCostSavedUsd: 14820,
  quarantinedPendingCount: 4,
  quarantinedResolvedCount: 1840
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High-Similarity Semantic Collision Flagged',
    message: 'Global_Remote_Work_Framework_2026.pdf has an 89.4% collision with HR_Remote_Policy_2022.pdf',
    timestamp: '18:42:15',
    type: 'ALERT',
    conflictId: 'conf-8901',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Legal Compliance Override Detected',
    message: 'Scanned_IP_Assignment_Addendum_EU.pdf (94.2% collision) supersedes 2021 non-compete policy.',
    timestamp: '19:01:20',
    type: 'ALERT',
    conflictId: 'conf-8902',
    read: false
  },
  {
    id: 'notif-3',
    title: 'DBSCAN Cluster Updated',
    message: 'Auto-discovered 215 chunk vectors in "Air Travel & Per Diem Thresholds" cluster.',
    timestamp: '19:10:00',
    type: 'INFO',
    read: true
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-901',
    timestamp: '2026-09-17 18:45:12',
    actorName: 'Sarah Jenkins',
    actorRole: 'DATA_STEWARD',
    department: 'HR',
    action: 'RESOLVE_ACCEPT',
    targetId: 'conf-8901',
    details: 'Accepted incoming chunk "Global_Remote_Work_Framework_2026.pdf" and pruned legacy 2022 chunk.',
    integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'aud-902',
    timestamp: '2026-09-17 19:04:33',
    actorName: 'Marcus Vance',
    actorRole: 'COMPLIANCE_AUDITOR',
    department: 'LEGAL',
    action: 'MANUAL_MERGE',
    targetId: 'conf-8902',
    details: 'Merged EU IP assignment clause addendum text with 2021 baseline policy context.',
    integrityHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4'
  },
  {
    id: 'aud-903',
    timestamp: '2026-09-17 19:15:00',
    actorName: 'Alex Rivera',
    actorRole: 'SYSTEM_ADMIN',
    department: 'GLOBAL',
    action: 'RATE_LIMIT_CHANGE',
    targetId: 't-eng',
    details: 'Increased Engineering tenant worker rate limit to 1,200 req/min for high-throughput batch indexing.',
    integrityHash: '320e8b2b64d0f622e9643a6d713c4155a5b28d7d42cf28eb7127e2a44f50937c'
  },
  {
    id: 'aud-904',
    timestamp: '2026-09-17 19:22:45',
    actorName: 'Elena Rostova',
    actorRole: 'DATA_STEWARD',
    department: 'FINANCE',
    action: 'RESOLVE_KEEP',
    targetId: 'conf-8903',
    details: 'Retained existing Q3 Per Diem Cap chunk ($120/day) and discarded duplicate incoming chunk.',
    integrityHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
  }
];

