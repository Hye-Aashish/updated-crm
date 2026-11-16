# Unblocks Zone.Identifier / MOTW on the installed (or unpacked) Electron app and launches it.
$ErrorActionPreference = 'Continue'

$candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Nexprism'),
    (Join-Path $env:LOCALAPPDATA 'Nexprism Employee Monitor'),
    (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist-electron\win-unpacked')
)

$AppDir = $null
$ExeName = $null
foreach ($dir in $candidates) {
    foreach ($name in @('Nexprism.exe', 'Nexprism Employee Monitor.exe')) {
        $exe = Join-Path $dir $name
        if (Test-Path -LiteralPath $exe) {
            $AppDir = $dir
            $ExeName = $name
            break
        }
    }
    if ($AppDir) { break }
}

if (-not $AppDir) {
    Write-Host 'App folder not found. Run Install-Nexprism.bat first.' -ForegroundColor Red
    exit 1
}

$Exe = Join-Path $AppDir $ExeName
Write-Host "App: $Exe"

# Remove Mark-of-the-Web from all binaries
Get-ChildItem -LiteralPath $AppDir -Recurse -Force -ErrorAction SilentlyContinue |
    ForEach-Object {
        try { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue } catch {}
        # Also wipe Zone.Identifier ADS if present
        try {
            $zone = $_.FullName + ':Zone.Identifier'
            if (Test-Path -LiteralPath $zone) {
                Remove-Item -LiteralPath $zone -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }

Write-Host 'Files unblocked.' -ForegroundColor Green

# Add Defender exclusion for this folder (needs admin; ignore if denied)
try {
    Add-MpPreference -ExclusionPath $AppDir -ErrorAction Stop
    Write-Host 'Windows Defender exclusion added for app folder.' -ForegroundColor Green
} catch {
    Write-Host 'Defender exclusion skipped (run PowerShell as Admin if still blocked).' -ForegroundColor Yellow
}

Write-Host 'Launching...'
try {
    $p = Start-Process -FilePath $Exe -WorkingDirectory $AppDir -PassThru
    Write-Host "Started PID $($p.Id)"
    Start-Sleep -Seconds 3
    if ($p.HasExited) {
        Write-Host "Process exited quickly with code $($p.ExitCode)" -ForegroundColor Red
        Write-Host 'Windows Application Control / Smart App Control may be blocking unsigned Electron apps.'
        Write-Host 'Fix: Settings → Privacy & security → Windows Security → App & browser control → Smart App Control → Off'
        Write-Host 'Or right-click the Desktop shortcut → Properties → Unblock → Apply, then open again.'
        exit 1
    }
    Write-Host 'App is running.' -ForegroundColor Green
} catch {
    Write-Host "Launch blocked: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Open Windows Security → App & browser control → turn Smart App Control Off (or ask for an exception).'
    exit 1
}
