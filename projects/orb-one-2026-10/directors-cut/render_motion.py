"""ORB ONE continuous physical-motion shot generator.
Blender: blender -b -t 4 --python render_motion.py -- rolling|gyro|bounce preview|final
Produces true 3D frame sequences, never Ken Burns stills.
"""
import bpy, math, os, sys
from mathutils import Vector
HERE=os.path.dirname(__file__)
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
SHOT=args[0] if args else "rolling"
QUALITY=args[1] if len(args)>1 else "preview"
if SHOT not in ("rolling","gyro","bounce"):
    raise ValueError("shot must be rolling, gyro, bounce")
# Reuse original product material, room, HDRI and camera definitions; omit original still-render driver.
source=open(os.path.join(HERE,"render_product.py"),encoding="utf8").read()
source=source.split("\nif SHOT in ['hero','macro','end','cutaway']:")[0]
exec(compile(source,os.path.join(HERE,"render_product.py"),"exec"),globals())
sc=bpy.context.scene
sc.render.resolution_x=960 if QUALITY=="preview" else 1920
sc.render.resolution_y=540 if QUALITY=="preview" else 1080
sc.render.resolution_percentage=100
sc.render.film_transparent=False
sc.render.image_settings.file_format="PNG"
sc.render.fps=24
sc.frame_start=1
sc.frame_end=72 if SHOT!="gyro" else 60
sc.render.filepath=os.path.join(ASSETS,"motion",SHOT,"frame_")
os.makedirs(os.path.dirname(sc.render.filepath),exist_ok=True)
sc.render.image_settings.color_mode="RGBA"
sc.render.image_settings.color_depth="8"
sc.render.engine="BLENDER_EEVEE"
sc.render.use_file_extension=True
sc.render.image_settings.file_format="PNG"
# TAA high sample quality for short preview; final can be adjusted for speed.
try:sc.render.image_settings.compression=25
except:pass

def group_product(origin,with_gyro=False):
    before=set(bpy.data.objects)
    orb(origin,cut=with_gyro)
    children=list(set(bpy.data.objects)-before)
    pivot=bpy.data.objects.new("ORB ONE | physical movement pivot",None)
    bpy.context.collection.objects.link(pivot)
    pivot.location=origin
    # Preserve world transforms when parenting to an offset pivot.
    # Reassigning matrix_world without a parent inverse previously doubled the
    # world-space position, sending the orb outside the camera frame.
    bpy.context.view_layer.update()
    inv=pivot.matrix_world.inverted()
    for child in children:
        child.parent=pivot
        child.matrix_parent_inverse=inv
    bpy.context.view_layer.update()
    return pivot,children

def keys(obj,prop,frames):
    for frame,value in frames:
        setattr(obj,prop,value)
        obj.keyframe_insert(data_path=prop,frame=frame)
    if obj.animation_data and obj.animation_data.action:
        try:
            for curve in obj.animation_data.action.fcurves:
                for key in curve.keyframe_points:key.interpolation="BEZIER"
        except AttributeError:pass

if SHOT in ("rolling","bounce"):
    room()
    if SHOT=="rolling":
        pivot,children=group_product((-.65,-.28,.115))
        # Distance 1.20m / radius .115m => 10.43rad angular rotation about the camera's lateral axis.
        frames=[(1,(-.65,-.28,.115)),(12,(-.51,-.28,.115)),(28,(-.20,-.28,.115)),
                (48,(.22,-.28,.115)),(65,(.49,-.28,.115)),(72,(.55,-.28,.115))]
        keys(pivot,"location",frames)
        for frame,pos in frames:
            travel=pos[0]-frames[0][1][0]
            pivot.rotation_euler=(0,travel/.115,0)
            pivot.keyframe_insert(data_path="rotation_euler",frame=frame)
        cam((-.07,-1.85,.42),(-.07,-.28,.14),30,6.0)
        # Camera deliberately static enough to preserve room parallax as orb moves.
    else:
        pivot,children=group_product((-.20,-.23,.115))
        # Smooth vertical trajectory with takeoff/landing; small secondary rebound.
        frames=[(1,(-.20,-.23,.115)),(12,(-.20,-.23,.115)),(20,(-.15,-.19,.43)),
                (30,(-.10,-.13,.76)),(39,(-.03,-.08,.83)),(49,(.07,-.01,.64)),
                (58,(.16,.04,.115)),(64,(.20,.05,.18)),(72,(.22,.05,.115))]
        keys(pivot,"location",frames)
        for f,angle in [(1,0),(12,0),(30,.14),(49,.21),(58,.30),(72,.31)]:
            pivot.rotation_euler=(angle,0,0)
            pivot.keyframe_insert(data_path="rotation_euler",frame=f)
        cam((1.13,-1.62,.69),(-.04,.04,.43),35,6)
    # Product contact shadow comes from real floor/area lights and ambient occlusion, no fake moving decal.
else:
    studio()
    pivot,children=group_product((0,0,.16),True)
    # Optical core stays nearly level as outer rings tilt and rotate.
    # Product shell is temporarily hidden only in this technical cutaway shot.
    # Otherwise the opaque titanium sphere would conceal all gyro mechanics.
    for o in children:
        if "gyro isolation ring" not in o.name and "Compute core" not in o.name:
            o.hide_render=True
    rings=[o for o in children if "gyro isolation ring" in o.name]
    core=[o for o in children if "Compute core" in o.name]
    for i,o in enumerate(rings):
        # Preserve original orientation and animate a separate local rotation axis.
        base=o.rotation_euler.copy()
        for f in (1,15,30,45,60):
            t=(f-1)/59
            o.rotation_euler=(base.x+(.40 if i%2 else -.35)*math.sin(t*math.pi*2),
                              base.y+(.50 if i%2 else -.45)*math.sin(t*math.pi*2+.6),
                              base.z+(1 if i%2 else -1)*t*1.5)
            o.keyframe_insert(data_path="rotation_euler",frame=f)
    # Expose the mechanism: move enclosure off-center while core stays stabilized.
    shell=[o for o in children if "enclosure" in o.name or "CNC shell seam" in o.name]
    for o in shell:
        for f in (1,15,30,45,60):
            t=(f-1)/59
            o.rotation_euler=(.17*math.sin(2*math.pi*t),0,.23*math.sin(2*math.pi*t))
            o.keyframe_insert(data_path="rotation_euler",frame=f)
    cam((.32,-.75,.31),(0,0,.16),68,5.5)
sc.camera.data.dof.aperture_fstop=6
sc.frame_set(1)
print("MOTION_SHOT",SHOT,"FRAMES",sc.frame_end,"OUTPUT",sc.render.filepath,flush=True)
bpy.ops.render.render(animation=True)
print("MOTION_DONE",SHOT,flush=True)
