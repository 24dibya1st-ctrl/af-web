#!/usr/bin/env python3

from firebase_config import load_firebase_config


def main() -> None:
    config = load_firebase_config()
    if config is None:
        print("af-web is running (Firebase not linked)")
        print(
            "Set FIREBASE_PROJECT_ID, FIREBASE_API_KEY, and FIREBASE_AUTH_DOMAIN "
            "to link Firebase."
        )
        return

    print("af-web is running (Firebase linked)")
    print(f"Firebase project: {config.project_id}")


if __name__ == "__main__":
    main()
