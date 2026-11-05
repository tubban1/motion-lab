param([switch]$Background)
$ErrorActionPreference='Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..'))
$folder='renders\hongkong-wind-lyrics-20261031\director-v2'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$script='node_modules\@remotion\cli\remotion-cli.js'
$args2=@($script,'render','src/index.ts','HKWindLyricsDirectorV2',
 'renders/hongkong-wind-lyrics-20261031/director-v2/hk-director-v2-540x960.mp4',
 '--scale','0.75','--concurrency','2','--codec','h264','--crf','20')
if($Background){
 $stdout=Join-Path $folder 'full-render.log'
 $stderr=Join-Path $folder 'full-render.err'
 $process=Start-Process -FilePath 'node.exe' -ArgumentList $args2 -WorkingDirectory (Get-Location).Path -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
 Write-Output "DIRECTOR_RENDER_PID=$($process.Id)"
}else{
 & node.exe @args2
 if($LASTEXITCODE -ne 0){throw "Render failed with code $LASTEXITCODE"}
}
