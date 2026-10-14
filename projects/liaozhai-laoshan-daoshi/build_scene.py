import bpy, math, random, os, sys
from mathutils import Vector
R=random.Random(23)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
s=bpy.context.scene
s.render.engine='BLENDER_EEVEE'
s.render.resolution_x=960; s.render.resolution_y=540; s.render.resolution_percentage=100
s.render.fps=8; s.frame_start=1; s.frame_end=480
s.render.image_settings.file_format='PNG'; s.render.image_settings.color_mode='RGB'
s.render.filepath=os.path.abspath('public/liaozhai-laoshan-daoshi/3d/frames/frame_')
s.view_settings.view_transform='AgX'
s.world.color=(.018,.023,.04)
s.world.use_nodes=True
s.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.012,.020,.033,1)
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.6
def mat(n,c,met=0,rough=.85,glow=0):
 m=bpy.data.materials.new(n);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=met;p.inputs['Roughness'].default_value=rough
 if glow:
  p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=glow
 else:
  t=m.node_tree.nodes.new('ShaderNodeTexNoise');t.inputs['Scale'].default_value=36
  b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.13;b.inputs['Distance'].default_value=.07
  m.node_tree.links.new(t.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
 return m
rock=mat('slate',(0.07,.09,.1));stone=mat('weathered moss stone',(.17,.18,.14))
wood=mat('burnt oak',(.095,.043,.025));roof=mat('wet ink tiles',(.017,.032,.045))
red=mat('vermilion silk',(.55,.018,.013));bronze=mat('bronze',(.4,.24,.07),.5,.35)
cloth=mat('worn blue grey robe',(.16,.18,.2));ivory=mat('Daoist linen',(.66,.56,.43))
skin=mat('skin',(.5,.29,.2));black=mat('hair black',(.011,.014,.019))
pine=mat('pine needles',(.019,.057,.048));white=mat('phantom robe',(.46,.6,.67),0,.7,.18)
paper=mat('paper moon moonlight',(.7,.85,1),0,.6,.01)
def cube(n,p,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 mod=o.modifiers.new('chipped stone / wood edges','BEVEL');mod.width=.048;mod.segments=2
 o.modifiers.new('smooth corner normals','WEIGHTED_NORMAL')
 return o
def cone(n,p,ra,rb,h,m):
 bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=ra,radius2=rb,depth=h,location=p);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o
def cyl(n,p,r,h,m,verts=20,rx=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=p);o=bpy.context.object;o.name=n;o.rotation_euler[0]=rx;o.data.materials.append(m);return o
def ball(n,p,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=12,location=p);o=bpy.context.object;o.name=n;o.scale=scale;o.data.materials.append(m);bpy.ops.object.shade_smooth();return o
def light(n,p,e,col,size=5):
 d=bpy.data.lights.new(n,'AREA');d.energy=e;d.shape='DISK';d.size=size;d.color=col
 o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=p;return o
def actor(n,p,robe=cloth):
 root=bpy.data.objects.new(n+' MAIN MOTION',None);bpy.context.collection.objects.link(root);root.location=p
 elements=[cone(n+' pleated robe',(0,0,.82),.48,.28,1.55,robe),
 ball(n+' face',(0,-.05,1.78),(.23,.22,.29),skin),ball(n+' hair',(0,.04,2.02),(.22,.22,.16),black),cyl(n+' waist',(0,0,1.05),.31,.12,bronze)]
 for dx in [-.43,.43]:
  sl=cone(n+' draped sleeve',(dx,0,1.30),.23,.08,.63,robe);sl.rotation_euler[1]=dx*.9;elements.append(sl)
 for o in elements:o.parent=root
 return root
def tree(x,y,z=0,h=4):
 cyl('rough pine trunk',(x,y,z+h*.36),.11,h*.7,wood)
 for k in range(3):
  cone('dense pine crown',(x,y,z+h*(.49+k*.16)),h*(.21-k*.025),.025,h*.49,pine)
def master_gate(x):
 for dx in [-2.6,2.6]:cyl('painted gate post',(x+dx,0,2.3),.2,4.6,red)
 cube('gate ornate lintel',(x,0,4.55),(6.4,.7,.5),red)
 cube('gate blue tile roof',(x,0,5.06),(7,2,.25),roof)
# Mountain hillside
cube('basalt base',(0,0,-.55),(44,48,.45),rock)
for i in range(65):
 x=R.uniform(-20,20); y=R.uniform(-4,22)
 if abs(x)<4 and y<8:continue
 tree(x,y,0,R.uniform(2.5,5.9))
for i in range(13):
 cube('ancient mountain steps',(0,-10+i*.8,.19+i*.15),(4.5,.77,.43),stone)
master_gate(0)
light('mountain pale dawn',(-6,-2,13),1400,(.48,.68,1),10)
# Forest chopping site
cube('pine logging clearing',(21,0,-.4),(24,25,.36),rock)
for i in range(33):
 x=21+R.uniform(-11,11);y=R.uniform(-11,11)
 if abs(x-21)<3 and abs(y+2)<3:continue
 tree(x,y,0,R.uniform(3,5))
for i in range(5):
 o=cyl('lumber log',(19+i*.46,-1+i*.32,.21),.22,1.8,wood);o.rotation_euler[1]=math.pi/2
light('logging cold smoke',(19,-5,8),900,(.72,.86,1),6)
# Daoist temple hall
C=45
cube('temple stone courtyard',(C,0,-.40),(23,22,.66),rock)
cube('rear temple plaster wall',(C,6,3.45),(20,.85,7),stone)
for x in [-9,-4.5,0,4.5,9]:
 cyl('giant lacquer pillar',(C+x,-5,3.85),.32,7.7,red)
 cyl('ancient pillar bronze collars',(C+x,-5,.47),.40,.47,bronze)
cube('gold carved lintel',(C,-5,7.45),(19,.65,.7),wood)
for dy,angle in [(-2.9,.23),(2.9,-.23)]:
 o=cube('sweeping old roof eave',(C,dy,8.4),(22,6.0,.35),roof);o.rotation_euler[0]=angle
cube('roofline',(C,0,9.4),(24,.8,.6),roof)
for side in [-1,1]:
 cube('red hanging stage curtain',(C+side*8.2,-5,5.1),(1.1,.08,4.6),red)
 cyl('red silk lantern',(C+side*5.7,-4.4,5.5),.45,1.0,red)
 light('warm lantern'+str(side),(C+side*5.7,-5,5.1),210,(1,.39,.13),4)
cube('worn wooden banquet table',(C,2,1.1),(5.5,2,.25),wood)
for x in [-1.9,-.7,.7,1.9]:
 cyl('earthenware cup',(C+x,2,1.34),.2,.34,bronze)
light('warm hall principal',(C-4,-2,5.5),500,(1,.54,.28),5)
light('hall atmospheric cold',(C+5,-5,9),850,(.36,.55,1),7)
# wall passage scene (side-on)
cube('magic courtyard base',(73,0,-.42),(21,24,.72),rock)
cube('the tested solid wall',(77,0,3),(1.1,19,6.0),stone)
for y in range(-8,9,2):
 cube('wall seam',(76.43,y,2.7),(.02,.06,5.2),rock)
light('magic wall edge light',(71,-3,9),850,(.43,.68,1),6)
# home compound
H=104
cube('home flagstone',(H,0,-.43),(22,21,.74),stone)
cube('home unyielding wall',(H+5.5,0,3),(1.15,19,6),stone)
for z in [1.1,2.4,3.7,5.0]:
 cube('home coursing mortar',(H+4.9,0,z),(.03,17,.045),rock)
for dx in [-7,2]:
 cyl('home timber post',(H+dx,6,3),.28,6,red)
cube('home veranda lintel',(H-2.5,6,6),(11,.7,.75),wood)
for yy in [-5.5,5.5]:
 cyl('home vermilion lantern',(H+1,yy,4.8),.40,.9,red)
 light('home red-gold haze'+str(yy),(H,yy,5.5),230,(1,.32,.12),4)
light('home shadow fill',(H,-7,10),800,(.35,.53,1),7)
# always-visible actors are physically staged in separate distant sets
wm=actor('Wang arrives',(0,-12,.4))
wf=actor('Wang woodcutter',(21,-3,.32))
wh=actor('Wang observes banquet',(C-5,-2,.36))
master=actor('white-haired master',(C,3,.36),ivory)
guest=actor('banquet visitor',(C+3,2,.36),red)
dancer=actor('moon dancer',(C+1,0,.4),white)
ww=actor('Wang traverses wall',(73,-2,.32))
mw=actor('Daoist teaches beside wall',(73,3,.32),ivory)
home=actor('Wang returns boasting',(H-4,-2,.32))
wife=actor('Wang wife',(H-2,3,.32),red)
def motion(o,locs):
 for f,p in locs:o.location=p;o.keyframe_insert(data_path='location',frame=f)
motion(wm,[(1,(0,-12,.4)),(56,(0,-1,.4))])
motion(wf,[(57,(21,-3,.32)),(112,(22,-2,.32))])
for f,a in [(57,0),(66,.32),(72,0),(83,.33),(89,0),(105,.34),(112,0)]:
 wf.rotation_euler[0]=a;wf.keyframe_insert(data_path='rotation_euler',frame=f)
motion(wh,[(113,(C-5,-2,.36)),(312,(C-4,-1,.36))])
motion(dancer,[(193,(C+1,0,.4)),(248,(C-1,0,.4))])
for f,z in [(1,.001),(192,.001),(199,.06),(219,1),(248,1),(249,.001)]:
 dancer.scale=(z,z,z);dancer.keyframe_insert(data_path='scale',frame=f)
for f,a in [(193,0),(220,1.8),(248,4.2)]:
 dancer.rotation_euler[2]=a;dancer.keyframe_insert(data_path='rotation_euler',frame=f)
motion(ww,[(313,(73,-2,.32)),(329,(74,-2,.32)),(350,(80,-2,.32)),(360,(81,-2,.32))])
motion(home,[(361,(H-5,-2,.32)),(425,(H-5,-2,.32)),(445,(H+4.6,-2,.32)),(457,(H+3.1,-2,.32)),(480,(H+1,-2,.32))])
for f,a in [(361,0),(442,0),(451,.3),(456,1.1),(473,1.3),(480,1.3)]:
 home.rotation_euler[1]=a;home.keyframe_insert(data_path='rotation_euler',frame=f)
# Paper moon: physical luminous disk fixed to wall at x=C, y=5.52
moon=cyl('PAPER MOON on wall',(C,5.52,5.45),1.38,.04,paper,verts=48,rx=math.pi/2)
p=paper.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength']
for f,x in [(1,.01),(112,.01),(131,2),(157,4),(249,4),(271,.04),(480,.04)]:
 p.default_value=x;p.keyframe_insert(data_path='default_value',frame=f)
moonlight=light('moon illumination physically changes room',(C,2.5,6.5),0,(.52,.73,1),3)
moonlight.rotation_euler[0]=math.pi/2
for f,x in [(1,0),(112,0),(132,500),(155,1200),(250,1200),(276,0),(480,0)]:
 moonlight.data.energy=x;moonlight.data.keyframe_insert(data_path='energy',frame=f)
# cinematic camera: position keys ensure true perspective movement, no pan on still
d=bpy.data.cameras.new('cinema lens');cam=bpy.data.objects.new('director camera',d);bpy.context.collection.objects.link(cam);s.camera=cam
d.lens=45
def camera(f,point,target,lens):
 cam.location=point;cam.rotation_euler=(Vector(target)-Vector(point)).to_track_quat('-Z','Y').to_euler()
 cam.keyframe_insert(data_path='location',frame=f);cam.keyframe_insert(data_path='rotation_euler',frame=f)
 d.lens=lens;d.keyframe_insert(data_path='lens',frame=f)
cuts=[
 (1,56, (6,-27,11),(8,-17,9),(0,0,3),(0,0,3),34),
 (57,112,(24,-17,6),(22,-10,5),(21,-1,1.5),(21,-1,1.6),54),
 (113,192,(C+2,-21,7),(C+1,-13,5.5),(C,3,5),(C,4,5.5),39),
 (193,248,(C+5,-16,6),(C+2,-11,4.5),(C,0,3),(C,1,3),59),
 (249,312,(C-4,-13,5),(C-2,-10,4),(C,1,2.5),(C,1.5,2.5),60),
 (313,360,(78,-15,5.6),(79,-11,5.1),(77,-1,2.7),(77,-1,2.7),45),
 (361,424,(H-2,-18,6),(H+1,-14,4.9),(H,0,2.7),(H+2,0,2.5),42),
 (425,480,(H+4,-12,4.8),(H+5,-8,4.5),(H+4,0,2.7),(H+5,0,2.7),55),
]
for st,en,ps,pe,ts,te,lens in cuts:
 camera(st,ps,ts,lens);camera(en,pe,te,lens)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('projects/liaozhai-laoshan-daoshi/laoshan_scene.blend'))
if '--test' in sys.argv:
 s.frame_set(152);s.render.filepath=os.path.abspath('projects/liaozhai-laoshan-daoshi/preview-paper-moon.png')
 bpy.ops.render.render(write_still=True)
print('READY',s.render.engine,s.frame_start,s.frame_end)
