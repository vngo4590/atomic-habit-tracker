param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("deploy", "cleanup", "restart", "stop", "update")]
  [string]$Action
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$namespace = "atomicly-local"
$deployment = "atomicly-web"
$migrationJob = "atomicly-migrate"
$appImage = "atomicly:local"
$migratorImage = "atomicly-migrator:local"
$appUrl = "http://localhost:30080"
$deploymentVersion = "local"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Message"
  & $Command
}

function Build-AppImage {
  Invoke-Step "Building $appImage" {
    docker build `
      --target runner `
      --build-arg "NEXT_PUBLIC_APP_URL=$appUrl" `
      --build-arg "DEPLOYMENT_VERSION=$deploymentVersion" `
      -t $appImage .
  }
}

function Build-MigratorImage {
  Invoke-Step "Building $migratorImage" {
    docker build --target migrator -t $migratorImage .
  }
}

function Start-LocalDatabase {
  Invoke-Step "Starting local PostgreSQL" {
    npm run db:up
  }
}

function Apply-LocalKubernetes {
  Invoke-Step "Applying k8s/local" {
    kubectl apply -k k8s/local
  }
}

function Rerun-Migrations {
  Invoke-Step "Recreating migration job" {
    kubectl -n $namespace delete job $migrationJob --ignore-not-found
    kubectl apply -f k8s/local/migrate-job.yaml
  }

  Wait-ForMigrations
}

function Wait-ForMigrations {
  Invoke-Step "Waiting for migration job" {
    kubectl -n $namespace wait --for=condition=complete "job/$migrationJob" --timeout=120s
  }
}

function Wait-ForWebRollout {
  Invoke-Step "Waiting for web rollout" {
    kubectl -n $namespace rollout status "deployment/$deployment"
  }
}

Push-Location $root
try {
  switch ($Action) {
    "deploy" {
      Build-AppImage
      Build-MigratorImage
      Start-LocalDatabase
      Apply-LocalKubernetes
      Wait-ForMigrations
      Wait-ForWebRollout
      Write-Host ""
      Write-Host "Local Kubernetes app is available at $appUrl"
    }
    "cleanup" {
      Invoke-Step "Deleting k8s/local resources" {
        kubectl delete -k k8s/local --ignore-not-found
      }
    }
    "restart" {
      Invoke-Step "Restarting $deployment" {
        kubectl -n $namespace rollout restart "deployment/$deployment"
      }
      Wait-ForWebRollout
    }
    "stop" {
      Invoke-Step "Scaling $deployment to zero replicas" {
        kubectl -n $namespace scale "deployment/$deployment" --replicas=0
      }
    }
    "update" {
      Build-AppImage
      Build-MigratorImage
      Start-LocalDatabase
      Apply-LocalKubernetes
      Rerun-Migrations
      Invoke-Step "Restarting $deployment" {
        kubectl -n $namespace rollout restart "deployment/$deployment"
      }
      Wait-ForWebRollout
      Write-Host ""
      Write-Host "Local Kubernetes app is updated at $appUrl"
    }
  }
}
finally {
  Pop-Location
}
