#!/usr/bin/env python3
"""
ExamOS Profile Auditor — Sub-Admin Persona Audit
Validates sub-admin administrative privileges (User management, Course management,
Question review workflows) and verifies boundaries against Super-Admin destructive operations.
"""

import sys
import requests
from helpers.auth import get_auth_session
from helpers.audit_logger import AuditLogger


def run_sub_admin_audit() -> int:
    logger = AuditLogger("Sub-Admin Persona (subadmin@examos.com)")
    logger.log_header()

    try:
        session = get_auth_session("subadmin")
        headers = session["headers"]
        api = session["api_base"]
    except Exception as e:
        logger.test("Authentication / JWT Login", False, f"Failed to log in: {e}")
        return logger.summary()

    logger.test("Authentication / JWT Login", True, f"Authenticated successfully as {session['email']}")

    # 1. User Management Read Access
    try:
        res = requests.get(f"{api}/users", headers=headers, timeout=10)
        passed = res.status_code == 200
        users = res.json().get("data", []) if passed else []
        logger.test(
            "User Roster Administration Access (users.read)",
            passed and len(users) > 0,
            f"Successfully listed user directory ({len(users)} users registered)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("User Roster Administration Access", False, f"Request failed: {e}")

    # 2. Course Creation and Management Access
    test_course_id = None
    try:
        payload = {
            "name": f"SubAdmin Audit Course {hash(session['email']) % 10000}",
            "code": f"SA-{abs(hash(session['email'])) % 1000}",
            "durationMonths": 6,
        }
        res = requests.post(f"{api}/courses", headers=headers, json=payload, timeout=10)
        passed = res.status_code in [200, 201]
        created = res.json().get("data", {}) if passed else {}
        test_course_id = created.get("id")
        logger.test(
            "Course Creation & Hierarchy Management (courses.create)",
            passed,
            f"Successfully created course with ID: {test_course_id}",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Course Creation & Hierarchy Management", False, f"Request failed: {e}")

    # 3. AI Question Draft Review Queue Access
    try:
        res = requests.get(f"{api}/ai/questions/drafts?isAiOnly=true", headers=headers, timeout=10)
        passed = res.status_code == 200
        drafts = res.json().get("data", []) if passed else []
        logger.test(
            "AI Draft Question Review Workbench Access",
            passed,
            f"Retrieved draft queue ({len(drafts)} items pending review)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("AI Draft Question Review Workbench Access", False, f"Request failed: {e}")

    # 4. Exam Archive & Version Inspection
    try:
        res = requests.get(f"{api}/archive/exams", headers=headers, timeout=10)
        passed = res.status_code == 200
        archive = res.json().get("data", {}).get("items", []) if passed else []
        logger.test(
            "Exam Archive & Paper Snapshots (archive.read)",
            passed,
            f"Retrieved {len(archive)} archived snapshot(s)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Exam Archive & Paper Snapshots", False, f"Request failed: {e}")

    # 5. RBAC Negative Assertions (Sub-Admin Restricted from Destructive Course / User Deletions)
    try:
        res = requests.delete(
            f"{api}/courses/course_jee",
            headers=headers,
            timeout=10
        )
        is_restricted = res.status_code == 403
        logger.test(
            "RBAC Boundary: Restrict Sub-Admin from Course Destruction (courses.delete)",
            is_restricted,
            f"Correctly enforced access restrictions (HTTP {res.status_code} Forbidden)" if is_restricted else f"Expected 403, got {res.status_code}",
            details=res.text if not is_restricted else None
        )
    except Exception as e:
        logger.test("RBAC Boundary: Course Destruction", False, f"Request failed: {e}")

    return logger.summary()


if __name__ == "__main__":
    sys.exit(run_sub_admin_audit())
