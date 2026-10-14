import bpy, math, os, sys, random
from mathutils import Vector
random.seed(13)
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
SHOT=args[0] if args else "hero"
QUALITY=args[1] if len(args)>1 else "preview"
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"../../.."))
ASSETS=os.path.join(ROOT,"public/orb-one-directors-cut")
OUT=os.path.join(ASSETS,"frames")
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene
sc.render.engine="BLENDER_EEVEE"
sc.render.resolution_x=1280 if QUALITY=="final" else 960
sc.render.resolution_y=720 if QUALITY=="final" else 540
sc.render.resolution_percentage=100
sc.render.image_settings.file_format="PNG"
sc.render.filepath=os.path.join(OUT,SHOT+".png")
try:
 sc.view_settings.view_transform="AgX";sc.view_settings.look="AgX - Medium High Contrast"
except:pass
def rgba(h):return tuple(int(h[i:i+2],16)/255 for i in (1,3,5))+(1,)
def mat(name,h,metal=0,rough=.5,coat=0,noise=0):
 m=bpy.data.materials.new(name);m.diffuse_color=rgba(h);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=rgba(h)
 p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if coat:
  p.inputs["Coat Weight"].default_value=coat;p.inputs["Coat Roughness"].default_value=.11
 if noise:
  n=m.node_tree.nodes.new("ShaderNodeTexNoise");n.inputs["Scale"].default_value=270
  b=m.node_tree.nodes.new("ShaderNodeBump");b.inputs["Distance"].default_value=.0001
  b.inputs["Strength"].default_value=noise
  l=m.node_tree.links;l.new(n.outputs["Fac"],b.inputs["Height"]);l.new(b.outputs["Normal"],p.inputs["Normal"])
 return m
metal=mat("Satin pearlescent titanium #AEBDC7","#ADBAC4",.72,.22,.85,.06)
gun=mat("Precision graphite aluminum","#242A30",.87,.24,.55,.08)
optical=mat("Deep optical glass","#08121D",.55,.07,.98)
chrome=mat("Micro-chamfer polished steel","#D7E3E8",.92,.14,.9)
status=mat("Status LED light cyan","#6DCEDB",.1,.22)
walnut=mat("Oiled walnut","#715440",.08,.44,.1)
linen=mat("Woven boucle textile","#A8A298",0,.93,0,.38)
sand=mat("Interior limewash","#D6CFC2",0,.94)
ground=mat("Charcoal studio floor","#171B20",.45,.28)
leaf=mat("Natural green foliage","#416147",0,.8)
ink=mat("Eyeglass graphite","#282A2B",.72,.25)
def sphere(name,loc,r,m,scale=None,seg=64):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=32,radius=r,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(m)
 if scale:o.scale=scale
 for face in o.data.polygons:face.use_smooth=True
 return o
def cylinder(name,loc,r,depth,m,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc,rotation=rotation)
 o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def torus(name,loc,r,thick,m,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=12,major_radius=r,minor_radius=thick,location=loc,rotation=rotation)
 o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
def cube(name,loc,dim,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name
 o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new("Real manufactured edge radius","BEVEL");mod.width=bevel;mod.segments=4
  o.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
 return o
def bar(name,a,b,r,m):
 aa,bb=Vector(a),Vector(b);o=cylinder(name,(aa+bb)/2,r,(bb-aa).length,m)
 o.rotation_euler=(bb-aa).to_track_quat("Z","Y").to_euler();return o
def point(o,target):
 o.rotation_euler=(Vector(target)-o.location).to_track_quat("-Z","Y").to_euler()
def cam(loc,target,lens=60,fstop=3.5):
 bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name="Cinema camera 36mm sensor"
 point(o,target);o.data.lens=lens;o.data.sensor_width=36
 o.data.dof.use_dof=True;o.data.dof.focus_distance=(Vector(target)-o.location).length
 o.data.dof.aperture_fstop=fstop;sc.camera=o;return o
def light(name,loc,power,dim,color,target,rect=False):
 bpy.ops.object.light_add(type="AREA",location=loc);o=bpy.context.object;o.name=name
 o.data.energy=power;o.data.color=color
 o.data.shape="RECTANGLE" if rect else "DISK";o.data.size=dim
 if rect:o.data.size_y=dim*1.6
 point(o,target);return o
def env(kind,power=.6):
 world=bpy.data.worlds.new(kind);world.use_nodes=True;n=world.node_tree.nodes;n.clear();l=world.node_tree.links
 texture=n.new("ShaderNodeTexEnvironment")
 texture.image=bpy.data.images.load(os.path.join(ASSETS,"hdri",kind+"_1k.hdr"),check_existing=True)
 back=n.new("ShaderNodeBackground");back.inputs["Strength"].default_value=power
 end=n.new("ShaderNodeOutputWorld")
 l.new(texture.outputs["Color"],back.inputs["Color"]);l.new(back.outputs["Background"],end.inputs["Surface"])
 sc.world=world
def orb(pos,cut=False):
 x,y,z=pos;r=.115;sphere("ORB ONE | satin titanium enclosure",pos,r,metal,seg=96)
 for h in [-.006,.006]:torus("CNC shell seam",(x,y,z+h),math.sqrt(r*r-h*h),.0008,gun)
 torus("Polished part line",pos,r,.0007,chrome)
 face=y-r
 cylinder("Precision lens housing",(x,face-.002,z),.039,.008,gun,(math.pi/2,0,0))
 cylinder("Deep recess",(x,face-.006,z),.031,.004,gun,(math.pi/2,0,0))
 for R,t,m in [(.036,.0015,chrome),(.029,.001,metal),(.026,.0008,chrome)]:
  torus("Concentric lens trim",(x,face-.01,z),R,t,m,(math.pi/2,0,0))
 sphere("Convex optical glass",(x,face-.012,z),.024,optical,scale=(1,.24,1),seg=96)
 cylinder("Iris aperture",(x,face-.019,z),.009,.0009,gun,(math.pi/2,0,0))
 sphere("Reflective glass glint",(x-.007,face-.02,z+.008),.002,status,scale=(1,.2,1),seg=24)
 for xx,zz in [(-.065,-.028),(.065,-.028),(-.065,.03),(.065,.03)]:
  yy=y-math.sqrt(max(.0001,r*r-xx*xx-zz*zz))-.001
  sphere("Micro sensor",(x+xx,yy,z+zz),.003,gun,seg=16)
 for xx in [-.013,0,.013]:
  zz=.082;yy=y-math.sqrt(r*r-zz*zz-xx*xx)-.002
  sphere("Indicator diode",(x+xx,yy,z+zz),.002,status,seg=16)
 if cut:
  for R,rot in [(.08,(0,0,0)),(.065,(math.pi/2,0,0)),(.047,(0,math.pi/2,0))]:
   torus("Mechanical gyro isolation ring",pos,R,.0028,chrome,rot)
  sphere("Compute core",pos,.029,gun)
def studio():
 sc.view_settings.exposure=-.5
 env("studio_small_03",.65)
 cube("Neutral charcoal infinity studio",(0,0,-.045),(5,5,.09),ground,.005)
 cube("Seamless background",(0,1.7,.8),(5,.06,3),ground)
 cylinder("Black anodized display pedestal",(0,0,.022),.25,.045,gun)
 light("Key 6x4ft silk",(-.7,-.5,.9),100,.85,(1,1,1),(0,0,.17),True)
 light("Blue polished edge",(.6,.33,.73),145,.5,(.7,.86,1),(0,0,.15),True)
 light("Back 4x4 bounce",(0,.5,.75),105,.8,(1,1,1),(0,0,.17))
 light("front bounce",(0,-.8,.49),30,.5,(1,.89,.78),(0,0,.17))
def glasses():
 for xx in [-.072,.072]:
  pts=[]
  for i in range(33):
   a=2*math.pi*i/32;pts.append((xx+.055*math.cos(a),.6+.038*math.sin(a),.036))
  for a,b in zip(pts,pts[1:]):bar("Eyeglass metal loop",a,b,.0018,ink)
 bar("Eyeglass center bridge",(-.017,.6,.036),(.017,.6,.036),.003,ink)
 bar("Eyeglass folded arm left",(-.13,.6,.036),(-.18,.40,.05),.0025,ink)
 bar("Eyeglass folded arm right",(.13,.6,.036),(.18,.40,.05),.0025,ink)
def room():
 sc.view_settings.exposure=-.7
 env("lebombo",.35)
 floor=mat("Oil-finished oak parquet","#846C50",0,.56,noise=.17)
 nodes=floor.node_tree.nodes;links=floor.node_tree.links
 wave=nodes.new("ShaderNodeTexWave");wave.wave_type="BANDS";wave.bands_direction="X"
 wave.inputs["Scale"].default_value=18;wave.inputs["Distortion"].default_value=1.7
 ramp=nodes.new("ShaderNodeValToRGB")
 ramp.color_ramp.elements[0].color=(.41,.33,.25,1)
 ramp.color_ramp.elements[1].color=(.45,.36,.29,1)
 links.new(wave.outputs["Color"],ramp.inputs["Fac"])
 links.new(ramp.outputs["Color"],nodes.get("Principled BSDF").inputs["Base Color"])
 cube("Oak floor",(0,.7,-.05),(8,9,.1),floor,.004)
 cube("Natural plaster backwall",(0,3.5,1.5),(8,.1,3),sand)
 cube("Large window wall",(-3.2,0,1.5),(.1,8,3),sand)
 cube("Curtained diffuse daylight",(-3.12,.2,1.83),(.05,2,2.3),mat("Curtain linen","#D7D7CF",0,.87))
 for i in [-.75,0,.75]:cube("Window frame",(-3.05,i+.2,1.83),(.045,.025,2.3),gun)
 light("Late morning window bounce",(-2.2,-.15,2.45),720,2.0,(1,.86,.72),(0,0,.2),True)
 light("Room fill over shoulder",(1.6,-1.2,2.5),270,2,(.78,.87,1),(0,.8,.2),True)
 cube("Boucle sofa base",(-.85,2,.27),(2.65,1,.34),linen,.10)
 cube("Cushioned sofa back",(-.85,2.51,.6),(2.65,.3,.7),linen,.1)
 for xx in [-2.1,.38]:cube("Sofa armrest",(xx,2,.48),(.32,1,.62),linen,.09)
 for xx in [-1.65,-.85,-.04]:cube("Sofa seat pillow",(xx,1.88,.52),(.76,.86,.2),linen,.07)
 for xx in [-1.58,-.2]:
  o=cube("Throw pillow",(xx,2.23,.77),(.49,.14,.5),sand,.06);o.rotation_euler[1]=.24
 cylinder("Solid walnut coffee table",(1.44,1.12,.44),.57,.07,walnut)
 for xx,yy in [(1.12,.8),(1.74,.8),(1.12,1.44),(1.74,1.44)]:
  bar("Brushed steel table legs",(xx,yy,.03),(xx,yy,.4),.015,gun)
 bar("Reading lamp stem",(2.6,2.54,.04),(2.6,2.54,1.23),.015,chrome)
 cylinder("Warm linen lamp shade",(2.6,2.54,1.34),.25,.2,sand)
 cylinder("Reading lamp foot",(2.6,2.54,.025),.19,.05,gun)
 cylinder("Ceramic plant pot",(2.2,3.04,.23),.19,.44,sand)
 for i in range(19):
  a=i*2.4;R=.15+random.random()*.15
  o=sphere("Single realistic leaf",(2.2+R*math.cos(a),3.04+R*math.sin(a),.53+random.random()*.67),.09,leaf,scale=(.55,.24,1),seg=20)
  o.rotation_euler=(random.random()*.5,random.random()*.8,a)
 light("Table lamp practical",(2.28,2.06,1.6),110,.9,(1,.75,.59),(1.0,1.4,.2))

def contact_shadow(x,y):
 m=bpy.data.materials.new("Photographic soft ambient occlusion");m.use_nodes=True
 n=m.node_tree.nodes;n.clear();l=m.node_tree.links
 uv=n.new("ShaderNodeTexCoord")
 sub=n.new("ShaderNodeVectorMath");sub.operation="SUBTRACT";sub.inputs[1].default_value=(.5,.5,0)
 l.new(uv.outputs["UV"],sub.inputs[0])
 dist=n.new("ShaderNodeVectorMath");dist.operation="LENGTH";l.new(sub.outputs["Vector"],dist.inputs[0])
 ramp=n.new("ShaderNodeValToRGB")
 ramp.color_ramp.elements[0].color=(.7,.7,.7,1)
 ramp.color_ramp.elements[1].position=.48;ramp.color_ramp.elements[1].color=(0,0,0,1)
 l.new(dist.outputs["Value"],ramp.inputs[0])
 trans=n.new("ShaderNodeBsdfTransparent")
 darkness=n.new("ShaderNodeBsdfDiffuse");darkness.inputs["Color"].default_value=(.03,.025,.022,1)
 mix=n.new("ShaderNodeMixShader")
 l.new(ramp.outputs["Color"],mix.inputs[0])
 l.new(trans.outputs[0],mix.inputs[1]);l.new(darkness.outputs[0],mix.inputs[2])
 out=n.new("ShaderNodeOutputMaterial");l.new(mix.outputs[0],out.inputs["Surface"])
 bpy.ops.mesh.primitive_plane_add(size=1,location=(x,y,.002))
 o=bpy.context.object;o.name="Contact AO footprint";o.scale=(.63,.47,1);o.data.materials.append(m)

if SHOT in ['hero','macro','end','cutaway']:
 studio();orb((0,0,.16),SHOT=='cutaway')
 if SHOT=='macro':cam((.10,-.39,.235),(0,-.10,.165),89,4.1)
 elif SHOT=='end':cam((.31,-.79,.29),(0,0,.16),73,4)
 elif SHOT=='cutaway':cam((.28,-.62,.30),(0,0,.16),66,5)
 else:cam((.39,-.91,.38),(0,0,.16),66,4)
else:
 room()
 if SHOT=='rolling':
  contact_shadow(-.14,-.05)
  orb((-.14,-.05,.115));cam((1,-1.32,.35),(-.18,.24,.16),48,3.5)
 elif SHOT=='under':
  contact_shadow(-.77,1.14)
  orb((-.77,1.14,.115));cam((.48,-.8,.21),(-.77,1.2,.12),49,3.9)
 elif SHOT=='jump':
  orb((-.14,-.18,.72));cam((1.3,-1.48,.49),(-.14,.06,.69),56,3.7)
 elif SHOT=='scan':
  contact_shadow(-.27,-.04)
  orb((-.27,-.04,.115));cam((1.25,-1.3,1.48),(0,.2,.14),47,4)
 elif SHOT=='found':
  contact_shadow(-.29,-.08)
  orb((-.29,-.08,.115));glasses()
  cam((.50,-.79,.22),(.035,.42,.056),69,3.8)
 else:
  orb((0,0,.115));cam((1.2,-1.2,.44),(0,.1,.115),52,3.5)
print('BLENDER_SHOT',SHOT,sc.render.filepath,flush=True)
bpy.ops.render.render(write_still=True)
print('BLENDER_DONE',SHOT,flush=True)
