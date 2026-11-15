#!/usr/bin/env python3
"""
Seed Script for Enterprise Multi-Tenant Semantic RAG Governance Platform
Idempotently seeds:
- 4 tenants (HR, FINANCE, LEGAL, ENGINEERING)
- 6 users across roles with BCrypt hashed passwords
- Demo documents and vector chunks:
  - 3 policy pairs for HR (remote work, leave, stipend)
  - 2 policy pairs for FINANCE (CapEx limits, travel expense)
  - 2 policy pairs for LEGAL (jurisdiction/non-compete, GDPR retention)
  - 1 clean ENGINEERING playbook (no collisions)
  - Quarantined chunks: >= 40 per demo tenant in 3-4 topics for DBSCAN clustering (min_samples=12)
"""

import os
import sys
import uuid
import math
import random
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:adminpassword@localhost:5432/semantic_rag_db")

# Standard BCrypt hash for "password123"
BCRYPT_HASH = "$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG"

TENANTS = [
    ("HR", "HR & People Operations"),
    ("FINANCE", "Finance & Procurement"),
    ("LEGAL", "Legal & Regulatory Compliance"),
    ("ENGINEERING", "Engineering & Architecture")
]

USERS = [
    ("usr-hr-01", "hr_steward@enterprise.com", BCRYPT_HASH, "Sarah Jenkins", "DATA_STEWARD", "HR"),
    ("usr-hr-02", "hr_admin@enterprise.com", BCRYPT_HASH, "Alex Rivera", "SYSTEM_ADMIN", "HR"),
    ("usr-fin-01", "finance_steward@enterprise.com", BCRYPT_HASH, "Elena Rostova", "DATA_STEWARD", "FINANCE"),
    ("usr-leg-01", "legal_auditor@enterprise.com", BCRYPT_HASH, "Marcus Vance", "COMPLIANCE_AUDITOR", "LEGAL"),
    ("usr-eng-01", "eng_steward@enterprise.com", BCRYPT_HASH, "David Chen", "DATA_STEWARD", "ENGINEERING"),
    ("usr-admin-01", "superadmin@enterprise.com", BCRYPT_HASH, "Chief Administrator", "SYSTEM_ADMIN", "HR")
]

def generate_topic_vector(seed_val: int, dim: int = 384, jitter: float = 0.05) -> list:
    """Generates a deterministic, normalized 384-dimensional vector around a cluster center."""
    rng = random.Random(seed_val)
    vec = [rng.gauss(0, 1) + rng.uniform(-jitter, jitter) for _ in range(dim)]
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [round(x / norm, 6) for x in vec]

def generate_seed_data():
    seed_sql = []
    
    # Tenants
    seed_sql.append("-- 1. Seed Tenants")
    for tid, name in TENANTS:
        seed_sql.append(
            f"INSERT INTO tenants (id, name) VALUES ('{tid}', '{name}') "
            f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;"
        )
        
    # Users
    seed_sql.append("\n-- 2. Seed Users")
    for uid, email, pwhash, dname, role, tid in USERS:
        seed_sql.append(
            f"INSERT INTO users (id, email, password_hash, display_name, role, tenant_id) "
            f"VALUES ('{uid}', '{email}', '{pwhash}', '{dname}', '{role}', '{tid}') "
            f"ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;"
        )
        
    # Demo Documents and Active Vector Chunks
    # HR Pair 1: Remote Work Policy
    seed_sql.append("\n-- 3. Seed Documents & Baseline Active Vector Chunks")
    hr_docs = [
        ("doc-hr-2022-01", "HR", "HR_Remote_Policy_2022.pdf", "2022-03-14", "ACTIVE"),
        ("doc-hr-2026-01", "HR", "Global_Remote_Work_Framework_2026.pdf", "2026-09-07", "SUPERSEDED"),
        ("doc-hr-2021-02", "HR", "HR_Parental_Leave_Benefits_2021.pdf", "2021-06-01", "ACTIVE"),
        ("doc-hr-2026-02", "HR", "HR_Parental_Leave_Framework_2026.pdf", "2026-09-07", "SUPERSEDED"),
        ("doc-hr-2020-03", "HR", "HR_Equipment_Stipend_Guide_2020.pdf", "2020-04-01", "ACTIVE"),
        ("doc-hr-2026-03", "HR", "HR_Equipment_Stipend_Framework_2026.pdf", "2026-09-07", "SUPERSEDED"),
        # Finance
        ("doc-fin-2022-01", "FINANCE", "Corporate_CapEx_Policy_2022.pdf", "2022-01-15", "ACTIVE"),
        ("doc-fin-2026-01", "FINANCE", "Corporate_CapEx_Policy_2026.pdf", "2026-09-07", "SUPERSEDED"),
        ("doc-fin-2019-02", "FINANCE", "Corporate_Travel_Policy_2019.pdf", "2019-05-10", "ACTIVE"),
        ("doc-fin-2026-02", "FINANCE", "Corporate_Travel_Per_Diem_Caps_2026.pdf", "2026-09-07", "SUPERSEDED"),
        # Legal
        ("doc-leg-2021-01", "LEGAL", "Standard_Global_IP_NonCompete_2021.pdf", "2021-01-10", "ACTIVE"),
        ("doc-leg-2026-01", "LEGAL", "Scanned_IP_Assignment_Addendum_EU_2026.pdf", "2026-09-07", "SUPERSEDED"),
        ("doc-leg-2018-02", "LEGAL", "EU_GDPR_Compliance_Baseline_2018.pdf", "2018-05-25", "ACTIVE"),
        ("doc-leg-2026-02", "LEGAL", "EU_GDPR_Retention_Audit_Addendum_2026.pdf", "2026-09-07", "SUPERSEDED"),
        # Engineering
        ("doc-eng-2023-01", "ENGINEERING", "SRE_Severity_1_Incident_Playbook_v4.pdf", "2023-05-19", "ACTIVE")
    ]
    
    for did, tid, dname, eff_date, status in hr_docs:
        seed_sql.append(
            f"INSERT INTO documents (id, tenant_id, name, effective_date, status) "
            f"VALUES ('{did}', '{tid}', '{dname}', '{eff_date}', '{status}') "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # Active Vector Chunks for Baselines
    baseline_chunks = [
        ("chk-hr-base-01", "doc-hr-2022-01", "HR_Remote_Policy_2022.pdf", "HR", 
         "Section 4.2 - Home Office Allowance: All full-time remote employees will receive an automatic, unverified flat stipend of $300 per month included in standard payroll to cover high-speed internet and electricity.", 101),
        ("chk-hr-base-02", "doc-hr-2021-02", "HR_Parental_Leave_Benefits_2021.pdf", "HR", 
         "Section 6.1 - Primary Caregiver Leave: Primary caregivers are eligible for 16 weeks of continuous paid leave at 100% standard base salary.", 201),
        ("chk-hr-base-03", "doc-hr-2020-03", "HR_Equipment_Stipend_Guide_2020.pdf", "HR", 
         "Section 2.4 - Ergonomic Furniture Allowance: Permanent personnel are entitled to a one-time lump-sum workstation reimbursement capped at $500 upon initial hiring.", 301),
        ("chk-fin-base-01", "doc-fin-2022-01", "Corporate_CapEx_Policy_2022.pdf", "FINANCE", 
         "Section 3.1 - Capital Expenditure Limits: Operating hardware purchases exceeding $10,000 require written dual approval from the Department Director and VP Finance.", 401),
        ("chk-fin-base-02", "doc-fin-2019-02", "Corporate_Travel_Policy_2019.pdf", "FINANCE", 
         "Section 2.3 - Meal Allowance: Per diem meal expenses cap at $75 per day worldwide without itemized receipts required.", 501),
        ("chk-leg-base-01", "doc-leg-2021-01", "Standard_Global_IP_NonCompete_2021.pdf", "LEGAL", 
         "Clause 12.1 - Post-Employment Restriction: Employee agrees that for a period of twelve (12) months following termination, Employee shall not directly or indirectly engage with competing entities globally.", 601),
        ("chk-leg-base-02", "doc-leg-2018-02", "EU_GDPR_Compliance_Baseline_2018.pdf", "LEGAL", 
         "Article 5 - Data Subject Retention: Personal data shall be preserved for a maximum statutory term of 3 years following account closure.", 701),
        ("chk-eng-base-01", "doc-eng-2023-01", "SRE_Severity_1_Incident_Playbook_v4.pdf", "ENGINEERING", 
         "SLA Rule 1: Severity 1 (Outage) Acknowledgment: On-call primary site reliability engineers must acknowledge Sev-1 PagerDuty incidents within 15 minutes.", 801)
    ]

    for cid, did, dname, tid, text, seed_v in baseline_chunks:
        vec_str = "[" + ",".join(str(x) for x in generate_topic_vector(seed_v)) + "]"
        safe_text = text.replace("'", "''")
        seed_sql.append(
            f"INSERT INTO vector_chunks (id, document_id, chunk_index, doc_name, tenant_id, chunk_text, embedding, status) "
            f"VALUES ('{cid}', '{did}', 1, '{dname}', '{tid}', '{safe_text}', '{vec_str}'::vector, 'ACTIVE') "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    # 4. Quarantined Chunks (>= 40 per demo tenant across 3-4 dense topics for DBSCAN eps=0.15, min_samples=12)
    seed_sql.append("\n-- 4. Seed Quarantined Chunks across 3-4 Topics per Tenant")

    topics = {
        "HR": [
            ("Remote Work & Internet Allowance", 101, [
                ("Remote employees may submit itemized monthly broadband receipts up to $150/mo. Automatic flat stipends are rescinded.", "HR_Remote_Policy_2022.pdf", 0.894, "CONTRADICTORY"),
                ("High-speed internet reimbursements require telecom invoice verification and cannot exceed $140 monthly.", "HR_Remote_Policy_2022.pdf", 0.887, "PARTIAL_UPDATE"),
                ("Office attendance is mandatory 2 days per week; home office internet subsidies are capped at $125/month.", "HR_Remote_Policy_2022.pdf", 0.905, "SUPERSEDING_POLICY"),
                ("Itemized utility and internet vouchers must be submitted through Concur with manager sign-off.", "HR_Remote_Policy_2022.pdf", 0.879, "PARTIAL_UPDATE"),
            ]),
            ("Parental & Family Caregiver Benefits", 201, [
                ("Primary caregiver leave is extended to 24 weeks with phased return-to-work options at 80% schedule.", "HR_Parental_Leave_Benefits_2021.pdf", 0.915, "SUPERSEDING_POLICY"),
                ("Secondary caregivers are entitled to 8 weeks fully paid parental leave within the first 12 months.", "HR_Parental_Leave_Benefits_2021.pdf", 0.882, "PARTIAL_UPDATE"),
                ("Parental bonding leave must be taken in minimum 2-week increments following birth or adoption.", "HR_Parental_Leave_Benefits_2021.pdf", 0.896, "CONTRADICTORY"),
                ("Adoption assistance grants provide up to $5,000 per child for qualified legal and agency expenses.", "HR_Parental_Leave_Benefits_2021.pdf", 0.865, "PARTIAL_UPDATE"),
            ]),
            ("Home Office Equipment & Ergonomic Subsidies", 301, [
                ("Ergonomic chair and monitor allowances are capped at $250 annually with mandatory IT asset tagging.", "HR_Equipment_Stipend_Guide_2020.pdf", 0.923, "SUPERSEDING_POLICY"),
                ("Standing desk converter reimbursements require prior ergonomic assessment from HR safety officer.", "HR_Equipment_Stipend_Guide_2020.pdf", 0.884, "CONTRADICTORY"),
                ("Annual peripheral replacement stipend cannot exceed $150 per calendar year without director exception.", "HR_Equipment_Stipend_Guide_2020.pdf", 0.871, "PARTIAL_UPDATE"),
                ("Computer monitors remain company property and must be returned upon employment termination.", "HR_Equipment_Stipend_Guide_2020.pdf", 0.902, "SUPERSEDING_POLICY"),
            ])
        ],
        "FINANCE": [
            ("CapEx Approvals & Procurement Limits", 401, [
                ("Capital expenditures exceeding $25,000 require CFO authorization and procurement bidding documentation.", "Corporate_CapEx_Policy_2022.pdf", 0.932, "SUPERSEDING_POLICY"),
                ("Software license acquisitions over $15,000 require Security Architecture and Finance Director sign-off.", "Corporate_CapEx_Policy_2022.pdf", 0.891, "PARTIAL_UPDATE"),
                ("Single-source vendor contracts above $50,000 must obtain competitive bidding waiver from VP Procurement.", "Corporate_CapEx_Policy_2022.pdf", 0.915, "CONTRADICTORY"),
            ]),
            ("Corporate Travel & Airline Class Thresholds", 501, [
                ("Business Class booking is permitted for continuous international flights exceeding 5 flight hours.", "Corporate_Travel_Policy_2019.pdf", 0.918, "SUPERSEDING_POLICY"),
                ("Economy class is mandatory for all domestic flights under 4 hours regardless of seniority tier.", "Corporate_Travel_Policy_2019.pdf", 0.885, "CONTRADICTORY"),
                ("Flight bookings must be made at least 14 days in advance to qualify for corporate negotiated rates.", "Corporate_Travel_Policy_2019.pdf", 0.876, "PARTIAL_UPDATE"),
            ]),
            ("Per Diem Meals & Expense Receipts", 501, [
                ("Daily per diem meal reimbursements cap at $120/day with itemized electronic receipts mandatory.", "Corporate_Travel_Policy_2019.pdf", 0.904, "CONTRADICTORY"),
                ("Alcohol expenses during travel are non-reimbursable unless associated with approved client entertainment.", "Corporate_Travel_Policy_2019.pdf", 0.868, "PARTIAL_UPDATE"),
                ("Hotel incidentals and room service fees must be settled separately on personal payment cards.", "Corporate_Travel_Policy_2019.pdf", 0.892, "PARTIAL_UPDATE"),
            ])
        ],
        "LEGAL": [
            ("Non-Compete & Restrictive Covenants", 601, [
                ("Pursuant to EU Directive 2025/119, post-employment non-compete clauses are null and void for EU staff.", "Standard_Global_IP_NonCompete_2021.pdf", 0.942, "SUPERSEDING_POLICY"),
                ("Non-solicitation of clients is restricted to 6 months post-termination within designated operating territories.", "Standard_Global_IP_NonCompete_2021.pdf", 0.895, "PARTIAL_UPDATE"),
                ("Garden leave compensation of 50% base salary applies during enforced non-compete periods where enforceable.", "Standard_Global_IP_NonCompete_2021.pdf", 0.889, "CONTRADICTORY"),
            ]),
            ("GDPR Data Retention Schedules", 701, [
                ("Personal data retention is extended to 7 years following contract closure to satisfy EU tax audit mandates.", "EU_GDPR_Compliance_Baseline_2018.pdf", 0.931, "SUPERSEDING_POLICY"),
                ("Right to be forgotten erasure requests must be processed across all replicas within 14 business days.", "EU_GDPR_Compliance_Baseline_2018.pdf", 0.890, "PARTIAL_UPDATE"),
                ("Customer marketing consent logs must be scrubbed automatically after 24 months of inactivity.", "EU_GDPR_Compliance_Baseline_2018.pdf", 0.874, "CONTRADICTORY"),
            ]),
            ("IP Assignment & Patent Inventions", 601, [
                ("Inventions created using company hardware or trade secrets remain exclusive intellectual property of the firm.", "Standard_Global_IP_NonCompete_2021.pdf", 0.925, "PARTIAL_UPDATE"),
                ("Open source software contributions require written approval from Open Source Review Board.", "Standard_Global_IP_NonCompete_2021.pdf", 0.883, "SUPERSEDING_POLICY"),
                ("Patent incentive bonus of $2,500 is awarded upon formal filing with the United States Patent and Trademark Office.", "Standard_Global_IP_NonCompete_2021.pdf", 0.867, "PARTIAL_UPDATE"),
            ])
        ]
    }

    # Generate at least 42-45 quarantined chunks per tenant
    for tid, topic_list in topics.items():
        chunk_counter = 1
        for topic_name, seed_val, samples in topic_list:
            # Generate 14-15 chunks per topic to ensure > 12 core samples for DBSCAN
            for i in range(15):
                sample_idx = i % len(samples)
                base_text, exist_doc, base_sim, verdict = samples[sample_idx]
                var_text = f"[{topic_name} Revision {i+1}] {base_text} (Reference ID: HR-REF-{seed_val + i})."
                sim_score = min(0.98, max(0.85, round(base_sim + (random.uniform(-0.02, 0.02)), 3)))
                
                conf_id = f"conf-{tid.lower()}-{chunk_counter:04d}"
                safe_text = var_text.replace("'", "''")
                safe_exist = f"Existing standard policy clause for {topic_name}."
                explanation = f"Incoming policy amendment modifies baseline terms for {topic_name} with {sim_score*100:.1f}% semantic similarity."
                
                seed_sql.append(
                    f"INSERT INTO quarantine_queue (id, tenant_id, similarity_score, verdict_type, contradiction_explanation, "
                    f"existing_document, incoming_chunk_text, existing_chunk_text, status) "
                    f"VALUES ('{conf_id}', '{tid}', {sim_score}, '{verdict}', '{explanation}', "
                    f"'{exist_doc}', '{safe_text}', '{safe_exist}', 'PENDING') "
                    f"ON CONFLICT (id) DO NOTHING;"
                )
                chunk_counter += 1

    return "\n".join(seed_sql)

def main():
    print("Generating comprehensive seed migration script...")
    sql_content = generate_seed_data()
    
    # Write V2__seed_demo_data.sql for Flyway
    flyway_seed_path = os.path.join(
        os.path.dirname(__file__), 
        "java-gateway", "src", "main", "resources", "db", "migration", "V2__seed_demo_data.sql"
    )
    os.makedirs(os.path.dirname(flyway_seed_path), exist_ok=True)
    with open(flyway_seed_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"Wrote Flyway seed migration: {flyway_seed_path}")

    # Attempt to connect to live PostgreSQL if running
    try:
        print(f"Attempting live connection to PostgreSQL at {DATABASE_URL}...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(sql_content)
        conn.commit()
        cur.close()
        conn.close()
        print("Successfully seeded live PostgreSQL database!")
    except Exception as e:
        print(f"Live PostgreSQL seed skipped (Service offline or in container): {e}")
        print("Flyway will automatically execute V2__seed_demo_data.sql on database startup.")

if __name__ == "__main__":
    main()
