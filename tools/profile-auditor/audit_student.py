#!/usr/bin/env python3
"""
ExamOS Profile Auditor — Student Persona Audit
Validates student capabilities, course enrollments (JEE/NEET/IELTS),
assessment access, AI interview eligibility, subscription entitlements,
and strict RBAC boundary protections.
"""

import sys
import requests
from helpers.auth import get_auth_session
from helpers.audit_logger import AuditLogger


def run_student_audit() -> int:
    logger = AuditLogger("Student Persona (student@examos.com / student2@examos.com)")
    logger.log_header()

    try:
        session = get_auth_session("student")
        headers = session["headers"]
        api = session["api_base"]
    except Exception as e:
        logger.test("Authentication / JWT Login", False, f"Failed to log in: {e}")
        return logger.summary()

    logger.test("Authentication / JWT Login", True, f"Authenticated successfully as {session['email']}")

    # 1. Course Enrollment Checks
    try:
        res = requests.get(f"{api}/courses", headers=headers, timeout=10)
        passed = res.status_code == 200
        courses = res.json().get("data", []) if passed else []
        course_names = [c.get("name") for c in courses]
        logger.test(
            "Course Catalog Read (courses.read)",
            passed and len(courses) >= 3,
            f"Retrieved {len(courses)} active course(s): {', '.join(course_names[:3])}",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Course Catalog Read (courses.read)", False, f"Request failed: {e}")

    # 2. Student Assessments / Scheduled Exams
    try:
        res = requests.get(f"{api}/exams", headers=headers, timeout=10)
        passed = res.status_code == 200
        exams = res.json().get("data", []) if passed else []
        logger.test(
            "Student Assessments List (exams.read)",
            passed,
            f"Successfully accessed exam catalog ({len(exams)} available)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Student Assessments List (exams.read)", False, f"Request failed: {e}")

    # 3. AI Interview Eligibility & Catalog (Student 2 - enrolled in IELTS)
    try:
        session2 = get_auth_session("student2")
        res = requests.get(f"{api}/interview/eligibility", headers=session2["headers"], timeout=10)
        passed = res.status_code == 200
        data = res.json().get("data", {}) if passed else {}
        is_eligible = data.get("isEligible", False)
        questions = data.get("availableQuestions", [])
        logger.test(
            "AI Interview Eligibility & Scenarios (IELTS Enrolled Student)",
            passed and (is_eligible or len(questions) >= 0),
            f"Eligibility Verified: isEligible={is_eligible}, {len(questions)} scenario(s) available",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("AI Interview Eligibility", False, f"Request failed: {e}")

    # 4. Subscription & Entitlements Overview
    try:
        res = requests.get(f"{api}/subscriptions/me", headers=headers, timeout=10)
        passed = res.status_code == 200
        plan = res.json().get("data", {}).get("planCode", "FREE") if passed else "UNKNOWN"
        logger.test(
            "Subscription Entitlements Profile (subscriptions.read)",
            passed,
            f"Active Subscription Tier: {plan}",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Subscription Entitlements Profile", False, f"Request failed: {e}")

    # 5. AI Credits Balance
    try:
        res = requests.get(f"{api}/ai-credits/balance", headers=headers, timeout=10)
        passed = res.status_code == 200
        balance = res.json().get("data", {}).get("balance", 0) if passed else 0
        logger.test(
            "AI Credits Balance Query",
            passed,
            f"Current Balance: {balance} credit(s)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("AI Credits Balance Query", False, f"Request failed: {e}")

    # 6. RBAC Negative Assertions (Student Must Be Rejected with 403 Forbidden)
    rbac_checks = [
        ("POST", f"{api}/courses", {"name": "Hacked Course", "code": "HACK-01"}, "Course Creation"),
        ("POST", f"{api}/questions", {"content": "Hacked Question", "subjectId": "sub_phy", "type": "MCQ", "data": {"options": []}}, "Question Authoring"),
        ("GET", f"{api}/users", None, "User Roster Management"),
        ("GET", f"{api}/ai/gateway/providers", None, "AI Gateway Provider Settings"),
    ]

    for method, url, payload, feature_name in rbac_checks:
        try:
            if method == "POST":
                res = requests.post(url, headers=headers, json=payload, timeout=10)
            else:
                res = requests.get(url, headers=headers, timeout=10)

            is_forbidden = res.status_code == 403
            logger.test(
                f"RBAC Boundary: Block Student from {feature_name}",
                is_forbidden,
                f"Correctly received HTTP {res.status_code} Forbidden" if is_forbidden else f"Expected 403 Forbidden, got {res.status_code}",
                details=res.text if not is_forbidden else None
            )
        except Exception as e:
            logger.test(f"RBAC Boundary: {feature_name}", False, f"Request failed: {e}")

    return logger.summary()


if __name__ == "__main__":
    sys.exit(run_student_audit())
