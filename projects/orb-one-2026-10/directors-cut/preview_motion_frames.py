"""Render a few stills for director framing checks before expensive full animation."""
from pathlib import Path
import sys,bpy
path=Path(__file__).with_name('render_motion.py')
source=path.read_text().split('bpy.ops.render.render(animation=True)')[0]
exec(compile(source,str(path),'exec'),globals())
sc.render.resolution_x=960;sc.render.resolution_y=540
shot=sys.argv[sys.argv.index('--')+1]
frames=[1,30,60] if shot=='gyro' else [1,36,72]
out=Path(__file__).resolve().parents[3]/'renders/qc/orb-one-physical-directors-cut-director-v2-2026-10/preview-v3'
out.mkdir(parents=True,exist_ok=True)
for f in frames:
 sc.frame_set(f)
 sc.render.filepath=str(out/f'{shot}-{f:04}.png')
 bpy.ops.render.render(write_still=True)
 print('PREVIEW_FRAME_DONE',shot,f,flush=True)
