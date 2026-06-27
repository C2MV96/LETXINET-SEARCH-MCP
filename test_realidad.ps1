$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "criminalidad Peru homicide rate 2024 2025 seguridad ciudadana"
            sources = @("peru")
            limit = 5
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "Buscando realidad criminalidad Peru..."
$result = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
$json = $result.result.content[0].text | ConvertFrom-Json
$json.data.sources | ForEach-Object {
    Write-Host "Title: $($_.title)" 
    Write-Host "Year: $($_.year)"
    Write-Host "Abstract: $($_.abstract.Substring(0, [Math]::Min(500, $_.abstract.Length)))"
    Write-Host "---"
}