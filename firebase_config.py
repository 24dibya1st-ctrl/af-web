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
