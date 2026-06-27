---
name: automejora
description: >
  Sistema de auto-mejora por país para repositorios académicos LATAM.
  Subcarpetas por país (Peru, Brasil, Mexico, Argentina, Chile, Colombia, Ecuador).
  Testa 300+ repositorios, auto-descubre nuevos, actualiza dspace-resolver.ts,
  build + rollback automático. Ejecuta con run_all.ps1.
---

# Auto-Mejora de Fuentes Académicas LATAM

## Quick Start

```powershell
# Probar TODOS los países (~300 repos)
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1"

# Solo un país
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -Country peru
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -Country brasil

# Solo probar (sin modificar código)
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -TestOnly

# Ver qué cambiaría
powershell -ExecutionPolicy Bypass -File ".agents/skills/automejora/run_all.ps1" -DryRun
```

## Estructura

```
automejora/
├── SKILL.md              # Esta documentación
├── run_all.ps1            # Orquestador principal
├── shared/
│   └── test_helpers.ps1   # Test-Source, New-Summary, Save-Results
├── global/
│   └── test_global.ps1    # Sci-Hub (10) + APIs OA (8) + Internacional (10)
├── peru/                  # Usa source-tester existente (121 fuentes)
├── brasil/
│   └── test_brasil.ps1    # 35+ universidades federais + BDTD + SciELO
├── mexico/
│   └── test_mexico.ps1    # 25+ universidades + Redalyc + CONACYT
├── argentina/
│   └── test_argentina.ps1 # 20+ universidades + CONICET + CLACSO
├── chile/
│   └── test_chile.ps1     # 16+ universidades + ANID
├── colombia/
│   └── test_colombia.ps1  # 15+ universidades + MinCiencias
└── ecuador/
    └── test_ecuador.ps1   # 13+ universidades + RRAAE
```

## Pipeline

```
run_all.ps1
  ├── test_global.ps1        → Sci-Hub, APIs, Internacional
  ├── test_peru.ps1           → 121 fuentes (ALICIA CONCYTEC)
  ├── test_brasil.ps1         → 35+ repos
  ├── test_mexico.ps1         → 25+ repos
  ├── test_argentina.ps1      → 20+ repos
  ├── test_chile.ps1          → 16+ repos
  ├── test_colombia.ps1       → 15+ repos
  ├── test_ecuador.ps1        → 13+ repos
  │
  └── AUTO-IMPROVE
       ├── Collect NEW working repos from all countries
       ├── Add to dspace-resolver.ts (grouped by country)
       ├── npm run build
       └── git checkout rollback if build fails
```

## Cobertura Total: ~300 repositorios

| País | Repos | Fuente principal |
|---|---|---|
| Perú | 121 | ALICIA CONCYTEC |
| Brasil | 35+ | BDTD, universidades federais |
| México | 25+ | UNAM, Redalyc, CONACYT |
| Argentina | 20+ | CONICET, CLACSO, UBA |
| Chile | 16+ | UChile, ANID |
| Colombia | 15+ | UNAL, MinCiencias |
| Ecuador | 13+ | RRAAE, ESPOL |
| Global | 28 | Sci-Hub, APIs OA, Internacional |
| **Total** | **~300** | |
