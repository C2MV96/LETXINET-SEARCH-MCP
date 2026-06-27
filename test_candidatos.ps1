# Busquedas propuestas importantes por candidato y region

# KEIKO FUJIMORI - Plan detallado
$query1 = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "Keiko Fujimori plan gobierno seguridad Economia salud educacion Peru 2021 2026"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "=== KEIKO FUJIMORI - PROPUESTAS ===" -ForegroundColor Cyan
$result1 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query1 -TimeoutSec 90
$json1 = $result1.result.content[0].text | ConvertFrom-Json
$json1.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

# CARLOS ALVAREZ - Propuestas
$query2 = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "Carlos Alvarez candidato Peru plan gobierno pobreza reconciliation"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== CARLOS ALVAREZ - PROPUESTAS ===" -ForegroundColor Cyan
$result2 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query2 -TimeoutSec 90
$json2 = $result2.result.content[0].text | ConvertFrom-Json
$json2.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

# LOPEZ ALIAGA - Propuestas
$query3 = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "Rafael Lopez Aliaga Lima plan gobierno corrupcion Petroperu"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== LOPEZ ALIAGA - PROPUESTAS ===" -ForegroundColor Cyan
$result3 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query3 -TimeoutSec 90
$json3 = $result3.result.content[0].text | ConvertFrom-Json
$json3.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

# ROBERTO SANCHEZ - PropuestasIzquierda
$query4 = @{
    jsonrpc = "2.0"
    id = 4
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "Roberto Sanchez Peru Libre constitucion plurinacional reforma agraria"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== ROBERTO SANCHEZ - PROPUESTAS ===" -ForegroundColor Cyan
$result4 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query4 -TimeoutSec 90
$json4 = $result4.result.content[0].text | ConvertFrom-Json
$json4.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

# REGIONES CLAVE - NORTE MINERO
$query5 = @{
    jsonrpc = "2.0"
    id = 5
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "region norte Peru mineria Cajamarca Ancash desarrollo economico conflictos"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== REGION NORTE - MINERIA ===" -ForegroundColor Cyan
$result5 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query5 -TimeoutSec 90
$json5 = $result5.result.content[0].text | ConvertFrom-Json
$json5.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

# REGION SUR ANDINA
$query6 = @{
    jsonrpc = "2.0"
    id = 6
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "region sur andina Peru Puno Cusco Ayacucho pobreza desarrollo rural"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== REGION SUR ANDINA ===" -ForegroundColor Cyan
$result6 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query6 -TimeoutSec 90
$json6 = $result6.result.content[0].text | ConvertFrom-Json
$json6.data.sources | ForEach-Object {
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(300, $_.abstract.Length))
    Write-Host ""
}

Write-Host "`n=== COMPLETADO ===" -ForegroundColor Green