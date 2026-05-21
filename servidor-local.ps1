# Servidor HTTP simples para o MDGEO WebGis (sem precisar de Python)
param([int]$Porta = 8765)

$raiz = $PSScriptRoot
$prefixo = "http://localhost:$Porta/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefixo)

try {
    $listener.Start()
} catch {
    Write-Host "ERRO: nao foi possivel iniciar em $prefixo"
    Write-Host $_.Exception.Message
    Write-Host "Tente executar como administrador ou use outra porta."
    pause
    exit 1
}

function Get-MimeType([string]$ext) {
    switch ($ext.ToLower()) {
        '.html' { 'text/html; charset=utf-8' }
        '.htm'  { 'text/html; charset=utf-8' }
        '.js'   { 'application/javascript; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.geojson' { 'application/geo+json; charset=utf-8' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.svg'  { 'image/svg+xml' }
        '.ico'  { 'image/x-icon' }
        default { 'application/octet-stream' }
    }
}

Write-Host ""
Write-Host "  MDGEO WebGis"
Write-Host "  http://localhost:$Porta/"
Write-Host "  Pasta: $raiz"
Write-Host "  Pressione Ctrl+C para encerrar."
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $caminhoUrl = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($caminhoUrl -eq '/') { $caminhoUrl = '/index.html' }

    $relativo = $caminhoUrl.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
    $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz $relativo))

    if (-not $arquivo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase)) {
        $response.StatusCode = 403
        $response.Close()
        continue
    }

    if ($request.HttpMethod -eq 'HEAD') {
        if (Test-Path $arquivo -PathType Leaf) {
            $response.StatusCode = 200
            $response.ContentLength64 = (Get-Item $arquivo).Length
            $response.ContentType = Get-MimeType ([IO.Path]::GetExtension($arquivo))
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
        continue
    }

    if (Test-Path $arquivo -PathType Leaf) {
        $bytes = [IO.File]::ReadAllBytes($arquivo)
        $response.StatusCode = 200
        $response.ContentType = Get-MimeType ([IO.Path]::GetExtension($arquivo))
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("404 - Nao encontrado")
        $response.ContentLength64 = $msg.Length
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.Close()
}
