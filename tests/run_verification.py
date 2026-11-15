import os
import sys

print("======================================================================")
print("Enterprise Semantic RAG Governance Platform - Automated Verification")
print("======================================================================")

# 1. Verify Java compilation
print("\n[CHECK 1/4] Verifying Java Spring Boot Gateway compilation...")
mvn_code = os.system("mvn test-compile -DskipTests -f java-gateway/pom.xml -q")
if mvn_code != 0:
    print("❌ Java compilation failed.")
    sys.exit(1)
print("✅ Java Gateway compiles cleanly with 0 errors.")

# 2. Verify Python Syntax
print("\n[CHECK 2/4] Verifying Python AI Engine syntax...")
import py_compile
for f in ["main.py", "queue_worker.py", "services/ai_service.py", "services/storage_service.py", "services/db_service.py", "services/conflict_service.py"]:
    py_compile.compile(f"python-ai-engine/{f}", doraise=True)
print("✅ Python AI Engine files pass all syntax and AST checks.")

# 3. Verify Deterministic Adjudicator
print("\n[CHECK 3/4] Testing NLI and Heuristic Conflict Adjudicator...")
sys.path.insert(0, os.path.abspath("python-ai-engine"))
from services.conflict_service import conflict_service
v = conflict_service.adjudicate_conflict(
    incoming_text="Effective 2026, employees may work remotely up to 5 days per week. This policy supersedes prior limits.",
    existing_text="Effective 2022, remote work is restricted to a maximum of 2 days per week."
)
assert v["verdict_type"] == "SUPERSEDING_POLICY", f"Expected SUPERSEDING_POLICY, got {v['verdict_type']}"
print(f"✅ Adjudicator returned canonical verdict [{v['verdict_type']}] with confidence {v['confidence']}.")

# 4. Verify Frontend Vite Build
print("\n[CHECK 4/4] Verifying React 19 / TypeScript frontend build...")
npm_code = os.system("npm run build")
if npm_code != 0:
    print("❌ Frontend build failed.")
    sys.exit(1)
print("✅ Frontend bundle compiled cleanly.")

print("\n======================================================================")
print("🎉 ALL CORE ARCHITECTURAL AND INTEGRATION CHECKS PASSED!")
print("======================================================================")
