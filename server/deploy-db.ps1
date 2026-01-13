# Database Deployment Script

# This script deploys the complete database schema to your PostgreSQL database
# It will DROP all existing tables and recreate them - USE WITH CAUTION!

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL,
    
    [Parameter(Mandatory=$false)]
    [switch]$Confirm
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Database Deployment Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $DatabaseUrl) {
    Write-Host "ERROR: DATABASE_URL not found!" -ForegroundColor Red
    Write-Host "Please set the DATABASE_URL environment variable or pass it as a parameter." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Gray
    Write-Host "  .\deploy-db.ps1 -DatabaseUrl 'postgresql://user:pass@host:5432/dbname'" -ForegroundColor Gray
    Write-Host "  or set in .env file" -ForegroundColor Gray
    exit 1
}

# Load .env file if it exists and no URL was provided
if (Test-Path "server\.env") {
    Write-Host "Loading environment from server\.env..." -ForegroundColor Yellow
    Get-Content "server\.env" | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $DatabaseUrl = $matches[1]
        }
    }
}

# Mask password in output
$MaskedUrl = $DatabaseUrl -replace '://([^:]+):([^@]+)@', '://$1:****@'
Write-Host "Target Database: $MaskedUrl" -ForegroundColor Yellow
Write-Host ""

# Warning
Write-Host "⚠️  WARNING: This will DROP ALL EXISTING TABLES!" -ForegroundColor Red
Write-Host "⚠️  ALL DATA WILL BE LOST!" -ForegroundColor Red
Write-Host ""

if (-not $Confirm) {
    $response = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($response -ne "yes") {
        Write-Host "Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Deploying schema..." -ForegroundColor Green

# Run the schema file
try {
    $schemaPath = "server\src\schema-complete.sql"
    
    if (-not (Test-Path $schemaPath)) {
        Write-Host "ERROR: Schema file not found at $schemaPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Executing SQL from $schemaPath..." -ForegroundColor Cyan
    
    # Execute with psql
    psql $DatabaseUrl -f $schemaPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Database schema deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verifying tables..." -ForegroundColor Cyan
        
        # Verify tables exist
        $verifyQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
        psql $DatabaseUrl -c $verifyQuery
        
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  Deployment Complete!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ Database deployment failed!" -ForegroundColor Red
        Write-Host "Check the error messages above." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "✗ Error during deployment: $_" -ForegroundColor Red
    exit 1
}
