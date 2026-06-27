import os
import glob
import requests
import json
import time

BASE_DIR = r"D:\OTROS\MCP_CLIENTE_LATEX_V3\referencias_uct"
API_URL = "http://localhost:4000/api/mcp"

# Find all PDFs in the base directory and its immediate subdirectories
pdf_files = []
for root, dirs, files in os.walk(BASE_DIR):
    for file in files:
        if file.lower().endswith('.pdf') and not file.startswith('Informe_'):
            pdf_files.append(os.path.join(root, file))

print(f"Total PDFs encontrados: {len(pdf_files)}")

# To avoid a massive runtime, we'll test a random sample or up to 30 files if there are many
MAX_TESTS = 30
if len(pdf_files) > MAX_TESTS:
    import random
    random.seed(42)
    pdf_files = random.sample(pdf_files, MAX_TESTS)

print(f"Analizando {len(pdf_files)} PDFs con MCP V6...")

results = {"thesis": 0, "article": 0, "report": 0, "unknown": 0}
details = []

for i, pdf_path in enumerate(pdf_files):
    filename = os.path.basename(pdf_path)
    parent_dir = os.path.basename(os.path.dirname(pdf_path))
    
    print(f"[{i+1}/{len(pdf_files)}] Analizando: {parent_dir}/{filename}...")
    
    t1 = time.time()
    try:
        # Request analyze_academic tool
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "analyze_academic",
                "arguments": {
                    "source": pdf_path
                }
            }
        }
        res = requests.post(API_URL, json=payload, timeout=60).json()
        
        # Parse result
        mcp_result = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
        data = json.loads(mcp_result)
        
        if data.get("success"):
            doc_type = data["data"]["documentType"]
            lang = data["data"]["language"]
            pages = data["data"]["pages"]
            results[doc_type] = results.get(doc_type, 0) + 1
            
            details.append(f"| {parent_dir}/{filename} | **{doc_type.upper()}** | {lang} | {pages} p. |")
        else:
            print(f"  Error MCP: {data.get('error')}")
            details.append(f"| {parent_dir}/{filename} | ERROR | - | - |")
            
    except Exception as e:
        print(f"  Exception: {str(e)}")
        details.append(f"| {parent_dir}/{filename} | FAILED | - | - |")
        
    print(f"  -> Tomó {time.time()-t1:.2f}s")

# Save report
with open("classification_report.md", "w", encoding="utf-8") as f:
    f.write("# 🔬 Reporte de Clasificación de PDFs (LetXipu MCP V6)\n\n")
    f.write(f"Total analizados: {len(pdf_files)}\n\n")
    f.write("### 📊 Resumen por Tipo\n")
    for k, v in results.items():
        f.write(f"- **{k.capitalize()}**: {v}\n")
    f.write("\n### 📄 Detalle por Archivo\n")
    f.write("| Archivo | Tipo de Documento | Idioma | Páginas |\n")
    f.write("| :--- | :--- | :--- | :--- |\n")
    for d in details:
        f.write(d + "\n")

print("\n¡Análisis completado! Reporte guardado en classification_report.md")
