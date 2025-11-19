param(
    [Parameter(Mandatory=$false, HelpMessage="Rebuild the backend.")]
    [switch]$Backend = $false,
    [Parameter(Mandatory=$false, HelpMessage="Rebuild the frontend.")]
    [switch] $Frontend = $false,
    [Parameter(Mandatory=$false, HelpMessage="Set to true to deploy the application.")]
    [switch] $Deploy = $false
)

$ErrorActionPreference = 'Stop'

if($Backend) {
    if (Test-Path '.\dist\backend') { Remove-Item -Recurse -Force '.\dist\backend' }
    Set-Location ..\
    pnpm i 
    pnpm -F homeserver-backend run clean 
    pnpm -F homeserver-backend run build
    pnpm -F homeserver-backend run deploy
    Set-Location .\deployment
}

if($Frontend) {
    if (Test-Path '.\dist\frontend') { Remove-Item -Recurse -Force '.\dist\frontend' }
    Set-Location ..\
    pnpm i 
    pnpm -F homeserver-frontend run clean 
    pnpm -F homeserver-frontend run build
    pnpm -F homeserver-frontend run deploy
    Set-Location .\deployment
}

if($Deploy) {
    terraform plan -out='tfplan'
    Read-Host "Press Enter to continue or Ctrl+C to cancel." 
    terraform apply 'tfplan'
}

