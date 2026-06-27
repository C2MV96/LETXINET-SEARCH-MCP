# Busquedas regionales por Peru

# 1. Criminalidad por regiones
$query1 = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "criminalidad Homicidio region Lima Callao La Libertad Cusco Puno Peru 2024 2025"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "=== BUSCANDO CRIMINALIDAD POR REGIONES ===" -ForegroundColor Cyan
$result1 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query1 -TimeoutSec 90
$json1 = $result1.result.content[0].text | ConvertFrom-Json
$json1.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "Titulo: $($_.title)" -ForegroundColor Green
    Write-Host "Año: $($_.year)"
    $abs = $_.abstract.Substring(0, [Math]::Min(400, $_.abstract.Length))
    Write-Host "Resumen: $abs"
    Write-Host ""
}

# 2. Pobreza regional
$query2 = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "pobreza extrema region rural andina Amazonas Cajamarca Huancavelica Peru indicadores sociales"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== BUSCANDO POBREZA POR REGIONES ===" -ForegroundColor Cyan
$result2 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query2 -TimeoutSec 90
$json2 = $result2.result.content[0].text | ConvertFrom-Json
$json2.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "Titulo: $($_.title)" -ForegroundColor Green
    Write-Host "Año: $($_.year)"
    $abs = $_.abstract.Substring(0, [Math]::Min(400, $_.abstract.Length))
    Write-Host "Resumen: $abs"
    Write-Host ""
}

# 3. Economia regional -mineria
$query3 = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "economia region Arequipa Cajamarca Ica Mining export Peru desarrollo regional"
            sources = @("peru")
            limit = 8
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== BUSCANDO ECONOMIA REGIONAL ===" -ForegroundColor Cyan
$result3 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query3 -TimeoutSec 90
$json3 = $result3.result.content[0].text | ConvertFrom-Json
$json3.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "Titulo: $($_.title)" -ForegroundColor Green
    Write-Host "Año: $($_.year)"
    $abs = $_.abstract.Substring(0, [Math]::Min(400, $_.abstract.Length))
    Write-Host "Resumen: $abs"
    Write-Host ""
}

Write-Host "`n=== RESUMEN BUSQUEDAS COMPLETADO ===" -ForegroundColor Green