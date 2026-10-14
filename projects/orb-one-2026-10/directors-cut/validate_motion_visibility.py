"""Blender camera visibility quality gate: prevent clipped/offscreen hero product."""
from pathlib import Path
import sys,bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
path=Path(__file__).with_name('render_motion.py')
source=path.read_text().split('bpy.ops.render.render(animation=True)')[0]
exec(compile(source,str(path),'exec'),globals())
shot=sys.argv[sys.argv.index('--')+1]
if shot=='gyro':
 objects=[o for o in bpy.data.objects if o.type=='MESH' and ('gyro isolation ring' in o.name or 'Compute core' in o.name) and not o.hide_render]
else:
 objects=[o for o in bpy.data.objects if o.type=='MESH' and 'titanium enclosure' in o.name and not o.hide_render]
assert objects,f'No visible product for {shot}'
failures=[]
for frame in range(1,sc.frame_end+1):
 sc.frame_set(frame)
 deps=bpy.context.evaluated_depsgraph_get()
 for obj in objects:
  o=obj.evaluated_get(deps)
  coords=[world_to_camera_view(sc,sc.camera,o.matrix_world @ Vector(c)) for c in o.bound_box]
  xs=[p.x for p in coords];ys=[p.y for p in coords];zs=[p.z for p in coords]
  if min(zs)<=0 or min(xs)<.025 or max(xs)>.975 or min(ys)<.025 or max(ys)>.975:
   failures.append((frame,obj.name,round(min(xs),3),round(max(xs),3),round(min(ys),3),round(max(ys),3)))
if failures:
 for issue in failures[:12]:print('CAMERA_CLIPPING',issue)
 raise RuntimeError(f'CAMERA_VISIBILITY_FAIL {shot}: {len(failures)} violations')
print('CAMERA_VISIBILITY_PASS',shot,'frames',sc.frame_end,'subjects',len(objects),flush=True)
