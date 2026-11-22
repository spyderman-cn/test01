# 打包虚拟机部署包：dist + nginx.conf + Dockerfile + compose
#
# 用法：
#   powershell -File scripts/pack-deploy.ps1
# 产物：
#   release/campus-web.tar.gz
#
# 前提：已执行过 `cd web; npm install; npm run build`

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'web\dist'
$stage = Join-Path $root 'release\campus-web'
$tarball = Join-Path $root 'release\campus-web.tar.gz'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    throw "未找到 web\dist，请先在 web 目录执行 npm run build"
}

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $stage 'dist') | Out-Null

Copy-Item (Join-Path $dist '*') (Join-Path $stage 'dist') -Recurse -Force
Copy-Item (Join-Path $root 'deploy\nginx.conf') (Join-Path $stage 'nginx.conf') -Force
Copy-Item (Join-Path $root 'deploy\Dockerfile') (Join-Path $stage 'Dockerfile') -Force
Copy-Item (Join-Path $root 'deploy\docker-compose.yml') (Join-Path $stage 'docker-compose.yml') -Force
Copy-Item (Join-Path $root 'deploy\README-部署.md') (Join-Path $stage 'README.md') -Force

if (Test-Path $tarball) { Remove-Item $tarball -Force }
Push-Location (Join-Path $root 'release')
try {
    & tar.exe -czf 'campus-web.tar.gz' 'campus-web'
    if ($LASTEXITCODE -ne 0) { throw 'tar 打包失败' }
} finally {
    Pop-Location
}

$size = (Get-Item $tarball).Length / 1MB
Write-Host ("已生成 {0}（{1:N2} MB）" -f $tarball, $size)

# 同时生成 zip（条目使用 / 分隔，Linux unzip 与 Windows 资源管理器都能正常解压）
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $root 'release\campus-web.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    foreach ($file in Get-ChildItem $stage -Recurse -File) {
        $rel = $file.FullName.Substring($stage.Length + 1).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $file.FullName, "campus-web/$rel",
            [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally {
    $zip.Dispose()
}
Write-Host ("已生成 {0}（{1:N2} MB）" -f $zipPath, ((Get-Item $zipPath).Length / 1MB))
Write-Host '虚拟机：tar -xzf campus-web.tar.gz && cd campus-web && docker compose up -d --build'
Write-Host '或上传 zip：unzip campus-web.zip && cd campus-web && docker compose up -d --build'
