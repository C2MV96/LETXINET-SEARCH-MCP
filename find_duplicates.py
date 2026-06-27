import os
import hashlib
from collections import defaultdict

BASE_DIR = r"D:\OTROS\MCP_CLIENTE_LATEX_V3\referencias_uct"

def get_file_hash(filepath):
    h = hashlib.md5()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

pdf_files = []
for root, dirs, files in os.walk(BASE_DIR):
    for file in files:
        if file.lower().endswith('.pdf'):
            pdf_files.append(os.path.join(root, file))

# Find exact duplicates by hash
hashes = defaultdict(list)
# Find potential duplicates by filename (ignoring numbers)
names = defaultdict(list)

for pdf in pdf_files:
    h = get_file_hash(pdf)
    hashes[h].append(pdf)
    
    # Strip prefix numbers like "063_" or "047_"
    basename = os.path.basename(pdf)
    import re
    clean_name = re.sub(r'^\d+_', '', basename).lower()
    names[clean_name].append(pdf)

print("=== EXACT DUPLICATES (By Hash) ===")
for h, paths in hashes.items():
    if len(paths) > 1:
        print(f"Hash {h}:")
        for p in paths:
            print(f"  - {os.path.relpath(p, BASE_DIR)}")

print("\n=== POTENTIAL DUPLICATES (By Name) ===")
for name, paths in names.items():
    if len(paths) > 1:
        print(f"Name '{name}':")
        for p in paths:
            print(f"  - {os.path.relpath(p, BASE_DIR)}")
