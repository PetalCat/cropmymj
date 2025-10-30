# PowerShell script to rebuild and redeploy the Docker container# PowerShell script to rebuild and redeploy the Docker container



Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

Write-Host "  Rebuild & Redeploy cropmymj" -ForegroundColor CyanWrite-Host "  Rebuild & Redeploy cropmymj" -ForegroundColor Cyan

Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

Write-Host ""Write-Host ""



# Stop and remove everything# Stop and remove everything

Write-Host "[1/4] Stopping and removing existing containers..." -ForegroundColor YellowWrite-Host "[1/4] Stopping and removing existing containers..." -ForegroundColor Yellow

docker-compose down -vdocker-compose down -v

if ($LASTEXITCODE -ne 0) {if ($LASTEXITCODE -ne 0) {

    Write-Host "Error stopping containers" -ForegroundColor Red    Write-Host "Error stopping containers" -ForegroundColor Red

    exit 1    exit 1

}}

Write-Host "SUCCESS: Containers stopped and removed" -ForegroundColor GreenWrite-Host "✓ Containers stopped and removed" -ForegroundColor Green

Write-Host ""Write-Host ""



# Force rebuild with no cache# Force rebuild with no cache

Write-Host "[2/4] Building Docker image with no cache..." -ForegroundColor YellowWrite-Host "[2/4] Building Docker image with no cache..." -ForegroundColor Yellow

docker build --no-cache -t cropmymj .docker build --no-cache -t cropmymj .

if ($LASTEXITCODE -ne 0) {if ($LASTEXITCODE -ne 0) {

    Write-Host "Error building image" -ForegroundColor Red    Write-Host "Error building image" -ForegroundColor Red

    exit 1    exit 1

}}

Write-Host "SUCCESS: Image built successfully" -ForegroundColor GreenWrite-Host "✓ Image built successfully" -ForegroundColor Green

Write-Host ""Write-Host ""



# Start fresh# Start fresh

Write-Host "[3/4] Starting containers..." -ForegroundColor YellowWrite-Host "[3/4] Starting containers..." -ForegroundColor Yellow

docker-compose up -ddocker-compose up -d

if ($LASTEXITCODE -ne 0) {if ($LASTEXITCODE -ne 0) {

    Write-Host "Error starting containers" -ForegroundColor Red    Write-Host "Error starting containers" -ForegroundColor Red

    exit 1    exit 1

}}

Write-Host "SUCCESS: Containers started" -ForegroundColor GreenWrite-Host "✓ Containers started" -ForegroundColor Green

Write-Host ""Write-Host ""



# Wait a moment for startup# Wait a moment for startup

Write-Host "[4/4] Waiting for application to start..." -ForegroundColor YellowWrite-Host "[4/4] Waiting for application to start..." -ForegroundColor Yellow

Start-Sleep -Seconds 3Start-Sleep -Seconds 3

Write-Host ""Write-Host ""



# Check logs# Check logs

Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

Write-Host "  Container Logs" -ForegroundColor CyanWrite-Host "  Container Logs" -ForegroundColor Cyan

Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

docker-compose logs --tail=20docker-compose logs --tail=20



Write-Host ""Write-Host ""

Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor GreenWrite-Host "✓ Deployment complete!" -ForegroundColor Green

Write-Host ""Write-Host ""

Write-Host "Application running at: http://localhost:8547" -ForegroundColor CyanWrite-Host "Application running at: http://localhost:8547" -ForegroundColor Cyan

Write-Host ""Write-Host ""

Write-Host "Useful commands:" -ForegroundColor YellowWrite-Host "Useful commands:" -ForegroundColor Yellow

Write-Host "  View logs:      docker-compose logs -f" -ForegroundColor WhiteWrite-Host "  View logs:      docker-compose logs -f" -ForegroundColor White

Write-Host "  Stop:           docker-compose down" -ForegroundColor WhiteWrite-Host "  Stop:           docker-compose down" -ForegroundColor White

Write-Host "  Restart:        docker-compose restart" -ForegroundColor WhiteWrite-Host "  Restart:        docker-compose restart" -ForegroundColor White

Write-Host "=====================================" -ForegroundColor CyanWrite-Host "=====================================" -ForegroundColor Cyan

