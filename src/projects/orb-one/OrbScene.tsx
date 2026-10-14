import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame,interpolate} from 'remotion';
import {Canvas} from '@react-three/fiber';
import * as THREE from 'three';
const mat=(color:string,metalness=0,roughness=.3)=>({color,metalness,roughness});
const Orb:React.FC<{frame:number;mode:string}>=({frame,mode})=>{
 const spin=mode==='roll'?frame*.045:frame*.007;
 const lift=mode==='jump'?Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,(frame-624)/120))),2)*2.1:0;
 return <group position={[mode==='roll'?Math.sin(frame/40)*1.5:0,-.1+lift,0]} rotation={[0,spin*.55,spin*.28]}>
 <mesh castShadow><sphereGeometry args={[1.55,64,64]}/><meshPhysicalMaterial {...mat('#879da8',.82,.19)} clearcoat={1} clearcoatRoughness={.08}/></mesh>
 <mesh scale={[1.014,1.014,1.014]}><sphereGeometry args={[1.55,64,64]}/><meshPhysicalMaterial color="#d9edf6" transparent opacity={.1} metalness={.6} roughness={.08}/></mesh>
 <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[1.53,.018,12,128]}/><meshStandardMaterial color="#e0f7ff" metalness={.9} roughness={.17}/></mesh>
 <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.53,.014,12,128]}/><meshStandardMaterial color="#3d667a" metalness={.9} roughness={.18}/></mesh>
 <group position={[0,0,1.47]}>
 <mesh><cylinderGeometry args={[.51,.51,.16,64]}/><meshStandardMaterial color="#132a39" metalness={.8} roughness={.24}/></mesh>
 <mesh position={[0,0,.09]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.37,.045,16,64]}/><meshStandardMaterial color="#c2e8f3" metalness={.95} roughness={.13}/></mesh>
 <mesh position={[0,0,.13]}><sphereGeometry args={[.27,48,48]}/><meshPhysicalMaterial color="#05101a" metalness={.45} roughness={.08} clearcoat={1}/></mesh>
 <mesh position={[-.08,.08,.32]}><sphereGeometry args={[.045,20,20]}/><meshBasicMaterial color="#c9ffff"/></mesh>
 </group>
 </group>;
};
export const OrbScene:React.FC<{mode:string}>=({mode})=>{
 const f=useCurrentFrame();
 return <ThreeCanvas width={1920} height={1080} style={{position:'absolute',inset:0}} camera={{position:[0,2.6,8.8],fov:38,near:.1,far:100}} gl={{antialias:true,alpha:true}}>
 <ambientLight intensity={.75} color="#b8d9f1"/>
 <directionalLight position={[-4,7,6]} intensity={4.2} color="#ffffff"/>
 <directionalLight position={[4,2,-5]} intensity={5} color="#7bdfff"/>
 <spotLight position={[0,8,1]} intensity={110} angle={.6} penumbra={1} color="#ffffff"/>
 <Orb frame={f} mode={mode}/>
 <mesh position={[0,-1.85,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color={mode==='home'?'#5a514b':'#111d28'} roughness={.55} metalness={.12}/></mesh>
 {mode==='home'&&<group>
 <mesh position={[-3,-.8,-2]}><boxGeometry args={[2.6,1.5,1.2]}/><meshStandardMaterial color="#b9aaa1" roughness={.86}/></mesh>
 <mesh position={[-3,-.15,-1.5]}><boxGeometry args={[2.8,.22,1.35]}/><meshStandardMaterial color="#e0d3c9" roughness={.9}/></mesh>
 <mesh position={[3,-1.2,-2]}><boxGeometry args={[2.3,.18,1.2]}/><meshStandardMaterial color="#8a705e" roughness={.6}/></mesh>
 <mesh position={[2.2,-1.65,-2]}><boxGeometry args={[.13,.8,.13]}/><meshStandardMaterial color="#4b3b32" metalness={.35}/></mesh>
 <mesh position={[3.8,-1.65,-2]}><boxGeometry args={[.13,.8,.13]}/><meshStandardMaterial color="#4b3b32" metalness={.35}/></mesh>
 </group>}
 </ThreeCanvas>;
};
