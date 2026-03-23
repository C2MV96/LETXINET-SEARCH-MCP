---
name: LetXipu Search MCP v3
description: Servidor MCP académico con 16 herramientas — búsqueda multi-fuente, búsqueda inteligente con variaciones, análisis profundo de tesis/artículos, extracción de secciones. Usar para investigar literatura, extraer datos específicos de PDFs o buscar papers de temas cruzados/nicho.
---

# 🔬 LetXipu Search MCP v3 — Guía de Herramientas

## Cuándo usar este MCP

Usa las herramientas de LetXipu cuando el usuario necesite:
- **Buscar papers**: búsqueda simple multi-fuente o búsqueda inteligente con variaciones (`smart_search`)
- **Leer un PDF** desde URL o archivo local
- **Analizar estructura** de un paper (secciones, citas, metadatos)
- **Extraer una sección específica** (ej: solo la Metodología o Resultados de un PDF gigante)
- **Analizar tesis/artículos en profundidad** (Marco Teórico, Metodología, Resultados, estadísticas)
- **Extraer datos estadísticos** de PDFs (p-values, porcentajes, ANOVA, chi², regresiones)
- **Descargar** un PDF o resolver su URL de descarga
- **Enriquecer metadatos** de papers (agregar DOI, abstract, autores faltantes)

## Conexión

El MCP se conecta via `mcp-bridge.js` (stdio↔HTTP).

- **Local**: `http://localhost:4000/api/mcp`
- **HuggingFace**: `https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp`

---

## 📚 HERRAMIENTAS DE BÚSQUEDA (6 tools)

### 1. `smart_search` — Búsqueda Inteligente (Recomendada para investigación) ⭐ NUEVO

**Cuándo**: Tema de nicho, intersección de conceptos (ej: "elicitación con ácido salicílico en stevia"), o cuando una búsqueda normal no da resultados.

```json
{
  "query": "elicitación ácido salicílico stevia rebaudiana",
  "sources": ["global", "latam"],
  "maxResults": 30
}
```

**Qué hace mágicamente**:
1. Recibe tu query.
2. Genera de 3 a 5 variaciones automáticas: traducciones (ES↔EN), combinaciones de palabras clave, y conceptos más generales.
3. Lanza múltiples búsquedas en paralelo.
4. Une y deduplica todos los resultados devolviendo los mejores.

---

### 2. `search` — Búsqueda básica multi-fuente

**Cuándo**: El usuario quiere buscar papers sobre un tema, en cualquier idioma o región.

```json
{
  "query": "machine learning medicina",
  "sources": ["global"],
  "maxSources": 10,
  "yearStart": "2020",
  "yearEnd": "2026"
}
```

**Parámetros**:
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `query` | string | ✅ | Tema de búsqueda |
| `sources` | string[] | ❌ | Grupos: `"all"`, `"global"`, `"latam"`, `"peru"`, `"ai_ml"`, o IDs específicos |
| `maxSources` | number | ❌ | Máximo de resultados (default 50) |
| `yearStart` | string | ❌ | Año desde (ej: `"2020"`) |
| `yearEnd` | string | ❌ | Año hasta (ej: `"2026"`) |
| `university` | string | ❌ | Filtrar por universidad |

**Grupos de fuentes disponibles**:
- `"global"`: OpenAlex, PubMed, Scopus, SemanticScholar, CORE, DOAJ, CrossRef
- `"latam"`: ALICIA, SciELO, Redalyc, CONCYTEC, RENATI, LaReferencia, etc.
- `"peru"`: ALICIA, CONCYTEC, RENATI, repositorios peruanos
- `"ai_ml"`: DBLP, HuggingFace, OpenReview, PapersWithCode, arXiv
- `"all"`: Todas las 26 fuentes

**Fuentes individuales**: `openalex`, `pubmed`, `scopus`, `semantic_scholar`, `arxiv`, `core`, `doaj`, `crossref`, `dblp`, `huggingface`, `openreview`, `paperswithcode`, `alicia`, `scielo`, `redalyc`, `concytec`, `renati`, etc.

---

### 3. `search_dblp` — DBLP Computer Science

**Cuándo**: El usuario busca papers de ciencias de computación, conferencias CS, o necesita resultados con BibTeX.

```json
{
  "query": "transformer attention mechanism",
  "maxResults": 10
}
```

---

### 4. `search_paperswithcode` — Papers con código

**Cuándo**: El usuario busca papers que tengan implementaciones de código, benchmarks o datasets asociados.

```json
{
  "query": "image segmentation neural network",
  "maxResults": 10
}
```
> ⚠️ NOTA: PapersWithCode tiene protección Cloudflare que puede bloquear algunas requests.

---

### 5. `trending_papers` — Papers trending AI/ML

**Cuándo**: El usuario pregunta por lo más nuevo/trending en AI, ML, LLMs, o NLP. Sin query devuelve todo lo trending.

```json
{
  "query": "diffusion models",
  "maxResults": 10
}
```

**Caso especial**: Para ver TODO lo trending sin filtro, no envíes `query` o envía string vacío.

---

### 6. `search_conferences` — Papers de conferencias (OpenReview)

**Cuándo**: El usuario busca papers de ICLR, NeurIPS, ICML u otras conferencias top de AI/ML.

```json
{
  "query": "reinforcement learning robotics",
  "maxResults": 10
}
```

---

## 📄 HERRAMIENTAS DE PDF (6 tools)

### 7. `read_pdf` — Extraer texto completo

**Cuándo**: El usuario necesita leer un PDF (paper, reporte, tesis). Acepta URL o ruta local.

```json
{
  "source": "https://arxiv.org/pdf/1706.03762v5"
}
```

**Retorna**: texto completo, número de páginas, info del documento.

**Usar en vez de** instalar pymupdf o pdf-parse localmente — el MCP lo maneja todo.

---

### 8. `pdf_metadata` — Metadatos del PDF

**Cuándo**: El usuario quiere saber título, autor, número de páginas, tamaño del archivo.

```json
{
  "source": "https://arxiv.org/pdf/2301.00001.pdf"
}
```

**Retorna**: title, author, subject, creator, producer, creationDate, pages, fileSize.

---

### 9. `pdf_sections` — Detectar resumen de secciones (Rápido)

**Cuándo**: El usuario quiere un resumen estructurado, identificar las partes de un paper, o extraer una sección específica (Métodos, Resultados, etc.).

```json
{
  "source": "https://arxiv.org/pdf/1706.03762v5"
}
```

**Detecta**: Abstract, Introduction, Related Work, Methodology, Experiments, Results, Discussion, Conclusion, References, Appendix.

**Tip**: Úsalo ANTES de resumir un paper para entender la estructura y luego usar `read_pdf` si necesitas el texto completo.

---

### 10. `pdf_citations` — Extraer referencias

**Cuándo**: El usuario quiere la lista de citas/referencias de un paper, o necesita saber cuántas fuentes cita.

```json
{
  "source": "https://arxiv.org/pdf/1706.03762v5"
}
```

**Retorna**: lista de citas con `index`, `text`, `authors`, `year`.
Soporta formato numerado `[1]` y formato autor-año.

### 11. `analyze_academic` — Análisis profundo de tesis/artículos

**Cuándo**: El usuario quiere analizar una **tesis** o **artículo académico** en profundidad. Detecta secciones en español e inglés, clasifica el documento, y extrae datos estadísticos.

```json
{
  "source": "https://repositorio.uni.edu.pe/tesis.pdf"
}
```

**Detecta 22 tipos de secciones** (ES/EN):
- **Intro**: Introducción, Planteamiento del Problema, Justificación, Objetivos, Hipótesis
- **Teoría**: Marco Teórico, Antecedentes, Bases Conceptuales, Marco Legal
- **Métodos**: Metodología, Población y Muestra, Instrumentos, Diseño Experimental
- **Resultados**: Resultados, Análisis de Datos, Discusión
- **Cierre**: Conclusiones, Recomendaciones, Referencias, Anexos

**Extrae datos estadísticos** (14 patrones):
- p-value, porcentajes, media/promedio, correlación r, chi², intervalo de confianza
- t-test, F-test, n muestral, α, R², ANOVA, regresión, tablas/figuras

**Retorna**: `documentType` (thesis/article), `language` (es/en/mixed), secciones con contenido y estadísticas, `globalStatistics` del documento completo.

**Cuándo usar `analyze_academic` vs `pdf_sections`**:
- `pdf_sections`: rápido, solo detecta secciones en inglés (10 patrones)
- `analyze_academic`: profundo, bilingüe ES/EN (22 patrones), clasifica documento, extrae estadísticas

### 12. `extract_section` — Extraer una sección COMPLETA ⭐ NUEVO

**Cuándo**: Tienes un PDF gigante y solo te interesa leer la "Metodología", "Resultados" o el "Marco Teórico", sin restricciones de tamaño.

```json
{
  "source": "https://repositorio.uni.edu.pe/tesis.pdf",
  "section": "metodologia"
}
```

**Qué lo hace especial**:
- Acepta nombres de sección en ES o EN y hace coincidencia imprecisa (fuzzy match).
- Si un paper tiene la metodología dividida en 5 sub-títulos, **los une todos** en un solo gran bloque de texto.
- Devuelve el contenido completo sin límite de caracteres (ideal para extraer sets de datos o protocolos largos).

---

## 🔧 HERRAMIENTAS DE METADATOS (4 tools)

### 13. `enrich_metadata` — Enriquecer papers en batch

**Cuándo**: Tienes una lista de papers con datos incompletos (falta DOI, abstract, autores) y quieres completarlos automáticamente.

```json
{
  "papers": [
    {"title": "Attention Is All You Need", "year": 2017},
    {"title": "BERT: Pre-training of Deep Bidirectional Transformers"}
  ]
}
```

---

### 14. `fetch_metadata` — Metadata de un paper específico

**Cuándo**: El usuario tiene un DOI, URL o título y quiere la info completa.

```json
{
  "doi": "10.1038/s41586-020-2649-2"
}
```
o:
```json
{
  "title": "Attention Is All You Need"
}
```
o:
```json
{
  "url": "https://arxiv.org/abs/1706.03762"
}
```

---

### 15. `download_pdf` — Obtener URL de descarga

**Cuándo**: El usuario quiere descargar el PDF de un paper dado su DOI o URL.

```json
{
  "doi": "10.1038/s41586-020-2649-2"
}
```

**Retorna**: URL directa de descarga del PDF.

---

### 16. `list_sources` — Catálogo de fuentes

**Cuándo**: El usuario pregunta qué fuentes/repositorios están disponibles, o necesita ver los IDs.

```json
{}
```

**Retorna**: 26 fuentes con ID, nombre, descripción, tipo, región.

---

## 🧠 PATRONES DE USO RECOMENDADOS

### Patrón A: "Investiga sobre X (Tema Difícil o Específico)"
1. `smart_search` en lugar de `search` → generará variaciones y buscará en inglés/español.
2. Ver la tabla de resultados deduplicados.
3. Extraer contenido relevante del ganador usando `extract_section`.

### Patrón B: "Lee/analiza este PDF"
1. `pdf_sections` → entender estructura (rápido)
2. `read_pdf` → texto completo
3. `pdf_citations` → referencias
4. Generar resumen con la info obtenida

### Patrón B2: "Analiza esta tesis en profundidad"
1. `analyze_academic` → clasificación + secciones + estadísticas
2. Presentar: tipo de documento, idioma, estructura detectada
3. Destacar secciones con datos estadísticos
4. Listar los estadísticos encontrados (p-values, muestras, etc.)

### Patrón C: "Qué hay de nuevo en AI"
1. `trending_papers` sin query → últimos papers trending
2. Presentar con upvotes y categorías

### Patrón D: "Revisión de literatura de X"
1. `search` con `sources: ["global"]` + años
2. `search` con `sources: ["latam"]` para complementar
3. `enrich_metadata` en los mejores 10
4. `read_pdf` en los 3 más relevantes
5. `pdf_citations` para expandir la búsqueda

### Patrón E: "Busca papers con código sobre X"
1. `search_dblp` → papers CS
2. `search_paperswithcode` → papers + repos
3. Combinar y presentar

### Patrón F: "Dame los metadatos / descarga este paper"
1. `fetch_metadata` con el DOI/URL/título
2. `download_pdf` si quiere el PDF
3. `read_pdf` con la URL obtenida si quiere el contenido

---

## ⚠️ NOTAS IMPORTANTES

- **Tiempos de respuesta**: Las búsquedas multi-fuente (`sources: ["all"]`) pueden tardar 15-30 segundos.
- **PDF desde URL**: El MCP descarga PDFs con cache de 10 minutos. Sucesivas llamadas al mismo PDF son instantáneas.
- **PapersWithCode**: Puede fallar por Cloudflare. Si falla, usar `search_dblp` + `search` como alternativa.
- **OpenReview**: Busca en ICLR 2024/2025 y NeurIPS 2023/2024. Para acceso completo, setear `OPENREVIEW_USERNAME`/`PASSWORD`.
- **Fuentes LATAM**: ALICIA, CONCYTEC, RENATI son repositorios peruanos ideales para tesis y papers de universidades de Perú.
