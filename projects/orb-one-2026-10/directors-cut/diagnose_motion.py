from pathlib import Path
import sys,bpy
from bpy_extras.object_utils import world_to_camera_view
path=Path(__file__).with_name('render_motion.py')
source=path.read_text()
source=source.split('bpy.ops.render.render(animation=True)')[0]
exec(compile(source,str(path),'exec'),globals())
print('CAMERA',tuple(sc.camera.location),tuple(sc.camera.rotation_euler),sc.camera.data.lens)
for f in (1,30,39,60,72):
 if f>sc.frame_end:continue
 sc.frame_set(f)
 print('FRAME',f)
 for o in bpy.data.objects:
  if ('titanium enclosure' in o.name or 'Compute core' in o.name or 'isolation ring' in o.name or 'physical movement pivot' in o.name) and (o.type=='MESH' or o.type=='EMPTY'):
   pos=o.matrix_world.translation
   c=world_to_camera_view(sc,sc.camera,pos)
   print('OBJ',o.name,'world',tuple(round(x,3) for x in pos),'screen',tuple(round(x,3) for x in c),'hide',o.hide_render)
