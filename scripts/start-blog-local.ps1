$ErrorActionPreference='Stop'
$blogFront=Split-Path $PSScriptRoot -Parent
$env:CRICA_API_PROXY='http://127.0.0.1:5031'
Start-Process -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4174','--strictPort') -WorkingDirectory $blogFront -WindowStyle Hidden -RedirectStandardOutput (Join-Path $blogFront 'blog-local.log') -RedirectStandardError (Join-Path $blogFront 'blog-local.err.log') -PassThru | Select-Object Id
