$body = @{
    jsonrpc = "2.0"
    id = 1
    method = "tools/call"
    params = @{
        name = "search"
        arguments = @{
            query = "Keiko Fujimori plan de gobierno Peru 2026"
            sources = @("peru")
            limit = 5
        }
    }
} | ConvertTo-Json -Depth 5

Write-Host "Sending request to letxipu cloud..."
$result = Invoke-RestMethod -Uri "https://C2MV-letxipu-search-mcp-v3.hf.space/api/mcp" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
$result | ConvertTo-Json -Depth 10