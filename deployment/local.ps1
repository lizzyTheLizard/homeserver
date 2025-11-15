Set-Location ..
pnpm -F * install  --config.confirmModulesPurge=false 
pnpm -F * run clean 
pnpm -F * build
pnpm -F * i --prod --config.confirmModulesPurge=false
Set-Location .\deployment
Remove-Item -Recurse -Force 'dist'
New-Item -ItemType Directory -Path 'dist\frontend'
Copy-Item -Path '..\frontend\build\client\*'  -Recurse -Destination 'dist\frontend\'
New-Item -ItemType Directory -Path 'dist\backend'
Compress-Archive -Path '..\backend\*' -DestinationPath 'dist\backend\homeserver-backend.zip'
terraform plan -out='tfplan'
Read-Host "Press Enter to continue or Ctrl+C to cancel." 
terraform apply 'tfplan'
