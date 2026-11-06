// Prestige GP: Absolute Chaos — original Three.js street-circuit GT simulation.
// All geometry is procedural; Three.js (MIT) is vendored in ./vendor.
import * as THREE from 'three';
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();const FOG=new THREE.Color(0x0b0d16);
scene.background=FOG.clone();scene.fog=new THREE.Fog(FOG,120,1500);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,2200);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- Lighting ----------
const hemi=new THREE.HemisphereLight(0x5a6c9a,0x15110c,.55);scene.add(hemi);
const moon=new THREE.DirectionalLight(0xc8d4ff,.6);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:360});scene.add(moon,moon.target);
const fill=new THREE.DirectionalLight(0xffe8c8,.25);fill.position.set(-40,60,-30);scene.add(fill);

// ---------- Circuit ----------
const CP=[[0,0],[260,0],[340,30],[360,110],[300,170],[200,180],[170,240],[230,300],[250,380],[180,440],[40,450],[-60,400],[-70,330],[-20,290],[-40,230],[-150,210],[-230,150],[-240,60],[-170,8]];
const curve=new THREE.CatmullRomCurve3(CP.map(p=>new THREE.Vector3(p[0],0,p[1])),true,'centripetal');
const NS=1400,HALF=7,KERB=1.4,RUN=14,WALL=HALF+RUN;
const P=[],TG=[],NM=[];
for(let i=0;i<NS;i++){const t=i/NS,p=curve.getPointAt(t),tg=curve.getTangentAt(t).normalize();P.push(p);TG.push(tg);NM.push(new THREE.Vector3(-tg.z,0,tg.x));}
const LEN=curve.getLength();
function ribbon(a,b,y,mat,uvScale=1,recv=true){
 const pos=[],uv=[],idx=[];
 for(let i=0;i<=NS;i++){const k=i%NS,p=P[k],n=NM[k];
  pos.push(p.x+n.x*a,y,p.z+n.z*a,p.x+n.x*b,y,p.z+n.z*b);const v=i/NS*LEN/uvScale;uv.push(0,v,1,v);
  if(i<NS){const j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const m=new THREE.Mesh(g,mat);m.receiveShadow=recv;scene.add(m);return m;}
function canvasTex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const asphaltTex=canvasTex(256,512,(g,w,h)=>{
 g.fillStyle='#35363c';g.fillRect(0,0,w,h);
 for(let i=0;i<11000;i++){const c=40+Math.random()*55|0;g.fillStyle=`rgb(${c},${c},${c+4})`;g.fillRect(Math.random()*w,Math.random()*h,1.6,1.6);}
 g.fillStyle='rgba(18,18,20,.55)';g.fillRect(w*.32,0,w*.36,h);
 g.strokeStyle='rgba(245,240,225,.95)';g.lineWidth=5;g.beginPath();g.moveTo(5,0);g.lineTo(5,h);g.moveTo(w-5,0);g.lineTo(w-5,h);g.stroke();
 g.fillStyle='rgba(245,240,220,.85)';for(let y=0;y<h;y+=110)g.fillRect(w/2-2.5,y,5,48);
});
const roadMat=new THREE.MeshStandardMaterial({map:asphaltTex,roughness:.9,metalness:.02,color:0xffffff});
ribbon(-HALF,HALF,0.02,roadMat,20);
const kerbTex=canvasTex(32,64,(g,w,h)=>{g.fillStyle='#c4121c';g.fillRect(0,0,w,h/2);g.fillStyle='#f4f2ea';g.fillRect(0,h/2,w,h/2);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,h/2-1,w,2);});
const kerbMat=new THREE.MeshStandardMaterial({map:kerbTex,roughness:.55,metalness:.05});
ribbon(HALF,HALF+KERB,0.06,kerbMat,2.2);ribbon(-HALF-KERB,-HALF,0.06,kerbMat,2.2);
const grassTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#1e3a24';g.fillRect(0,0,w,h);for(let i=0;i<4200;i++){g.fillStyle=`rgba(${24+Math.random()*40|0},${70+Math.random()*55|0},${30+Math.random()*28|0},.85)`;g.fillRect(Math.random()*w,Math.random()*h,1.5,2.4);}});
const runMat=new THREE.MeshStandardMaterial({map:grassTex,roughness:1,color:0xffffff});
ribbon(HALF+KERB,WALL,0.01,runMat,8);ribbon(-WALL,-HALF-KERB,0.01,runMat,8);
// sidewalks
const walkMat=new THREE.MeshStandardMaterial({color:0x6a6c72,roughness:.85,metalness:.05});
ribbon(WALL,WALL+3.2,0.03,walkMat,6);ribbon(-WALL-3.2,-WALL,0.03,walkMat,6);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(3600,3600),new THREE.MeshStandardMaterial({color:0x2a3d28,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-0.02;ground.receiveShadow=true;scene.add(ground);
// Armco + tyre walls
function wall(off,h,mat){const pos=[],idx=[];for(let i=0;i<=NS;i++){const k=i%NS,p=P[k],n=NM[k],x=p.x+n.x*off,z=p.z+n.z*off;pos.push(x,0,z,x,h,z);if(i<NS){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
const armco=new THREE.MeshStandardMaterial({color:0xb0b6c0,metalness:.85,roughness:.28,side:THREE.DoubleSide});
const tyreWall=new THREE.MeshStandardMaterial({color:0x161618,roughness:.92,side:THREE.DoubleSide});
wall(WALL,1.15,armco);wall(-WALL,1.15,armco);wall(WALL+.35,0.55,tyreWall);wall(-WALL-.35,0.55,tyreWall);
// Armco posts + stacked tyre blocks (instanced)
const postGeo=new THREE.CylinderGeometry(.08,.1,1.2,6),postMat=new THREE.MeshStandardMaterial({color:0x7a8088,metalness:.7,roughness:.4});
const posts=new THREE.InstancedMesh(postGeo,postMat,Math.floor(NS/10)*2);const dm=new THREE.Object3D();let pi=0;
for(let i=0;i<NS;i+=10){for(const s of[-1,1]){const p=P[i],n=NM[i];dm.position.set(p.x+n.x*WALL*s,0.6,p.z+n.z*WALL*s);dm.rotation.set(0,0,0);dm.scale.set(1,1,1);dm.updateMatrix();posts.setMatrixAt(pi++,dm.matrix);}}
posts.count=pi;scene.add(posts);
const tyreGeo=new THREE.TorusGeometry(.28,.12,8,12);tyreGeo.rotateX(Math.PI/2);
const tyreMat=new THREE.MeshStandardMaterial({color:0x0e0e10,roughness:.95});
const tyreStacks=new THREE.InstancedMesh(tyreGeo,tyreMat,220);let ti=0;
for(let i=0;i<NS;i+=38){for(const s of[-1,1]){if((i/38+s)&1)continue;const p=P[i],n=NM[i],bx=p.x+n.x*(WALL+.55)*s,bz=p.z+n.z*(WALL+.55)*s;
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){dm.position.set(bx+NM[i].x*s*(col*.12), .28+row*.32, bz+TG[i].x*(col-1)*.55);dm.rotation.set(0,row*.2,0);dm.scale.set(1,1,1);dm.updateMatrix();if(ti<220)tyreStacks.setMatrixAt(ti++,dm.matrix);}}}
tyreStacks.count=ti;scene.add(tyreStacks);

// ---------- Lamps ----------
const poleGeo=new THREE.CylinderGeometry(.12,.16,12,6),headGeo=new THREE.BoxGeometry(1.6,.3,.6);
const poleMat=new THREE.MeshStandardMaterial({color:0x2a2c30,metalness:.6,roughness:.5}),headMat=new THREE.MeshStandardMaterial({color:0xffe3b0,emissive:0xffd59a,emissiveIntensity:3});
const lampPos=[];
for(let i=0;i<NS;i+=26){const s=(i/26)%2?1:-1,p=P[i],n=NM[i],x=p.x+n.x*(WALL+2.2)*s,z=p.z+n.z*(WALL+2.2)*s;
 const pole=new THREE.Mesh(poleGeo,poleMat);pole.position.set(x,6,z);scene.add(pole);
 const hd=new THREE.Mesh(headGeo,headMat);hd.position.set(x-n.x*s*1.2,12,z-n.z*s*1.2);hd.lookAt(p.x,0,p.z);scene.add(hd);
 lampPos.push(new THREE.Vector3(x-n.x*s*2.5,11,z-n.z*s*2.5));}
const lampLights=[];for(let i=0;i<6;i++){const L=new THREE.PointLight(0xffd8a0,180,60,1.6);scene.add(L);lampLights.push(L);}

// ---------- Start gantry / grandstands / pit ----------
const startI=0,sp=P[startI],sn=NM[startI],st=TG[startI];
const chk=canvasTex(64,16,(g,w,h)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){g.fillStyle=(x+y)%2?'#111':'#eee';g.fillRect(x*4,y*4,4,4);}});
const line=new THREE.Mesh(new THREE.PlaneGeometry(HALF*2,1.4),new THREE.MeshStandardMaterial({map:chk,roughness:.8}));line.rotation.x=-Math.PI/2;line.rotation.z=-Math.atan2(st.z,st.x)+Math.PI/2;line.position.set(sp.x,.04,sp.z);scene.add(line);
const gant=new THREE.Group();const gm=new THREE.MeshStandardMaterial({color:0x1a1b1f,metalness:.7,roughness:.4});
for(const s of[-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.6,8,.6),gm);leg.position.set(0,4,s*(WALL-1));gant.add(leg);}
const beam=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.6,WALL*2),gm);beam.position.y=8;gant.add(beam);
const banner=new THREE.Mesh(new THREE.PlaneGeometry(WALL*1.6,1.2),new THREE.MeshBasicMaterial({map:canvasTex(1024,80,(g,w,h)=>{g.fillStyle='#0b0b0e';g.fillRect(0,0,w,h);g.fillStyle='#c9a45c';g.font='600 40px Segoe UI,sans-serif';g.textAlign='center';g.fillText('PRESTIGE GP · START / FINISH',w/2,56);})}));
banner.position.set(-.62,8,0);banner.rotation.y=-Math.PI/2;gant.add(banner);
const lightsRow=[];for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshStandardMaterial({color:0x220000,emissive:0xff0000,emissiveIntensity:0}));b.position.set(-.7,9.2,(i-2)*1.2);gant.add(b);lightsRow.push(b);}
gant.position.copy(sp);gant.rotation.y=-Math.atan2(st.z,st.x);scene.add(gant);

// Facade building helper with window grid texture
function makeFacadeTex(col,winLit){return canvasTex(256,512,(g,w,h)=>{
 const r=(col>>16)&255,gg=(col>>8)&255,b=col&255;
 g.fillStyle=`rgb(${r},${gg},${b})`;g.fillRect(0,0,w,h);
 g.fillStyle='rgba(0,0,0,.12)';for(let y=0;y<h;y+=64)g.fillRect(0,y,w,3);
 const rows=10,cols=6,mw=28,mh=36,gapX=(w-cols*mw)/(cols+1),gapY=28;
 for(let row=0;row<rows;row++)for(let coln=0;coln<cols;coln++){
  const x=gapX+coln*(mw+gapX),y=24+row*(mh+gapY);
  const lit=winLit&&Math.random()>.35;
  g.fillStyle=lit?`rgba(${200+Math.random()*40|0},${180+Math.random()*40|0},${120+Math.random()*40|0},${.55+Math.random()*.4})`:'rgba(25,35,50,.75)';
  g.fillRect(x,y,mw,mh);
  g.strokeStyle='rgba(0,0,0,.35)';g.strokeRect(x,y,mw,mh);
 }
 g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,0,8,h);
});}
const cityBuildings=[]; // for emissive TOD updates
function building(i,side,len,h,d,col){
 const p=P[i],n=NM[i],t=TG[i],o=WALL+4.5+d/2,g=new THREE.Group();
 const tex=makeFacadeTex(col,true);
 const body=new THREE.Mesh(new THREE.BoxGeometry(len,h,d),new THREE.MeshStandardMaterial({map:tex,roughness:.72,metalness:.08,emissive:0x1a1408,emissiveIntensity:0}));
 body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
 // rooftop plant / AC
 const ac=new THREE.Mesh(new THREE.BoxGeometry(len*.25,.6,d*.3),new THREE.MeshStandardMaterial({color:0x4a4e55,metalness:.4,roughness:.5}));ac.position.set(0,h+.3,0);g.add(ac);
 const ant=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,h*.25,5),new THREE.MeshStandardMaterial({color:0x888}));ant.position.set(len*.3,h+h*.12,0);g.add(ant);
 g.position.set(p.x+n.x*o*side,0,p.z+n.z*o*side);g.rotation.y=-Math.atan2(t.z,t.x);scene.add(g);
 cityBuildings.push(body);return g;}
function grandstand(i,side,len){
 const p=P[i],n=NM[i],t=TG[i],g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:.9}),seat=new THREE.MeshStandardMaterial({color:0x5a1015,roughness:.8});
 for(let r=0;r<7;r++){const s=new THREE.Mesh(new THREE.BoxGeometry(len,.8,1.4),r%2?m:seat);s.position.set(0,.4+r*.8,side*(r*1.4));s.castShadow=s.receiveShadow=true;g.add(s);}
 const roof=new THREE.Mesh(new THREE.BoxGeometry(len,.3,11),m);roof.position.set(0,8.5,side*4.5);g.add(roof);
 // crowd dots (instanced-like children that shimmer)
 const crowdGeo=new THREE.BoxGeometry(.35,.45,.25);const crowdMat=new THREE.MeshStandardMaterial({color:0x2a2030,emissive:0x402010,emissiveIntensity:.4,roughness:.9});
 const crowd=[];
 for(let r=1;r<7;r++)for(let c=0;c<Math.floor(len/1.1);c++){if(Math.random()<.2)continue;const pe=new THREE.Mesh(crowdGeo,crowdMat.clone());pe.position.set(-len/2+c*1.1+.3,.9+r*.8,side*(r*1.4));g.add(pe);crowd.push(pe);}
 g.userData.crowd=crowd;
 g.position.set(p.x+n.x*(WALL+3.5)*side,0,p.z+n.z*(WALL+3.5)*side);g.rotation.y=-Math.atan2(t.z,t.x);scene.add(g);return g;}
// denser city blocks around the circuit
building(NS-40,-1,70,9,14,0x3a3d48);building(NS-80,-1,40,14,12,0x4a4540);building(NS-160,1,55,11,13,0x2e3440);
building(100,1,48,16,11,0x454038);building(180,-1,36,8,10,0x3a4048);building(260,1,60,12,14,0x2c3038);
building(Math.round(NS*.22),-1,44,18,12,0x403830);building(Math.round(NS*.48),1,52,10,13,0x353a42);
building(Math.round(NS*.55),-1,38,22,11,0x2a2e38);building(Math.round(NS*.7),1,46,13,12,0x48423a);
building(Math.round(NS*.82),-1,50,9,14,0x3a3840);building(Math.round(NS*.9),1,42,15,12,0x2f343c);
const stands=[grandstand(40,1,60),grandstand(NS-120,1,50),grandstand(Math.round(NS*.36),-1,44)];
// pit building
building(15,-1,80,6,18,0x1c1d22);

// Jumbotron near start
const jumbo=new THREE.Group();
const jFrame=new THREE.Mesh(new THREE.BoxGeometry(14,8,.6),new THREE.MeshStandardMaterial({color:0x141518,metalness:.5,roughness:.4}));jFrame.position.y=10;jumbo.add(jFrame);
const jScreenMat=new THREE.MeshStandardMaterial({color:0x102030,emissive:0xc9a45c,emissiveIntensity:1.2});
const jScreen=new THREE.Mesh(new THREE.PlaneGeometry(12.5,6.5),jScreenMat);jScreen.position.set(0,10,.35);jumbo.add(jScreen);
jumbo.position.set(sp.x+sn.x*-(WALL+12),0,sp.z+sn.z*-(WALL+12));jumbo.rotation.y=-Math.atan2(st.z,st.x);scene.add(jumbo);

// Billboards / banners / flags
const flagPoleGeo=new THREE.CylinderGeometry(.06,.08,9,6);
const flagGeo=new THREE.PlaneGeometry(2.4,1.4,4,1);
const flags=[];
const flagColors=[0xc9a45c,0xb3121b,0xf5ecd8,0x1a3a6a];
for(let i=0;i<NS;i+=55){const s=(i/55)%2?1:-1,p=P[i],n=NM[i],t=TG[i];
 const grp=new THREE.Group();
 const pole=new THREE.Mesh(flagPoleGeo,poleMat);pole.position.y=4.5;grp.add(pole);
 const fl=new THREE.Mesh(flagGeo,new THREE.MeshStandardMaterial({color:flagColors[i%4],side:THREE.DoubleSide,roughness:.7,metalness:.05,emissive:flagColors[i%4],emissiveIntensity:.15}));
 fl.position.set(1.2,8,0);grp.add(fl);flags.push(fl);
 grp.position.set(p.x+n.x*(WALL+5.5)*s,0,p.z+n.z*(WALL+5.5)*s);grp.rotation.y=-Math.atan2(t.z,t.x);scene.add(grp);}
// planters
const planterGeo=new THREE.CylinderGeometry(.7,.85,.55,8),planterMat=new THREE.MeshStandardMaterial({color:0x3a2a20,roughness:.9});
const bushGeo=new THREE.SphereGeometry(.7,8,6),bushMat=new THREE.MeshStandardMaterial({color:0x1f4a28,roughness:1});
for(let i=0;i<NS;i+=70){for(const s of[-1,1]){const p=P[i],n=NM[i];const pl=new THREE.Mesh(planterGeo,planterMat);pl.position.set(p.x+n.x*(WALL+3.6)*s,.28,p.z+n.z*(WALL+3.6)*s);scene.add(pl);
 const bu=new THREE.Mesh(bushGeo,bushMat);bu.position.copy(pl.position);bu.position.y=1.0;bu.scale.set(1,.8,1);scene.add(bu);}}

// Trees (instanced) — sway via matrix update
const trunkGeo=new THREE.CylinderGeometry(.18,.28,3.2,6),trunkMat=new THREE.MeshStandardMaterial({color:0x3a2818,roughness:1});
const canopyGeo=new THREE.ConeGeometry(2.2,5.5,7),canopyMat=new THREE.MeshStandardMaterial({color:0x1a4a28,roughness:1});
const TREE_N=90;const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,TREE_N),canopies=new THREE.InstancedMesh(canopyGeo,canopyMat,TREE_N);
const treeData=[];
for(let i=0;i<TREE_N;i++){const idx=Math.floor(i/(TREE_N)*NS),s=i%2?1:-1,p=P[idx],n=NM[idx];
 const x=p.x+n.x*(WALL+10+ (i%5)*2.2)*s + (Math.random()-.5)*3,z=p.z+n.z*(WALL+10+(i%5)*2.2)*s+(Math.random()-.5)*3;
 const sc=.75+Math.random()*.55;treeData.push({x,z,sc,ph:Math.random()*6.28});
 dm.position.set(x,1.6,z);dm.scale.set(sc,sc,sc);dm.rotation.set(0,0,0);dm.updateMatrix();trunks.setMatrixAt(i,dm.matrix);
 dm.position.set(x,4.2*sc,z);dm.scale.set(sc,sc,sc);dm.updateMatrix();canopies.setMatrixAt(i,dm.matrix);}
scene.add(trunks,canopies);

// Distant hills + skyline
const hillGeo=new THREE.SphereGeometry(1,10,8);const hillMat=new THREE.MeshStandardMaterial({color:0x2a3a30,roughness:1,flatShading:true});
const hills=new THREE.InstancedMesh(hillGeo,hillMat,40);
for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=520+Math.random()*180,h=40+Math.random()*70;dm.position.set(40+Math.cos(a)*r,h*.15,200+Math.sin(a)*r);dm.scale.set(60+Math.random()*80,h,50+Math.random()*70);dm.rotation.set(0,a,0);dm.updateMatrix();hills.setMatrixAt(i,dm.matrix);}scene.add(hills);
const sky=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x4a5560,emissive:0x1a1508,emissiveIntensity:.15,roughness:.85}),180);
for(let i=0;i<180;i++){const a=Math.random()*Math.PI*2,r=440+Math.random()*220,h=22+Math.random()*110;dm.position.set(50+Math.cos(a)*r,h/2,210+Math.sin(a)*r);dm.scale.set(12+Math.random()*28,h,12+Math.random()*28);dm.updateMatrix();sky.setMatrixAt(i,dm.matrix);}scene.add(sky);

// Harbour water cue
const waterMat=new THREE.MeshStandardMaterial({color:0x1a4060,metalness:.6,roughness:.25,emissive:0x0a2030,emissiveIntensity:.2});
const water=new THREE.Mesh(new THREE.PlaneGeometry(280,160),waterMat);water.rotation.x=-Math.PI/2;water.position.set(-280,.01,280);scene.add(water);

// Drifting clouds
const cloudGeo=new THREE.SphereGeometry(1,8,6);const cloudMat=new THREE.MeshStandardMaterial({color:0xf2f4f8,roughness:1,transparent:true,opacity:.55,depthWrite:false});
const CLOUD_N=28;const clouds=new THREE.InstancedMesh(cloudGeo,cloudMat,CLOUD_N);const cloudData=[];
for(let i=0;i<CLOUD_N;i++){const x=(Math.random()-.5)*900,z=(Math.random()-.5)*900,y=90+Math.random()*50,sx=18+Math.random()*30,sy=6+Math.random()*8,sz=10+Math.random()*18;
 cloudData.push({x,y,z,sx,sy,sz,spd:.4+Math.random()*1.2});dm.position.set(x,y,z);dm.scale.set(sx,sy,sz);dm.updateMatrix();clouds.setMatrixAt(i,dm.matrix);}scene.add(clouds);

// ---------- Garage / upgrades ----------
const UPG_KEYS=['engine','tyres','brakes','aero','body'];
const UPG_META={
 engine:{label:'ENGINE',desc:'Acceleration & top speed',max:5,cost:[0,400,900,1600,2600]},
 tyres:{label:'TYRES',desc:'Cornering grip',max:5,cost:[0,350,800,1400,2300]},
 brakes:{label:'BRAKES',desc:'Stopping power',max:5,cost:[0,300,700,1200,2000]},
 aero:{label:'AERO',desc:'High-speed stability',max:5,cost:[0,350,750,1300,2200]},
 body:{label:'BODY',desc:'Livery polish & gold trim',max:5,cost:[0,250,600,1100,1800]}
};
const garage={credits:1200,engine:1,tyres:1,brakes:1,aero:1,body:1};
function loadGarage(){try{const raw=localStorage.getItem('prestigeGP_garage');if(!raw)return;const o=JSON.parse(raw);for(const k of['credits',...UPG_KEYS])if(typeof o[k]==='number')garage[k]=o[k];}catch(e){}}
function saveGarage(){try{localStorage.setItem('prestigeGP_garage',JSON.stringify(garage));}catch(e){}}
loadGarage();
function upgLevel(k){return Math.max(1,Math.min(5,garage[k]|0));}
function statsFromGarage(){
 const e=upgLevel('engine'),t=upgLevel('tyres'),b=upgLevel('brakes'),a=upgLevel('aero');
 return{
  topKmh:260+(e-1)*12,
  accelMul:1+(e-1)*0.09,
  brakeForce:11.5*(1+(b-1)*0.09),
  muMul:1+(t-1)*0.07,
  aeroStab:1+(a-1)*0.12,
  body:upgLevel('body')
 };}
let STATS=statsFromGarage();
const TOP_MS=()=>STATS.topKmh/3.6; // dynamic top speed from upgrades (rivals stay on baseline)

// ---------- GT car (procedural) ----------
function makeCar(paint,number,isPlayer=false){
 const car=new THREE.Group(),body=new THREE.Group();car.add(body);
 const paintM=new THREE.MeshPhysicalMaterial({color:paint,metalness:.6,roughness:.28,clearcoat:1,clearcoatRoughness:.06});
 const black=new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.5,metalness:.3});
 const gold=new THREE.MeshStandardMaterial({color:0xc9a45c,metalness:1,roughness:.3});
 const glass=new THREE.MeshPhysicalMaterial({color:0x0a0d12,metalness:.1,roughness:.05,transmission:0,transparent:true,opacity:.82,clearcoat:1});
 const add=(geo,m,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
 const sh=new THREE.Shape();sh.moveTo(-2.25,.28);sh.lineTo(2.2,.28);sh.quadraticCurveTo(2.35,.32,2.32,.55);sh.lineTo(2.1,.78);sh.quadraticCurveTo(1.2,.92,.55,.98);sh.lineTo(-1.5,1.0);sh.quadraticCurveTo(-2.2,.98,-2.28,.75);sh.lineTo(-2.25,.28);
 const ex=new THREE.ExtrudeGeometry(sh,{depth:1.86,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:4,curveSegments:16});ex.translate(0,0,-.93);ex.rotateY(Math.PI/2);
 add(ex,paintM,0,0,0);
 const cs=new THREE.Shape();cs.moveTo(.55,0);cs.quadraticCurveTo(.1,.42,-.2,.5);cs.lineTo(-1.05,.48);cs.quadraticCurveTo(-1.6,.3,-1.75,0);cs.lineTo(.55,0);
 const cg=new THREE.ExtrudeGeometry(cs,{depth:1.36,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3,curveSegments:12});cg.translate(0,0,-.68);cg.rotateY(Math.PI/2);
 add(cg,glass,0,.98,0);
 add(new THREE.BoxGeometry(1.2,.05,1.0),paintM,0,1.47,.62);
 add(new THREE.BoxGeometry(.06,.02,4.2),gold,.25,1.0,0);add(new THREE.BoxGeometry(.06,.02,4.2),gold,-.25,1.0,0);
 const numT=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#f2efe6';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.fillStyle='#111';g.font='bold 72px Segoe UI,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(number,64,68);});
 for(const s of[-1,1]){const r=new THREE.Mesh(new THREE.CircleGeometry(.32,24),new THREE.MeshStandardMaterial({map:numT,roughness:.5}));r.position.set(s*1.025,.62,.1);r.rotation.y=s*Math.PI/2;body.add(r);}
 const splitter=add(new THREE.BoxGeometry(2.0,.05,.35),black,0,.24,-2.35);
 const diffuser=add(new THREE.BoxGeometry(1.9,.18,.3),black,0,.35,2.3);
 for(const s of[-1,1])add(new THREE.BoxGeometry(.08,.12,2.6),black,s*1.02,.3,0);
 const wing=add(new THREE.BoxGeometry(2.0,.06,.42),black,0,1.32,2.05);
 const wingEnd=[];for(const s of[-1,1]){add(new THREE.BoxGeometry(.04,.36,.2),black,s*.55,1.13,2.05);wingEnd.push(add(new THREE.BoxGeometry(.04,.3,.5),black,s*1.0,1.32,2.05));}
 for(const s of[-1,1])add(new THREE.BoxGeometry(.18,.12,.08),paintM,s*1.03,1.08,-.55);
 const hlM=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xf4f6ff,emissiveIntensity:3}),tlM=new THREE.MeshStandardMaterial({color:0x300000,emissive:0xff1010,emissiveIntensity:1.5});
 for(const s of[-1,1]){const h=add(new THREE.BoxGeometry(.42,.08,.1),hlM,s*.68,.72,-2.3);h.rotation.y=-s*.2;add(new THREE.BoxGeometry(.5,.07,.06),tlM,s*.62,.86,2.31);}
 add(new THREE.BoxGeometry(1.2,.16,.06),black,0,.45,-2.33);
 add(new THREE.SphereGeometry(.17,16,12),new THREE.MeshPhysicalMaterial({color:0x14151a,clearcoat:1,roughness:.3}),.28,1.25,-.15);
 add(new THREE.BoxGeometry(.25,.07,.06),new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.9,roughness:.1}),.28,1.27,-.31);
 add(new THREE.BoxGeometry(.42,.2,.3),new THREE.MeshStandardMaterial({color:0x2a0a0d,roughness:.8}),.28,1.05,-.05);
 const tyreG=new THREE.CylinderGeometry(.36,.36,.3,28);tyreG.rotateZ(Math.PI/2);
 const rimG=new THREE.CylinderGeometry(.25,.25,.31,20);rimG.rotateZ(Math.PI/2);
 const tyreM=new THREE.MeshStandardMaterial({color:0x111111,roughness:.85}),rimM=new THREE.MeshStandardMaterial({color:0x1c1c20,metalness:.95,roughness:.25});
 const spokeG=new THREE.BoxGeometry(.32,.05,.44);
 const wheels=[];
 for(const [x,z] of [[-.9,-1.45],[.9,-1.45],[-.9,1.42],[.9,1.42]]){
  const piv=new THREE.Group();piv.position.set(x,.36,z);car.add(piv);const spin=new THREE.Group();piv.add(spin);
  const t=new THREE.Mesh(tyreG,tyreM);t.castShadow=true;spin.add(t);spin.add(new THREE.Mesh(rimG,rimM));
  for(let k=0;k<5;k++){const s=new THREE.Mesh(spokeG,gold);s.rotation.x=k*Math.PI/5*2;s.position.x=Math.sign(x)*.02;spin.add(s);}
  const cal=new THREE.Mesh(new THREE.BoxGeometry(.06,.18,.2),new THREE.MeshStandardMaterial({color:0xb3121b}));cal.position.set(-Math.sign(x)*.1,.1,0);piv.add(cal);
  wheels.push({piv,spin,front:z<0});}
 const head=new THREE.SpotLight(0xf2f4ff,0,90,.42,.5,1.2);head.position.set(0,.8,-2.2);head.target.position.set(0,0,-30);car.add(head,head.target);

 // Royal cockpit interior (player only) — full dashboard visible
 let cockpit=null,steerWheel=null,needleSpeed=null,needleRpm=null,gearDigit=null,dashLight=null;
 if(isPlayer){
  cockpit=new THREE.Group();cockpit.name='cockpit';body.add(cockpit);
  const leather=new THREE.MeshStandardMaterial({color:0x1a1410,roughness:.85,metalness:.05});
  const carbon=new THREE.MeshStandardMaterial({color:0x121214,roughness:.4,metalness:.35});
  const wood=new THREE.MeshStandardMaterial({color:0x3a2412,roughness:.55,metalness:.15});
  const goldBezel=new THREE.MeshStandardMaterial({color:0xc9a45c,metalness:1,roughness:.28});
  // dash base spanning full width
  const dash=new THREE.Mesh(new THREE.BoxGeometry(1.55,.22,.55),leather);dash.position.set(0,1.05,-.55);cockpit.add(dash);
  const dashTop=new THREE.Mesh(new THREE.BoxGeometry(1.5,.04,.5),wood);dashTop.position.set(0,1.17,-.52);cockpit.add(dashTop);
  // gold trim line
  const trim=new THREE.Mesh(new THREE.BoxGeometry(1.48,.015,.02),goldBezel);trim.position.set(0,1.19,-.28);cockpit.add(trim);
  // instrument cluster housing
  const cluster=new THREE.Mesh(new THREE.BoxGeometry(.72,.28,.18),carbon);cluster.position.set(0,1.22,-.38);cockpit.add(cluster);
  const bezel=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,8,24),goldBezel);bezel.position.set(-.18,1.24,-.28);bezel.rotation.x=-.35;cockpit.add(bezel);
  const bezel2=bezel.clone();bezel2.position.x=.18;cockpit.add(bezel2);
  // dial faces
  const dialTex=(label)=>canvasTex(128,128,(g,w,h)=>{
   g.fillStyle='#0a0a0c';g.beginPath();g.arc(64,64,60,0,7);g.fill();
   g.strokeStyle='#c9a45c';g.lineWidth=3;g.beginPath();g.arc(64,64,58,0,7);g.stroke();
   g.fillStyle='#c9a45c';g.font='10px Segoe UI';g.textAlign='center';g.fillText(label,64,100);
   g.strokeStyle='#eee6d4';g.lineWidth=1.5;
   for(let i=0;i<11;i++){const a=-Math.PI*.75+i*(Math.PI*1.5/10);g.beginPath();g.moveTo(64+Math.cos(a)*42,64+Math.sin(a)*42);g.lineTo(64+Math.cos(a)*52,64+Math.sin(a)*52);g.stroke();}
  });
  const speedFace=new THREE.Mesh(new THREE.CircleGeometry(.12,24),new THREE.MeshStandardMaterial({map:dialTex('KM/H'),roughness:.4}));speedFace.position.set(-.18,1.24,-.285);speedFace.rotation.x=-.35;cockpit.add(speedFace);
  const rpmFace=new THREE.Mesh(new THREE.CircleGeometry(.12,24),new THREE.MeshStandardMaterial({map:dialTex('×1000'),roughness:.4}));rpmFace.position.set(.18,1.24,-.285);rpmFace.rotation.x=-.35;cockpit.add(rpmFace);
  needleSpeed=new THREE.Mesh(new THREE.BoxGeometry(.01,.1,.005),new THREE.MeshStandardMaterial({color:0xb3121b}));needleSpeed.position.set(-.18,1.24,-.28);needleSpeed.rotation.x=-.35;cockpit.add(needleSpeed);
  needleRpm=new THREE.Mesh(new THREE.BoxGeometry(.01,.1,.005),new THREE.MeshStandardMaterial({color:0xc9a45c}));needleRpm.position.set(.18,1.24,-.28);needleRpm.rotation.x=-.35;cockpit.add(needleRpm);
  // center screen / gear
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.28,.14),new THREE.MeshStandardMaterial({color:0x0a1520,emissive:0xc9a45c,emissiveIntensity:.6}));screen.position.set(0,1.26,-.29);screen.rotation.x=-.3;cockpit.add(screen);
  gearDigit=screen;
  // side gauges
  for(const sx of[-.48,.48]){const g=new THREE.Mesh(new THREE.CircleGeometry(.06,16),new THREE.MeshStandardMaterial({color:0x0c0c10,emissive:0x406080,emissiveIntensity:.4}));g.position.set(sx,1.18,-.35);g.rotation.x=-.4;cockpit.add(g);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.065,.006,6,16),goldBezel);ring.position.copy(g.position);ring.rotation.x=-.4;cockpit.add(ring);}
  // steering column + royal wheel
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.35,8),carbon);col.position.set(0,1.0,-.15);col.rotation.x=1.1;cockpit.add(col);
  steerWheel=new THREE.Group();steerWheel.position.set(0,1.12,-.05);cockpit.add(steerWheel);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.18,.022,10,28),leather);rim.rotation.x=Math.PI/2;steerWheel.add(rim);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.03,12),goldBezel);hub.rotation.x=Math.PI/2;steerWheel.add(hub);
  for(let k=0;k<3;k++){const spk=new THREE.Mesh(new THREE.BoxGeometry(.16,.02,.025),carbon);spk.rotation.z=k*Math.PI*2/3;steerWheel.add(spk);}
  // stitching hint on wheel
  const stitch=new THREE.Mesh(new THREE.TorusGeometry(.18,.004,6,28),new THREE.MeshStandardMaterial({color:0xc9a45c,metalness:.5,roughness:.5}));stitch.rotation.x=Math.PI/2;steerWheel.add(stitch);
  // seats / tunnel
  const seatM=new THREE.MeshStandardMaterial({color:0x1c1010,roughness:.8});
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.42,.35,.55),seatM);seat.position.set(.28,.95,.15);cockpit.add(seat);
  const tunnel=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.8),carbon);tunnel.position.set(0,.85,.1);cockpit.add(tunnel);
  dashLight=new THREE.PointLight(0xffd8a0,0,3.5,2);dashLight.position.set(0,1.35,-.2);cockpit.add(dashLight);
  cockpit.visible=false;
 }
 car.userData={body,wheels,head,tlM,paintM,gold,splitter,wing,wingEnd,cockpit,steerWheel,needleSpeed,needleRpm,gearDigit,dashLight,isPlayer};scene.add(car);return car;}
const player=makeCar(0x5a0a10,'1',true);player.userData.head.intensity=0;player.userData.head.castShadow=true;

function applyBodyVisuals(){
 const u=player.userData,b=STATS.body;
 u.paintM.clearcoatRoughness=Math.max(.02,.08-(b-1)*.012);
 u.paintM.metalness=.55+(b-1)*.08;
 u.paintM.roughness=Math.max(.12,.3-(b-1)*.035);
 u.gold.color.setHex(b>=3?0xe0c070:0xc9a45c);
 // aero visual: larger wing / splitter
 const e=upgLevel('aero');
 u.wing.scale.set(1,1,.9+(e-1)*.08);u.wing.position.y=1.32+(e-1)*.04;
 u.splitter.scale.set(1+(e-1)*.04,1,1+(e-1)*.08);
}

// rivals: same baseline top speed as stock player (level-1 stats)
const RIV=[{c:0x101114,n:'7',name:'A. LINDQVIST'},{c:0x1b2230,n:'22',name:'M. ROSSETTI'},{c:0x3a3a40,n:'44',name:'K. TANAKA'}];
const rivals=RIV.map((r,i)=>{const m=makeCar(r.c,r.n,false);m.userData.head.intensity=0;return {mesh:m,s:(18+i*16)%LEN,lane:(i%2?-2.5:2.5),v:0,name:r.name,num:r.n};});
const RIVAL_TOP=260/3.6;
let lampI=180;

// ---------- Weather ----------
const WX=[{n:'DRY',r:0,t:22},{n:'DRIZZLE',r:.3,t:18},{n:'RAIN',r:.65,t:15},{n:'STORM',r:1,t:12}];
const wx={idx:0,rain:0,target:0,temp:22,wet:0,auto:70+Math.random()*50,flash:0,nextL:4};
const setW=i=>{wx.idx=i;wx.target=WX[i].r;flashMsg('FORECAST · '+WX[i].n);};
const cycleW=()=>{setW((wx.idx+1)%4);wx.auto=70+Math.random()*60;};
const TOD=['DAY','DUSK','NIGHT'];
let tod=0;
const cycleTod=()=>{tod=(tod+1)%3;flashMsg(TOD[tod]);};
const wxName=r=>r<.12?'DRY':r<.45?'DRIZZLE':r<.85?'RAIN':'STORM';
const RN=2600,rainPos=new Float32Array(RN*6),rainV=new Float32Array(RN);
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.LineBasicMaterial({color:0xaab8d8,transparent:true,opacity:0,depthWrite:false});
const rainMesh=new THREE.LineSegments(rainGeo,rainMat);rainMesh.frustumCulled=false;scene.add(rainMesh);
for(let i=0;i<RN;i++){rainV[i]=24+Math.random()*10;const x=(Math.random()-.5)*70,y=Math.random()*30,z=(Math.random()-.5)*70;rainPos.set([x,y,z,x+.1,y+.9,z],i*6);}
const SPN=500,spPos=new Float32Array(SPN*3),spVel=new Float32Array(SPN*3),spLife=new Float32Array(SPN);let spI=0;
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));
const spray=new THREE.Points(spGeo,new THREE.PointsMaterial({color:0xc8d0e0,size:.35,transparent:true,opacity:.35,depthWrite:false}));spray.frustumCulled=false;scene.add(spray);
for(let i=0;i<SPN;i++)spPos[i*3+1]=-50;

// ---------- Player physics ----------
const S={x:0,z:0,h:0,vx:0,vz:0,yaw:0,steer:0,thr:0,brk:0,gear:1,rpm:0,hint:0,lap:0,lapT:0,best:null,last:null,prog:0,started:false,wheelRot:0,pitch:0,roll:0,lastS:0,hit:0,needRecover:false};
const GEARS_BASE=[0,62,98,135,172,212,260];
function gearsNow(){const top=STATS.topKmh,scale=top/260;return GEARS_BASE.map((v,i)=>i===0?0:v*scale);}
function placeAt(sIdx,lane,o){const p=P[sIdx],n=NM[sIdx],t=TG[sIdx];o.x=p.x+n.x*lane;o.z=p.z+n.z*lane;o.h=Math.atan2(-t.x,-t.z);}
function resetPlayer(){const i=NS-Math.round(20/LEN*NS);placeAt(i,-2.5,S);S.vx=S.vz=S.yaw=0;S.hint=i;S.prog=i;S.lap=0;S.lapT=0;S.started=false;S.hit=0;S.needRecover=false;S.pitch=S.roll=0;}
resetPlayer();
function nearest(x,z,hint){let best=1e9,bi=hint;for(let j=-40;j<=40;j++){const q=(hint+j+NS)%NS,dx=P[q].x-x,dz=P[q].z-z,d=dx*dx+dz*dz;if(d<best){best=d;bi=q;}}
 const lat=(x-P[bi].x)*NM[bi].x+(z-P[bi].z)*NM[bi].z;return[bi,lat];}
function recoverCar(){
 if(!running)return;
 const [ni]=nearest(S.x,S.z,S.hint);S.hint=ni;
 placeAt(ni,0,S); // center of road, straight along tangent
 S.vx=S.vz=0;S.yaw=0;S.steer=0;S.pitch=0;S.roll=0;S.vf=0;S.kmh=0;S.hit=0;S.needRecover=false;
 flashMsg('RECOVERED · TRACK CENTER');
 updateRecoverBtn();
}
function updateRecoverBtn(){
 const btn=$('br');if(!btn)return;
 btn.classList.toggle('need',!!S.needRecover);
 btn.textContent=S.needRecover?'RECOVER !':'RECOVER';
}
const K={};let TC={};
addEventListener('keydown',e=>{
 K[e.code]=1;
 if(e.code==='KeyQ')cycleW();
 if(e.code==='KeyT')cycleTod();
 if(e.code==='KeyC')camMode=(camMode+1)%3;
 if(e.code==='KeyR')recoverCar();
 if(e.code==='KeyG')openGarage();
 if(e.code==='Escape'||e.code==='KeyP'){if(garageOpen)closeGarage();else togP();}
 if(/Arrow|Space/.test(e.code))e.preventDefault();audioInit();
});
addEventListener('keyup',e=>{K[e.code]=0;});
function hold(id,k){const el=$(id);if(!el)return;const on=e=>{e.preventDefault();TC[k]=1;audioInit();},off=e=>{e.preventDefault();TC[k]=0;};el.addEventListener('touchstart',on);el.addEventListener('touchend',off);el.addEventListener('touchcancel',off);}
hold('tL','l');hold('tR','r');hold('tB','b');hold('tG','g');
if('ontouchstart' in window||navigator.maxTouchPoints>0)$('touch').classList.remove('hide');
let camMode=0,running=false,paused=false,countdown=0,garageOpen=false;
function togP(){if(!running||garageOpen)return;paused=!paused;$('pause').classList.toggle('hide',!paused);}
$('go').onclick=()=>{$('title').classList.add('hide');running=true;STATS=statsFromGarage();applyBodyVisuals();resetPlayer();countdown=4.5;audioInit();};
$('res').onclick=togP;$('bp').onclick=togP;$('bw').onclick=cycleW;$('bt').onclick=cycleTod;$('bc').onclick=()=>camMode=(camMode+1)%3;
$('br').onclick=e=>{e.stopPropagation();recoverCar();};
$('bg').onclick=()=>openGarage();
$('gTitle').onclick=()=>openGarage();
let msgT=0;function flashMsg(t){$('msg').textContent=t;$('msg').style.opacity=1;msgT=2.2;}

// click canvas to recover when crashed
renderer.domElement.addEventListener('pointerdown',()=>{if(running&&!paused&&!garageOpen&&S.needRecover)recoverCar();});

// ---------- Garage UI ----------
function openGarage(){
 garageOpen=true;paused=true;
 $('garage').classList.remove('hide');
 $('pause').classList.add('hide');
 if(!running)$('title').classList.add('hide');
 renderGarage();
 camMode=0;
}
function closeGarage(){
 garageOpen=false;
 $('garage').classList.add('hide');
 if(running){paused=false;}
 else{$('title').classList.remove('hide');}
 STATS=statsFromGarage();applyBodyVisuals();
}
$('gClose').onclick=closeGarage;
function renderGarage(){
 $('gCredits').textContent=garage.credits+' CR';
 const box=$('gList');box.innerHTML='';
 for(const k of UPG_KEYS){
  const meta=UPG_META[k],lv=upgLevel(k),next=lv<meta.max?lv+1:null,cost=next?meta.cost[next-1]:0;
  const row=document.createElement('div');row.className='grow';
  const effect=k==='engine'?`Top ${260+(lv-1)*12} → ${next?260+(next-1)*12:260+(lv-1)*12} km/h`
   :k==='tyres'?`Grip +${((lv-1)*7)}% → ${next?((next-1)*7):((lv-1)*7)}%`
   :k==='brakes'?`Brake +${((lv-1)*9)}% → ${next?((next-1)*9):((lv-1)*9)}%`
   :k==='aero'?`Stability +${((lv-1)*12)}% → ${next?((next-1)*12):((lv-1)*12)}%`
   :`Polish Lv ${lv}${next?' → '+next:''}`;
  row.innerHTML=`<div class="gl"><b>${meta.label}</b> · Lv ${lv}/${meta.max}<div class="gs">${meta.desc}<br>${effect}</div></div>`;
  const btn=document.createElement('button');
  if(!next){btn.textContent='MAX';btn.disabled=true;}
  else{btn.textContent=`UPGRADE · ${cost} CR`;btn.disabled=garage.credits<cost;btn.onclick=()=>{
   if(garage.credits<cost)return;garage.credits-=cost;garage[k]=next;saveGarage();STATS=statsFromGarage();applyBodyVisuals();renderGarage();flashMsg(meta.label+' · LEVEL '+next);
  };}
  row.appendChild(btn);box.appendChild(row);
 }
}
applyBodyVisuals();

// simple engine audio
let AC,osc,osc2,gainN;function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();osc=AC.createOscillator();osc2=AC.createOscillator();osc.type='sawtooth';osc2.type='square';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=900;gainN=AC.createGain();gainN.gain.value=0;osc.connect(f);osc2.connect(f);f.connect(gainN);gainN.connect(AC.destination);osc.start();osc2.start();}catch(e){}}

function updatePlayer(dt){
 const go=countdown<=0;
 const up=go&&(K.KeyW||K.ArrowUp||TC.g),dn=K.KeyS||K.ArrowDown||TC.b||!go,lf=K.KeyA||K.ArrowLeft||TC.l,rt=K.KeyD||K.ArrowRight||TC.r;
 S.thr+=((up?1:0)-S.thr)*Math.min(1,dt*6);S.brk+=((dn?1:0)-S.brk)*Math.min(1,dt*8);
 const fx=-Math.sin(S.h),fz=-Math.cos(S.h);
 const rx=-fz,rz=fx;
 let vf=S.vx*fx+S.vz*fz,vl=S.vx*rx+S.vz*rz;const kmh=Math.abs(vf)*3.6;
 const [ni,lat]=nearest(S.x,S.z,S.hint);S.hint=ni;const alat=Math.abs(lat);
 const surf=alat<=HALF+KERB?1:.5;
 const wetFactor=1-.45*wx.wet, tempF=wx.temp<10?.95:1;
 const mu=1.25*wetFactor*tempF*surf*STATS.muMul;
 const GEARS=gearsNow();
 while(S.gear<6&&kmh>GEARS[S.gear]-2)S.gear++;while(S.gear>1&&kmh<GEARS[S.gear-1]-12)S.gear--;
 const lo=GEARS[S.gear-1],hi=GEARS[S.gear];S.rpm=Math.min(1,.25+.75*(kmh-lo)/(hi-lo+1e-3));
 const gearForce=[0,9.5,7.6,6.2,5.0,4.0,3.1][S.gear]*STATS.accelMul;
 let a=S.thr*gearForce*(kmh<GEARS[6]?1:0)*Math.min(1,.35+surf);
 const tractionLimit=mu*9.81;a=Math.min(a,tractionLimit*1.05);
 if(S.brk>.05){if(vf>.5)a-=S.brk*Math.min(STATS.brakeForce,mu*9.81*1.0);else if(!up&&go)a-=4;}
 a-=0.00042*vf*Math.abs(vf)+.15*Math.sign(vf)+(surf<1?1.6*Math.sign(vf):0);
 const pvf=vf;vf+=a*dt;if(pvf>0&&vf<0&&!(S.brk>.05&&!up&&go&&pvf<.6))vf=Math.max(vf,0);if(vf<-6)vf=-6;
 const target=((rt?1:0)-(lf?1:0));S.steer+=(target-S.steer)*Math.min(1,dt*(target?5:7));
 const lock=.5/(1+kmh/55);const steerAng=S.steer*lock;
 let yawT=vf*Math.tan(steerAng)/2.65;
 const maxYaw=mu*9.81/Math.max(3,Math.abs(vf))*STATS.aeroStab;
 const over=Math.abs(yawT)>maxYaw;
 if(over)yawT=Math.sign(yawT)*(maxYaw+(Math.abs(yawT)-maxYaw)*.35/STATS.aeroStab);
 S.yaw+=(yawT-S.yaw)*Math.min(1,dt*(6*wetFactor+2));
 S.h-=S.yaw*dt;
 const latDemand=S.yaw*vf;vl+=(latDemand-0)*0; vl*=Math.exp(-dt*(7*mu));
 if(over)vl+=-Math.sign(S.yaw)*(Math.abs(yawT)-maxYaw)*Math.abs(vf)*.04*dt*20*(1.2-wetFactor+.3)/STATS.aeroStab;
 const nfx=-Math.sin(S.h),nfz=-Math.cos(S.h),nrx=-nfz,nrz=nfx;
 S.vx=nfx*vf+nrx*vl;S.vz=nfz*vf+nrz*vl;S.x+=S.vx*dt;S.z+=S.vz*dt;
 const [ni2,lat2]=nearest(S.x,S.z,S.hint);
 if(Math.abs(lat2)>WALL-1.1){const s=Math.sign(lat2),push=Math.abs(lat2)-(WALL-1.1);S.x-=NM[ni2].x*s*push;S.z-=NM[ni2].z*s*push;
  const vn=S.vx*NM[ni2].x+S.vz*NM[ni2].z;if(vn*s>0){S.vx-=NM[ni2].x*vn*1.3;S.vz-=NM[ni2].z*vn*1.3;}S.vx*=.86;S.vz*=.86;
  if(Math.abs(vn)>4){S.hit=1.8;S.needRecover=true;updateRecoverBtn();if(Math.abs(vn)>5)flashMsg('CONTACT · PRESS R');}}
 if(alat>HALF+KERB+2&&Math.abs(vf)<2){S.needRecover=true;updateRecoverBtn();}
 S.pitch+=((-a*.006)-S.pitch)*Math.min(1,dt*5);S.roll+=((-S.yaw*vf*.0045)-S.roll)*Math.min(1,dt*5);
 S.wheelRot+=vf*dt/.36;S.steerVis=steerAng;S.slip=Math.abs(vl)+(over?3:0);S.vf=vf;S.kmh=kmh;S.grip=wetFactor*tempF*surf*STATS.muMul;S.off=surf<1;
 if(S.hit>0)S.hit-=dt;
 if(go){S.lapT+=dt;const d=ni2-S.prog;if(d<-NS/2){if(S.started){S.last=S.lapT;const pb=!S.best||S.lapT<S.best;if(pb)S.best=S.lapT;
   const earned=180+Math.round((pb?80:0)+(1-wx.wet)*40);garage.credits+=earned;saveGarage();flashMsg((pb?'PERSONAL BEST  ':'LAP  ')+ft(S.lapT)+'  · +'+earned+' CR');}
  S.started=true;S.lap++;S.lapT=0;}
  if(d>NS/2){S.lap=Math.max(0,S.lap-1);}S.prog=ni2;}
 if(wx.wet>.15&&Math.abs(vf)>14){const n=Math.min(10,Math.floor(Math.abs(vf)*wx.wet/4));for(let k=0;k<n;k++){const i=spI++%SPN,side=k%2?1:-1;
  spPos[i*3]=S.x-nfx*2.3+nrx*.9*side;spPos[i*3+1]=.2;spPos[i*3+2]=S.z-nfz*2.3+nrz*.9*side;spVel[i*3]=-nfx*vf*.15+(Math.random()-.5)*3;spVel[i*3+1]=1+Math.random()*2.5;spVel[i*3+2]=-nfz*vf*.15+(Math.random()-.5)*3;spLife[i]=.7;}}
 if(AC){osc.frequency.value=60+S.rpm*190;osc2.frequency.value=30+S.rpm*95;gainN.gain.value=running&&!paused?.035+S.thr*.05:0;}
}
function updateRivals(dt){if(countdown>0)return;
 const wetFactor=1-.45*wx.wet,tempF=wx.temp<10?.95:1,mu=1.25*wetFactor*tempF,look=36;
 for(const r of rivals){const i=Math.floor((r.s/LEN)*NS)%NS;
  const j=(i+look)%NS,dot=Math.max(-1,Math.min(1,TG[i].dot(TG[j]))),ang=Math.acos(dot),dist=LEN*look/NS;
  const radius=ang>0.015?dist/ang:1e6,vmax=Math.min(RIVAL_TOP,Math.sqrt(mu*9.81*Math.max(10,radius)));
  r.v+=Math.max(-11.5*dt,Math.min(9.5*dt,vmax-r.v));r.s=(r.s+r.v*dt+LEN)%LEN;r.lane+=(Math.sin(r.s*.01)*2-r.lane)*dt*.3;
  const k=Math.floor((r.s/LEN)*NS)%NS,o={};placeAt(k,r.lane,o);const dx=o.x-S.x,dz=o.z-S.z,d=Math.hypot(dx,dz);
  if(d<4.2){const pk=(o.x-S.x)/d,pz=(o.z-S.z)/d;S.vx-=pk*2;S.vz-=pz*2;r.v*=.97;
   if(d<3.5&&Math.hypot(S.vx,S.vz)>8){S.hit=1.5;S.needRecover=true;updateRecoverBtn();}}
  r.mesh.position.set(o.x,0,o.z);r.mesh.rotation.y=o.h;for(const w of r.mesh.userData.wheels){w.spin.rotation.x-=r.v*dt/.36;}}}
function syncCar(){const c=player,u=c.userData;c.position.set(S.x,0,S.z);c.rotation.y=S.h;u.body.rotation.set(S.pitch,0,S.roll);
 for(const w of u.wheels){w.spin.rotation.x=-S.wheelRot;if(w.front)w.piv.rotation.y=-S.steerVis*1.4;}
 u.tlM.emissiveIntensity=S.brk>.1?6:1.5;
 // cockpit gauges + wheel
 if(u.cockpit){u.cockpit.visible=camMode===1;if(u.steerWheel)u.steerWheel.rotation.z=-(S.steerVis||0)*12;
  if(u.needleSpeed){const ang=-Math.PI*.75+Math.min(1,(S.kmh||0)/320)*Math.PI*1.5;u.needleSpeed.rotation.z=ang;}
  if(u.needleRpm){const ang=-Math.PI*.75+(S.rpm||0)*Math.PI*1.5;u.needleRpm.rotation.z=ang;}
  if(u.dashLight)u.dashLight.intensity=tod===0?0:tod===1?.6:1.4;}}
// camera
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();let camInit=false;
function updateCamera(dt){const fx=-Math.sin(S.h),fz=-Math.cos(S.h);let des,look;
 if(camMode===0){const back=8.4+Math.min(2.5,Math.abs(S.vf||0)/40);des=new THREE.Vector3(S.x-fx*back,3.05,S.z-fz*back);look=new THREE.Vector3(S.x+fx*8,1.15,S.z+fz*8);}
 else if(camMode===1){
  // royal cockpit: behind the wheel so full dash + wheel + windscreen read clearly
  const rx=-fz, rz=fx; // right
  des=new THREE.Vector3(S.x + rx*.22 - fx*.15, 1.42, S.z + rz*.22 - fz*.15);
  look=new THREE.Vector3(S.x+fx*12 + rx*.15, 1.12, S.z+fz*12 + rz*.15);
 }
 else{const i=(S.hint+30)%NS,p=P[i],n=NM[i];des=new THREE.Vector3(p.x+n.x*(WALL+6),7.5,p.z+n.z*(WALL+6));look=new THREE.Vector3(S.x,1.0,S.z);}
 if(!camInit||camMode!==0){camPos.copy(des);camLook.copy(look);camInit=true;}else{camPos.lerp(des,1-Math.exp(-dt*7));camLook.lerp(look,1-Math.exp(-dt*10));}
 camera.position.copy(camPos);camera.lookAt(camLook);
 camera.fov=(camMode===1?68:60)+Math.min(10,(S.kmh||0)/25);camera.updateProjectionMatrix();
 player.visible=true;
 // hide exterior cabin glass clutter in cockpit by making glass more transparent already; body stays
}
function updateEnvAnim(dt,now){
 const t=now*0.001;
 // clouds drift
 for(let i=0;i<CLOUD_N;i++){const c=cloudData[i];c.x+=c.spd*dt*4;if(c.x>500)c.x=-500;dm.position.set(c.x,c.y,c.z);dm.scale.set(c.sx,c.sy,c.sz);dm.updateMatrix();clouds.setMatrixAt(i,dm.matrix);}clouds.instanceMatrix.needsUpdate=true;
 // trees sway
 for(let i=0;i<TREE_N;i++){const td=treeData[i],sw=Math.sin(t*1.3+td.ph)*.045;dm.position.set(td.x,1.6,td.z);dm.scale.set(td.sc,td.sc,td.sc);dm.rotation.set(0,0,sw);dm.updateMatrix();trunks.setMatrixAt(i,dm.matrix);
  dm.position.set(td.x,4.2*td.sc,td.z);dm.rotation.set(sw*1.4,0,sw);dm.scale.set(td.sc,td.sc,td.sc);dm.updateMatrix();canopies.setMatrixAt(i,dm.matrix);}trunks.instanceMatrix.needsUpdate=true;canopies.instanceMatrix.needsUpdate=true;
 // flags wave
 for(let i=0;i<flags.length;i++){flags[i].rotation.y=Math.sin(t*3+i)*.35;flags[i].scale.x=1+Math.sin(t*5+i)*.05;}
 // crowd shimmer
 for(const st of stands){if(!st.userData.crowd)continue;for(let i=0;i<st.userData.crowd.length;i++){const pe=st.userData.crowd[i];pe.material.emissiveIntensity=.25+Math.abs(Math.sin(t*2+i*.7))*.55;}}
 // jumbotron color cycle
 const hue=(t*.08)%1;jScreenMat.emissive.setHSL(hue,.55,.45);jScreenMat.emissiveIntensity=.9+.3*Math.sin(t*2);
 // water shimmer
 waterMat.emissiveIntensity=.15+.1*Math.sin(t*1.5);
 // gantry hold green after GO
 if(running&&countdown<=0){lightsRow.forEach(b=>{b.material.emissive.setHex(0x20ff60);b.material.emissiveIntensity=.8+.4*Math.sin(t*2);});}
}
function updateWeather(dt){
 wx.auto-=dt;if(wx.auto<=0){let n=wx.idx+(Math.random()<.55?1:-1);if(n<0)n=1;if(n>3)n=2;setW(n);wx.auto=60+Math.random()*80;}
 wx.rain+=(wx.target-wx.rain)*Math.min(1,dt/10);
 if(wx.rain>wx.wet+.001)wx.wet=Math.min(wx.rain,wx.wet+dt/70);else wx.wet=Math.max(wx.rain,wx.wet-dt/120);
 wx.temp+=(WX[wx.idx].t-wx.temp)*dt/50;
 if(wx.rain>.8){wx.nextL-=dt;if(wx.nextL<0){wx.flash=1;wx.nextL=5+Math.random()*10;}}wx.flash=Math.max(0,wx.flash-dt*3);
 const w=wx.wet;roadMat.roughness=.9-.7*w;roadMat.metalness=.02+.28*w;roadMat.color.setScalar(1-.4*w);kerbMat.roughness=.55-.4*w;runMat.color.setScalar(1-.28*w);
 const rainAmt=wx.rain,flash=wx.flash;
 let skyC,sunI,hemiI,exp,headP,headR,skyEm,gndC;
 if(tod===0){
  skyC=new THREE.Color(0x87b8dc).lerp(new THREE.Color(0x6a7c8c),rainAmt);
  scene.fog.near=140-50*rainAmt;scene.fog.far=1600-650*rainAmt;
  hemi.color.set(0xb2d4f5);hemi.groundColor.set(0x8a7a50);hemiI=1.55-.5*rainAmt+flash*2;
  moon.color.set(0xfff2c8);sunI=2.6*(1-.82*rainAmt)+flash*3;exp=1.12;
  headMat.emissiveIntensity=.05;lampI=0;headP=0;headR=0;
  sky.material.color.set(0x5c6674);skyEm=0;gndC=new THREE.Color(0x3d5a34).lerp(new THREE.Color(0x1c2a1c),rainAmt*.4);
  cloudMat.opacity=.62;fill.intensity=.35;
  for(const b of cityBuildings)b.material.emissiveIntensity=0;
 }else if(tod===1){
  skyC=new THREE.Color(0xc47a4a).lerp(new THREE.Color(0x4a4558),rainAmt);
  scene.fog.near=90-35*rainAmt;scene.fog.far=900-320*rainAmt;
  hemi.color.set(0xe8a878);hemi.groundColor.set(0x4a3020);hemiI=1.0-.3*rainAmt+flash*2;
  moon.color.set(0xffc088);sunI=1.25*(1-.7*rainAmt)+flash*3;exp=1.14;
  headMat.emissiveIntensity=1.6;lampI=90;headP=140;headR=70;
  sky.material.color.set(0x2a2832);sky.material.emissive.setHex(0x3a2010);skyEm=.4;gndC=new THREE.Color(0x243022);
  cloudMat.opacity=.35;fill.intensity=.15;
  for(const b of cityBuildings)b.material.emissiveIntensity=.45;
 }else{
  skyC=FOG.clone().lerp(new THREE.Color(0x141a24),rainAmt);
  scene.fog.near=70-40*rainAmt;scene.fog.far=620-300*rainAmt;
  hemi.color.set(0x5a6c9a);hemi.groundColor.set(0x15110c);hemiI=.55-.2*rainAmt+flash*3;
  moon.color.set(0xc8d4ff);sunI=.6*(1-.7*rainAmt)+flash*4;exp=1.1;
  headMat.emissiveIntensity=3;lampI=180*(1+.4*wx.wet);headP=260;headR=120;
  sky.material.color.set(0x0e1018);sky.material.emissive.setHex(0x1a1508);skyEm=.65;gndC=new THREE.Color(0x0c100d);
  cloudMat.opacity=.12;fill.intensity=.05;
  for(const b of cityBuildings)b.material.emissiveIntensity=.85;
 }
 scene.fog.color.copy(skyC);scene.background.copy(skyC);
 hemi.intensity=hemiI;moon.intensity=sunI;renderer.toneMappingExposure=exp;
 player.userData.head.intensity=headP;rivals.forEach(r=>r.mesh.userData.head.intensity=headR);
 sky.material.emissiveIntensity=skyEm;ground.material.color.copy(gndC);
 rainMat.opacity=Math.min(.55,wx.rain*.7);rainMesh.visible=wx.rain>.02;
 const cnt=Math.floor(RN*wx.rain);rainGeo.setDrawRange(0,cnt*2);
 const cx=camera.position.x,cy=camera.position.y,cz=camera.position.z,wind=2+wx.rain*4;
 for(let i=0;i<cnt;i++){const o=i*6;let x=rainPos[o],y=rainPos[o+1]-rainV[i]*dt,z=rainPos[o+2]+wind*dt;
  if(y<cy-6||Math.abs(x-cx)>35||Math.abs(z-cz)>35){x=cx+(Math.random()-.5)*70;z=cz+(Math.random()-.5)*70;y=cy+10+Math.random()*20;}
  rainPos[o]=x;rainPos[o+1]=y;rainPos[o+2]=z;rainPos[o+3]=x-wind*.03;rainPos[o+4]=y+.9;rainPos[o+5]=z-wind*.03;}
 rainGeo.attributes.position.needsUpdate=true;
 for(let i=0;i<SPN;i++){if(spLife[i]>0){spLife[i]-=dt;spPos[i*3]+=spVel[i*3]*dt;spPos[i*3+1]+=spVel[i*3+1]*dt;spPos[i*3+2]+=spVel[i*3+2]*dt;spVel[i*3+1]-=6*dt;if(spLife[i]<=0)spPos[i*3+1]=-50;}}
 spGeo.attributes.position.needsUpdate=true;}
function updateLamps(){const c=new THREE.Vector3(S.x,0,S.z);const sorted=lampPos.slice().sort((a,b)=>a.distanceToSquared(c)-b.distanceToSquared(c));
 lampLights.forEach((L,i)=>{L.position.copy(sorted[i]);L.intensity=lampI;});
 if(tod===0)moon.position.set(S.x+90,210,S.z+55);
 else if(tod===1)moon.position.set(S.x+130,42,S.z+25);
 else moon.position.set(S.x+40,80,S.z+30);
 moon.target.position.set(S.x,0,S.z);}
const ft=t=>{if(t==null)return'–:––.–––';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(3);};
function hud(){
 $('tl').innerHTML=`<div><span class="k">LAP</span>${Math.max(1,S.lap)}</div><div><span class="k">TIME</span>${ft(S.lapT)}</div><div><span class="k">LAST</span>${ft(S.last)}</div><div><span class="k">BEST</span>${ft(S.best)}</div>`+
 `<div style="margin-top:6px"><span class="k">LIGHT</span>${TOD[tod]}</div><div><span class="k">WEATHER</span>${wxName(wx.rain)}${Math.abs(wx.target-wx.rain)>.05?' → '+WX[wx.idx].n:''}</div><div><span class="k">WET</span>${Math.round(wx.wet*100)}% · ${wx.temp.toFixed(0)}°C</div><div><span class="k">GRIP</span>${Math.round((S.grip||1)*100)}%${S.off?' · OFF TRACK':''}</div>`+
 `<div style="margin-top:6px"><span class="k">CR</span>${garage.credits}</div>`;
 $('kmh').textContent=Math.round(S.kmh||0);$('gear').textContent=(S.vf||0)<-0.5?'R':S.gear;$('rpm').firstChild.style.width=(S.rpm*100)+'%';}
let last=performance.now(),acc=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused&&!garageOpen)updateWeather(dt);
 if(running&&!paused&&!garageOpen){
  if(countdown>0){countdown-=dt;const n=Math.min(5,Math.floor((4.5-countdown)/0.7));lightsRow.forEach((b,i)=>{b.material.emissive.setHex(0xff0000);b.material.emissiveIntensity=(countdown>0&&i<n)?4:0;});if(countdown<=0)flashMsg('GO');}
  acc+=dt;while(acc>=1/120){updatePlayer(1/120);acc-=1/120;}
  updateRivals(dt);
  msgT-=dt;if(msgT<=0)$('msg').style.opacity=0;}
 syncCar();updateLamps();updateEnvAnim(dt,now);
 if(garageOpen){
  // orbit showcase around player car
  const t=now/1000*.35;camera.position.set(S.x+Math.sin(t)*6.5,2.4,S.z+Math.cos(t)*6.5);camera.lookAt(S.x,1.0,S.z);camera.fov=50;camera.updateProjectionMatrix();
  if(player.userData.cockpit)player.userData.cockpit.visible=false;
 }else if(!running){const t=now/1000*.12;camera.position.set(S.x+Math.sin(t*3)*10,2.6,S.z+Math.cos(t*3)*10);camera.lookAt(S.x,.9,S.z);}
 else updateCamera(dt);
 hud();renderer.render(scene,camera);requestAnimationFrame(loop);}
rivals.forEach(r=>{const k=Math.floor((r.s/LEN)*NS)%NS,o={};placeAt(k,r.lane,o);r.mesh.position.set(o.x,0,o.z);r.mesh.rotation.y=o.h;});
requestAnimationFrame(loop);
{const q=new URLSearchParams(location.search);if(q.get('start')){$('go').click();countdown=0;}if(q.get('wx')){const i=+q.get('wx');setW(i);wx.rain=wx.wet=WX[i].r;}if(q.get('tod')!=null)tod=Math.max(0,Math.min(2,+q.get('tod')));if(q.get('garage'))openGarage();}
