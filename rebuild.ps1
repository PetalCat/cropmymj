# PowerShell script to rebuild and redeploy the Docker container

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Rebuild & Redeploy cropmymj" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Stop and remove everything
Write-Host "[1/4] Stopping and removing existing containers..." -ForegroundColor Yellow
docker-compose down
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error stopping containers" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Containers stopped and removed" -ForegroundColor Green
Write-Host ""

# Force rebuild with no cache
Write-Host "[2/4] Building Docker image with no cache..." -ForegroundColor Yellow
docker build --no-cache -t cropmymj .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building image" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Image built successfully" -ForegroundColor Green
Write-Host ""

# Start fresh
Write-Host "[3/4] Starting containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting containers" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Containers started" -ForegroundColor Green
Write-Host ""

# Wait a moment for startup
Write-Host "[4/4] Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# Check logs
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Container Logs" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
docker-compose logs --tail=20

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Application running at: http://localhost:8547" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:      docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop:           docker-compose down" -ForegroundColor White
Write-Host "  Restart:        docker-compose restart" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
