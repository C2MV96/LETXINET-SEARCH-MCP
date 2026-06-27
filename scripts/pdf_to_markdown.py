#!/usr/bin/env python3
"""PDF to Markdown converter using pymupdf4llm (Microsoft MarkItDown engine)
Used by LetXipu Search MCP v6 for structured PDF extraction.
"""
import sys
import json
import pymupdf4llm
import pymupdf

def convert(pdf_path, pages_str=None):
    try:
        doc = pymupdf.open(pdf_path)
        total_pages = len(doc)
        doc.close()
        
        kwargs = {}
        if pages_str:
            pages = [int(p) for p in pages_str.split(',')]
            kwargs['pages'] = pages
        
        markdown = pymupdf4llm.to_markdown(pdf_path, **kwargs)
        
        result = {
            "success": True,
            "markdown": markdown,
            "chars": len(markdown),
            "lines": markdown.count("\n"),
            "pages": total_pages
        }
        sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
    except Exception as e:
        result = {"success": False, "error": str(e)}
        sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: pdf_to_markdown.py <pdf_path> [pages]"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    pages_str = sys.argv[2] if len(sys.argv) > 2 else None
    convert(pdf_path, pages_str)
