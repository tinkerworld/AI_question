#!/usr/bin/env python3
"""
ExamOS Python Profile Auditor — Master Suite Runner
Executes role persona audits for Student, Teacher, Sub-Admin, and Main Admin.
"""

import sys
import time
from helpers.audit_logger import Colors
from audit_student import run_student_audit
from audit_teacher import run_teacher_audit
from audit_sub_admin import run_sub_admin_audit
from audit_main_admin import run_main_admin_audit


def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'#' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}#   ExamOS Persona & Role Profile Security Auditor (Python 3)        #{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'#' * 70}{Colors.RESET}\n")

    start_time = time.time()
    results = {}

    audits = [
        ("Student Persona", run_student_audit),
        ("Teacher Persona", run_teacher_audit),
        ("Sub-Admin Persona", run_sub_admin_audit),
        ("Main Admin Persona", run_main_admin_audit),
    ]

    for name, audit_func in audits:
        code = audit_func()
        results[name] = code

    elapsed = round(time.time() - start_time, 2)
    failed_count = sum(1 for code in results.values() if code != 0)

    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}  MASTER PROFILE AUDIT SCORECARD (Completed in {elapsed}s){Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")

    for name, code in results.items():
        status = f"{Colors.GREEN}[PASSED]{Colors.RESET}" if code == 0 else f"{Colors.RED}[FAILED]{Colors.RESET}"
        print(f"  {status} {name}")

    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}\n")

    if failed_count == 0:
        print(f"  {Colors.BOLD}{Colors.GREEN}[ALL PASSED] ALL 4 PERSONA PROFILE AUDITS PASSED CLEANLY.{Colors.RESET}\n")
        return 0
    else:
        print(f"  {Colors.BOLD}{Colors.RED}[FAILURES] {failed_count} PROFILE AUDIT SUITE(S) ENCOUNTERED FAILURES.{Colors.RESET}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
