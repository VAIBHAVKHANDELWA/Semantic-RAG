#!/usr/bin/env python3
"""
Enterprise Conflicting Policies PDF Generator
Script: scripts/generate_conflicting_pdfs.py

Generates 40 formal, publication-grade PDF documents (10 for each department:
HR, FINANCE, LEGAL, ENGINEERING) that contain explicit, legally and operationally
contradictory revisions against the baseline policies stored in the database.

IMPORTANT: These PDFs are saved locally for the user to download and manually
inject into the UI during their presentation to showcase the DeBERTa Cross-Encoder
quarantine and human-in-the-loop conflict resolution workflow.
They are NOT automatically added to the database.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(BASE_DIR, "demo-data", "conflicting_policies_pdf")

# Complete specification of 10 conflicting amendments per department
AMENDMENTS = {
    "HR": [
        ("HR-REV-001", "Mandatory_Return_to_Office_and_Remote_Work_Repeal",
         "Executive Directive on Immediate Repeal of Remote Work and Mandatory 5-Day On-Site Presence",
         "HR-POL-001 (Global Remote and Hybrid Work Policy)",
         "Mandatory 5-Day On-Site Presence",
         "Effective February 1, 2026, all corporate, engineering, and administrative personnel are required to be physically present at corporate offices five (5) days per week (Monday through Friday, 8:30 AM to 5:30 PM). All hybrid telecommuting arrangements and remote work allowances authorized under prior policies are hereby permanently rescinded. Department managers are strictly prohibited from granting individualized work-from-home exceptions. Failure to report in-person constitutes job abandonment."),
        
        ("HR-REV-002", "Executive_Compensation_and_Overtime_Cap_Amendment",
         "Comprehensive Revision to Salaried Overtime Eligibility and Executive Deferred Compensation",
         "HR-POL-002 (Comprehensive Compensation and Benefits Handbook)",
         "Overtime Pay Elimination for Salaried Hybrid Staff",
         "All overtime compensation for salaried professional staff operating in hybrid or flexible roles is completely eliminated. Non-exempt categories are restructured to a fixed monthly stipend regardless of hours worked. Furthermore, annual performance bonus allocations are capped at a maximum of 8% of base salary, with a mandatory 5-year deferred vesting schedule requiring complete forfeiture upon voluntary resignation."),

        ("HR-REV-003", "Talent_Acquisition_and_Direct_Referral_Revision",
         "Mandatory Third-Party Staffing and Revised Talent Sourcing Directives",
         "HR-POL-003 (Talent Acquisition and Executive Hiring Charter)",
         "Immediate Sourcing Bounty & Mandatory Contingency Agency Usage",
         "Employee referral incentives are increased to a flat $7,500 payable immediately on the candidate's first day of employment, bypassing all 90-day retention probationary contingencies. Additionally, all requisitions for senior engineering and managerial talent must be exclusively outsourced to designated external contingency recruitment agencies at a mandated 30% first-year compensation fee."),

        ("HR-REV-004", "Performance_Management_Forced_Distribution_Quota",
         "Implementation of Mandatory Stack Ranking and Forced Termination Distribution",
         "HR-POL-004 (Performance Management and OKRs Framework)",
         "Mandatory Forced Bell-Curve Stack Ranking",
         "Collaborative 360-degree feedback reviews are discontinued. Every operating department must strictly adhere to a forced bell-curve performance distribution: Top 15% (Tier 1), Middle 75% (Tier 2), and Bottom 10% (Tier 3). Any employee ranked in Tier 3 must be placed on an immediate 30-day Performance Improvement Plan (PIP) or terminated without severance by quarter-end."),

        ("HR-REV-005", "Business_Ethics_and_Gift_Acceptance_Thresholds",
         "Amendment to Corporate Gift Acceptance, Entertainment, and Hospitality Ceilings",
         "HR-POL-005 (Employee Code of Conduct and Business Ethics)",
         "Expansion of Allowable Vendor Gifts and Entertainment to $500",
         "The corporate limit on gifts, travel hospitality, and promotional entertainment provided by vendors is hereby elevated from $50 to $500 per transaction without requiring prior disclosure to the Ethics Committee. Corporate personnel may accept vendor-sponsored international lodging and dining without supervisory sign-off."),

        ("HR-REV-006", "Parental_Leave_and_Caregiver_Duration_Reduction",
         "Restructuring of Family Caregiver Benefits and Paid Parental Leave Tenures",
         "HR-POL-006 (Family Caregiver and Parental Leave Standard)",
         "Parental Leave Reduction to 6 Weeks at 60% Pay",
         "Paid primary caregiver leave is reduced from 16 fully compensated weeks to six (6) weeks compensated at sixty percent (60%) of base salary. Secondary caregiver leave is reduced to five (5) business days. Eligibility requires a minimum of twenty-four (24) continuous months of service, eliminating leave entitlements for first-year employees."),

        ("HR-REV-007", "Workplace_Health_and_Ergonomic_Stipend_Revocation",
         "Discontinuation of Home Office Ergonomic Subsidies and Remote Health Coverage",
         "HR-POL-007 (Workplace Health Safety and Ergonomics Manual)",
         "Total Revocation of Home Ergonomic Hardware Stipends",
         "Corporate subsidies and stipends for home office desks, monitors, and ergonomic equipment are terminated immediately. The corporation explicitly disclaims all occupational safety, health, and workers compensation liabilities arising from injuries sustained within private home residences."),

        ("HR-REV-008", "Tuition_Assistance_and_Academic_Sponsorship_Freeze",
         "Immediate Freeze on Continuing Professional Education and Graduate Sponsorship",
         "HR-POL-008 (Continuing Education and Tuition Assistance)",
         "Complete Indefinite Freeze on Tuition Reimbursements",
         "All financial assistance for external university degrees, graduate tuition, and professional credentialing examinations is frozen indefinitely. Employees pursuing ongoing academic programs must personally assume 100% of remaining tuition obligations, and study leave entitlements are suspended."),

        ("HR-REV-009", "Diversity_Charter_and_Affirmative_Outreach_Repeal",
         "Standardization of Merit-Only Candidate Screening and Dissolution of ERG Funding",
         "HR-POL-009 (Diversity Equity Inclusion and Belonging Charter)",
         "Dissolution of ERG Budgets and Repeal of Demographic Outreach Targets",
         "Dedicated corporate operational budgets for Employee Resource Groups (ERGs) are dissolved. All affirmative demographic outreach recruiting mandates are superseded by standardized algorithmic aptitude assessments, and targeted hiring initiatives are strictly prohibited."),

        ("HR-REV-010", "Severance_Calculation_and_Separation_Pay_Reduction",
         "Revising Involuntary Separation Formula and Accelerated Asset Surrender",
         "HR-POL-015 (Voluntary Separation and Retirement Governance)",
         "Severance Cap Reduced to Flat 2-Week Maximum",
         "Severance compensation in cases of reduction-in-force is capped at a flat maximum of two (2) weeks base salary, regardless of total years of continuous enterprise service. Departing personnel must surrender all company-issued hardware within 24 hours without post-employment equity vesting acceleration.")
    ],

    "FINANCE": [
        ("FIN-REV-001", "Capital_Expenditure_Delegation_Threshold_Inflation",
         "Autonomous Capital Expenditure Expansion and Delegation of Signatory Limits",
         "FIN-POL-001 (Capital Expenditure and Fixed Asset Accounting)",
         "Director CapEx Approval Ceiling Elevated to $75,000 Without CFO Review",
         "Department Directors are authorized to approve capital expenditures up to $75,000 without obtaining written concurrence from the Chief Financial Officer or Vice President. Multi-year lease commitments under $150,000 no longer require capital allocation committee review."),

        ("FIN-REV-002", "Treasury_Liquidity_and_High_Yield_Investment_Shift",
         "Strategic Allocation of Surplus Operational Cash into Alternative Yield Instruments",
         "FIN-POL-002 (Global Treasury and Cash Liquidity Management)",
         "35% Cash Allocation to High-Yield Corporate Debt and Digital Assets",
         "The enterprise treasury mandate restricting surplus cash to AAA sovereign repos is amended. Up to thirty-five percent (35%) of corporate liquidity may be allocated into unrated high-yield debt instruments, secondary market receivables, and digital asset reserve facilities to optimize returns."),

        ("FIN-REV-003", "Foreign_Exchange_Unhedged_Exposure_Expansion",
         "Liberalization of Foreign Currency Derivative Hedging and Speculative Limits",
         "FIN-POL-003 (Foreign Exchange Risk and Derivatives Hedging)",
         "Mandatory Hedging Exemption Ceiling Raised to $5,000,000",
         "Operating foreign currency exposures up to $5,000,000 equivalent are exempt from mandatory derivative hedging. Regional subsidiaries may maintain unhedged speculative currency balances in non-pegged currencies to capitalize on foreign exchange market fluctuations."),

        ("FIN-REV-004", "Commercial_Purchasing_Card_and_Per_Diem_Doubling",
         "Expansion of Executive Travel Allowances, Meal Per Diems, and Receipt Auditing",
         "FIN-POL-004 (Corporate Credit Card and Travel Expense Policy)",
         "Domestic Travel Meal Per Diem Increased to $200 with 90-Day Receipt Window",
         "Domestic travel meal per diem caps are elevated to $200 per day. Itemized receipts are not required for transactions under $75, and the mandatory expense reconciliation window is relaxed from 30 days to ninety (90) calendar days following travel conclusion."),

        ("FIN-REV-005", "Accounts_Payable_Extended_Net_90_Disbursement",
         "Implementation of Working Capital Optimization via Mandatory Net-90 Vendor Terms",
         "FIN-POL-005 (Accounts Payable and Disbursement Internal Controls)",
         "Mandatory Unilateral Transition to Net-90 Vendor Payment Terms",
         "All third-party vendor commercial invoices will be scheduled and disbursed strictly on Net-90 payment terms from invoice verification date. Early payment discounts under 5% are categorically rejected, and automated payment batch runs will execute once monthly."),

        ("FIN-REV-006", "Revenue_Recognition_Upfront_Software_License_Booking",
         "Accelerated Revenue Recognition for Multi-Year Cloud and Enterprise Licenses",
         "FIN-POL-006 (Revenue Recognition and ASC 606 Compliance)",
         "100% Upfront Revenue Recognition on Multi-Year Software Commitments",
         "One hundred percent (100%) of multi-year enterprise contract revenues shall be recognized immediately upon initial execution and digital delivery of credentials, replacing ratable monthly amortization and performance milestone deferral schedules."),

        ("FIN-REV-007", "Internal_Controls_and_SOX_Segregation_of_Duties_Relaxation",
         "Streamlining Procurement Velocity Through Single-Signatory Disbursement Authorizations",
         "FIN-POL-007 (Internal Financial Controls and SOX 404 Compliance)",
         "Dual-Authorization Threshold Elevated to $50,000",
         "The mandatory requirement for dual cryptographic signatories on international wire transfers and vendor disbursements is relaxed to transactions exceeding $50,000. Single-signatory authorizations up to $50,000 are approved to eliminate internal procurement bottlenecks."),

        ("FIN-REV-008", "Intercompany_Transfer_Pricing_and_Tax_Nexus_Shift",
         "Restructuring of Intercompany Intellectual Property Royalties and Cost-Sharing",
         "FIN-POL-008 (Corporate Tax Strategy and Transfer Pricing)",
         "Intercompany Royalty Markup Elevated to 22.5%",
         "The standard intercompany software licensing markup is adjusted from an 8.5% cost-plus formula to a 22.5% fixed gross royalty fee, reallocating corporate tax exposure to designated overseas subsidiaries."),

        ("FIN-REV-009", "Mergers_and_Acquisitions_Escrow_Holdback_Reduction",
         "Acceleration of Acquisition Target Closings and Escrow Retention Reductions",
         "FIN-POL-009 (Mergers Acquisitions and Financial Due Diligence)",
         "Acquisition Indemnity Escrow Reduced to 3% for 90 Days",
         "Standard purchase price escrow holdbacks for enterprise technology acquisitions are reduced from 15% to three percent (3%), with the retention release window compressed from 18 months to ninety (90) calendar days post-closing."),

        ("FIN-REV-010", "Accounts_Receivable_Credit_Tolerance_Expansion",
         "Liberalization of Customer Credit Scoring and Suspension of Credit Holds",
         "FIN-POL-010 (Accounts Receivable and Customer Credit Underwriting)",
         "Delinquency Threshold for Credit Hold Extended to 120 Days Past Due",
         "Automated supply suspensions and credit holds on customer accounts are delayed until invoices exceed one hundred twenty (120) days past due. Discretionary credit limits for enterprise tier-1 clients are doubled without credit committee sign-off.")
    ],

    "LEGAL": [
        ("LEG-REV-001", "Data_Privacy_and_Cross_Border_Transfer_Deregulation",
         "Revised Cross-Border Data Transfer Framework and Extended Incident Notification SLA",
         "LEG-POL-001 (Global Data Privacy and Cross Border Data Flows)",
         "Regulatory Breach Notification Window Extended to 30 Days",
         "Mandatory regulatory reporting of confirmed customer personal data breaches is extended from 72 hours to thirty (30) calendar days. Cross-border transfers of operational metadata to foreign hosting regions are authorized without requiring localized Standard Contractual Clauses (SCCs)."),

        ("LEG-REV-002", "Intellectual_Property_Invention_Rights_Reversion",
         "Employee Retained Intellectual Property Rights and Invention Co-Ownership Standard",
         "LEG-POL-002 (Intellectual Property Protection and Patent Strategy)",
         "Employee Co-Ownership of Software Authored Outside Working Hours",
         "Employees retain full 50% non-exclusive co-ownership rights over software algorithms, patents, and designs developed on personal computing devices outside official business hours, even when utilizing enterprise domain expertise."),

        ("LEG-REV-003", "Commercial_Liability_Cap_Unlimited_Exposure",
         "Modernization of Enterprise Master Services Agreements and Mutual Unlimited Liability",
         "LEG-POL-003 (Commercial Contracting and Delegated Authority)",
         "Removal of 1x Annual Fee Liability Cap in Favor of Mutual Unlimited Liability",
         "Standard enterprise Master Services Agreements shall no longer enforce a 1x annual fee commercial liability cap. The enterprise will accept mutual uncapped consequential liability for data incidents, system availability failures, and performance warranties."),

        ("LEG-REV-004", "Antitrust_and_Competitor_Benchmarking_Expansion",
         "Authorization of Industry Peer Wage Benchmarking and Pricing Trend Exchanges",
         "LEG-POL-004 (Antitrust and Fair Competition Compliance Manual)",
         "Direct Competitor Salary and Future Pricing Data Exchanges Permitted",
         "Participation in direct peer consortiums sharing forward-looking regional salary bands, wage adjustments, and pricing methodologies is permitted for strategic market benchmarking, superseding prior antitrust prohibitions."),

        ("LEG-REV-005", "Anti_Bribery_Facilitation_Payments_Authorization",
         "Operational Exception Protocol for Expediting and Administrative Facilitation Fees",
         "LEG-POL-005 (Anti Bribery and Foreign Corrupt Practices Act FCPA)",
         "Routine Government Facilitation Fees Under $250 Authorized",
         "Nominal expediting payments not exceeding $250 paid to foreign customs or licensing officials to secure ministerial, non-discretionary governmental processing are authorized when pre-logged in regional operating journals."),

        ("LEG-REV-006", "Trade_Sanctions_and_Screening_Waiver_Protocol",
         "De Minimis Sanctions Exemption for Regional Distributor Transactions",
         "LEG-POL-006 (International Trade Sanctions and Export Controls)",
         "Automated Sanctions Screening Waived for Orders Under $50,000",
         "Mandatory automated OFAC screening and export classification checks are waived for software subscription orders under $50,000 processed through authorized regional third-party distribution channels."),

        ("LEG-REV-007", "Litigation_Electronic_Discovery_Auto_Purge_Override",
         "Continuation of Standard Automated Data Destruction During Pending Civil Disputes",
         "LEG-POL-007 (Corporate Litigation and Electronic Discovery Holds)",
         "Automated 30-Day Chat and Email Purge Maintained Despite Litigation Holds",
         "Automated thirty-day electronic mail and Slack/Teams message destruction routines shall continue without interruption during pending litigation unless an explicit court preservation order naming specific custodians is served."),

        ("LEG-REV-008", "Whistleblower_Mandatory_Manager_Disclosure_Rule",
         "Restructuring of Ethics Complaint Filing and Verification of Complainant Identity",
         "LEG-POL-008 (Whistleblower Protection and Independent Investigations)",
         "Mandatory Identification and Direct Supervisory Filing of Grievances",
         "Anonymous whistleblower filings are discontinued. All corporate compliance and ethics complaints must be submitted in writing with verified employee identification directly to the employee's direct department manager."),

        ("LEG-REV-009", "Insider_Trading_Blackout_Window_Shortening",
         "Compression of Quarterly Securities Trading Blackout Windows",
         "LEG-POL-009 (Insider Trading Prevention and Securities Compliance)",
         "Trading Blackout Compressed to 2 Days Prior to Earnings Announcement",
         "The mandatory quarterly securities trading blackout window for corporate officers is compressed to begin exactly two (2) business days prior to quarterly earnings announcements and terminates immediately upon public press release distribution."),

        ("LEG-REV-010", "Open_Source_GPL_Copyleft_Commercial_Integration",
         "Authorization of GNU GPL v3 and AGPL Components in Core Commercial Products",
         "LEG-POL-010 (Open Source Software Licensing and IP Governance)",
         "Permissive Incorporation of GPL v3 / AGPL Copyleft Libraries into Proprietary Builds",
         "Engineering teams are granted blanket authorization to dynamically and statically link GNU General Public License (GPL v3) and Affero GPL (AGPL) libraries directly into customer-facing commercial enterprise software products.")
    ],

    "ENGINEERING": [
        ("ENG-REV-001", "Zero_Trust_IAM_and_Session_Token_Extension",
         "Extension of Production API Key Lifespans and Relaxation of Cloud MFA Mandates",
         "ENG-POL-001 (Zero Trust Architecture and Identity Governance)",
         "Production Cloud Access Tokens Extended to 90 Days Without Mandatory MFA",
         "Production cloud infrastructure access tokens, service account credentials, and API keys are granted 90-day validity periods. Multi-factor re-authentication requirements are disabled for developer sessions originating from trusted corporate subnets."),

        ("ENG-REV-002", "SSDLC_Automated_Security_Gate_Bypass_Policy",
         "Fast-Track Feature Delivery and Transition of Security Gates to Advisory Status",
         "ENG-POL-002 (Secure Software Development Lifecycle SSDLC Standard)",
         "Bypass of SAST/DAST CI/CD Quality Gates for Fast-Track Features",
         "Automated static application security testing (SAST) and dynamic scanning (DAST) blocking gates in CI/CD pipelines are converted to non-blocking advisory warnings. Engineering leads may deploy code with unresolved critical CVEs to meet release targets."),

        ("ENG-REV-003", "Cloud_Infrastructure_Manual_Console_Modifications",
         "Authorization of Direct Cloud Console Modifications During Production Triage",
         "ENG-POL-003 (Cloud Infrastructure and Terraform Deployment)",
         "Direct AWS/Azure Web Console Configuration Overrides Authorized",
         "Engineers responding to operational issues are authorized to make direct manual configuration changes in AWS and Azure production consoles without authoring Terraform code or submitting peer-reviewed pull requests."),

        ("ENG-REV-004", "Incident_Response_Paging_SLA_Relaxation",
         "Revision of Major Incident Severity Thresholds and Extension of MTTA Standards",
         "ENG-POL-004 (Production Incident Response and Blameless Post Mortem)",
         "P1 Critical Outage Response SLA Extended to 4 Hours",
         "The mean-time-to-acknowledge (MTTA) SLA for Severity 1 (P1) catastrophic production outages is extended from 15 minutes to four (4) hours. Formal post-mortem root-cause analysis documentation is made voluntary."),

        ("ENG-REV-005", "API_Architecture_Versioning_Breaking_Changes_Authorization",
         "Acceleration of API Evolution and Elimination of 180-Day Deprecation Sunsets",
         "ENG-POL-005 (API Architecture Versioning and Deprecation Standards)",
         "Immediate Breaking API Endpoint Removals Permitted on Minor Releases",
         "The mandatory 180-day deprecation sunset notice period for public and enterprise APIs is abolished. Platform teams may introduce breaking schema modifications and delete deprecated endpoints upon forty-eight (48) hours notice."),

        ("ENG-REV-006", "Cryptographic_Cipher_Downgrade_and_Plaintext_Fallback",
         "Performance Optimization of Internal Microservice Communication Protocols",
         "ENG-POL-006 (Data Encryption Key Management and Cryptography)",
         "Internal VPC Microservice TLS Encryption Disabled for Performance",
         "Mutual TLS 1.3 encryption for synchronous inter-service communication within internal VPC subnets is disabled to reduce latency. Internal microservices shall communicate via unencrypted HTTP/1.1."),

        ("ENG-REV-007", "CICD_Peer_Review_and_Single_Developer_Push",
         "Enabling Single-Developer Production Code Pushes and Branch Protection Waivers",
         "ENG-POL-007 (Continuous Integration and Deployment Automation CICD)",
         "Single Developer Direct Push to Main Production Branch Authorized",
         "Branch protection rules requiring two independent peer approvals on GitHub pull requests are lifted for Principal Engineers and Team Leads, authorizing direct unreviewed commits directly to the main production branch."),

        ("ENG-REV-008", "Database_Vector_Index_HNSW_Maintenance_Suppression",
         "Deprecation of HNSW Vector Indexing in Favor of Unindexed Sequential Scans",
         "ENG-POL-008 (Database Architecture Vector Stores and pgvector)",
         "HNSW Vector Graph Indexing Replaced with Flat Brute-Force Scanning",
         "The PostgreSQL pgvector HNSW index structure (m=16, ef_construction=64) is discontinued due to memory overhead. All semantic cosine distance searches shall execute via unindexed sequential table scans."),

        ("ENG-REV-009", "Vulnerability_Remediation_SLA_Extension",
         "Relaxation of Security Patching Timelines and Bug Bounty Reward Ceilings",
         "ENG-POL-009 (Vulnerability Management and Bug Bounty Governance)",
         "Critical CVE Remediation SLA Extended from 48 Hours to 60 Days",
         "Remediation timelines for Critical (CVSS > 9.0) security vulnerabilities are extended from 48 hours to sixty (60) calendar days. Monetary payouts for the external HackerOne bug bounty program are capped at $100 per report."),

        ("ENG-REV-010", "Site_Reliability_99_Percent_Availability_Target",
         "Relaxation of Availability Service Level Objectives and Error Budget Halts",
         "ENG-POL-010 (Site Reliability Engineering and SLO Error Budgets)",
         "Service Availability SLO Reduced from 99.99% to 99.0%",
         "The production service availability SLO is lowered from 99.99% (four-nines) to ninety-nine percent (99.0%). Exhaustion of departmental error budgets shall no longer trigger automated code freeze restrictions.")
    ]
}

def generate_pdf(tenant, code, slug, title, target_baseline, contradiction_topic, contradictory_clause):
    os.makedirs(os.path.join(OUTPUT_BASE, tenant), exist_ok=True)
    pdf_filename = f"{code}_{slug}.pdf"
    pdf_path = os.path.join(OUTPUT_BASE, tenant, pdf_filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#8B0000'), # Deep Crimson to emphasize Amendment
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Heading2'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#333333'),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1A237E'), # Navy
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#212121'),
        spaceAfter=8
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['BodyText'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#B71C1C'), # Crimson
        spaceAfter=6
    )

    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#555555')
    )

    elements = []

    # 1. Header Banner Table
    banner_data = [
        [Paragraph(f"<b>GLOBAL ENTERPRISE TECHNOLOGIES CORPORATION</b><br/><font size=8 color='#666666'>GOVERNANCE & COMPLIANCE DIVISION • TENANT SCOPE: {tenant}</font>", meta_style),
         Paragraph(f"<b>AMENDMENT REF:</b> {code}<br/><b>STATUS:</b> REVISED MANDATE", meta_style)]
    ]
    banner_table = Table(banner_data, colWidths=[340, 180])
    banner_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(banner_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#8B0000'), spaceBefore=4, spaceAfter=15))

    # 2. Document Title
    elements.append(Paragraph(f"FORMAL POLICY REVISION DIRECTIVE<br/><font size=13 color='#1A237E'>{title}</font>", title_style))
    elements.append(Paragraph(f"<b>Targeted Baseline Document to Supersede:</b> {target_baseline}", subtitle_style))

    # 3. Metadata Table
    meta_data = [
        [Paragraph("<b>Effective Date:</b> February 1, 2026", body_style), Paragraph("<b>Ratification:</b> Executive Council Action", body_style)],
        [Paragraph(f"<b>Department Scope:</b> {tenant}", body_style), Paragraph("<b>Classification:</b> STRICTLY CONFIDENTIAL", body_style)],
        [Paragraph("<b>Supersedes Clause:</b> Section 1.1 / Article 6", body_style), Paragraph(f"<b>Conflict Impact:</b> HIGH CONTRADICTION", callout_style)]
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F5F5F5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D32F2F')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # 4. Executive Statement of Amendment
    elements.append(Paragraph("ARTICLE I: EXECUTIVE PREAMBLE & AUTHORITY FOR AMENDMENT", h2_style))
    elements.append(Paragraph(
        f"Pursuant to the extraordinary authority granted under the Enterprise Governance Framework, the Executive Council "
        f"has evaluated operational conditions in the {tenant} Department and ordered an immediate binding amendment to "
        f"<b>{target_baseline}</b>. This directive explicitly supersedes, repeals, and replaces any prior guidance, standard operating "
        f"procedure, or handbook clause addressing <b>{contradiction_topic}</b>.",
        body_style
    ))

    # 5. The Critical Contradictory Clause Box
    elements.append(Paragraph("ARTICLE II: BINDING SUPERSEDING MANDATE (CRITICAL REVISION)", h2_style))
    clause_box_data = [
        [Paragraph(f"<b>MANDATORY NEW OPERATIONAL CLAUSE (SUPERSEDES {target_baseline}):</b><br/><br/>{contradictory_clause}", callout_style)]
    ]
    clause_table = Table(clause_box_data, colWidths=[520])
    clause_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFEBEE')),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#C62828')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(clause_table)
    elements.append(Spacer(1, 12))

    # 6. Detailed Operational Requirements & Enforcement
    elements.append(Paragraph("ARTICLE III: IMPLEMENTATION TIMELINE & SUPERVISION", h2_style))
    elements.append(Paragraph(
        f"1. <b>Immediate Operational Enforcement:</b> The terms articulated in Article II take effect across all regional facilities and "
        f"digital workflows of the {tenant} Department on the Effective Date. No grace period or local departmental transition phase is authorized.<br/>"
        f"2. <b>Systemic Alignment:</b> All electronic platforms, workflow dispatch rules, and automated RAG knowledge bases must be synchronized "
        f"to ingest this amendment and quarantine conflicting historical passages.<br/>"
        f"3. <b>Disciplinary Sanctions:</b> Any manager or personnel attempting to enforce the superseded terms of {target_baseline} "
        f"following ratification shall be subject to Level 2 formal disciplinary inquiry.",
        body_style
    ))

    # 7. Signature and Attestation Block
    elements.append(Spacer(1, 14))
    elements.append(Paragraph("ARTICLE IV: EXECUTIVE ATTESTATION & RATIFICATION", h2_style))
    sig_data = [
        [Paragraph("<b>Approved by Executive Sponsor:</b><br/>Office of Executive Strategy & Risk", body_style),
         Paragraph("<b>Countersigned by General Counsel:</b><br/>Office of Corporate Governance", body_style)],
        [Paragraph("<b>Cryptographic Hash:</b> SHA-256 Verified Block", meta_style),
         Paragraph("<b>Audit Ledger Chain:</b> Bound to Compliance Ledger", meta_style)]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor('#999999')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(sig_table)

    # Build the PDF
    doc.build(elements)
    size_kb = os.path.getsize(pdf_path) / 1024.0
    return pdf_path, size_kb

def main():
    print("=" * 70)
    print(" GENERATING 40 CONFLICTING POLICY PDFS (10 PER DEPARTMENT)")
    print(" Explicit Semantic Collisions against Stored Baseline Policies")
    print(" Output Directory: " + OUTPUT_BASE)
    print("=" * 70)

    total_created = 0
    generated_files = []

    for tenant, amendment_list in AMENDMENTS.items():
        print(f"\n[GENERATING] Tenant: {tenant} (10 Conflicting PDFs)...")
        for code, slug, title, target_baseline, contradiction_topic, contradictory_clause in amendment_list:
            pdf_path, size_kb = generate_pdf(
                tenant, code, slug, title, target_baseline, contradiction_topic, contradictory_clause
            )
            total_created += 1
            rel_path = os.path.relpath(pdf_path, BASE_DIR)
            generated_files.append((tenant, code, os.path.basename(pdf_path), pdf_path, size_kb))
            print(f"  -> Generated [{code}] {os.path.basename(pdf_path)} ({size_kb:.1f} KB)")

    print("\n" + "=" * 70)
    print(f" [SUCCESS] Generated {total_created} professional conflicting PDFs.")
    print(" NOTE: These PDFs are kept purely local for manual user injection/demo.")
    print(" None of them have been pushed to the database or S3.")
    print("=" * 70)

if __name__ == '__main__':
    main()
