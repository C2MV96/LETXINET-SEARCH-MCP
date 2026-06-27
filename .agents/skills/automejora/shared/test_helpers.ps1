# ============================================================
# Shared Test Helpers — Reutilizable por todos los scripts de país
# Dot-source: . "$PSScriptRoot\..\shared\test_helpers.ps1"
# ============================================================

function Test-Source {
    param(
        [string]$Name, 
        [string]$Url, 
        [string]$Category, 
        [string]$ExpectType = "html",
        [int]$Timeout = 4,
        [ref]$Summary
    )
    
    $result = @{ name=$Name; url=$Url; status="unknown"; latency=0; size=0; notes="" }
    if ($Summary) { $Summary.Value.total_tested++ }
    
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36" -MaximumRedirection 5 -ErrorAction Stop
        $sw.Stop()
        
        $result.latency = $sw.ElapsedMilliseconds
        $result.size = $r.Content.Length
        
        if ($r.StatusCode -eq 200) {
            if ($ExpectType -eq "pdf_link" -and $r.Content -match 'iframe.*src.*pdf|embed.*pdf|\.pdf') {
                $result.status = "working_pdf_link"; if ($Summary) { $Summary.Value.working++ }
            } elseif ($r.Content.Length -gt 500) {
                $result.status = "working"; $result.notes = "$([Math]::Round($r.Content.Length/1024))KB"
                if ($Summary) { $Summary.Value.working++ }
            } else {
                $result.status = "empty_response"; if ($Summary) { $Summary.Value.error++ }
            }
        } else {
            $result.status = "http_$($r.StatusCode)"; if ($Summary) { $Summary.Value.error++ }
        }
    } catch {
        $msg = "$($_.Exception.Message)"
        if ($msg -match "403|Prohibido|Forbidden") { $result.status = "blocked_403"; if ($Summary) { $Summary.Value.blocked++ } }
        elseif ($msg -match "404|encontr") { $result.status = "not_found_404"; if ($Summary) { $Summary.Value.error++ } }
        elseif ($msg -match "tiempo|timeout|Timeout|aborted") { $result.status = "timeout"; if ($Summary) { $Summary.Value.timeout++ } }
        elseif ($msg -match "resolver|DNS|nombre remoto") { $result.status = "dns_fail"; if ($Summary) { $Summary.Value.dns_fail++ } }
        else { $result.status = "error"; $result.notes = $msg.Substring(0, [Math]::Min(80, $msg.Length)); if ($Summary) { $Summary.Value.error++ } }
    }
    
    $icon = switch ($result.status) { { $_ -match "working" } { "OK" }; "blocked_403" { "BLOCK" }; "timeout" { "TIME" }; "dns_fail" { "DNS" }; default { "FAIL" } }
    Write-Host "  [$icon] $Name -- $($result.status) -- $($result.latency)ms"
    return $result
}

function New-Summary { return @{ total_tested=0; working=0; blocked=0; timeout=0; dns_fail=0; error=0 } }

function Save-Results {
    param([string]$OutputFile, $Results, $Summary, [string]$Country)
    $data = @{
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        country = $Country
        summary = $Summary
        repos = $Results
    }
    $dir = Split-Path $OutputFile -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $data | ConvertTo-Json -Depth 4 | Set-Content $OutputFile -Encoding UTF8
    Write-Host "`n  Results saved: $OutputFile"
}
