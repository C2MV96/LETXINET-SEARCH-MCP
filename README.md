---
title: LetXipu Search MCP v3
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

# 🔬 LetXipu Search MCP v3

### Academic Research Engine + PDF Analyzer + MCP Server

[![HuggingFace Space](https://img.shields.io/badge/🤗%20HuggingFace-Space-blue)](https://huggingface.co/spaces/C2MV/letxipu-search-mcp-v3)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-green)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)

**26 academic sources** · **16 MCP tools** · **9-source PDF resolver** · **Bilingual ES/EN** · **Zero AI dependencies**

[🌍 Visit Public Space](https://huggingface.co/spaces/C2MV/letxipu-search-mcp-v3) · [⚡ Live API Endpoint](https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp) · [🏥 Health Check](https://C2MV-letxipu-search-mcp-v3.hf.space/health) · [📚 Source Catalog](https://C2MV-letxipu-search-mcp-v3.hf.space/api/sources)

</div>

---

## 📋 Overview

**LetXipu Search MCP v3** is a standalone academic research server optimized for integration with AI assistants (Claude, Cursor, Antigravity) via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) standard. It is fully adapted to run elegantly on both **GitHub** (local deployment) and **HuggingFace Spaces** (cloud deployment).

### 🎥 Demostración del Agente LetXinet Investigador

<div align="center">
  <h4>1. Presentación General de la IA</h4>
  <video src="./assets/LetXinet__IA_Investigadora.mp4" controls width="80%"></video>
  
  <h4>2. Uso de las 16 Herramientas Clave MCP</h4>
  <video src="./assets/IA__16_Herramientas_Clave.mp4" controls width="80%"></video>
</div>

---

## 🚀 Quick Start & Integration

### ☁️ Option 1: Use the Public Cloud (Recommended)
You don't need to host it yourself! The LetXipu Search MCP v3 backend is already deployed and heavily optimized for large context AI workloads on HuggingFace Spaces.
👉 **Public Space:** [https://huggingface.co/spaces/C2MV/letxipu-search-mcp-v3](https://huggingface.co/spaces/C2MV/letxipu-search-mcp-v3)

**Add this config to your Claude Desktop MCP (`claude_desktop_config.json`)**:
```json
{
  "mcpServers": {
    "letxipu-search-v3": {
      "command": "node",
      "args": ["/path/to/your/desktop/mcp-bridge.js"],
      "env": {
        "LETXIPU_URL": "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp"
      }
    }
  }
}
```

### 💻 Option 2: Clone and Run Locally (GitHub)
```bash
git clone https://github.com/C2MV/LETXIPU-SEARCH-MCP-V3.git
cd LETXIPU-SEARCH-MCP-V3
npm install
npm run build
npm start
```

---

## 🛠️ Detalles Completos y Ejemplos de las 16 Herramientas MCP

A continuación se detalla exhaustivamente cada una de las 16 herramientas expuestas a través del protocolo MCP, diseñadas para brindar a las IAs el máximo control sobre la investigación científica.

### 🔍 MÓDULO 1: BÚSQUEDA Y RECUPERACIÓN DE LITERATURA

---

### 1. `search`
**Búsqueda Estándar Multi-fuente**
Es el motor principal para buscar papers. Permite lanzar peticiones masivas a bases de datos mundiales (OpenAlex, PubMed, Semantic Scholar) o regionales (SciELO, ALICIA, Redalyc). Permite cruzar filtros estrictos como universidad o país y devuelve títulos, abstract, DOI, fechas y URLs limpias.

**Ejemplo de llamada JSON-RPC:**
```json
{
  "name": "search",
  "arguments": {
    "query": "tratamiento de aguas residuales fotocatálisis",
    "sources": ["latam", "peru"],
    "limit": 10,
    "yearStart": 2018,
    "yearEnd": 2024
  }
}
```

---

### 2. `smart_search`
**Búsqueda Inteligente (Variaciones Semánticas Algorítmicas)**
Si tienes un tema muy "nicho" (ej. "elicitación ácido salicílico stevia rebaudiana"), una búsqueda regular puede fracasar. `smart_search` coge el *query*, lo traduce al inglés, expande sinónimos y crea hasta 4 variaciones combinadas de búsqueda. Se envían en paralelo a diversas fuentes para atrapar documentos oscuros o mal indexados, deduplicando los resultados antes de devolverlos.

**Ejemplo de uso:**
```json
{
  "name": "smart_search",
  "arguments": {
    "query": "efectos neurotóxicos de aluminio en Alzheimer",
    "sources": ["global"]
  }
}
```

---

### 3. `search_dblp`
**Búsqueda Especializada en Ciencias de la Computación**
Herramienta dedicada única y exclusivamente a `dblp.org`. Extremadamente detallada para ingenieros de software e investigadores en IA. Recupera actas completas, revisiones por pares, libros técnicos y papers, entregándolos en formato compatible con metadatos hiper-densos listos para un motor de citas.

**Ejemplo de uso:**
```json
{
  "name": "search_dblp",
  "arguments": {
    "query": "LLM fine-tuning techniques parameter-efficient",
    "limit": 15
  }
}
```

---

### 4. `search_paperswithcode`
**Búsqueda de Papers con Código (PWC)**
La pesadilla de las IAs es encontrar un paper brillante y no hallar su código fuente. Esta herramienta ataca a *Papers With Code* y retorna no solo los autores y abstracts, sino el **enlace exacto de GitHub**, las librerías implementadas, las estrellas del repo y los benchmarks o métricas top (SOTA) donde compiten.

**Ejemplo de uso:**
```json
{
  "name": "search_paperswithcode",
  "arguments": {
    "query": "object detection transformer YOLO",
    "limit": 5
  }
}
```

---

### 5. `trending_papers`
**Radar Diario de Top Papers en IA/ML**
Invocación masiva al dashboard diario de Hugging Face Papers. La IA la utiliza sin argumentos para ponerse "al día" con lo que la comunidad de desarrollo en Silicon Valley y Open Source está debatiendo hoy mismo. Esencial para revisiones de estado del arte ultrarrecientes.

**Ejemplo de uso:**
```json
{
  "name": "trending_papers",
  "arguments": {}
}
```

---

### 6. `search_conferences`
**Búsqueda en Actas y Conferencias (OpenReview)**
Se salta el rezago de meses de las bases de revistas tradicionales y va directo a OpenReview (NeurIPS, ICLR, ICML, CVPR). Encuentra papers "Under Review" o "Accepted" con puntuaciones de jurados, listos para descargar.

**Ejemplo de uso:**
```json
{
  "name": "search_conferences",
  "arguments": {
    "query": "diffusion models video generation"
  }
}
```

---

### 📄 MÓDULO 2: MOTOR DE PROCESAMIENTO ANALÍTICO DE PDFs

---

### 7. `analyze_academic`
**Analizador Diagnóstico Profundo (LA JOYA DE LA CORONA 👑)**
No solo lee el PDF; lo *disecciona*. Toma el enlace de descarga o DOI, usa heurísticas avanzadas de Python/Node y escanea buscando lo que el humano necesita: estadísticas matemáticas, p-values, tamaño muestral ($n$), regresiones, Anovas, y detecta con láser la separación de hasta 22 estructuras (Discusión, Metodología, Hipótesis, etc.). 

**Ejemplo de uso:**
```json
{
  "name": "analyze_academic",
  "arguments": {
    "source": "10.1371/journal.pone.0185809"
  }
}
```
*Output revelará inmediatamente si el paper es significativo (p<0.05), el n de los participantes empíricos, y la estructura de su documento, en lugar de inundar a la IA con 50.000 tokens de texto.*

---

### 8. `read_pdf`
**Extractor de Texto Completo en Crudo**
Ideal cuando sabes que necesitas toda la contextura del paper (desde el título hasta las referencias). Realiza el *scraping* del PDF, desempaqueta bloques binarios y devuelve todo en Markdown textual y limpio. Si el link del PDF falla por paywalls proxy, intentará pasarlo al Resolver automático.

**Ejemplo de uso:**
```json
{
  "name": "read_pdf",
  "arguments": {
    "source": "https://url.com/mi_paper_123.pdf"
  }
}
```

---

### 9. `extract_section`
**Extractor Selectivo (Low-Token Retrieval)**
¿Para qué saturar la memoria de contexto de la IA leyendo un paper de 50 páginas cuando solo necesitas redactar los Antecedentes? Esta herramienta extrae **solo la sección vital**. Acepta identificadores difusos ("Materials and methods", "Methodology", "Metodología", "Procedimiento") gracias a su heurística multilingüe.

**Ejemplo de uso:**
```json
{
  "name": "extract_section",
  "arguments": {
    "source": "10.1016/j.jclepro.2019.03.031",
    "section": "Resultados"
  }
}
```

---

### 10. `pdf_sections`
**Mapeador Estructural Arborescente**
Muestra a la IA el "Esqueleto" del documento. Retorna un JSON con las páginas y líneas donde empizan cada uno de los grandes apartados, permitiendo a la IA crear índices de contenido o validar si una Tesis cuenta con el "Marco Legal" que necesita para su análisis.

**Ejemplo de uso:**
```json
{
  "name": "pdf_sections",
  "arguments": {
    "source": "http://repositorio.unmsm.edu.pe/tesis123.pdf"
  }
}
```

---

### 11. `pdf_citations`
**Extractor de Citas (Bibliography Tracker)**
Extrae las referencias bibliográficas al final de un artículo científico y las formatea de una sola vez. Divide automáticamente citas ordenadas por `[1], [2]...` o las basadas en autor-año (APA). Fundamental si la IA detecta que el investigador está usando "citaciones fantasmas" y necesita validar que el paper fuente realmente usó a ese autor.

**Ejemplo de uso:**
```json
{
  "name": "pdf_citations",
  "arguments": {
    "source": "10.1038/s41586-020-2649-2"
  }
}
```

---

### 12. `pdf_metadata`
**Identificador de Límites de Hardware/PDF**
Va más allá de los autores. Examina los contenedores XMP nativos del archivo `.pdf` en hexadecimal. Devuelve quién usó qué software para fabricar el PDF (Adobe, Word, LaTeX), fecha nativa de edición, peso del archivo en bytes y si tiene bloqueos DRM de copia.

**Ejemplo de uso:**
```json
{
  "name": "pdf_metadata",
  "arguments": {
    "source": "https://c2mv.repos.com/archivo_sospechoso.pdf"
  }
}
```

---

### 📋 MÓDULO 3: UTILIDADES DE METADATOS Y RESOLUCIÓN (PAYWALLS)

---

### 13. `download_pdf`
**El Resolutor Mágico de 9-Fuentes (Anti-Paywall Resolver)**
Esta herramienta es un arma letal contra la falta de acceso. Ante un DOI (Ej: Elsevier, Nature, IEEE), se activa un algoritmo en cascada que intenta derribar el paywall y conseguir el link final directo del archivo PDF real por estos 9 escudos sucesivos:
`(1) Sci-Hub Mirrors → (2) Unpaywall.org → (3) CORE.ac.uk → (4) Semantic Scholar → (5) PubMed Central (PMC) → (6) DOIs Content Negotiator → (7) OA.mg → (8) WeLib → (9) Google Scholar Scrape`.

**Ejemplo de uso:**
```json
{
  "name": "download_pdf",
  "arguments": {
    "identifier": "10.1109/CVPR42600.2020.00115"
  }
}
```

---

### 14. `enrich_metadata`
**Compilador de Metadatos Batch**
Acepta un arreglo entero de bibliografías y usa un *pool* asíncrono cruzando datos con la API de CrossRef, OpenAlex y Unpaywall. Rescata años faltantes, nombres de editoriales borrosas y abstracts de documentos mutilados o muy antiguos en segundos. Ideal para sanear listados bibliográficos de tesis antes de convertirlos a referencias finales LaTeX.

**Ejemplo de uso:**
```json
{
  "name": "enrich_metadata",
  "arguments": {
    "papers": [
      { "title": "A Survey on Deep Learning" },
      { "title": "Generative adversarial nets", "author": "Goodfellow" }
    ]
  }
}
```

---

### 15. `fetch_metadata`
**Extractor Bibliográfico Preciso**
Al igual que `enrich_metadata`, pero hiperfocalizado en un único paper mediante el *DOI, arXiv ID, URL o Título exacto*. Actúa como el escáner de confirmación del "agente validador", garantizando 100% que la cita solicitada existe y es la aceptada universalmente por las bases indexadas (Previene y aborta las alucinaciones AI de citaciones inventadas).

**Ejemplo de uso:**
```json
{
  "name": "fetch_metadata",
  "arguments": {
    "query": "10.1126/science.1246990"
  }
}
```

---

### 16. `list_sources`
**Catálogo Vivo de Proveedores (26 Motores de Consulta)**
El punto de entrada cuando el agente no sabe qué bases de datos usar hoy. No recibe argumentos, y retorna un array clasificado con todos los dominios integrados, separados en *Globales (DOAJ, Crossref), Regionales LatAm (SciELO, ALICIA, CONAHCyT), y AI/ML (HuggingFace Papers, OpenReview)*. 

**Ejemplo de uso:**
```json
{
  "name": "list_sources",
  "arguments": {}
}
```

---

## 🌐 26 Supported Academic Sources

| Domain | Sources |
|---|---|
| **Global / Open Access** | Semantic Scholar, OpenAlex, PubMed, arXiv, Crossref, DOAJ, Zenodo, OpenAIRE, CORE, Scopus, Google Scholar |
| **AI / Machine Learning** | DBLP, Papers With Code, HuggingFace Papers, OpenReview |
| **LatAm / Public Grid** | SciELO, Redalyc, La Referencia, ALICIA (Peru), RENATI (Peru), CONAHCyT (Mexico), UNAM, ANID (Chile), Oasisbr (Brazil), SNRD (Argentina), MinCiencias (Colombia) |

---

<div align="center">
  <strong>Built for rigorous researchers, by rigorous researchers 🔬</strong><br>
  <sub>LetXipu Search MCP v3.0 | Compatible seamlessly across GitHub and HuggingFace Spaces.</sub>
</div>
