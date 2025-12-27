# Local Development Configuration for Order Service
$env:DB_URL="jdbc:postgresql://localhost:5432/novamart_orders"
$env:DB_USERNAME="novamart"
$env:DB_PASSWORD="dev-password"
$env:AWS_REGION="us-east-2"
$env:EVENT_BUS_NAME="default"

Write-Host "Starting Order Service (Local Dev Mode)..." -ForegroundColor Cyan
Write-Host "Database: localhost:5432/novamart_orders" -ForegroundColor Yellow

mvn spring-boot:run
