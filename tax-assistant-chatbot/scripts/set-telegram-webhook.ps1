param(
  [string]$BaseUrl = $env:APP_BASE_URL,
  [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$SecretToken = $env:TELEGRAM_WEBHOOK_SECRET
)

if (-not $BaseUrl) {
  throw "APP_BASE_URL is required. Example: https://your-domain.com"
}

if (-not $BotToken) {
  throw "TELEGRAM_BOT_TOKEN is required."
}

$trimmedBaseUrl = $BaseUrl.TrimEnd('/')
$webhookUrl = "$trimmedBaseUrl/api/telegram/webhook"

Write-Host "Setting Telegram webhook to $webhookUrl"

$body = @{
  url = $webhookUrl
}

if ($SecretToken) {
  $body.secret_token = $SecretToken
}

$response = Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
  -Body $body

$response | ConvertTo-Json -Depth 5
