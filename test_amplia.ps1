# Busquedas amplias adicionales Peru 2026

# 1. Gestion municipal y candidatos
$q1 = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "gestion municipal Lima candidatos Peru corrupcion infraestructura servicios"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "=== GESTION MUNICIPAL ===" -ForegroundColor Cyan
$r1 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q1 -TimeoutSec 90
$j1 = $r1.result.content[0].text | ConvertFrom-Json
$j1.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 2. Educacion y calidad
$q2 = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "educacion Peru calidad aprendizaje estudiantes desempeno regional"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== EDUCACION ===" -ForegroundColor Cyan
$r2 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q2 -TimeoutSec 90
$j2 = $r2.result.content[0].text | ConvertFrom-Json
$j2.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 3. Salud publica y pandemic
$q3 = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "salud publica Peru hospital regional pandemia COVID infraestructura"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== SALUD PUBLICA ===" -ForegroundColor Cyan
$r3 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q3 -TimeoutSec 90
$j3 = $r3.result.content[0].text | ConvertFrom-Json
$j3.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 4. Economia y PBI regional
$q4 = @{
    jsonrpc = "2.0"
    id = 4
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "economia Peru desarrollo regional empleo productividad competitividad"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== ECONOMIA Y EMPLEO ===" -ForegroundColor Cyan
$r4 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q4 -TimeoutSec 90
$j4 = $r4.result.content[0].text | ConvertFrom-Json
$j4.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 5. Mineria y conflictos sociales
$q5 = @{
    jsonrpc = "2.0"
    id = 5
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "mineria Peru conflictos sociales comunidades ambiente licencias"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== MINERIA Y CONFLICTOS ===" -ForegroundColor Cyan
$r5 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q5 -TimeoutSec 90
$j5 = $r5.result.content[0].text | ConvertFrom-Json
$j5.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 6. Agricultura y reforma agraria
$q6 = @{
    jsonrpc = "2.0"
    id = 6
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "agricultura Peru campesino reforma agraria tierras productividad"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== AGRICULTURA ===" -ForegroundColor Cyan
$r6 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q6 -TimeoutSec 90
$j6 = $r6.result.content[0].text | ConvertFrom-Json
$j6.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 7. Transporte e infraestructura
$q7 = @{
    jsonrpc = "2.0"
    id = 7
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "infraestructura Peru carreteras puerto aeropuerto desarrollo"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== INFRAESTRUCTURA ===" -ForegroundColor Cyan
$r7 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q7 -TimeoutSec 90
$j7 = $r7.result.content[0].text | ConvertFrom-Json
$j7.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 8. Corruption y gobernabilidad
$q8 = @{
    jsonrpc = "2.0"
    id = 8
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "corrupcion Peru politica gobernabilidad transparencia partido politico"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== CORRUPCION ===" -ForegroundColor Cyan
$r8 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q8 -TimeoutSec 90
$j8 = $r8.result.content[0].text | ConvertFrom-Json
$j8.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 9. Descentralizacion
$q9 = @{
    jsonrpc = "2.0"
    id = 9
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "descentralizacion Peru region gobierno regional autonomia"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== DESCENTRALIZACION ===" -ForegroundColor Cyan
$r9 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q9 -TimeoutSec 90
$j9 = $r9.result.content[0].text | ConvertFrom-Json
$j9.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

# 10. Women y genero
$q10 = @{
    jsonrpc = "2.0"
    id = 10
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "genero Peru mujeres violencia feminicidio igualdad oportunidad"
            sources = @("peru")
            limit = 10
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== GENERO ===" -ForegroundColor Cyan
$r10 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $q10 -TimeoutSec 90
$j10 = $r10.result.content[0].text | ConvertFrom-Json
$j10.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(250, $_.abstract.Length))
    Write-Host ""
}

Write-Host "`n=== BUSQUEDA AMPLIA COMPLETADA ===" -ForegroundColor Green