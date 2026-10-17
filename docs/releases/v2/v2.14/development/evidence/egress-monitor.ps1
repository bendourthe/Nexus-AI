# v2.14.0 gate V-8 -- watch for non-loopback TCP connections during voice turns.
#
# Polls every 250 ms for -Seconds and covers exactly the processes a voice turn
# runs through, identified by command line: the sidecar bundle
# (desktop\sidecar\dist\main.js), the audio runtime (runtimes.audio.main) and
# the Ollama model server (`ollama serve`). Other node processes on the host
# and the Ollama tray app's update checker are not Nexus and are excluded.
# Prints one line per distinct non-loopback remote endpoint; a clean window
# prints only the summary. Local evidence tool; not part of CI.
param(
    [int]$Seconds = 120,
    [string]$Out = ""
)

$loopback = @("127.0.0.1", "::1", "0.0.0.0", "::")
$seen = @{}
$samples = 0
$watched = @{}
$deadline = (Get-Date).AddSeconds($Seconds)
while ((Get-Date) -lt $deadline) {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and (
            $_.CommandLine -match "sidecar[\\/]dist[\\/]main\.js" -or
            $_.CommandLine -match "runtimes\.audio\.main" -or
            ($_.Name -eq "ollama.exe" -and $_.CommandLine -match "\bserve\b")
        )
    }
    $pids = @($procs | ForEach-Object { $watched["$($_.ProcessId)"] = $_.Name; $_.ProcessId })
    if ($pids.Count -gt 0) {
        Get-NetTCPConnection -ErrorAction SilentlyContinue |
            Where-Object { $pids -contains $_.OwningProcess -and $loopback -notcontains $_.RemoteAddress } |
            ForEach-Object {
                $key = "$($watched["$($_.OwningProcess)"]) $($_.RemoteAddress):$($_.RemotePort) $($_.State)"
                if (-not $seen.ContainsKey($key)) { $seen[$key] = (Get-Date).ToString("o") }
            }
    }
    $samples++
    Start-Sleep -Milliseconds 250
}
$names = ($watched.Values | Sort-Object -Unique) -join ","
$lines = @("samples=$samples watchedProcesses=$($watched.Count) ($names) nonLoopback=$($seen.Count)")
foreach ($key in $seen.Keys) { $lines += "$($seen[$key]) $key" }
if ($Out) { $lines | Set-Content -Encoding utf8 $Out }
$lines
