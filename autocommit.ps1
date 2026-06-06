# Auto-commit and push to GitHub
# Usage: .\autocommit.ps1 "commit message"
# Or set as alias in PowerShell profile

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,

    [string]$RepoPath = "."
)

Set-Location $RepoPath

# Check for changes
$status = & git status --short
if ($status) {
    Write-Host "📝 Staging all changes..." -ForegroundColor Cyan
    & git add -A

    Write-Host "💾 Creating commit..." -ForegroundColor Cyan
    $fullMessage = @"
$Message

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
"@
    & git commit -m $fullMessage

    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
    & git push origin main

    Write-Host "✅ Done!" -ForegroundColor Green
    & git log --oneline -1
} else {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Yellow
}
