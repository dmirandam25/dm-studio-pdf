# Compila «DM Studio PDF.exe»: empaqueta la app (carpeta app) dentro del programa.
# Uso: clic derecho > Ejecutar con PowerShell (o: powershell -ExecutionPolicy Bypass -File compilar.ps1)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path (Split-Path -Parent $here) 'app'
$work = Join-Path $env:TEMP 'FolioPDF-compilar'   # fuera de OneDrive (que bloquea archivos mientras sincroniza)
Add-Type -AssemblyName System.Drawing, System.IO.Compression.FileSystem
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory $work | Out-Null

# 1) icono: los PNG del logo de la carpeta «icono» (si falta alguno, se dibuja uno simple)
function New-Png([int]$s) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $r = [math]::Max(2, [int]($s * 0.22)); $d = $r * 2
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc(0, 0, $d, $d, 180, 90); $p.AddArc($s - $d - 1, 0, $d, $d, 270, 90); $p.AddArc($s - $d - 1, $s - $d - 1, $d, $d, 0, 90); $p.AddArc(0, $s - $d - 1, $d, $d, 90, 90); $p.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(214, 41, 62))), $p)
  $f = New-Object System.Drawing.Font 'Segoe UI', ([single]($s * 0.62)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString('F', $f, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, ([single]($s * 0.02)), $s, $s), $sf)
  $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
  return ,$ms.ToArray()
}
$sizes = 16, 24, 32, 48, 64, 128, 256
$pngs = $sizes | ForEach-Object { $f = Join-Path $here "icono\icono-$_.png"; if (Test-Path $f) { ,[IO.File]::ReadAllBytes($f) } else { ,(New-Png $_) } }
$ico = New-Object System.IO.MemoryStream; $bw = New-Object System.IO.BinaryWriter $ico
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$off = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $b = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$b); $bw.Write([byte]$b); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$pngs[$i].Length); $bw.Write([uint32]$off); $off += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write([byte[]]$p) }
[IO.File]::WriteAllBytes((Join-Path $work 'folio.ico'), $ico.ToArray())

# 2) la app, en un zip (sin el .bat, que en el .exe no hace falta)
$stage = Join-Path $work 'app'
Copy-Item $app $stage -Recurse
Get-ChildItem $stage -Filter '*.bat' | Remove-Item -Force
$zip = Join-Path $work 'app.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [IO.Compression.CompressionLevel]::Optimal, $false)

# 3) compilar con el compilador de C# que trae Windows (.NET Framework 4)
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$csc = Join-Path $fw 'csc.exe'
$out = Join-Path $here 'DM Studio PDF.exe'
$wv = Join-Path $here 'webview2'   # Microsoft.Web.WebView2 (SDK redistribuible de Microsoft)
& $csc /nologo /target:winexe /optimize+ /platform:x64 "/out:$out" "/win32icon:$(Join-Path $work 'folio.ico')" "/resource:$zip,app.zip" `
  "/resource:$wv\Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.Core.dll" "/resource:$wv\Microsoft.Web.WebView2.WinForms.dll,Microsoft.Web.WebView2.WinForms.dll" "/resource:$wv\WebView2Loader.dll,WebView2Loader.dll" `
  "/r:$wv\Microsoft.Web.WebView2.Core.dll" "/r:$wv\Microsoft.Web.WebView2.WinForms.dll" `
  "/r:$fw\System.IO.Compression.dll" "/r:$fw\System.IO.Compression.FileSystem.dll" /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  (Join-Path $here 'Program.cs')
if ($LASTEXITCODE -ne 0) { throw 'La compilación falló' }
Remove-Item $work -Recurse -Force
"Listo: $out ({0:N1} MB)" -f ((Get-Item $out).Length / 1MB)
