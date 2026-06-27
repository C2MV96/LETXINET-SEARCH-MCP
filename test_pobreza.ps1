$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "pobreza extrema Peru anemia infantil 2024 2025 indicadores sociales"
            sources = @("peru")
            limit = 5
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "Buscando realidad pobreza y anemia..."
$result = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
$json = $result.result.content[0].text | ConvertFrom-Json
$json.data.sources | ForEach-Object {
    Write-Host "=== $($_.title) ($($_.year))"
    Write-Host $_.abstract.Substring(0, [Math]::Min(500, $_.abstract.Length))
    Write-Host ""
}