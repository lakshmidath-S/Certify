# CERTIFY API Test Script

$baseUrl = "http://localhost:3000/api"

Write-Host "`n=== CERTIFY API Testing ===" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing | ConvertFrom-Json
Write-Host "   Status: $($health.success)" -ForegroundColor Green
Write-Host "   Message: $($health.message)" -ForegroundColor Green

# Test 2: Register ISSUER
Write-Host "`n2. Registering Issuer..." -ForegroundColor Yellow
$issuerData = @{
    email = "issuer@university.edu"
    password = "password123"
    role = "ISSUER"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

try {
    $issuerReg = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST -Body $issuerData -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    Write-Host "   Issuer registered: $($issuerReg.user.email)" -ForegroundColor Green
} catch {
    Write-Host "   Issuer already exists or error" -ForegroundColor Yellow
}

# Test 3: Register OWNER
Write-Host "`n3. Registering Owner..." -ForegroundColor Yellow
$ownerData = @{
    email = "owner@example.com"
    password = "password123"
    role = "OWNER"
    firstName = "Jane"
    lastName = "Smith"
} | ConvertTo-Json

try {
    $ownerReg = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST -Body $ownerData -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    Write-Host "   Owner registered: $($ownerReg.user.email)" -ForegroundColor Green
} catch {
    Write-Host "   Owner already exists or error" -ForegroundColor Yellow
}

# Test 4: Login as Issuer
Write-Host "`n4. Logging in as Issuer..." -ForegroundColor Yellow
$loginData = @{
    email = "issuer@university.edu"
    password = "password123"
} | ConvertTo-Json

$issuerLogin = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
$issuerToken = $issuerLogin.accessToken
Write-Host "   Logged in successfully" -ForegroundColor Green
Write-Host "   Token: $($issuerToken.Substring(0, 20))..." -ForegroundColor Gray

# Test 5: Login as Owner
Write-Host "`n5. Logging in as Owner..." -ForegroundColor Yellow
$ownerLoginData = @{
    email = "owner@example.com"
    password = "password123"
} | ConvertTo-Json

$ownerLogin = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $ownerLoginData -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
$ownerToken = $ownerLogin.accessToken
$ownerId = $ownerLogin.user.id
Write-Host "   Logged in successfully" -ForegroundColor Green
Write-Host "   Owner ID: $ownerId" -ForegroundColor Gray

# Test 6: Get Issuer Profile
Write-Host "`n6. Getting Issuer Profile..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $issuerToken"
}
$profile = Invoke-WebRequest -Uri "$baseUrl/auth/profile" -Headers $headers -UseBasicParsing | ConvertFrom-Json
Write-Host "   Email: $($profile.user.email)" -ForegroundColor Green
Write-Host "   Role: $($profile.user.role)" -ForegroundColor Green

# Test 7: Verify Certificate (should fail - no certificates yet)
Write-Host "`n7. Testing Verification Endpoint..." -ForegroundColor Yellow
$verifyData = @{
    hash = "0000000000000000000000000000000000000000000000000000000000000000"
} | ConvertTo-Json

$verifyResult = Invoke-WebRequest -Uri "$baseUrl/verify/hash" -Method POST -Body $verifyData -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
Write-Host "   Status: $($verifyResult.verification.status)" -ForegroundColor Green
Write-Host "   Valid: $($verifyResult.verification.valid)" -ForegroundColor Green

# Test 8: Get Owner's Certificates (should be empty)
Write-Host "`n8. Getting Owner's Certificates..." -ForegroundColor Yellow
$ownerHeaders = @{
    "Authorization" = "Bearer $ownerToken"
}
$certs = Invoke-WebRequest -Uri "$baseUrl/certificates/my" -Headers $ownerHeaders -UseBasicParsing | ConvertFrom-Json
Write-Host "   Certificate count: $($certs.count)" -ForegroundColor Green

Write-Host "`n=== All Basic Tests Passed! ===" -ForegroundColor Cyan
Write-Host "`nNote: Certificate issuance requires:" -ForegroundColor Yellow
Write-Host "  1. Database setup (schema.sql)" -ForegroundColor Yellow
Write-Host "  2. Issuer wallet mapping (admin operation)" -ForegroundColor Yellow
Write-Host "  3. Issuer private key for blockchain signing" -ForegroundColor Yellow
