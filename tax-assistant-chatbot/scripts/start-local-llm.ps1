param(
  [string]$ModelPath = $env:LOCAL_GGUF_MODEL_PATH,
  [string]$Alias = 'local-tax-sql',
  [int]$Port = 8000
)

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $ModelPath) {
  $candidatePaths = @(
    (Join-Path $env:USERPROFILE 'models\qwen2.5-0.5b-instruct-q4_k_m.gguf'),
    (Join-Path $repoRoot 'data\models\qwen2.5-0.5b-instruct-q4_k_m.gguf')
  )

  $ModelPath = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $ModelPath -or -not (Test-Path $ModelPath)) {
  throw "Could not find a GGUF model file. Set LOCAL_GGUF_MODEL_PATH or place qwen2.5-0.5b-instruct-q4_k_m.gguf in $env:USERPROFILE\\models or scripts\\..\\data\\models."
}

$llamaServer = (Get-Command llama-server -ErrorAction SilentlyContinue).Source

if (-not $llamaServer) {
  $wingetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe'

  if (Test-Path $wingetPath) {
    $llamaServer = $wingetPath
  }
}

if (-not $llamaServer) {
  throw 'Could not locate llama-server.exe. Install ggml.llamacpp first.'
}

Write-Host "Starting local LLM server with model: $ModelPath"
Write-Host "Endpoint: http://127.0.0.1:$Port/v1"

& $llamaServer `
  --model $ModelPath `
  --alias $Alias `
  --host 127.0.0.1 `
  --port $Port `
  --ctx-size 2048 `
  --n-gpu-layers 0 `
  --jinja
