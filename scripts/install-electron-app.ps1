# Installs Nexprism workspace app from dist-electron\win-unpacked
# Creates Desktop + Start Menu shortcuts (current user).
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Source = Join-Path $Root 'dist-electron\win-unpacked'
$AppName = 'Nexprism'
$ExeName = 'Nexprism.exe'
$InstallDir = Join-Path $env:LOCALAPPDATA $AppName
$ExePath = Join-Path $InstallDir $ExeName

if (-not (Test-Path (Join-Path $Source $ExeName))) {
    Write-Host "ERROR: App files not found at:" -ForegroundColor Red
    Write-Host "  $Source"
    Write-Host "Build first with: npm run build:electron"
    exit 1
}

Write-Host "Installing $AppName ..." -ForegroundColor Cyan
Write-Host "From: $Source"
Write-Host "To:   $InstallDir"

if (Test-Path $InstallDir) {
    Get-Process | Where-Object { $_.Path -like "$InstallDir*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Remove-Item -Recurse -Force $InstallDir
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $Source '*') -Destination $InstallDir -Recurse -Force

$Wsh = New-Object -ComObject WScript.Shell

$DesktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
$Shortcut = $Wsh.CreateShortcut($DesktopLnk)
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = $AppName
$Shortcut.Save()

$StartMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs\$AppName"
New-Item -ItemType Directory -Force -Path $StartMenu | Out-Null
$StartLnk = Join-Path $StartMenu "$AppName.lnk"
$Shortcut2 = $Wsh.CreateShortcut($StartLnk)
$Shortcut2.TargetPath = $ExePath
$Shortcut2.WorkingDirectory = $InstallDir
$Shortcut2.Description = $AppName
$Shortcut2.Save()

$UninstallPs1 = Join-Path $InstallDir 'Uninstall.ps1'
@(
    '$ErrorActionPreference = "Stop"'
    '$dir = Split-Path -Parent $MyInvocation.MyCommand.Path'
    'Get-Process | Where-Object { $_.Path -like "$dir*" } | Stop-Process -Force -ErrorAction SilentlyContinue'
    'Start-Sleep -Seconds 1'
    "Remove-Item -LiteralPath ([Environment]::GetFolderPath('Desktop') + '\$AppName.lnk') -Force -ErrorAction SilentlyContinue"
    "Remove-Item -LiteralPath ([Environment]::GetFolderPath('StartMenu') + '\Programs\$AppName') -Recurse -Force -ErrorAction SilentlyContinue"
    'Remove-Item -LiteralPath $dir -Recurse -Force'
    "Write-Host 'Uninstalled $AppName'"
) | Set-Content -Path $UninstallPs1 -Encoding UTF8

# Mark downloaded/built binaries as trusted for this user (helps SmartScreen / MOTW)
Get-ChildItem -Path $InstallDir -Recurse -Include *.exe,*.dll -ErrorAction SilentlyContinue |
    ForEach-Object { Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "Installed successfully." -ForegroundColor Green
Write-Host "Desktop shortcut: $DesktopLnk"
Write-Host "App folder:       $InstallDir"
Write-Host ""
Write-Host "Launching app..."
try {
    Start-Process -FilePath $ExePath -WorkingDirectory $InstallDir
} catch {
    Write-Host "Auto-launch blocked by Windows Application Control / Smart App Control." -ForegroundColor Yellow
    Write-Host "Open the Desktop shortcut manually. If Windows blocks it: right-click → Properties → Unblock → Apply,"
    Write-Host "or allow the app in Windows Security."
}
