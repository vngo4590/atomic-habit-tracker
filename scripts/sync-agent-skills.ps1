param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string[]]$CodexSkillsRoots,
  [switch]$SkipClaude,
  [switch]$SkipProjectCodex,
  [switch]$SkipUserCodex,
  [switch]$ForceReplace
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$Path) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }
  $leaf = Split-Path -Leaf $Path
  return Join-Path (Resolve-Path $parent).Path $leaf
}

function Test-ReparsePoint([string]$Path) {
  if (-not (Test-Path $Path)) {
    return $false
  }
  return [bool]((Get-Item -LiteralPath $Path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)
}

function Remove-ExistingTarget([string]$Path, [string]$AllowedRoot) {
  if (-not (Test-Path $Path)) {
    return
  }

  if (Test-ReparsePoint $Path) {
    [System.IO.Directory]::Delete($Path)
    return
  }

  if (-not $ForceReplace) {
    throw "Target already exists and is not a link: $Path. Re-run with -ForceReplace to replace it."
  }

  $resolved = (Resolve-Path $Path).Path
  $root = (Resolve-Path $AllowedRoot).Path
  if (-not $resolved.StartsWith($root)) {
    throw "Refusing to replace path outside allowed root: $resolved"
  }

  Remove-Item -LiteralPath $resolved -Recurse -Force
}

function New-SafeJunction([string]$LinkPath, [string]$TargetPath, [string]$AllowedRoot) {
  $projectRootPath = (Resolve-Path $ProjectRoot).Path
  $target = (Resolve-Path $TargetPath).Path
  $link = Resolve-FullPath $LinkPath

  if (-not $target.StartsWith($projectRootPath)) {
    throw "Refusing to link to target outside project root: $target"
  }

  Remove-ExistingTarget -Path $link -AllowedRoot $AllowedRoot
  New-Item -ItemType Junction -Path $link -Target $target | Out-Null
  Write-Host "linked $link -> $target"
}

$projectRootPath = (Resolve-Path $ProjectRoot).Path
$centralSkills = Join-Path $projectRootPath ".agents\skills"
if (-not (Test-Path $centralSkills)) {
  throw "Canonical skills directory not found: $centralSkills"
}

if (-not $SkipClaude) {
  New-SafeJunction `
    -LinkPath (Join-Path $projectRootPath ".claude\skills") `
    -TargetPath $centralSkills `
    -AllowedRoot $projectRootPath
}

$roots = @()
if ($CodexSkillsRoots) {
  $roots += $CodexSkillsRoots
} else {
  if (-not $SkipProjectCodex) {
    $roots += (Join-Path $projectRootPath ".codex\skills")
  }
  if (-not $SkipUserCodex) {
    $roots += (Join-Path $HOME ".codex\skills")
  }
}

foreach ($root in $roots) {
  if (-not (Test-Path $root)) {
    New-Item -ItemType Directory -Path $root | Out-Null
  }
  $resolvedRoot = (Resolve-Path $root).Path
  Get-ChildItem -LiteralPath $centralSkills -Directory | ForEach-Object {
    New-SafeJunction `
      -LinkPath (Join-Path $resolvedRoot $_.Name) `
      -TargetPath $_.FullName `
      -AllowedRoot $resolvedRoot
  }
}
