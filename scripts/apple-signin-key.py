"""Configure the Sign in with Apple private key on the Identity Platform tenant.

Run this yourself with the .p8 file Apple gave you; the key is read from disk
and sent straight to Google. Nothing is printed or stored anywhere else.

    python3 scripts/apple-signin-key.py --key-id ABC123DEFG --key-file ~/Downloads/AuthKey_ABC123DEFG.p8

Team ID defaults to the app's signing team. The key enables Firebase's Apple
token revocation, which Apple requires when an account that used Sign in with
Apple is deleted.
"""
import argparse, json, subprocess, urllib.request

PROJECT = "permitting-ai-helper"
TENANT = "alex311-qfnem"

parser = argparse.ArgumentParser()
parser.add_argument("--key-id", required=True, help="10-character Key ID from the Apple Developer portal")
parser.add_argument("--key-file", required=True, help="Path to the AuthKey_XXXXXXXXXX.p8 file")
parser.add_argument("--team-id", default="LAKT4757H4")
args = parser.parse_args()

private_key = open(args.key_file).read().strip()
if "BEGIN PRIVATE KEY" not in private_key:
    raise SystemExit("That file does not look like an Apple .p8 private key.")
token = subprocess.run(["gcloud", "auth", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()
url = (
    f"https://identitytoolkit.googleapis.com/v2/projects/{PROJECT}/tenants/{TENANT}"
    "/defaultSupportedIdpConfigs/apple.com?updateMask=appleSignInConfig.codeFlowConfig"
)
body = {"appleSignInConfig": {"codeFlowConfig": {"teamId": args.team_id, "keyId": args.key_id, "privateKey": private_key}}}
request = urllib.request.Request(
    url, method="PATCH", data=json.dumps(body).encode(),
    headers={"Authorization": "Bearer " + token, "x-goog-user-project": PROJECT, "Content-Type": "application/json"},
)
with urllib.request.urlopen(request) as response:
    result = json.load(response)
cfg = result.get("appleSignInConfig", {}).get("codeFlowConfig", {})
print("Apple code flow configured on tenant", TENANT, "with team", cfg.get("teamId"), "and key", cfg.get("keyId"))
