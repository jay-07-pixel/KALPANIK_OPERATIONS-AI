# PowerShell script to test API endpoints

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "TESTING INPUT GATEWAY API ENDPOINTS" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Timestamp: $($response.timestamp)`n" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 2: Input Gateway Status
Write-Host "TEST 2: Input Gateway Status" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/order/status" -Method Get
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Website Channel: $($response.channels.website)" -ForegroundColor Green
    Write-Host "WhatsApp Channel: $($response.channels.whatsapp)`n" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: Website Order
Write-Host "TEST 3: Website Order (Structured JSON)" -ForegroundColor Yellow
$websiteOrder = @{
    userId = "user123"
    customerId = "CUST-001"
    customerName = "Rajesh Kumar"
    productId = "PROD-123"
    productName = "Widget A"
    quantity = 15
    unit = "boxes"
    priority = "HIGH"
    deadline = "2026-02-01T15:00:00Z"
    notes = "Please pack carefully"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/order/website" -Method Post -Body $websiteOrder -ContentType "application/json"
    Write-Host "Success: $($response.success)" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Green
    Write-Host "Channel: $($response.channel)`n" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 4: WhatsApp Order
Write-Host "TEST 4: WhatsApp Order (Raw Text)" -ForegroundColor Yellow
$whatsappOrder = @{
    phone = "+91-98765-43210"
    name = "Rajesh Kumar"
    message = "Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!"
    timestamp = (Get-Date).ToString("o")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/order/whatsapp" -Method Post -Body $whatsappOrder -ContentType "application/json"
    Write-Host "Success: $($response.success)" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Green
    Write-Host "Channel: $($response.channel)" -ForegroundColor Green
    Write-Host "Note: $($response.note)`n" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 5: Invalid Order (Missing Fields)
Write-Host "TEST 5: Invalid Order (Should Fail)" -ForegroundColor Yellow
$invalidOrder = @{
    customerName = "Test User"
    quantity = 10
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/order/website" -Method Post -Body $invalidOrder -ContentType "application/json"
    Write-Host "Unexpected success!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Expected Error Caught: $($errorResponse.error)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "ALL API TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan
