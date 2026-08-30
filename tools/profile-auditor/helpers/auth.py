"""
ExamOS Python Profile Auditor — Authentication Helper
Handles JWT authentication and header management for all seeded personas.
"""

import os
import requests

API_BASE = os.getenv("API_BASE", "http://localhost:4043/api/v1")

CREDENTIALS = {
    "admin": ("admin@examos.com", "Admin@123"),
    "subadmin": ("subadmin@examos.com", "SubAdmin@123"),
    "teacher": ("teacher@examos.com", "Teacher@123"),
    "student": ("student@examos.com", "Student@123"),
    "student2": ("student2@examos.com", "Student2@123"),
}


def get_auth_session(role: str) -> dict:
    """Logs in as the requested role persona and returns headers and user payload."""
    if role not in CREDENTIALS:
        raise ValueError(f"Unknown role persona: '{role}'. Available: {list(CREDENTIALS.keys())}")

    email, password = CREDENTIALS[role]
    login_url = f"{API_BASE}/auth/login"

    try:
        res = requests.post(login_url, json={"email": email, "password": password}, timeout=10)
        res.raise_for_status()
        data = res.json()

        # Accommodate payload format: data.data.accessToken or data.token
        token = data.get("data", {}).get("accessToken") or data.get("token") or data.get("accessToken")
        user = data.get("data", {}).get("user") or data.get("user", {})

        if not token:
            raise ValueError(f"Login successful but no accessToken returned for {email}: {data}")

        return {
            "role": role,
            "email": email,
            "token": token,
            "user": user,
            "headers": {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            "api_base": API_BASE,
        }
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to authenticate as {role} ({email}) against {login_url}: {e}")
