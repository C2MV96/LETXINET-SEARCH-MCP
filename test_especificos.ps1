# Busquedas especificas por tema

# 1. Education regional
$query1 = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "educacion rendimiento académico region Peru rurales andinas calidad义务教育"
            sources = @("peru")
            limit = 6
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "=== EDUCACION POR REGIONES ===" -ForegroundColor Cyan
$result1 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query1 -TimeoutSec 90
$json1 = $result1.result.content[0].text | ConvertFrom-Json
$json1.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(350, $_.abstract.Length))
    Write-Host ""
}

# 2. Salud regional
$query2 = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "salud sistema hospital region Peru infraestructura acceso servicios"
            sources = @("peru")
            limit = 6
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== SALUD POR REGIONES ===" -ForegroundColor Cyan
$result2 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query2 -TimeoutSec 90
$json2 = $result2.result.content[0].text | ConvertFrom-Json
$json2.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(350, $_.abstract.Length))
    Write-Host ""
}

# 3. Corrupción institucional
$query3 = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "corrupcion institucional Peru gobernabilidad transparencia Estado"
            sources = @("peru")
            limit = 6
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== CORRUPCION Y GOBERNABILIDAD ===" -ForegroundColor Cyan
$result3 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query3 -TimeoutSec 90
$json3 = $result3.result.content[0].text | ConvertFrom-Json
$json3.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(350, $_.abstract.Length))
    Write-Host ""
}

# 4. Agricultura y alimentos
$query4 = @{
    jsonrpc = "2.0"
    id = 4
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "agricultura Peru alimentos productividad campesino agrarian reform"
            sources = @("peru")
            limit = 6
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== AGRICULTURA Y REFORMA AGRARIA ===" -ForegroundColor Cyan
$result4 = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $query4 -TimeoutSec 90
$json4 = $result4.result.content[0].text | ConvertFrom-Json
$json4.data.sources | ForEach-Object {
    Write-Host "---" -ForegroundColor Yellow
    Write-Host "$($_.title) ($($_.year))" -ForegroundColor Green
    Write-Host $_.abstract.Substring(0, [Math]::Min(350, $_.abstract.Length))
    Write-Host ""
}

Write-Host "`n=== COMPLETADO ===" -ForegroundColor Green