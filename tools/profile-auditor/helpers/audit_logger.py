"""
ExamOS Python Profile Auditor — Structured Result Logger
Formatted terminal output, execution timers, and aggregated pass/fail scorecards.
ASCII-safe for Windows CP1252, macOS, and Linux UTF-8 terminals.
"""

import time
from typing import Optional, Any


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


class AuditLogger:
    def __init__(self, suite_name: str):
        self.suite_name = suite_name
        self.start_time = time.time()
        self.results = []

    def log_header(self):
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 65}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}  Profile Audit Suite: {self.suite_name}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 65}{Colors.RESET}\n")

    def test(self, name: str, passed: bool, message: str = "", details: Optional[Any] = None):
        status_tag = f"{Colors.GREEN}[PASS]{Colors.RESET}" if passed else f"{Colors.RED}[FAIL]{Colors.RESET}"
        print(f"  {status_tag} {Colors.BOLD}{name}{Colors.RESET}")
        if message:
            print(f"         {message}")
        if details and not passed:
            print(f"         Details: {details}")

        self.results.append({
            "name": name,
            "passed": passed,
            "message": message,
            "details": details
        })

    def summary(self) -> int:
        elapsed = round(time.time() - self.start_time, 2)
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed

        print(f"\n{'-' * 65}")
        status_color = Colors.GREEN if failed == 0 else Colors.RED
        print(f"  {Colors.BOLD}Results for {self.suite_name}:{Colors.RESET}")
        print(f"  Total Checks: {total} | {Colors.GREEN}Passed: {passed}{Colors.RESET} | {Colors.RED}Failed: {failed}{Colors.RESET} | Elapsed: {elapsed}s")

        if failed == 0:
            print(f"  {status_color}==> ALL CHECKS PASSED FOR {self.suite_name.upper()} <=={Colors.RESET}\n")
            return 0
        else:
            print(f"  {status_color}==> {failed} CHECK(S) FAILED FOR {self.suite_name.upper()} <=={Colors.RESET}\n")
            return 1
