# Original procedural Blender artwork — The Astral Garden
# Blender 5.2.3 LTS / no external assets
import bpy, math, random, os
from mathutils import Vector
from math import sin, cos, pi
random.seed(1105)

ROOT=r"C:\Users\i95i\mcp-workspace\blender-showcase"
os.makedirs(ROOT,exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
scene=bpy.context.scene

def material(name,col,metallic=0.0,rough=.52,glow=0.0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*col,1)
    bs.inputs['Metallic'].default_value=metallic
    bs.inputs['Roughness'].default_value=rough
    if glow:
        bs.inputs['Emission Color'].default_value=(*col,1)
        bs.inputs['Emission Strength'].default_value=glow
    return m
slate=[material('Faceted basalt %02d'%i,c,0.18,.66) for i,c in enumerate([(0.05,.12,.18),(.075,.16,.20),(.10,.20,.22),(.035,.085,.13),(.14,.19,.23)])]
moss=material('Deep jade velvet moss',(.055,.25,.19),.04,.94)
mossL=material('Sunlit emerald moss',(.13,.40,.25),0,.93)
gold=material('Brushed champagne gold',(.95,.60,.24),.68,.27)
goldlight=material('Warm gold emissive',(.95,.47,.15),.12,.30,3.0)
bark=material('Charcoal plum bark',(.13,.075,.14),.03,.77)
barkhi=material('Branch copper highlights',(.26,.13,.18),.1,.6)
pink=[material('Petals color %02d'%i,c,.05,.57,.32) for i,c in enumerate([
    (.96,.25,.46),(.96,.38,.56),(.95,.60,.71),(.74,.18,.37),(.97,.73,.74),(.90,.38,.67)])]
pink_light=material('Inner blossom luminosity',(1.0,.37,.53),0,.52,1.8)
water=material('Waterfall turquoise',(0.06,.75,.80),.05,.22,1.7)
water_bright=material('Waterfall liquid filaments',(.3,.97,.94),0,.28,4.0)
azure=material('Aether crystal',(0.09,.68,.90),.32,.13,1.2)
ice=material('Icy crystal highlights',(.48,.98,1.),.15,.19,2.5)
deep=material('Midnight teal mountains',(.045,.10,.17),.15,.7)
midpink=material('Peach glowing dust',(.97,.54,.65),.0,.35,4)
white=material('Tiny starlight',(.8,.94,1.),.0,.34,4)

def uv(name,loc,scale,mat,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name; o.scale=scale;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o
def ico(name,loc,r,mat,subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=r,location=loc)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
def curve(name,coords,mat,thick=.035,closed=False):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=18;cu.bevel_depth=thick;cu.bevel_resolution=3
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(coords)-1)
    for b,p in zip(sp.bezier_points,coords):
        b.co=p[:3];b.handle_left_type='AUTO';b.handle_right_type='AUTO'
        if len(p)>3:b.radius=p[3]
    sp.use_cyclic_u=closed
    ob=bpy.data.objects.new(name,cu);scene.collection.objects.link(ob);cu.materials.append(mat)
    return ob
def circle(name,center,r,mat,thick=.026,plane='xz',angle0=0,angle1=2*pi):
    pts=[]
    n=100
    for i in range(n+1):
        a=angle0+(angle1-angle0)*i/n
        if plane=='xz':pts.append((center[0]+r*cos(a),center[1],center[2]+r*sin(a)))
        else:pts.append((center[0]+r*cos(a),center[1]+r*sin(a),center[2]))
    return curve(name,pts,mat,thick)
def mesh(name,vertices,faces,mats,face_mat_idx=None):
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    for m in mats:me.materials.append(m)
    if face_mat_idx:
        for i,p in enumerate(me.polygons):p.material_index=face_mat_idx[i]
    return ob
def conic(name,location,up_radius,down_radius,depth,mat,verts=8):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=down_radius,radius2=up_radius,depth=depth,location=location)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
def light(name,loc,power,col,size,target):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=col;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()

# Floating island: 7 irregular sculpted rings, asymmetrical silhouette.
rings=[
(-2.45,.15),(-2.14,.46),(-1.71,.86),(-1.24,1.26),(-.74,1.87),(-.29,2.55),(-.10,2.75),(.03,2.60)]
verts=[];count=32
for k,(z,rad) in enumerate(rings):
    for j in range(count):
        a=j*2*pi/count
        uneven=1+.078*sin(5*a+k*.47)+.048*cos(11*a-1.1*k)+random.uniform(-.07,.07)
        rr=rad*uneven
        verts.append((rr*cos(a)*1.06,rr*sin(a)*.88,z+random.uniform(-.08,.08) if k not in (0,7) else z))
faces=[];ids=[]
for k in range(len(rings)-1):
    for j in range(count):
        jj=(j+1)%count
        faces.append((k*count+j,k*count+jj,(k+1)*count+jj,(k+1)*count+j))
        ids.append(random.randrange(len(slate)))
faces.extend([tuple(reversed(tuple(range(count)))),tuple((len(rings)-1)*count+j for j in range(count))]);ids.extend([0,2])
mesh('01  FLOATING ISLAND • hand faceted slate',verts,faces,slate,ids)
# top cushion moss organic grassy canopy
uv('02  Soft moss cap',(0,0,.005),(2.55,2.14,.18),moss,48,16)
uv('02a Warm uneven turf',(0,.15,.105),(2.31,1.92,.11),mossL,32,12)
# elevated edge gilded rim: subtle highlights along front
circle('02b Golden boundary inlaid',(0,0,.09),2.49,gold,.015,plane='xy',angle0=pi*.94,angle1=2*pi*1.96)
# little roots/stone facets descending
for j in range(30):
    a=random.uniform(0,2*pi);r=random.uniform(1.3,2.4)
    p=(r*cos(a),r*sin(a)*.85,-random.uniform(.37,1.2))
    o=ico('Hanging weathered stone',p,random.uniform(.11,.26),random.choice(slate),1)
    o.scale=(random.uniform(.7,1.4),random.uniform(.8,1.2),random.uniform(1.0,2.1))
# teal stream across the grass in S shape, tumbles over the cliff in front
curve('03  River: celestial stream',[(-.84,1.08,.25),(-.46,.45,.27),(.10,-.13,.28),(.44,-.93,.27),(.70,-2.06,.20),(.77,-2.42,.06)],water,.16)
curve('03a Turquoise reflection',[(-.84,1.07,.29),(-.35,.39,.30),(.15,-.12,.31),(.46,-.94,.31),(.7,-2.00,.24)],ice,.021)
for i in range(16):
    x=.68+(i-8)*.023
    path=[(x,-2.13,.20),(x+.08*sin(i*1.9),-2.43,-.44),(x+.04*sin(i),-2.25,-1.30),(x+.14*sin(i*1.3),-2.14,-2.25),(x+.1*sin(i*2),-2.09,-3.05)]
    curve('03b Light waterfall strand %02d'%i,path,water_bright if i%3==0 else water,.006+random.random()*.014)
for i in range(22):
    x=.66+random.uniform(-.25,.35)
    ico('03c Mist droplet', (x,-2.04+random.uniform(-.15,.08),random.uniform(-3.3,-1.45)),
        random.uniform(.009,.037),water_bright,1)

# Tree curls upwards, roots radiating around base
curve('04  Sacred plum tree • tapering trunk',[
    (-.17,.28,.19,1.28),(-.28,.30,.55,1.20),(-.05,.25,1.20,1.04),(.21,.23,1.78,.87),
    (.02,.17,2.36,.72),(-.18,.12,3.01,.53),(.01,.01,3.70,.28),(.10,.0,4.30,.10)],bark,.15)
for i in range(8):
    a=i*2*pi/8
    curve('04a Root vein %02d'%i,[
        (-.13,.18,.4,.68),(.33*cos(a),.32*sin(a)+.17,.19,.48),
        (.70*cos(a),.66*sin(a)+.08,.16,.12)],bark,.070)
# branching canopy architecture
clumps=[
(-1.64,.42,3.58,.62),(-1.10,-.64,3.92,.63),(-.45,.54,4.30,.69),
(.36,.08,4.52,.76),(1.1,-.32,3.89,.67),(1.66,.37,3.48,.55),
(1.36,.75,4.24,.60),(-1.28,.82,4.42,.62),(.38,-.74,3.92,.57),
(-.42,-1.02,3.64,.53),(.01,.95,4.75,.61),(1.88,-.03,4.05,.48),
(-1.95,-.22,3.83,.53)]
for i,(x,y,z,rad) in enumerate(clumps):
    anchor=(-.08,.19,2.15+.24*(i%3))
    mid=(x*.48,y*.50+.12,z-.35)
    end=(x,y,z)
    curve('04b Tree arm %02d'%i,[(*anchor,.85),(*mid,.58),(*end,.06)],barkhi if i%4==0 else bark,
          .047+rad*.025)
    for k in range(3):
        off=(x+random.uniform(-.35,.35),y+random.uniform(-.4,.4),z+random.uniform(-.16,.28))
        curve('04c Graceful twig',[(*mid,.36),(*off,.08)],bark,.018)
# cloud petals, subtle glow. Covering in painterly clusters.
for ci,(x,y,z,r) in enumerate(clumps):
    uv('05 Canopy underlight', (x,y,z),(.47*r,.4*r,.35*r),pink[(ci+3)%6],12,6)
    for i in range(36):
        a=random.uniform(0,2*pi);u=random.uniform(-1,1)
        rr=r*(random.random()**.38)
        xx=x+rr*math.sqrt(1-u*u)*math.cos(a)
        yy=y+rr*math.sqrt(1-u*u)*math.sin(a)*.70
        zz=z+rr*u*.75
        amt=random.uniform(.037,.110)
        o=ico('05 Pink sakura cluster', (xx,yy,zz),amt,
              pink_light if i%19==0 else random.choice(pink),1)
        o.scale=(1.22,1.02,.7)
# detailed recognizable flowers on the front of the canopy
for i in range(68):
    x,y,z,r=random.choice(clumps)
    xx=x+random.uniform(-r,r)
    zz=z+random.uniform(-r*.65,r*.65)
    yy=y-.36*r-random.uniform(.06,.33)
    base=(xx,yy,zz)
    for j in range(5):
        a=j*2*pi/5
        pet=uv('06 Five-petal sakura bloom',(base[0]+.055*cos(a),base[1]-.014,base[2]+.055*sin(a)),
          (.062,.023,.046),pink[(i+j)%6],10,6)
        pet.rotation_euler[1]=random.uniform(-.3,.3)
    ico('06 Golden pollen', (xx,yy-.03,zz),.025,goldlight,1)
# loose trailing petals drifting through air
for i in range(125):
    xx=random.uniform(-3.55,3.55);yy=random.uniform(-1.6,1.6)
    zz=random.uniform(-2.9,5.7)
    if random.random()<.35:xx*=1.4
    o=uv('07 Floating blossom petal',(xx,yy,zz),
        (.025+random.random()*.035,.010,.055+random.random()*.025),random.choice(pink),8,4)
    o.rotation_euler=(random.random()*pi,random.random()*pi,random.random()*pi)
# Tiny ground flowers and pebbles
for i in range(80):
    a=random.uniform(0,2*pi);rr=random.uniform(1.0,2.3)
    xx=rr*cos(a);yy=rr*sin(a)*.83
    if abs(xx-.6)<.38 and yy<-1.2:continue
    if i%3==0:
        ico('08 small shining floral seed',(xx,yy,.23),random.uniform(.018,.041),goldlight if i%7==0 else random.choice(pink),1)
    else:
        o=ico('08 stone or moss flower',(xx,yy,.20),random.uniform(.029,.09),moss if i%2 else slate[i%5],1)
        o.scale=(1.3,1.15,.42)

# A beautiful celestial aureole behind the tree (in XZ plane)
for idx,rad in enumerate((2.84,3.03,3.29)):
    circle('09 Aureole / precision gold band %d'%idx,(.03,1.58,2.44),rad,
       gold if idx!=1 else goldlight,.013 if idx!=1 else .018)
for i in range(20):
    a=2*pi*i/20
    rad=2.84
    x=rad*cos(a);z=2.44+rad*sin(a)
    ico('09a Ring gold celestial nodes',(x,1.54,z),.027,goldlight if i%4==0 else gold,1)
# micro celestial arcs
circle('09b Offset sacred orbit',(-.25,1.65,2.40),3.5,gold,.01,angle0=.08*pi,angle1=.79*pi)
circle('09c Displaced aether arc',(.15,1.62,2.55),3.53,water,.012,angle0=1.18*pi,angle1=1.75*pi)

# suspended glass crystals on delicate gold chains, three pendant lanterns
for i,(x,y,z) in enumerate([(-2.43,-.42,1.55),(2.28,-.31,2.15),(2.70,.43,3.43)]):
    curve('10 Pendant suspended chain',[(x,y,z+.71),(x+.08,y,z+.43),(x,y,z+.26)],gold,.008)
    ico('10 Lantern crystal heart',(x,y,z),.14,ice if i%2 else goldlight,1)
    # four tapered top/bottom points like faceted prisms
    for d in (1,-1):
        conic('10 Faceted pendant cap',(x,y,z+d*.16),.0,.12,.22,azure if i!=1 else gold,6)
    ico('10 Halo glass rim',(x,y,z),.20,water,1)
# large floating crystal formations on right-side edge
for i,(x,y,z,h) in enumerate([(1.65,.70,.35,.95),(2.12,.46,.29,.60),(-2.01,.86,.23,.46)]):
    conic('11 Prismatic aether obelisk',(x,y,z+h*.43),.0,.19,h,azure if i==0 else ice,5)
    ico('11 Obelisk gem tip',(x,y,z+h),.065,white,1)

# golden and cyan sparks falling in orbit around the island
for i in range(95):
    theta=random.uniform(0,2*pi)
    rr=random.uniform(2.7,4.5)
    x=rr*cos(theta);y=rr*sin(theta)*.57
    z=random.uniform(-2.8,5.8)
    ob=ico('12 Celestial spark', (x,y,z),random.uniform(.012,.05),
           goldlight if i%4 else ice,1)
    if i%7==0:ob.scale=(.55,.55,2.1)

# Backdrop: dark blue endless studio floor with a broad subtle pool of light
floor=material('Infinite royal-night background',(.012,.024,.066),.04,.9)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-7.4))
bpy.context.object.name='13 Infinite midnight studio';bpy.context.object.data.materials.append(floor)
world=bpy.data.worlds.new('Nebula-blue ambient world');scene.world=world;world.use_nodes=True
bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.025,.046,.085,1);bg.inputs['Strength'].default_value=.30

light('KEY warm dawn / huge softbox',(2,-5,8),1200,(1.,.66,.49),8,(0,0,1.5))
light('RIM icy blue / silhouettes',(-4,4,5),1700,(.20,.83,1.),6,(0,0,1.7))
light('FILL rose golden bloom',(-2,-2,4),750,(1.,.33,.53),5,(0,0,2))
light('FOOT / floating island glow',(0,-2,-1.8),280,(.15,.85,1.),4,(0,0,-1))

# Eye-level hero composition; camera faces the front waterfall.
bpy.ops.object.camera_add(location=(8.5,-15.7,8.1))
cam=bpy.context.object;cam.name='CAMERA • cinema hero shot'
target=Vector((0,0,1.05));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=11.9;scene.camera=cam

scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=30
scene.cycles.use_denoising=True
scene.render.resolution_x=1200
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.render.filepath=os.path.join(ROOT,'astral-garden-final.png')
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
# Blender 5.2 removed Scene.node_tree; keep rendering independent of legacy nodes.
# Emissive materials and area lights provide actual physical lighting in the saved scene.
# Frame the authored camera in interactive Blender if a GUI screen is present.
if bpy.context.screen is not None:
    for a in bpy.context.screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'astral-garden.blend'))
print("SCENE_READY objects=%d materials=%d camera=%s"%(len(bpy.data.objects),len(bpy.data.materials),cam.name),flush=True)
bpy.ops.render.render(write_still=True)
print("RENDER_COMPLETE "+scene.render.filepath,flush=True)
