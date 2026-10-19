$srcDir = 'C:\Users\victo\Documents\xiaomi-trainer-app'
$docDir = 'C:\Users\victo\Documents'

Add-Type -AssemblyName System.IO.Compression.FileSystem

$filesToInclude = @(
    'backend\Code.gs',
    'src\main.js',
    'src\services\api.js',
    'src\services\photo-worker.js',
    'src\views\Calendar.js',
    'src\views\Dashboard.js',
    'src\views\Login.js',
    'src\views\Materials.js',
    'src\views\Messages.js',
    'src\views\ReportForm.js',
    'src\views\Vacations.js',
    'capacitor.config.json',
    'CHANGELOG.txt',
    'index.html',
    'manifest.json',
    'package.json',
    'style.css',
    'sw.js',
    'Xiaomi_logo_(2021-).svg.png'
)

function Create-AppZip($zipFlatPath, $zipFolderPath) {
    if (Test-Path $zipFlatPath) { Remove-Item $zipFlatPath -Force }
    if (Test-Path $zipFolderPath) { Remove-Item $zipFolderPath -Force }

    # 1. Zip plano
    $tempFlat = Join-Path $env:TEMP ('xiaomi_flat_' + [System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempFlat -Force | Out-Null
    foreach ($rel in $filesToInclude) {
        $srcFile = Join-Path $srcDir $rel
        $dstFile = Join-Path $tempFlat $rel
        $parent = Split-Path $dstFile -Parent
        if (!(Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $srcFile $dstFile -Force
    }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempFlat, $zipFlatPath)
    Remove-Item $tempFlat -Recurse -Force

    # 2. Zip con carpeta contenedora
    $tempFolder = Join-Path $env:TEMP ('xiaomi_folder_' + [System.Guid]::NewGuid().ToString())
    $innerFolder = Join-Path $tempFolder 'xiaomi-trainer-app'
    New-Item -ItemType Directory -Path $innerFolder -Force | Out-Null
    foreach ($rel in $filesToInclude) {
        $srcFile = Join-Path $srcDir $rel
        $dstFile = Join-Path $innerFolder $rel
        $parent = Split-Path $dstFile -Parent
        if (!(Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $srcFile $dstFile -Force
    }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempFolder, $zipFolderPath)
    Remove-Item $tempFolder -Recurse -Force
}

# Generar v51.6 (Principal)
$zip51_6 = Join-Path $docDir 'xiaomi-trainer-app v.51.6.zip'
$zip51_6_folder = Join-Path $docDir 'xiaomi-trainer-app-folder v.51.6.zip'
Create-AppZip $zip51_6 $zip51_6_folder

Get-Item $zip51_6, $zip51_6_folder | Select-Object Name, Length, LastWriteTime

