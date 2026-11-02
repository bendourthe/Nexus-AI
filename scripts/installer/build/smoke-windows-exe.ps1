<#
.SYNOPSIS
    Packaging smoke for NexusSetup.exe: assert a single artifact, then boot it.

.DESCRIPTION
    v1.9.0 Phase 1 (T105): the NSIS outer shell is gone -- the PyInstaller
    onefile IS the distributable. This smoke asserts exactly one installer
    artifact was produced (NexusSetup.exe, and no leftover nexus-installer.exe
    two-artifact wizard), then boots the frozen exe twice without provisioning:
    --version for a bootloader probe, and --check-registry to assert the
    bundled catalog.json / recommended.json resolve inside the frozen bundle
    (the OSI004.P4.C regression guard). Both flags are handled before Qt loads,
    so the windowed exe runs them headless and exits with a code. The full
    provisioning flow is covered by tests/smoke/smoke-windows.ps1 (headless,
    source mode) and the Phase 6 clean-VM rehearsal.

    -InstallDesktop additionally installs the embedded desktop on a fresh hosted
    Windows runner and records strict backend/runtime proof. It refuses local use.
    Detached descendants are contained by the disposable hosted job; the local
    environment guard is not a security sandbox.

    Exits 0 when every assertion passes.
#>
[CmdletBinding()]
param(
    [string]$ExePath,
    [string]$DistDir,
    [switch]$InstallDesktop
)

$ErrorActionPreference = 'Stop'

if ($InstallDesktop -and ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows' -or $env:GITHUB_SHA -notmatch '^[a-fA-F0-9]{40}$' -or -not $env:RUNNER_TEMP)) {
    throw 'InstallDesktop requires a clean hosted Windows runner; no installer was launched.'
}
$failures = @()
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
if (-not $DistDir) { $DistDir = $RepoRoot }
if (-not $ExePath) { $ExePath = Join-Path $RepoRoot 'dist\NexusSetup.exe' }

function Assert-True {
    param([bool]$Condition, [string]$Label)
    if ($Condition) {
        Write-Host "  PASS  $Label"
    } else {
        Write-Host "  FAIL  $Label" -ForegroundColor Red
        $script:failures += $Label
    }
}

if (-not (Test-Path $ExePath)) {
    Write-Host "ERROR: $ExePath not found. Run build-windows.ps1 first." -ForegroundColor Red
    exit 1
}

$Dist = Join-Path $DistDir "dist"

Write-Host "==> Single-artifact assertions"
Assert-True (Test-Path $ExePath) "NexusSetup.exe present at $ExePath"
# The NSIS-era build emitted a second nexus-installer.exe wizard; assert the
# two-artifact confusion is gone.
$strayWizard = Join-Path $Dist "nexus-installer.exe"
Assert-True (-not (Test-Path $strayWizard)) "no leftover nexus-installer.exe two-artifact wizard"

Write-Host "==> Wizard boot probe (--version)"
$proc = Start-Process -FilePath $ExePath -ArgumentList "--version" -Wait -PassThru -WindowStyle Hidden
Assert-True ($proc.ExitCode -eq 0) "NexusSetup.exe --version exit code 0 (got $($proc.ExitCode))"

Write-Host "==> Bundled registry probe (--check-registry)"
$proc = Start-Process -FilePath $ExePath -ArgumentList "--check-registry" -Wait -PassThru -WindowStyle Hidden
Assert-True ($proc.ExitCode -eq 0) "NexusSetup.exe --check-registry exit code 0 (got $($proc.ExitCode))"

# v1.11.0 Phase 4 (T404): the embedded desktop payload must be present,
# manifest-valid, and hash-intact inside the frozen bundle.
Write-Host "==> Embedded desktop payload probe (--check-desktop-payload)"
$proc = Start-Process -FilePath $ExePath -ArgumentList "--check-desktop-payload" -Wait -PassThru -WindowStyle Hidden
Assert-True ($proc.ExitCode -eq 0) "NexusSetup.exe --check-desktop-payload exit code 0 (got $($proc.ExitCode))"


# Real provisioning is deliberately opt-in and restricted to a fresh hosted runner.
# Environment checks prevent accidental local execution; they are not a sandbox.
if ($InstallDesktop) {
    $stage = 'fresh-destinations'
    $receiptPath = Join-Path $Dist 'packaged-install-evidence.json'
    $failurePath = Join-Path $Dist 'packaged-install-failure.json'
    $installerHash = (Get-FileHash -LiteralPath $ExePath -Algorithm SHA256).Hash.ToLowerInvariant()
    try {
        if ($failures.Count -gt 0) { throw 'Frozen installer boot or payload checks failed.' }
        $desktopRoot = Join-Path $env:LOCALAPPDATA 'Nexus AI Studio'
        $nodeRoot = Join-Path $env:LOCALAPPDATA 'Nexus\runtime\node'
        $configRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.nexus'
        foreach ($target in @($desktopRoot, (Join-Path $env:LOCALAPPDATA 'Nexus'), $configRoot)) {
            if (Test-Path -LiteralPath $target) { throw "Acceptance requires a fresh destination: $target" }
        }
        $runRoot = Join-Path $env:RUNNER_TEMP ('nexus-packaged-install-' + [Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $runRoot | Out-Null
        function Invoke-PackagedProcess {
            param([string]$File, [string[]]$Arguments, [string]$Label, [int]$Seconds)
            $stdout = Join-Path $runRoot "$Label.stdout.log"
            $stderr = Join-Path $runRoot "$Label.stderr.log"
            $owned = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
            if (-not $owned.WaitForExit($Seconds * 1000)) {
                & taskkill.exe /PID $owned.Id /T /F | Out-Null
                throw "$Label exceeded its ${Seconds}s budget."
            }
            if ($owned.ExitCode -ne 0) { throw "$Label exited with code $($owned.ExitCode)." }
            return $stdout
        }
        $profilePath = Join-Path $runRoot 'profile.json'
        $resultPath = Join-Path $runRoot 'result.json'
        $profile = @{ name = 'packaged-desktop'; components = @('desktop'); selected_model_ids = @(); install_path = (Join-Path $runRoot 'install'); models_root = (Join-Path $runRoot 'models') }
        $profile | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $profilePath -Encoding utf8
        $stage = 'frozen-provisioning'
        $null = Invoke-PackagedProcess -File $ExePath -Arguments @('--headless-smoke', "`"$profilePath`"", '--smoke-output', "`"$resultPath`"", '--json-output') -Label 'install' -Seconds 600
        $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
        if ($result.success -ne $true -or @($result.steps_failed).Count -ne 0 -or 'desktop' -notin $result.steps_done -or 'runtime' -notin $result.steps_done) { throw 'Frozen desktop/runtime provisioning did not pass.' }
        $stage = 'installed-provenance'
        $version = (Get-Content -LiteralPath (Join-Path $RepoRoot 'package.json') -Raw | ConvertFrom-Json).version
        $identity = Get-Content -LiteralPath (Join-Path $configRoot 'desktop-payload.json') -Raw | ConvertFrom-Json
        if ($identity.version -ne $version -or $identity.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'Installed payload identity is missing or has the wrong version.' }
        $runtime = Get-Content -LiteralPath (Join-Path $configRoot 'runtime.json') -Raw | ConvertFrom-Json
        $nodePath = Join-Path $nodeRoot 'node.exe'
        function Normalized-ExecutablePath([string]$Value) {
            return [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Value).ProviderPath).Replace('\\?\', '')
        }
        if ((Normalized-ExecutablePath $runtime.nodePath) -ne (Normalized-ExecutablePath $nodePath)) { throw 'Runtime configuration did not select the newly provisioned Node.' }
        $installed = @('Nexus AI Studio.exe', 'Nexus.exe', 'nexus-shell.exe') | ForEach-Object { Join-Path $desktopRoot $_ } | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        if (-not $installed) { throw 'The installed desktop executable is missing.' }
        $stage = 'installed-healthcheck'
        $healthOutput = Invoke-PackagedProcess -File $installed -Arguments @('--healthcheck') -Label 'health' -Seconds 60
        $healthLines = @(Get-Content -LiteralPath $healthOutput | Where-Object { $_.Trim().StartsWith('{') })
        if ($healthLines.Count -ne 1) { throw 'The installed app did not emit exactly one health JSON verdict.' }
        $health = $healthLines[0] | ConvertFrom-Json
        if ($health.sidecar -ne 'ok' -or -not ($health.catalogRows -is [int] -or $health.catalogRows -is [long]) -or $health.catalogRows -le 0) { throw 'Installed sidecar health or model catalog failed.' }
        if ((Normalized-ExecutablePath $health.nodePath) -ne (Normalized-ExecutablePath $nodePath)) { throw 'The installed app used a different Node runtime.' }
        $stage = 'runtime-inventory'
        $nodeOutput = Invoke-PackagedProcess -File $nodePath -Arguments @('--version') -Label 'node' -Seconds 15
        $nodeVersion = (Get-Content -LiteralPath $nodeOutput -Raw).Trim()
        if ($nodeVersion -notmatch '^v\d+\.\d+\.\d+$') { throw 'Provisioned Node did not report a version.' }
        if ((Get-FileHash -LiteralPath $ExePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $installerHash) { throw 'Installer bytes changed during acceptance.' }
        $receipt = @{ schema = 'nexus-packaged-install/v1'; status = 'pass'; sourceSha = $env:GITHUB_SHA; runId = $env:GITHUB_RUN_ID; version = $version; installerSha256 = $installerHash; installedExeSha256 = (Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash.ToLowerInvariant(); payloadVersion = $identity.version; payloadSha256 = $identity.sha256; nodeVersion = $nodeVersion; nodeSha256 = (Get-FileHash -LiteralPath $nodePath -Algorithm SHA256).Hash.ToLowerInvariant(); nodePathMatchesProvisionedRuntime = $true; sidecar = $health.sidecar; catalogRows = $health.catalogRows; hubCatalog = $health.hubCatalog; modelsSelected = 0; stepsDone = $result.steps_done }
        $receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding utf8
        Write-Host "  PASS  Frozen desktop install and real backend health; receipt $receiptPath"
    } catch {
        @{ schema = 'nexus-packaged-install/v1'; status = 'failed'; sourceSha = $env:GITHUB_SHA; installerSha256 = $installerHash; stage = $stage; message = $_.Exception.Message } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $failurePath -Encoding utf8
        throw
    }
}

if ($failures.Count -gt 0) {
    Write-Host "`nSmoke FAILED: $($failures.Count) assertion(s)." -ForegroundColor Red
    exit 1
}
Write-Host "`nSmoke passed." -ForegroundColor Green
