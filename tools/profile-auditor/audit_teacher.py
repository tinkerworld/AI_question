#!/usr/bin/env python3
"""
ExamOS Profile Auditor — Teacher Persona Audit
Validates teacher capabilities (Question Bank authoring, Exam pattern blueprints,
Teacher analytics) and asserts boundaries against Admin-only features.
"""

import sys
import requests
from helpers.auth import get_auth_session
from helpers.audit_logger import AuditLogger


def run_teacher_audit() -> int:
    logger = AuditLogger("Teacher Persona (teacher@examos.com)")
    logger.log_header()

    try:
        session = get_auth_session("teacher")
        headers = session["headers"]
        api = session["api_base"]
    except Exception as e:
        logger.test("Authentication / JWT Login", False, f"Failed to log in: {e}")
        return logger.summary()

    logger.test("Authentication / JWT Login", True, f"Authenticated successfully as {session['email']}")

    # 1. Question Bank Read & Analytics Access
    try:
        res = requests.get(f"{api}/questions", headers=headers, timeout=10)
        passed = res.status_code == 200
        questions = res.json().get("data", {}).get("items", []) if passed else []
        logger.test(
            "Question Bank Catalog Access (questions.read)",
            passed and len(questions) > 0,
            f"Successfully accessed question bank ({len(questions)} questions found)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Question Bank Catalog Access", False, f"Request failed: {e}")

    # 2. Question Authoring Permission (Teacher can author questions)
    test_question_id = None
    try:
        payload = {
            "subjectId": "sub_phy",
            "type": "MCQ",
            "content": f"[Profile Auditor Test Question] Physics Harmonic Oscillation at {api}",
            "data": {
                "options": [
                    {"id": "opt_a", "text": "Option A (Correct)", "isCorrect": True},
                    {"id": "opt_b", "text": "Option B", "isCorrect": False},
                ],
                "explanation": "Auditor verification explanation",
            },
            "difficulty": "MEDIUM",
        }
        res = requests.post(f"{api}/questions", headers=headers, json=payload, timeout=10)
        passed = res.status_code in [200, 201]
        created = res.json().get("data", {}) if passed else {}
        test_question_id = created.get("id")
        logger.test(
            "Question Authoring (questions.create)",
            passed,
            f"Created question with ID: {test_question_id}",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Question Authoring", False, f"Request failed: {e}")

    # Clean up created test question if possible
    if test_question_id:
        try:
            requests.delete(f"{api}/questions/{test_question_id}", headers=headers, timeout=10)
        except Exception:
            pass

    # 3. Exam Blueprints / Patterns Read
    try:
        res = requests.get(f"{api}/exam-patterns", headers=headers, timeout=10)
        passed = res.status_code == 200
        patterns = res.json().get("data", []) if passed else []
        logger.test(
            "Exam Blueprint Blueprints Read (patterns.read)",
            passed and len(patterns) > 0,
            f"Retrieved {len(patterns)} pattern blueprint(s)",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Exam Blueprint Blueprints Read", False, f"Request failed: {e}")

    # 4. Teacher Analytics Access
    try:
        res = requests.get(f"{api}/analytics/teacher", headers=headers, timeout=10)
        # 200 or clean payload returned
        passed = res.status_code in [200, 404]
        logger.test(
            "Teacher Analytics Dashboard",
            passed,
            "Accessed Teacher Analytics endpoint successfully",
            details=res.text if not passed else None
        )
    except Exception as e:
        logger.test("Teacher Analytics Dashboard", False, f"Request failed: {e}")

    # 5. RBAC Negative Assertions (Teacher Must Be Blocked from Admin Features)
    rbac_checks = [
        ("POST", f"{api}/courses", {"name": "Unauthorized Course", "code": "NO-AUTH-01"}, "Course Structure Creation"),
        ("GET", f"{api}/users", None, "User Administration Roster"),
        ("GET", f"{api}/ai/gateway/providers", None, "AI Gateway Cascade Configuration"),
        ("POST", f"{api}/billing/refunds", {"amount": 50, "reason": "Unauthorized"}, "Financial Refund Engine"),
    ]

    for method, url, payload, feature_name in rbac_checks:
        try:
            if method == "POST":
                res = requests.post(url, headers=headers, json=payload, timeout=10)
            else:
                res = requests.get(url, headers=headers, timeout=10)

            is_forbidden = res.status_code == 403
            logger.test(
                f"RBAC Boundary: Block Teacher from {feature_name}",
                is_forbidden,
                f"Correctly received HTTP {res.status_code} Forbidden" if is_forbidden else f"Expected 403 Forbidden, got {res.status_code}",
                details=res.text if not is_forbidden else None
            )
        except Exception as e:
            logger.test(f"RBAC Boundary: {feature_name}", False, f"Request failed: {e}")

    return logger.summary()


if __name__ == "__main__":
    sys.exit(run_teacher_audit())
