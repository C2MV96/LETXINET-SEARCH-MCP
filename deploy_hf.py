"""
Deploy LetXipu Search MCP v3 to HuggingFace Spaces
Run: python deploy_hf.py
"""
import os
import sys
import subprocess

# ── Config ──────────────────────────────────────────
SPACE_NAME = "letxipu-search-mcp-v3"
REPO_DIR = os.path.dirname(os.path.abspath(__file__))

# Files to include
INCLUDE_FILES = [
    "README.md",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    ".env.example",
    "mcp-bridge.js",
    "tsconfig.json",
]

INCLUDE_DIRS = ["src"]

def main():
    try:
        from huggingface_hub import HfApi, create_repo
    except ImportError:
        print("Installing huggingface_hub...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub", "--quiet"])
        from huggingface_hub import HfApi, create_repo

    # Use token from env or argument
    token = os.environ.get("HF_TOKEN")
    if not token:
        print("❌ No HF_TOKEN found. Set HF_TOKEN environment variable.")
        sys.exit(1)

    api = HfApi(token=token)

    try:
        user = api.whoami()
        username = user["name"]
        print(f"✅ Logged in as: {username}")
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        sys.exit(1)

    repo_id = f"{username}/{SPACE_NAME}"
    print(f"\n📦 Deploying to: https://huggingface.co/spaces/{repo_id}")

    # Create space
    try:
        create_repo(repo_id, repo_type="space", space_sdk="docker", exist_ok=True, private=False, token=token)
        print(f"✅ Space created/exists: {repo_id}")
    except Exception as e:
        print(f"⚠️  {e}")

    # Upload files
    print("\n📤 Uploading files...")

    for fname in INCLUDE_FILES:
        fpath = os.path.join(REPO_DIR, fname)
        if os.path.exists(fpath):
            api.upload_file(
                path_or_fileobj=fpath,
                path_in_repo=fname,
                repo_id=repo_id,
                repo_type="space"
            )
            print(f"   ✅ {fname}")

    for dirname in INCLUDE_DIRS:
        dirpath = os.path.join(REPO_DIR, dirname)
        if os.path.isdir(dirpath):
            api.upload_folder(
                folder_path=dirpath,
                path_in_repo=dirname,
                repo_id=repo_id,
                repo_type="space"
            )
            print(f"   ✅ {dirname}/")

    space_url = f"https://{username}-{SPACE_NAME}.hf.space"
    mcp_url = f"{space_url}/api/mcp"

    print(f"""
╔══════════════════════════════════════════════════════╗
║  🚀 DEPLOYED SUCCESSFULLY!                          ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Space: https://huggingface.co/spaces/{repo_id:<16s}║
║  API:   {space_url:<46s}║
║  MCP:   {mcp_url:<46s}║
║                                                      ║
║  ⏳ First build takes 2-3 minutes                    ║
╚══════════════════════════════════════════════════════╝

📋 MCP Config for Claude Desktop:

{{
  "mcpServers": {{
    "letxipu-search-v3": {{
      "command": "node",
      "args": ["{os.path.join(REPO_DIR, 'mcp-bridge.js').replace(os.sep, '/')}"],
      "env": {{
        "LETXIPU_URL": "{mcp_url}"
      }}
    }}
  }}
}}
""")

if __name__ == "__main__":
    main()
