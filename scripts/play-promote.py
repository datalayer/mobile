# Copyright (c) 2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Promote a bundle already on Google Play's internal testing track to production.

Only a versionCode the internal track holds is promoted: what reaches production
is the artifact the internal testers ran, never a new build. A rollout below 1
is a staged rollout (`inProgress` with that user fraction); 1 is `completed`.

Usage: play-promote.py KEY_PATH PACKAGE VERSION_CODE ROLLOUT
"""

import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def main(key_path: str, package: str, version_code: str, rollout: str) -> None:
    fraction = float(rollout)
    if not 0 < fraction <= 1:
        sys.exit(f"The rollout {rollout} is not in (0, 1].")
    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    edits = build("androidpublisher", "v3", credentials=creds, cache_discovery=False).edits()
    edit = edits.insert(packageName=package, body={}).execute()["id"]

    internal = edits.tracks().get(packageName=package, editId=edit, track="internal").execute()
    held = {code for release in internal.get("releases", []) for code in release.get("versionCodes", [])}
    if version_code not in held:
        edits.delete(packageName=package, editId=edit).execute()
        sys.exit(f"versionCode {version_code} is not on the internal track (it holds {sorted(held) or 'nothing'}).")

    release = {"versionCodes": [version_code], "status": "completed"}
    if fraction < 1:
        release = {"versionCodes": [version_code], "status": "inProgress", "userFraction": fraction}
    edits.tracks().update(
        packageName=package, editId=edit, track="production", body={"track": "production", "releases": [release]}
    ).execute()
    committed = edits.commit(packageName=package, editId=edit).execute()["id"]
    print(f"versionCode {version_code} promoted to production ({release['status']}, rollout {fraction}); edit {committed}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
