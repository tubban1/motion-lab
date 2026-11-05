param(
 [ValidateSet('download','smoke','all')][string]$Mode='download'
)
$ErrorActionPreference='Stop'
$project=Resolve-Path (Join-Path $PSScriptRoot '..\..')
$python=Join-Path $env:LOCALAPPDATA 'MotionLab\qwen3-tts-venv\Scripts\python.exe'
if(-not (Test-Path $python)){throw 'Missing Qwen3 Python 3.12 environment'}
$folder=Join-Path $project 'projects\voice-library\acceptance\qwen3-0.6b'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$script='scripts/voice-library/qwen3_acceptance.py'
$arguments=@('-u',$script)
if($Mode -eq 'download'){$arguments+='--download-only'}
elseif($Mode -eq 'smoke'){$arguments+=@('--sample','zh-male')}
else{$arguments+=@('--sample','all')}
$out=Join-Path $folder ($Mode+'.stdout.log')
$err=Join-Path $folder ($Mode+'.stderr.log')
$p=Start-Process -FilePath $python -ArgumentList $arguments -WorkingDirectory $project -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden
Write-Output ('QWEN_ACCEPTANCE_STARTED_PID='+$p.Id+' MODE='+$Mode)
