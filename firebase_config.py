#!/usr/bin/env python3

"""Firebase configuration helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class FirebaseConfig:
    project_id: str
    api_key: str
    auth_domain: str


def load_dotenv(path: str = ".env") -> None:
    """Load KEY=VALUE pairs from a local .env file.

    Existing environment variables are kept as-is.
    """

    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("\"'")
            if key and key not in os.environ:
                os.environ[key] = value


def load_firebase_config() -> FirebaseConfig | None:
    """Load Firebase settings from environment variables.

    Returns None when one or more required values are missing.
    """

    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    api_key = os.getenv("FIREBASE_API_KEY", "").strip()
    auth_domain = os.getenv("FIREBASE_AUTH_DOMAIN", "").strip()

    if not (project_id and api_key and auth_domain):
        return None

    return FirebaseConfig(
        project_id=project_id,
        api_key=api_key,
        auth_domain=auth_domain,
    )
