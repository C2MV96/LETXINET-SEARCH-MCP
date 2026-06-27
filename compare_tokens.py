import requests
import tiktoken
import time

def num_tokens(text):
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))

urls = [
    "https://arxiv.org/pdf/1706.03762.pdf", # Attention Is All You Need (15 pages)
    "https://arxiv.org/pdf/2303.08774.pdf", # GPT-4 Technical Report (100 pages, but we'll read only a few pages or full if it's fast)
]

print("Comparing V5 (pdf-parse text) vs V6 (markitdown) Token Usage")
print("="*60)

for url in urls:
    print(f"Testing URL: {url}")
    
    # Text format (V5)
    t1 = time.time()
    res_text = requests.post("http://localhost:4000/api/pdf/read", json={
        "source": url,
        "format": "text",
        "maxChars": -1 # No limit for true comparison
    }).json()
    t2 = time.time()
    
    # Markdown format (V6)
    t3 = time.time()
    res_md = requests.post("http://localhost:4000/api/pdf/read", json={
        "source": url,
        "format": "markdown",
        "maxChars": -1
    }).json()
    t4 = time.time()
    
    # Smart Summary (V6 token saver)
    t5 = time.time()
    res_summary = requests.post("http://localhost:4000/api/pdf/analyze", json={
        "source": url
    }).json()
    
    # The analyze endpoint has "summary" maybe? Wait, we added /api/pdf/summary or we can just use MCP
    # Let's use the MCP endpoint for smart summary to be sure we get the 8000 maxChars version
    res_mcp = requests.post("http://localhost:4000/api/mcp", json={
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {
            "name": "pdf_smart_summary",
            "arguments": { "source": url, "maxTotalChars": 8000 }
        }
    }).json()
    t6 = time.time()

    text_data = res_text["data"]["text"]
    md_data = res_md["data"]["text"]
    
    try:
        summary_data = res_mcp["result"]["content"][0]["text"]
    except:
        summary_data = ""

    tokens_text = num_tokens(text_data)
    tokens_md = num_tokens(md_data)
    tokens_summary = num_tokens(summary_data)

    print(f"  V5 (Texto Crudo) : {len(text_data)} chars | {tokens_text} tokens | {t2-t1:.2f}s")
    print(f"  V6 (Markdown)    : {len(md_data)} chars | {tokens_md} tokens | {t4-t3:.2f}s")
    print(f"  V6 (SmartSummary): {len(summary_data)} chars | {tokens_summary} tokens | {t6-t5:.2f}s")
    
    saving = 100 - (tokens_md / tokens_text * 100) if tokens_text > 0 else 0
    print(f"  Ahorro V5 -> V6  : {saving:.2f}%\n")
