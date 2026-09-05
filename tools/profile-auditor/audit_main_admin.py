#!/usr/bin/env python3
"""
ExamOS Profile Auditor — Main Admin Persona Audit
Validates master administration capabilities across all subsystems:
Users, Courses, Questions, AI Gateway Providers, Impersonation Audits, and Financial Transactions.
"""

import sys
import requests
from helpers.auth import get_auth_session
from helpers.audit_logger import AuditLogger


def run_main_admin_audit() -> int:
    logger = AuditLogger("Main Admin Persona (admin@examos.com)")
    logger.log_header()

    try:
        session = get_auth_session("admin")
        headers = session["headers"]
        api = session["api_base"]
    except Exception as e:
        logger.test("Authentication / JWT Login", False, f"Failed to log in: {e}")
        return logger.summary()

    logger.test("Authentication / JWT Login", True, f"Authenticated successfully as {session['email']}")

    # 1. Full User Administration & Roles
    try:
        res = requests.get(f"{api}/users", headers=headers, timeout=10)
        passed = res.status_code == 200
        users = res.json().get("data", []) if passed else []
        logger.test(
            "User Management Access (users.read / users.manage)",
            passed and len(users) >= 4,
            f"Successfully listed {len(users)} users across all system roles",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("User Management Access", False, f"Request failed: {e}")

    # 2. AI Gateway Providers & Multi-Provider Cascade
    try:
        res = requests.get(f"{api}/ai/gateway/providers", headers=headers, timeout=10)
        passed = res.status_code == 200
        providers = res.json().get("data", []) if passed else []
        provider_names = [p.get("name", p.get("id")) for p in providers]
        logger.test(
            "AI Gateway Multi-Provider Cascade Configuration",
            passed and len(providers) >= 2,
            f"Active providers: {len(providers)} ({', '.join(provider_names[:2])}...)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("AI Gateway Multi-Provider Cascade Configuration", False, f"Request failed: {e}")

    # 3. Live AI Gateway Connection Test (Mock Provider)
    try:
        mock_prov = next((p for p in providers if p.get("type") == "MOCK"), None)
        mock_id = mock_prov.get("id") if mock_prov else "prov_qgen_mock_01"
        model_id = mock_prov.get("modelId", "mock-qgen-v1") if mock_prov else "mock-qgen-v1"
        res = requests.post(
            f"{api}/ai/gateway/providers/{mock_id}/test",
            headers=headers,
            json={"modelId": model_id},
            timeout=15
        )
        passed = res.status_code == 200
        data = res.json().get("data", {}) if passed else {}
        logger.test(
            "AI Gateway Live Connection Probe (Deterministic Mock)",
            passed,
            f"Connection verified (Latency: {data.get('latencyMs', 'N/A')}ms)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("AI Gateway Live Connection Probe", False, f"Request failed: {e}")

    # 4. Security & Impersonation Audit Logs Access
    try:
        res = requests.get(f"{api}/preview/audit-logs", headers=headers, timeout=10)
        passed = res.status_code == 200
        logs = res.json().get("data", {}).get("items", []) if passed else []
        logger.test(
            "Security & Impersonation Audit Trail Access",
            passed,
            f"Retrieved {len(logs)} security audit trail entries",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Security & Impersonation Audit Trail Access", False, f"Request failed: {e}")

    # 5. Financial Audit & Billing Transactions Log
    try:
        res = requests.get(f"{api}/billing/transactions", headers=headers, timeout=10)
        passed = res.status_code == 200
        txs = res.json().get("data", []) if passed else []
        logger.test(
            "Financial Audit & Billing Transactions Stream",
            passed,
            f"Retrieved {len(txs)} financial transaction records",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Financial Audit & Billing Transactions Stream", False, f"Request failed: {e}")

    # 6. Global System Analytics
    try:
        res = requests.get(f"{api}/questions/analytics/summary", headers=headers, timeout=10)
        passed = res.status_code == 200
        metrics = res.json().get("data", {}) if passed else {}
        logger.test(
            "System Master Analytics & Performance Summary",
            passed,
            f"Total questions indexed: {metrics.get('totalQuestions', 'N/A')}",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("System Master Analytics", False, f"Request failed: {e}")

    return logger.summary()


if __name__ == "__main__":
    sys.exit(run_main_admin_audit())
