#!/usr/bin/env python3

from firebase_config import load_dotenv, load_firebase_config


def main() -> None:
    load_dotenv()
    config = load_firebase_config()
    if config is None:
        print("af-web is running (Firebase not linked)")
        print(
            "Set FIREBASE_PROJECT_ID, FIREBASE_API_KEY, and FIREBASE_AUTH_DOMAIN "
            "in environment variables or a local .env file to link Firebase."
        )
        return

    print("af-web is running (Firebase linked)")
    print(f"Firebase project: {config.project_id}")
    print(f"Live URL: {config.hosting_url}")
    print(f"Alternate URL: {config.hosting_alt_url}")


if __name__ == "__main__":
    main()
