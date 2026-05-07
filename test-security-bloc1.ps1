# ─────────────────────────────────────────────────────────────────────────────
# DRIVES ON — Validation sécurité BLOC 1
# Usage : ! powershell -ExecutionPolicy Bypass -File test-security-bloc1.ps1
# Pré-requis : serveur Next.js actif sur http://localhost:3000
# ─────────────────────────────────────────────────────────────────────────────

$BASE = "http://localhost:3000"
$pass = 0
$fail = 0

function Test-Api {
    param(
        [string]$Label,
        [string]$Uri,
        [string]$Method    = 'GET',
        [string]$Body      = $null,
        [int]   $Expected  = 401
    )

    $params = @{ Uri = $Uri; Method = $Method; UseBasicParsing = $true }
    if ($Body) {
        $params.Body        = $Body
        $params.ContentType = 'application/json'
    }

    try {
        $r      = Invoke-WebRequest @params
        $status = [int]$r.StatusCode
        $json   = $r.Content
    } catch [System.Net.WebException] {
        $status = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $json   = $reader.ReadToEnd()
    } catch {
        $status = 0
        $json   = $_.Exception.Message
    }

    if ($status -eq $Expected) {
        Write-Host "  PASS  $Label  →  HTTP $status" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  $Label  →  HTTP $status  (attendu : $Expected)" -ForegroundColor Red
        Write-Host "         Body : $json" -ForegroundColor DarkRed
        $script:fail++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DRIVES ON — Validation sécurité BLOC 1 (API sans cookie)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Tests 5-7 : routes /api/admin/* sans cookie → 401 ────────────────────────
Write-Host "── Routes admin (sans cookie) ──────────────────────────────" -ForegroundColor Yellow

Test-Api `
    -Label    "Test 5 · GET  /api/admin/access-requests" `
    -Uri      "$BASE/api/admin/access-requests" `
    -Method   GET `
    -Expected 401

Test-Api `
    -Label    "Test 6 · POST /api/admin/invite-user" `
    -Uri      "$BASE/api/admin/invite-user" `
    -Method   POST `
    -Body     '{"email":"attaquant@ext.com","role":"loueur","full_name":"Hack"}' `
    -Expected 401

Test-Api `
    -Label    "Test 7 · PATCH /api/admin/deployment-cities/fake-id" `
    -Uri      "$BASE/api/admin/deployment-cities/fake-id" `
    -Method   PATCH `
    -Body     '{"status":"active"}' `
    -Expected 401

# ── Test 8 : /api/notify-loueur sans cookie → 401 ────────────────────────────
Write-Host ""
Write-Host "── Route notify-loueur (sans cookie) ───────────────────────" -ForegroundColor Yellow

Test-Api `
    -Label    "Test 8 · POST /api/notify-loueur" `
    -Uri      "$BASE/api/notify-loueur" `
    -Method   POST `
    -Body     '{"request":{"vehicleCategory":"citadine","location":{"address":"Test"},"assignedAgencyIds":[]}}' `
    -Expected 401

# ── Résultat ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($fail -eq 0) {
    Write-Host "  RÉSULTAT : $pass/$($pass+$fail) tests API réussis  ✓" -ForegroundColor Green
} else {
    Write-Host "  RÉSULTAT : $pass/$($pass+$fail) tests API réussis  — $fail ÉCHEC(S)" -ForegroundColor Red
}
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests navigateur à compléter manuellement (voir guide ci-dessous)." -ForegroundColor Gray
Write-Host ""
