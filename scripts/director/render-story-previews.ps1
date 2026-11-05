$ErrorActionPreference='Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..'))
$folder='renders\hongkong-wind-lyrics-20261031\story-v3'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$points=@(180,520,740,1130,1450,1860,2220,2650,3150,3630,4180,4540)
foreach($f in $points){
 Write-Output "STORY_FRAME_START=$f"
 & npx.cmd remotion still src/index.ts HKContinuousStoryV3 "$folder\frame-$f.png" --frame $f --scale 0.55
 if($LASTEXITCODE -ne 0){throw "Failed frame $f code $LASTEXITCODE"}
 Write-Output "STORY_FRAME_OK=$f"
}
Write-Output "ALL_STORY_PREVIEWS_RENDERED=$($points.Count)"
