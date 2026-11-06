// Prestige GP: Absolute Chaos — original Three.js night-circuit GT simulation.
// All geometry is procedural; Three.js (MIT) is vendored in ./vendor.
import * as THREE from 'three';
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();const FOG=new THREE.Color(0x0b0d16);
scene.background=FOG.clone();scene.fog=new THREE.Fog(FOG,60,520);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1400);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- Lighting ----------
const hemi=new THREE.HemisphereLight(0x5a6c9a,0x15110c,.55);scene.add(hemi);
const moon=new THREE.DirectionalLight(0xc8d4ff,.6);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:300});scene.add(moon,moon.target);

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
function canvasTex(w,h,fn,rep){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const asphaltTex=canvasTex(256,512,(g,w,h)=>{g.fillStyle='#2b2c30';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const c=30+Math.random()*40|0;g.fillStyle=`rgb(${c},${c},${c+3})`;g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5);}
 g.fillStyle='rgba(15,15,15,.5)';g.fillRect(w*.35,0,w*.3,h); // rubbered racing line
 g.fillStyle='#d8d4c8';g.fillRect(3,0,4,h);g.fillRect(w-7,0,4,h);
 g.fillStyle='rgba(230,225,210,.7)';for(let y=0;y<h;y+=128)g.fillRect(w/2-2,y,4,60);});
const roadMat=new THREE.MeshStandardMaterial({map:asphaltTex,roughness:.92,metalness:0});
ribbon(-HALF,HALF,0.02,roadMat,20);
const kerbTex=canvasTex(16,64,(g,w,h)=>{g.fillStyle='#b3121b';g.fillRect(0,0,w,h/2);g.fillStyle='#eee';g.fillRect(0,h/2,w,h/2);});
const kerbMat=new THREE.MeshStandardMaterial({map:kerbTex,roughness:.7});
ribbon(HALF,HALF+KERB,0.05,kerbMat,3);ribbon(-HALF-KERB,-HALF,0.05,kerbMat,3);
const grassTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#16261a';g.fillRect(0,0,w,h);for(let i=0;i<3000;i++){g.fillStyle=`rgba(${20+Math.random()*30|0},${45+Math.random()*40|0},${25+Math.random()*20|0},.8)`;g.fillRect(Math.random()*w,Math.random()*h,1,2);}});
const runMat=new THREE.MeshStandardMaterial({map:grassTex,roughness:1});
ribbon(HALF+KERB,WALL,0.01,runMat,8);ribbon(-WALL,-HALF-KERB,0.01,runMat,8);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0x0c100d,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// Armco walls (both sides) — vertical ribbons
function wall(off,h,mat){const pos=[],idx=[];for(let i=0;i<=NS;i++){const k=i%NS,p=P[k],n=NM[k],x=p.x+n.x*off,z=p.z+n.z*off;pos.push(x,0,z,x,h,z);if(i<NS){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;scene.add(m);}
const armco=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:.8,roughness:.35,side:THREE.DoubleSide});
const tyreWall=new THREE.MeshStandardMaterial({color:0x101012,roughness:.9,side:THREE.DoubleSide});
wall(WALL,1.1,armco);wall(-WALL,1.1,armco);wall(WALL+.3,0.5,tyreWall);wall(-WALL-.3,0.5,tyreWall);
// Light poles: emissive heads on many, real PointLights on a few near the car (pooled)
const poleGeo=new THREE.CylinderGeometry(.12,.16,12,6),headGeo=new THREE.BoxGeometry(1.6,.3,.6);
const poleMat=new THREE.MeshStandardMaterial({color:0x2a2c30,metalness:.6,roughness:.5}),headMat=new THREE.MeshStandardMaterial({color:0xffe3b0,emissive:0xffd59a,emissiveIntensity:3});
const lampPos=[];
for(let i=0;i<NS;i+=28){const s=(i/28)%2?1:-1,p=P[i],n=NM[i],x=p.x+n.x*(WALL+1.5)*s,z=p.z+n.z*(WALL+1.5)*s;
 const pole=new THREE.Mesh(poleGeo,poleMat);pole.position.set(x,6,z);scene.add(pole);
 const hd=new THREE.Mesh(headGeo,headMat);hd.position.set(x-n.x*s*1.2,12,z-n.z*s*1.2);hd.lookAt(p.x,0,p.z);scene.add(hd);
 lampPos.push(new THREE.Vector3(x-n.x*s*2.5,11,z-n.z*s*2.5));}
const lampLights=[];for(let i=0;i<6;i++){const L=new THREE.PointLight(0xffd8a0,180,60,1.6);scene.add(L);lampLights.push(L);}
// Start gantry + grid boxes + grandstands + pit building
const startI=0,sp=P[startI],sn=NM[startI],st=TG[startI];
const chk=canvasTex(64,16,(g,w,h)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){g.fillStyle=(x+y)%2?'#111':'#eee';g.fillRect(x*4,y*4,4,4);}});
const line=new THREE.Mesh(new THREE.PlaneGeometry(HALF*2,1.4),new THREE.MeshStandardMaterial({map:chk,roughness:.8}));line.rotation.x=-Math.PI/2;line.rotation.z=-Math.atan2(st.z,st.x)+Math.PI/2;line.position.set(sp.x,.04,sp.z);scene.add(line);
const gant=new THREE.Group();const gm=new THREE.MeshStandardMaterial({color:0x1a1b1f,metalness:.7,roughness:.4});
for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.6,8,.6),gm);leg.position.set(0,4,s*(WALL-1));gant.add(leg);}
const beam=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.6,WALL*2),gm);beam.position.y=8;gant.add(beam);
const banner=new THREE.Mesh(new THREE.PlaneGeometry(WALL*1.6,1.2),new THREE.MeshBasicMaterial({map:canvasTex(1024,80,(g,w,h)=>{g.fillStyle='#0b0b0e';g.fillRect(0,0,w,h);g.fillStyle='#c9a45c';g.font='600 40px Segoe UI,sans-serif';g.textAlign='center';g.fillText('PRESTIGE GP · START / FINISH',w/2,56);})}));
banner.position.set(-.62,8,0);banner.rotation.y=-Math.PI/2;gant.add(banner);
const lightsRow=[];for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshStandardMaterial({color:0x220000,emissive:0xff0000,emissiveIntensity:0}));b.position.set(-.7,9.2,(i-2)*1.2);gant.add(b);lightsRow.push(b);}
gant.position.copy(sp);gant.rotation.y=-Math.atan2(st.z,st.x);scene.add(gant);
function building(i,side,len,h,d,col,winCol){const p=P[i],n=NM[i],t=TG[i],o=WALL+3+d/2,g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(len,h,d),new THREE.MeshStandardMaterial({color:col,roughness:.8}));body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
 const win=new THREE.Mesh(new THREE.PlaneGeometry(len*.92,h*.3),new THREE.MeshStandardMaterial({color:0x111,emissive:winCol,emissiveIntensity:1.2}));win.position.set(0,h*.65,-side*(d/2+.02));if(side>0)win.rotation.y=Math.PI;g.add(win);
 g.position.set(p.x+n.x*o*side,0,p.z+n.z*o*side);g.rotation.y=-Math.atan2(t.z,t.x);scene.add(g);}
function grandstand(i,side,len){const p=P[i],n=NM[i],t=TG[i],g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x2a2d33,roughness:.9}),seat=new THREE.MeshStandardMaterial({color:0x5a1015,roughness:.8});
 for(let r=0;r<7;r++){const s=new THREE.Mesh(new THREE.BoxGeometry(len,.8,1.4),r%2?m:seat);s.position.set(0,.4+r*.8,side*(r*1.4));s.castShadow=s.receiveShadow=true;g.add(s);}
 const roof=new THREE.Mesh(new THREE.BoxGeometry(len,.3,11),m);roof.position.set(0,8.5,side*4.5);g.add(roof);
 g.position.set(p.x+n.x*(WALL+3)*side,0,p.z+n.z*(WALL+3)*side);g.rotation.y=-Math.atan2(t.z,t.x);scene.add(g);}
building(NS-40,-1,70,7,12,0x1c1d22,0xbfd6ff);grandstand(40,1,60);grandstand(NS-120,1,50);grandstand(Math.round(NS*.36),-1,40);
// city skyline far away
const sky=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x0e1018,emissive:0x1a1508,emissiveIntensity:.6}),160);const dm=new THREE.Object3D();
for(let i=0;i<160;i++){const a=Math.random()*Math.PI*2,r=420+Math.random()*200,h=20+Math.random()*90;dm.position.set(60+Math.cos(a)*r,h/2,220+Math.sin(a)*r);dm.scale.set(15+Math.random()*25,h,15+Math.random()*25);dm.updateMatrix();sky.setMatrixAt(i,dm.matrix);}scene.add(sky);

// ---------- GT car (procedural, many parts) ----------
function makeCar(paint,number){
 const car=new THREE.Group(),body=new THREE.Group();car.add(body);
 const paintM=new THREE.MeshPhysicalMaterial({color:paint,metalness:.6,roughness:.28,clearcoat:1,clearcoatRoughness:.06});
 const black=new THREE.MeshStandardMaterial({color:0x0b0b0d,roughness:.5,metalness:.3});
 const gold=new THREE.MeshStandardMaterial({color:0xc9a45c,metalness:1,roughness:.3});
 const glass=new THREE.MeshPhysicalMaterial({color:0x0a0d12,metalness:.1,roughness:.05,transmission:0,transparent:true,opacity:.82,clearcoat:1});
 const add=(geo,m,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
 // lower body via extruded side profile (length along Z, forward = -Z)
 const sh=new THREE.Shape();sh.moveTo(-2.25,.28);sh.lineTo(2.2,.28);sh.quadraticCurveTo(2.35,.32,2.32,.55);sh.lineTo(2.1,.78);sh.quadraticCurveTo(1.2,.92,.55,.98);sh.lineTo(-1.5,1.0);sh.quadraticCurveTo(-2.2,.98,-2.28,.75);sh.lineTo(-2.25,.28);
 const ex=new THREE.ExtrudeGeometry(sh,{depth:1.86,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:4,curveSegments:16});ex.translate(0,0,-.93);ex.rotateY(Math.PI/2);
 add(ex,paintM,0,0,0);
 // cabin greenhouse
 const cs=new THREE.Shape();cs.moveTo(.55,0);cs.quadraticCurveTo(.1,.42,-.2,.5);cs.lineTo(-1.05,.48);cs.quadraticCurveTo(-1.6,.3,-1.75,0);cs.lineTo(.55,0);
 const cg=new THREE.ExtrudeGeometry(cs,{depth:1.36,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3,curveSegments:12});cg.translate(0,0,-.68);cg.rotateY(Math.PI/2);
 const cabin=add(cg,glass,0,.98,0);
 const roof=add(new THREE.BoxGeometry(1.2,.05,1.0),paintM,0,1.47,.62);
 // gold pinstripe + number roundel
 add(new THREE.BoxGeometry(.06,.02,4.2),gold,.25,1.0,0);add(new THREE.BoxGeometry(.06,.02,4.2),gold,-.25,1.0,0);
 const numT=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#f2efe6';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.fillStyle='#111';g.font='bold 72px Segoe UI,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(number,64,68);});
 for(const s of[-1,1]){const r=new THREE.Mesh(new THREE.CircleGeometry(.32,24),new THREE.MeshStandardMaterial({map:numT,roughness:.5}));r.position.set(s*1.025,.62,.1);r.rotation.y=s*Math.PI/2;body.add(r);}
 // splitter, diffuser, side skirts, wing
 add(new THREE.BoxGeometry(2.0,.05,.35),black,0,.24,-2.35);add(new THREE.BoxGeometry(1.9,.18,.3),black,0,.35,2.3);
 for(const s of[-1,1])add(new THREE.BoxGeometry(.08,.12,2.6),black,s*1.02,.3,0);
 add(new THREE.BoxGeometry(2.0,.06,.42),black,0,1.32,2.05);for(const s of[-1,1]){add(new THREE.BoxGeometry(.04,.36,.2),black,s*.55,1.13,2.05);add(new THREE.BoxGeometry(.04,.3,.5),black,s*1.0,1.32,2.05);}
 // mirrors
 for(const s of[-1,1]){add(new THREE.BoxGeometry(.18,.12,.08),paintM,s*1.03,1.08,-.55);}
 // lights
 const hlM=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xf4f6ff,emissiveIntensity:3}),tlM=new THREE.MeshStandardMaterial({color:0x300000,emissive:0xff1010,emissiveIntensity:1.5});
 for(const s of[-1,1]){const h=add(new THREE.BoxGeometry(.42,.08,.1),hlM,s*.68,.72,-2.3);h.rotation.y=-s*.2;add(new THREE.BoxGeometry(.5,.07,.06),tlM,s*.62,.86,2.31);}
 // grille/intakes
 add(new THREE.BoxGeometry(1.2,.16,.06),black,0,.45,-2.33);
 // driver: helmet (dark, gold visor stripe), shoulders in race suit
 const helm=add(new THREE.SphereGeometry(.17,16,12),new THREE.MeshPhysicalMaterial({color:0x14151a,clearcoat:1,roughness:.3}),.28,1.25,-.15);
 add(new THREE.BoxGeometry(.25,.07,.06),new THREE.MeshStandardMaterial({color:0x0a0a0a,metalness:.9,roughness:.1}),.28,1.27,-.31);
 add(new THREE.BoxGeometry(.42,.2,.3),new THREE.MeshStandardMaterial({color:0x2a0a0d,roughness:.8}),.28,1.05,-.05);
 // wheels
 const tyreG=new THREE.CylinderGeometry(.36,.36,.3,28);tyreG.rotateZ(Math.PI/2);
 const rimG=new THREE.CylinderGeometry(.25,.25,.31,20);rimG.rotateZ(Math.PI/2);
 const tyreM=new THREE.MeshStandardMaterial({color:0x111111,roughness:.85}),rimM=new THREE.MeshStandardMaterial({color:0x1c1c20,metalness:.95,roughness:.25});
 const spokeG=new THREE.BoxGeometry(.32,.05,.44);
 const wheels=[];
 for(const [x,z,front] of [[-.9,-1.45,1],[.9,-1.45,1],[-.9,1.42,0],[.9,1.42,0]]){
  const piv=new THREE.Group();piv.position.set(x,.36,z);car.add(piv);const spin=new THREE.Group();piv.add(spin);
  const t=new THREE.Mesh(tyreG,tyreM);t.castShadow=true;spin.add(t);spin.add(new THREE.Mesh(rimG,rimM));
  for(let k=0;k<5;k++){const s=new THREE.Mesh(spokeG,gold);s.rotation.x=k*Math.PI/5*2;s.position.x=Math.sign(x)*.02;s.scale.set(1,1,1);spin.add(s);}
  const cal=new THREE.Mesh(new THREE.BoxGeometry(.06,.18,.2),new THREE.MeshStandardMaterial({color:0xb3121b}));cal.position.set(-Math.sign(x)*.1,.1,0);piv.add(cal);
  wheels.push({piv,spin,front});}
 // headlight beams
 const head=new THREE.SpotLight(0xf2f4ff,0,90,.42,.5,1.2);head.position.set(0,.8,-2.2);head.target.position.set(0,0,-30);car.add(head,head.target);
 car.userData={body,wheels,head,tlM};scene.add(car);return car;}
const player=makeCar(0x5a0a10,'1');player.userData.head.intensity=0;player.userData.head.castShadow=true;

// rivals: same top speed and acceleration as the player
const RIV=[{c:0x101114,n:'7',name:'A. LINDQVIST'},{c:0x1b2230,n:'22',name:'M. ROSSETTI'},{c:0x3a3a40,n:'44',name:'K. TANAKA'}];
const rivals=RIV.map((r,i)=>{const m=makeCar(r.c,r.n);m.userData.head.intensity=0;return {mesh:m,s:(18+i*16)%LEN,lane:(i%2?-2.5:2.5),v:0,name:r.name,num:r.n};});
const TOP_MS=260/3.6; // matches player sixth-gear cap
let lampI=180;

// ---------- Weather ----------
const WX=[{n:'DRY',r:0,t:22},{n:'DRIZZLE',r:.3,t:18},{n:'RAIN',r:.65,t:15},{n:'STORM',r:1,t:12}];
const wx={idx:0,rain:0,target:0,temp:22,wet:0,auto:70+Math.random()*50,flash:0,nextL:4};
const setW=i=>{wx.idx=i;wx.target=WX[i].r;flashMsg('FORECAST · '+WX[i].n);};
const cycleW=()=>{setW((wx.idx+1)%4);wx.auto=70+Math.random()*60;};
const TOD=['DAY','DUSK','NIGHT'];
let tod=0; // start in daylight
const cycleTod=()=>{tod=(tod+1)%3;flashMsg(TOD[tod]);};
const wxName=r=>r<.12?'DRY':r<.45?'DRIZZLE':r<.85?'RAIN':'STORM';
const RN=2600,rainPos=new Float32Array(RN*6),rainV=new Float32Array(RN);
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.LineBasicMaterial({color:0xaab8d8,transparent:true,opacity:0,depthWrite:false});
const rain=new THREE.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);
for(let i=0;i<RN;i++){rainV[i]=24+Math.random()*10;const x=(Math.random()-.5)*70,y=Math.random()*30,z=(Math.random()-.5)*70;rainPos.set([x,y,z,x+.1,y+.9,z],i*6);}
const SPN=500,spPos=new Float32Array(SPN*3),spVel=new Float32Array(SPN*3),spLife=new Float32Array(SPN);let spI=0;
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));
const spray=new THREE.Points(spGeo,new THREE.PointsMaterial({color:0xc8d0e0,size:.35,transparent:true,opacity:.35,depthWrite:false}));spray.frustumCulled=false;scene.add(spray);
for(let i=0;i<SPN;i++)spPos[i*3+1]=-50;

// ---------- Player physics ----------
const S={x:0,z:0,h:0,vx:0,vz:0,yaw:0,steer:0,thr:0,brk:0,gear:1,rpm:0,hint:0,lap:0,lapT:0,best:null,last:null,prog:0,started:false,wheelRot:0,pitch:0,roll:0,lastS:0};
const GEARS=[0,62,98,135,172,212,260]; // upper km/h per gear
function placeAt(sIdx,lane,o){const p=P[sIdx],n=NM[sIdx],t=TG[sIdx];o.x=p.x+n.x*lane;o.z=p.z+n.z*lane;o.h=Math.atan2(-t.x,-t.z);}
function resetPlayer(){const i=NS-Math.round(20/LEN*NS);placeAt(i,-2.5,S);S.vx=S.vz=S.yaw=0;S.hint=i;S.prog=i;S.lap=0;S.lapT=0;S.started=false;}
resetPlayer();
function nearest(x,z,hint){let best=1e9,bi=hint;for(let j=-40;j<=40;j++){const q=(hint+j+NS)%NS,dx=P[q].x-x,dz=P[q].z-z,d=dx*dx+dz*dz;if(d<best){best=d;bi=q;}}
 const lat=(x-P[bi].x)*NM[bi].x+(z-P[bi].z)*NM[bi].z;return[bi,lat];}
const K={};let TC={};
addEventListener('keydown',e=>{K[e.code]=1;if(e.code==='KeyQ')cycleW();if(e.code==='KeyT')cycleTod();if(e.code==='KeyC')camMode=(camMode+1)%3;if(e.code==='Escape'||e.code==='KeyP')togP();if(/Arrow|Space/.test(e.code))e.preventDefault();audioInit();});
addEventListener('keyup',e=>{K[e.code]=0;});
function hold(id,k){const el=$(id);const on=e=>{e.preventDefault();TC[k]=1;audioInit();},off=e=>{e.preventDefault();TC[k]=0;};el.addEventListener('touchstart',on);el.addEventListener('touchend',off);el.addEventListener('touchcancel',off);}
hold('tL','l');hold('tR','r');hold('tB','b');hold('tG','g');
if('ontouchstart' in window||navigator.maxTouchPoints>0)$('touch').classList.remove('hide');
let camMode=0,running=false,paused=false,countdown=0;
function togP(){if(!running)return;paused=!paused;$('pause').classList.toggle('hide',!paused);}
$('go').onclick=()=>{$('title').classList.add('hide');running=true;resetPlayer();countdown=4.5;audioInit();};
$('res').onclick=togP;$('bp').onclick=togP;$('bw').onclick=cycleW;$('bt').onclick=cycleTod;$('bc').onclick=()=>camMode=(camMode+1)%3;
let msgT=0;function flashMsg(t){$('msg').textContent=t;$('msg').style.opacity=1;msgT=2.2;}

// simple engine audio
let AC,osc,osc2,gainN;function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();osc=AC.createOscillator();osc2=AC.createOscillator();osc.type='sawtooth';osc2.type='square';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=900;gainN=AC.createGain();gainN.gain.value=0;osc.connect(f);osc2.connect(f);f.connect(gainN);gainN.connect(AC.destination);osc.start();osc2.start();}catch(e){}}

function updatePlayer(dt){
 const go=countdown<=0;
 const up=go&&(K.KeyW||K.ArrowUp||TC.g),dn=K.KeyS||K.ArrowDown||TC.b||!go,lf=K.KeyA||K.ArrowLeft||TC.l,rt=K.KeyD||K.ArrowRight||TC.r;
 S.thr+=((up?1:0)-S.thr)*Math.min(1,dt*6);S.brk+=((dn?1:0)-S.brk)*Math.min(1,dt*8);
 const fx=-Math.sin(S.h),fz=-Math.cos(S.h); // forward
 const rx=-fz,rz=fx; // right
 let vf=S.vx*fx+S.vz*fz,vl=S.vx*rx+S.vz*rz;const kmh=Math.abs(vf)*3.6;
 const [ni,lat]=nearest(S.x,S.z,S.hint);S.hint=ni;const alat=Math.abs(lat);
 const surf=alat<=HALF+KERB?1:.5; // grass/gravel
 const wetFactor=1-.45*wx.wet, tempF=wx.temp<10?.95:1;
 const mu=1.25*wetFactor*tempF*surf; // peak lateral g
 // gearbox
 while(S.gear<6&&kmh>GEARS[S.gear]-2)S.gear++;while(S.gear>1&&kmh<GEARS[S.gear-1]-12)S.gear--;
 const lo=GEARS[S.gear-1],hi=GEARS[S.gear];S.rpm=Math.min(1,.25+.75*(kmh-lo)/(hi-lo+1e-3));
 const gearForce=[0,9.5,7.6,6.2,5.0,4.0,3.1][S.gear];
 let a=S.thr*gearForce*(kmh<GEARS[6]?1:0)*Math.min(1,.35+surf);
 const tractionLimit=mu*9.81;a=Math.min(a,tractionLimit*1.05);
 if(S.brk>.05){if(vf>.5)a-=S.brk*Math.min(11.5,mu*9.81*1.0);else if(!up&&go)a-=4;}
 a-=0.00042*vf*Math.abs(vf)+.15*Math.sign(vf)+(surf<1?1.6*Math.sign(vf):0);
 const pvf=vf;vf+=a*dt;if(pvf>0&&vf<0&&!(S.brk>.05&&!up&&go&&pvf<.6))vf=Math.max(vf,0);if(vf<-6)vf=-6;
 // steering: speed sensitive lock
 const target=((rt?1:0)-(lf?1:0));S.steer+=(target-S.steer)*Math.min(1,dt*(target?5:7));
 const lock=.5/(1+kmh/55);const steerAng=S.steer*lock;
 let yawT=vf*Math.tan(steerAng)/2.65;
 const maxYaw=mu*9.81/Math.max(3,Math.abs(vf));const over=Math.abs(yawT)>maxYaw;
 if(over)yawT=Math.sign(yawT)*(maxYaw+(Math.abs(yawT)-maxYaw)*.35); // slide: car rotates less than asked
 S.yaw+=(yawT-S.yaw)*Math.min(1,dt*(6*wetFactor+2));
 S.h-=S.yaw*dt;
 // lateral slip: centripetal requirement vs grip
 const latDemand=S.yaw*vf;vl+=(latDemand-0)*0; vl*=Math.exp(-dt*(7*mu));
 if(over)vl+=-Math.sign(S.yaw)*(Math.abs(yawT)-maxYaw)*Math.abs(vf)*.04*dt*20*(1.2-wetFactor+.3);
 const nfx=-Math.sin(S.h),nfz=-Math.cos(S.h),nrx=-nfz,nrz=nfx;
 S.vx=nfx*vf+nrx*vl;S.vz=nfz*vf+nrz*vl;S.x+=S.vx*dt;S.z+=S.vz*dt;
 // walls
 const [ni2,lat2]=nearest(S.x,S.z,S.hint);if(Math.abs(lat2)>WALL-1.1){const s=Math.sign(lat2),push=Math.abs(lat2)-(WALL-1.1);S.x-=NM[ni2].x*s*push;S.z-=NM[ni2].z*s*push;
  const vn=S.vx*NM[ni2].x+S.vz*NM[ni2].z;if(vn*s>0){S.vx-=NM[ni2].x*vn*1.3;S.vz-=NM[ni2].z*vn*1.3;}S.vx*=.86;S.vz*=.86;if(Math.abs(vn)>5)flashMsg('CONTACT');}
 // body dynamics (visual)
 S.pitch+=((-a*.006)-S.pitch)*Math.min(1,dt*5);S.roll+=((-S.yaw*vf*.0045)-S.roll)*Math.min(1,dt*5);
 S.wheelRot+=vf*dt/.36;S.steerVis=steerAng;S.slip=Math.abs(vl)+(over?3:0);S.vf=vf;S.kmh=kmh;S.grip=wetFactor*tempF*surf;S.off=surf<1;
 // lap timing
 if(go){S.lapT+=dt;const d=ni2-S.prog;if(d<-NS/2){if(S.started){S.last=S.lapT;const pb=!S.best||S.lapT<S.best;if(pb)S.best=S.lapT;flashMsg((pb?'PERSONAL BEST  ':'LAP  ')+ft(S.lapT));}S.started=true;S.lap++;S.lapT=0;}
  if(d>NS/2){/* went backwards over line */S.lap=Math.max(0,S.lap-1);}S.prog=ni2;}
 // spray
 if(wx.wet>.15&&Math.abs(vf)>14){const n=Math.min(10,Math.floor(Math.abs(vf)*wx.wet/4));for(let k=0;k<n;k++){const i=spI++%SPN,side=k%2?1:-1;
  spPos[i*3]=S.x-nfx*2.3+nrx*.9*side;spPos[i*3+1]=.2;spPos[i*3+2]=S.z-nfz*2.3+nrz*.9*side;spVel[i*3]=-nfx*vf*.15+(Math.random()-.5)*3;spVel[i*3+1]=1+Math.random()*2.5;spVel[i*3+2]=-nfz*vf*.15+(Math.random()-.5)*3;spLife[i]=.7;}}
 if(AC){osc.frequency.value=60+S.rpm*190;osc2.frequency.value=30+S.rpm*95;gainN.gain.value=running&&!paused?.035+S.thr*.05:0;}
}
function updateRivals(dt){if(countdown>0)return;
 const wetFactor=1-.45*wx.wet,tempF=wx.temp<10?.95:1,mu=1.25*wetFactor*tempF,look=36;
 for(const r of rivals){const i=Math.floor((r.s/LEN)*NS)%NS;
  // same top speed as the player; slow only to the same grip-limited corner speed
  const j=(i+look)%NS,dot=Math.max(-1,Math.min(1,TG[i].dot(TG[j]))),ang=Math.acos(dot),dist=LEN*look/NS;
  const radius=ang>0.015?dist/ang:1e6,vmax=Math.min(TOP_MS,Math.sqrt(mu*9.81*Math.max(10,radius)));
  r.v+=Math.max(-11.5*dt,Math.min(9.5*dt,vmax-r.v));r.s=(r.s+r.v*dt+LEN)%LEN;r.lane+=(Math.sin(r.s*.01)*2-r.lane)*dt*.3;
  // keep out of player's way roughly: simple separation
  const k=Math.floor((r.s/LEN)*NS)%NS,o={};placeAt(k,r.lane,o);const dx=o.x-S.x,dz=o.z-S.z,d=Math.hypot(dx,dz);
  if(d<4.2){const pk=(o.x-S.x)/d,pz=(o.z-S.z)/d;S.vx-=pk*2;S.vz-=pz*2;r.v*=.97;}
  r.mesh.position.set(o.x,0,o.z);r.mesh.rotation.y=o.h;for(const w of r.mesh.userData.wheels){w.spin.rotation.x-=r.v*dt/.36;}}}
function syncCar(){const c=player,u=c.userData;c.position.set(S.x,0,S.z);c.rotation.y=S.h;u.body.rotation.set(S.pitch,0,S.roll);
 for(const w of u.wheels){w.spin.rotation.x=-S.wheelRot;if(w.front)w.piv.rotation.y=-S.steerVis*1.4;}
 u.tlM.emissiveIntensity=S.brk>.1?6:1.5;}
// camera
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();let camInit=false;
function updateCamera(dt){const fx=-Math.sin(S.h),fz=-Math.cos(S.h);let des,look;
 if(camMode===0){const back=6.6+Math.min(2,Math.abs(S.vf||0)/40);des=new THREE.Vector3(S.x-fx*back,2.4,S.z-fz*back);look=new THREE.Vector3(S.x+fx*6,1.0,S.z+fz*6);}
 else if(camMode===1){des=new THREE.Vector3(S.x+fx*.2,1.28,S.z+fz*.2);look=new THREE.Vector3(S.x+fx*20,1.0,S.z+fz*20);}
 else{const i=(S.hint+30)%NS,p=P[i],n=NM[i];des=new THREE.Vector3(p.x+n.x*(WALL+4),6,p.z+n.z*(WALL+4));look=new THREE.Vector3(S.x,.8,S.z);}
 if(!camInit||camMode!==0){camPos.copy(des);camLook.copy(look);camInit=true;}else{camPos.lerp(des,1-Math.exp(-dt*7));camLook.lerp(look,1-Math.exp(-dt*10));}
 if(camMode===2&&Math.hypot(camPos.x-S.x,camPos.z-S.z)<1){}
 camera.position.copy(camPos);camera.lookAt(camLook);
 camera.fov=62+Math.min(10,(S.kmh||0)/25);camera.updateProjectionMatrix();
 player.visible=true;}
function updateWeather(dt){
 wx.auto-=dt;if(wx.auto<=0){let n=wx.idx+(Math.random()<.55?1:-1);if(n<0)n=1;if(n>3)n=2;setW(n);wx.auto=60+Math.random()*80;}
 wx.rain+=(wx.target-wx.rain)*Math.min(1,dt/10);
 if(wx.rain>wx.wet+.001)wx.wet=Math.min(wx.rain,wx.wet+dt/70);else wx.wet=Math.max(wx.rain,wx.wet-dt/120);
 wx.temp+=(WX[wx.idx].t-wx.temp)*dt/50;
 if(wx.rain>.8){wx.nextL-=dt;if(wx.nextL<0){wx.flash=1;wx.nextL=5+Math.random()*10;}}wx.flash=Math.max(0,wx.flash-dt*3);
 const w=wx.wet;roadMat.roughness=.92-.72*w;roadMat.metalness=.25*w;roadMat.color.setScalar(1-.45*w);kerbMat.roughness=.7-.5*w;runMat.color.setScalar(1-.3*w);
 // sky, sun and lamps follow time of day; rain still greys the sky
 const rain=wx.rain,flash=wx.flash;
 let skyC,sunI,hemiI,exp,headP,headR,skyEm,gndC;
 if(tod===0){ // DAY
  skyC=new THREE.Color(0x7eb3d8).lerp(new THREE.Color(0x6a7c8c),rain);
  scene.fog.near=90-35*rain;scene.fog.far=1200-550*rain;
  hemi.color.set(0xa8d0f0);hemi.groundColor.set(0x7a6a48);hemiI=1.45-.5*rain+flash*2;
  moon.color.set(0xfff1c4);sunI=2.45*(1-.82*rain)+flash*3;exp=1.04;
  headMat.emissiveIntensity=.06;lampI=0;headP=0;headR=0;
  sky.material.color.set(0x5a6573);skyEm=0;gndC=new THREE.Color(0x3a5532).lerp(new THREE.Color(0x1c2a1c),rain*.4);
 }else if(tod===1){ // DUSK
  skyC=new THREE.Color(0xc47a4a).lerp(new THREE.Color(0x4a4558),rain);
  scene.fog.near=70-30*rain;scene.fog.far=700-280*rain;
  hemi.color.set(0xe8a878);hemi.groundColor.set(0x4a3020);hemiI=.95-.3*rain+flash*2;
  moon.color.set(0xffc088);sunI=1.2*(1-.7*rain)+flash*3;exp=1.12;
  headMat.emissiveIntensity=1.6;lampI=90;headP=140;headR=70;
  sky.material.color.set(0x2a2832);sky.material.emissive.setHex(0x3a2010);skyEm=.35;gndC=new THREE.Color(0x243022);
 }else{ // NIGHT
  skyC=FOG.clone().lerp(new THREE.Color(0x141a24),rain);
  scene.fog.near=60-40*rain;scene.fog.far=520-300*rain;
  hemi.color.set(0x5a6c9a);hemi.groundColor.set(0x15110c);hemiI=.55-.2*rain+flash*3;
  moon.color.set(0xc8d4ff);sunI=.6*(1-.7*rain)+flash*4;exp=1.1;
  headMat.emissiveIntensity=3;lampI=180*(1+.4*wx.wet);headP=260;headR=120;
  sky.material.color.set(0x0e1018);sky.material.emissive.setHex(0x1a1508);skyEm=.6;gndC=new THREE.Color(0x0c100d);
 }
 scene.fog.color.copy(skyC);scene.background.copy(skyC);
 hemi.intensity=hemiI;moon.intensity=sunI;renderer.toneMappingExposure=exp;
 player.userData.head.intensity=headP;rivals.forEach(r=>r.mesh.userData.head.intensity=headR);
 sky.material.emissiveIntensity=skyEm;ground.material.color.copy(gndC);
 rainMat.opacity=Math.min(.55,wx.rain*.7);rain.visible=wx.rain>.02;
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
 if(tod===0)moon.position.set(S.x+90,200,S.z+55);
 else if(tod===1)moon.position.set(S.x+130,42,S.z+25);
 else moon.position.set(S.x+40,80,S.z+30);
 moon.target.position.set(S.x,0,S.z);}
const ft=t=>{if(t==null)return'–:––.–––';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(3);};
function hud(){
 $('tl').innerHTML=`<div><span class="k">LAP</span>${Math.max(1,S.lap)}</div><div><span class="k">TIME</span>${ft(S.lapT)}</div><div><span class="k">LAST</span>${ft(S.last)}</div><div><span class="k">BEST</span>${ft(S.best)}</div>`+
 `<div style="margin-top:6px"><span class="k">LIGHT</span>${TOD[tod]}</div><div><span class="k">WEATHER</span>${wxName(wx.rain)}${Math.abs(wx.target-wx.rain)>.05?' → '+WX[wx.idx].n:''}</div><div><span class="k">WET</span>${Math.round(wx.wet*100)}% · ${wx.temp.toFixed(0)}°C</div><div><span class="k">GRIP</span>${Math.round((S.grip||1)*100)}%${S.off?' · OFF TRACK':''}</div>`;
 $('kmh').textContent=Math.round(S.kmh||0);$('gear').textContent=(S.vf||0)<-0.5?'R':S.gear;$('rpm').firstChild.style.width=(S.rpm*100)+'%';}
let last=performance.now(),acc=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused)updateWeather(dt);
 if(running&&!paused){
  if(countdown>0){const prev=Math.ceil(countdown-.5);countdown-=dt;const n=Math.min(5,Math.floor((4.5-countdown)/0.7));lightsRow.forEach((b,i)=>b.material.emissiveIntensity=(countdown>0&&i<n)?4:0);if(countdown<=0)flashMsg('GO');}
  // fixed-step physics for stability
  acc+=dt;while(acc>=1/120){updatePlayer(1/120);acc-=1/120;}
  updateRivals(dt);
  msgT-=dt;if(msgT<=0)$('msg').style.opacity=0;}
 else if(!running){S.h+=0;}
 syncCar();updateLamps();
 if(!running){const t=now/1000*.12,i=Math.floor((t%1)*NS);const p=P[(Math.floor(NS*.02)+0)%NS];camera.position.set(S.x+Math.sin(t*3)*9,2.2,S.z+Math.cos(t*3)*9);camera.lookAt(S.x,.8,S.z);}
 else updateCamera(dt);
 hud();renderer.render(scene,camera);requestAnimationFrame(loop);}
// place rivals initially
rivals.forEach(r=>{const k=Math.floor((r.s/LEN)*NS)%NS,o={};placeAt(k,r.lane,o);r.mesh.position.set(o.x,0,o.z);r.mesh.rotation.y=o.h;});
requestAnimationFrame(loop);
// URL options (testing / sharing): ?start=1 skips the title; &wx=0..3 sets weather and soaks the track instantly
{const q=new URLSearchParams(location.search);if(q.get('start')){$('go').click();countdown=0;}if(q.get('wx')){const i=+q.get('wx');setW(i);wx.rain=wx.wet=WX[i].r;}if(q.get('tod')!=null)tod=Math.max(0,Math.min(2,+q.get('tod')));}
