# Compila DM Studio · PDF para Windows como programa portable:
#   dist\DM Studio PDF\            DM Studio PDF.exe + librerías WebView2 de Microsoft + carpeta app
#   dist\DM-Studio-PDF-Windows.zip lo mismo, comprimido, para publicar
# El .exe no lleva nada empaquetado ni extrae archivos: así no lo confunden con un virus.
# Uso: clic derecho > Ejecutar con PowerShell (o: powershell -ExecutionPolicy Bypass -File compilar.ps1)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path (Split-Path -Parent $here) 'app'
$work = Join-Path $env:TEMP 'DMStudioPDF-compilar'   # fuera de OneDrive (que bloquea archivos mientras sincroniza)
$dist = Join-Path $here 'dist'
$out = Join-Path $dist 'DM Studio PDF'
Add-Type -AssemblyName System.Drawing, System.IO.Compression.FileSystem
foreach ($d in $work, $out) { if (Test-Path $d) { Remove-Item $d -Recurse -Force } }
New-Item -ItemType Directory $work, $out | Out-Null

# 1) icono del programa: los PNG del logo (carpeta «icono»)
$sizes = 16, 24, 32, 48, 64, 128, 256
$pngs = $sizes | ForEach-Object { ,[IO.File]::ReadAllBytes((Join-Path $here "icono\icono-$_.png")) }
$ico = New-Object System.IO.MemoryStream; $bw = New-Object System.IO.BinaryWriter $ico
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$off = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $b = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$b); $bw.Write([byte]$b); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$pngs[$i].Length); $bw.Write([uint32]$off); $off += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write([byte[]]$p) }
$icoFile = Join-Path $work 'dmstudio.ico'
[IO.File]::WriteAllBytes($icoFile, $ico.ToArray())

# 2) compilar con el compilador de C# que trae Windows (.NET Framework 4)
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$csc = Join-Path $fw 'csc.exe'
$wv = Join-Path $here 'webview2'   # Microsoft.Web.WebView2 (SDK redistribuible de Microsoft, firmado por Microsoft)
$exe = Join-Path $out 'DM Studio PDF.exe'
& $csc /nologo /target:winexe /optimize+ /platform:x64 "/out:$exe" "/win32icon:$icoFile" `
  "/r:$wv\Microsoft.Web.WebView2.Core.dll" "/r:$wv\Microsoft.Web.WebView2.WinForms.dll" `
  /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  (Join-Path $here 'Program.cs')
if ($LASTEXITCODE -ne 0) { throw 'La compilación falló' }

# 3) junto al .exe: las librerías de WebView2 y la app (sin el .bat, que en el programa no hace falta)
Copy-Item "$wv\Microsoft.Web.WebView2.Core.dll", "$wv\Microsoft.Web.WebView2.WinForms.dll", "$wv\WebView2Loader.dll" $out
Copy-Item $app (Join-Path $out 'app') -Recurse
Get-ChildItem (Join-Path $out 'app') -Filter '*.bat' | Remove-Item -Force
Copy-Item (Join-Path (Split-Path -Parent $here) 'LICENSE') (Join-Path $out 'LICENSE.txt') -ErrorAction SilentlyContinue
@"
DM Studio · PDF
===============
Abre «DM Studio PDF.exe». No hace falta instalar nada (Windows 10/11).
Deja todos estos archivos juntos: el programa usa la carpeta «app» y las librerías de WebView2.

Si Windows muestra «Windows protegió su PC», pulsa «Más información» y «Ejecutar de todas formas»:
pasa con los programas nuevos que aún no están firmados digitalmente.
"@ | Set-Content (Join-Path $out 'LEEME.txt') -Encoding UTF8

# 4) ZIP para publicar
$zip = Join-Path $dist 'DM-Studio-PDF-Windows.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
[IO.Compression.ZipFile]::CreateFromDirectory($out, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
"Listo: $exe ({0:N2} MB)" -f ((Get-Item $exe).Length / 1MB)
"ZIP:   $zip ({0:N1} MB)" -f ((Get-Item $zip).Length / 1MB)
