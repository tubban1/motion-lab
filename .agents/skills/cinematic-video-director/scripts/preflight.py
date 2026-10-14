#!/usr/bin/env python3
"""Motion Lab environment preflight. Read-only, Python standard library."""
import argparse, json, shutil, subprocess, sys, importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

def blender_path():
    return shutil.which("blender") or next(
        (x for x in ["/Applications/Blender.app/Contents/MacOS/Blender", "/usr/local/bin/blender"] if Path(x).is_file()), None)

def probe(exe, args):
    try:
        result = subprocess.run([str(exe), *args], capture_output=True, text=True, timeout=8)
        if result.returncode: return None
        return (result.stdout or result.stderr).strip().splitlines()[0][:150]
    except (OSError, subprocess.TimeoutExpired, IndexError): return None

def diagnose(root=ROOT):
    tools = {"node": shutil.which("node"), "npm": shutil.which("npm"),
             "ffmpeg": shutil.which("ffmpeg"), "ffprobe": shutil.which("ffprobe"),
             "blender": blender_path(),
             "remotion": str(root / "node_modules/.bin/remotion") if (root / "node_modules/.bin/remotion").is_file() else None}
    options = {"node":["--version"],"npm":["--version"],"ffmpeg":["-version"],"ffprobe":["-version"],
               "blender":["-b","--version"],"remotion":["--version"]}
    missing = [x for x in ("node","npm","ffmpeg","ffprobe","remotion") if not tools[x]]
    return {"repo":str(root),"status":"pass" if not missing and (root/"src/index.ts").is_file() else "fail",
            "tools":tools,"versions":{k:probe(v,options[k]) for k,v in tools.items() if v},
            "missing_required":missing,"entrypoint_present":(root/"src/index.ts").is_file(),
            "blender_optional_unless_3d": True,
            "voiceover_script_present": (root/"scripts/voiceover.py").is_file(),
            "edge_tts_installed": importlib.util.find_spec("edge_tts") is not None,
            "narration_default": "edge via scripts/voiceover.py; offline fallback must be explicit"}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("--json",action="store_true");a=p.parse_args()
    d=diagnose()
    if a.json: print(json.dumps(d,indent=2,ensure_ascii=False))
    else:
        print("Motion Lab:",d["status"].upper(),d["repo"])
        for name,path in d["tools"].items():print(" -",name,":",path or "NOT INSTALLED")
        if d["missing_required"]:print("缺少必需工具：",", ".join(d["missing_required"]))
    sys.exit(0 if d["status"]=="pass" else 1)
