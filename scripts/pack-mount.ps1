# 打包「html + conf」两目录的部署包（供自行挂载 / COPY）
#
# 用法：powershell -File scripts/pack-mount.ps1
# 产物：
#   release/mount/html        <- web/dist 的完整拷贝
#   release/mount/conf/nginx.conf
#   release/campus-web-mount.tar.gz   （顶层就是 html/ 和 conf/）
#   release/campus-web-mount.zip
#
# 前提：已执行过 `cd web; npm run build`

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'web\dist'
$stage = Join-Path $root 'release\mount'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    throw '未找到 web\dist，请先在 web 目录执行 npm run build'
}

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $stage 'html') | Out-Null
New-Item -ItemType Directory -Force (Join-Path $stage 'conf') | Out-Null

Copy-Item (Join-Path $dist '*') (Join-Path $stage 'html') -Recurse -Force
Copy-Item (Join-Path $root 'deploy\nginx.conf') (Join-Path $stage 'conf\nginx.conf') -Force

$tarball = Join-Path $root 'release\campus-web-mount.tar.gz'
if (Test-Path $tarball) { Remove-Item $tarball -Force }
Push-Location $stage
try {
    & tar.exe -czf '..\campus-web-mount.tar.gz' 'html' 'conf'
    if ($LASTEXITCODE -ne 0) { throw 'tar 打包失败' }
} finally {
    Pop-Location
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $root 'release\campus-web-mount.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    foreach ($file in Get-ChildItem $stage -Recurse -File) {
        $rel = $file.FullName.Substring($stage.Length + 1).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $file.FullName, $rel,
            [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally {
    $zip.Dispose()
}

Write-Host ("html: {0} 个文件" -f (Get-ChildItem (Join-Path $stage 'html') -Recurse -File).Count)
Write-Host ("conf: {0} 个文件" -f (Get-ChildItem (Join-Path $stage 'conf') -Recurse -File).Count)
Write-Host ("已生成 {0}" -f $tarball)
Write-Host ("已生成 {0}" -f $zipPath)
