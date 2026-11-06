(function(){
"use strict";
var cv=document.getElementById('c'),g=cv.getContext('2d'),W,H,DPR;
function rs(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;}
addEventListener('resize',rs);rs();
// Track: smooth closed loop from control points (metres)
var CP=[[0,0],[600,0],[760,80],[800,260],[700,420],[480,440],[420,560],[520,700],[480,860],[200,900],[-120,860],[-260,700],[-200,520],[-340,380],[-380,160],[-220,20]];
var T=[],N=0,HALF=34;
(function(){var n=CP.length;for(var i=0;i<n;i++){var p0=CP[(i-1+n)%n],p1=CP[i],p2=CP[(i+1)%n],p3=CP[(i+2)%n];
for(var s=0;s<20;s++){var t=s/20,t2=t*t,t3=t2*t;T.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}N=T.length;})();
var lamps=[];for(var i=0;i<N;i+=6){var a=T[i],b=T[(i+1)%N],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),s=(i/6)%2?1:-1;lamps.push([a[0]-dy/l*(HALF+14)*s,a[1]+dx/l*(HALF+14)*s]);}
var blds=[];for(i=0;i<N;i+=4){a=T[i];b=T[(i+1)%N];dx=b[0]-a[0];dy=b[1]-a[1];l=Math.hypot(dx,dy);for(var k=-1;k<=1;k+=2){var d=HALF+40+Math.random()*30;blds.push([a[0]-dy/l*d*k,a[1]+dx/l*d*k,20+Math.random()*25,Math.random()]);}}
blds=blds.filter(function(B){for(var j=0;j<N;j+=2)if(Math.hypot(T[j][0]-B[0],T[j][1]-B[1])<HALF+25)return false;return true;});
function nearest(x,y,hint){var best=1e9,bi=0;for(var j=-30;j<=30;j++){var q=(hint+j+N)%N,d=(T[q][0]-x)**2+(T[q][1]-y)**2;if(d<best){best=d;bi=q;}}return[bi,Math.sqrt(best)];}
// Weather
var WX=[{n:'Dry',r:0,t:24},{n:'Drizzle',r:.3,t:19},{n:'Rain',r:.65,t:16},{n:'Storm',r:1,t:13}];
var wx={idx:0,rain:0,target:0,temp:24,wet:0,auto:40+Math.random()*40,flash:0,nextL:5};
function setW(i){wx.idx=i;wx.target=WX[i].r;}
function cycleW(){setW((wx.idx+1)%4);wx.auto=60+Math.random()*60;}
function wxName(){var r=wx.rain;return r<.12?'Dry':r<.45?'Drizzle':r<.85?'Rain':'Storm';}
var drops=[];for(i=0;i<500;i++)drops.push([Math.random(),Math.random(),.6+Math.random()*.6]);
var spray=[];
// Car
var car={x:0,y:0,a:0,v:0,vx:0,vy:0,hint:0,lap:1,prog:0,best:null,lapT:0,steer:0};
function reset(){var a=T[0],b=T[1];car.x=a[0];car.y=a[1];car.a=Math.atan2(b[1]-a[1],b[0]-a[0]);car.vx=car.vy=0;car.hint=0;car.lap=1;car.prog=0;car.lapT=0;car.last=null;}
reset();
var K={};addEventListener('keydown',function(e){K[e.code]=1;if(e.code=='KeyQ')cycleW();if(e.code=='Escape'||e.code=='KeyP')togP();if(e.code.indexOf('Arrow')==0)e.preventDefault();});
addEventListener('keyup',function(e){K[e.code]=0;});
var TC={};function hold(id,k){var el=document.getElementById(id);el.addEventListener('touchstart',function(e){e.preventDefault();TC[k]=1;});el.addEventListener('touchend',function(e){e.preventDefault();TC[k]=0;});el.addEventListener('touchcancel',function(){TC[k]=0;});}
hold('tl','l');hold('tr','r');hold('tb','b');hold('tg','g');
if('ontouchstart' in window)document.getElementById('tch').classList.remove('hide');
var running=false,paused=false;
function togP(){if(!running)return;paused=!paused;document.getElementById('pause').classList.toggle('hide',!paused);}
document.getElementById('go').onclick=function(){document.getElementById('title').classList.add('hide');running=true;reset();};
document.getElementById('res').onclick=togP;document.getElementById('pbtn').onclick=togP;document.getElementById('wbtn').onclick=cycleW;
function update(dt){
 // weather evolves on its own
 wx.auto-=dt;if(wx.auto<=0){var n=wx.idx+(Math.random()<.5?-1:1);if(n<0)n=1;if(n>3)n=2;setW(n);wx.auto=50+Math.random()*70;}
 wx.rain+=(wx.target-wx.rain)*Math.min(1,dt/8);
 var wt=wx.rain>wx.wet?wx.rain:wx.rain*0.6; // drying is slower still
 var rate=wx.rain>wx.wet?1/70:1/120;            // ~70s to fully soak, never snaps
 wx.wet+=Math.max(-rate*dt,Math.min(rate*dt,wt-wx.wet));wx.wet=Math.max(0,Math.min(1,wx.wet));
 wx.temp+=(WX[wx.idx].t-wx.temp)*dt/40;
 if(wx.rain>.8){wx.nextL-=dt;if(wx.nextL<0){wx.flash=1;wx.nextL=6+Math.random()*12;}}wx.flash=Math.max(0,wx.flash-dt*2.5);
 // driving
 var up=K.KeyW||K.ArrowUp||TC.g,dn=K.KeyS||K.ArrowDown||TC.b,lf=K.KeyA||K.ArrowLeft||TC.l,rt=K.KeyD||K.ArrowRight||TC.r;
 var nr=nearest(car.x,car.y,car.hint);car.hint=nr[0];var off=nr[1]>HALF;
 var tempF=wx.temp<10?.95:1, grip=(1-0.45*wx.wet)*tempF*(off?.55:1);
 var fx=Math.cos(car.a),fy=Math.sin(car.a),fwd=car.vx*fx+car.vy*fy,lat=-car.vx*fy+car.vy*fx;
 var acc=0;if(up)acc+=off?9:15*(fwd<20?1:1-fwd/95);if(dn)acc-=fwd>1?32*(0.5+0.5*grip):8;
 acc-=fwd*(off?1.4:.06)+fwd*Math.abs(fwd)*.0009;
 fwd+=acc*dt;if(fwd<-10)fwd=-10;
 car.steer+=((rt?1:0)-(lf?1:0)-car.steer)*Math.min(1,dt*8);
 var sr=car.steer*Math.min(1,Math.abs(fwd)/8)*(1.9-Math.min(1,Math.abs(fwd)/90)*.9)*(fwd<0?-1:1);
 car.a+=sr*dt*(0.6+0.4*grip);
 lat*=Math.exp(-dt*9*grip); // tyre lateral bite
 fx=Math.cos(car.a);fy=Math.sin(car.a);
 car.vx=fx*fwd-fy*lat;car.vy=fy*fwd+fx*lat;car.x+=car.vx*dt;car.y+=car.vy*dt;car.v=Math.hypot(car.vx,car.vy);
 if(nr[1]>HALF+28){var p=T[nr[0]],k=(nr[1]-HALF-28)/nr[1];car.x+=(p[0]-car.x)*k;car.y+=(p[1]-car.y)*k;car.vx*=.5;car.vy*=.5;}
 // laps
 car.lapT+=dt;var d=nr[0]-car.prog;if(d<-N/2){if(car.prog>N*.8){car.lap++;car.last=car.lapT;if(!car.best||car.lapT<car.best)car.best=car.lapT;car.lapT=0;}}
 if(Math.abs(d)<N/2)car.prog=nr[0];else car.prog=nr[0];
 if(wx.wet>.15&&car.v>15)for(i=0;i<Math.floor(car.v*wx.wet/8);i++)spray.push([car.x-fx*10+(Math.random()-.5)*6,car.y-fy*10+(Math.random()-.5)*6,-car.vx*.3+(Math.random()-.5)*20,-car.vy*.3+(Math.random()-.5)*20,.6]);
 for(i=spray.length-1;i>=0;i--){var s=spray[i];s[0]+=s[2]*dt;s[1]+=s[3]*dt;s[4]-=dt;if(s[4]<=0)spray.splice(i,1);}
 if(spray.length>400)spray.splice(0,spray.length-400);
}
function ft(t){if(t==null)return'--:--.-';var m=Math.floor(t/60);return m+':'+('0'+(t%60).toFixed(1)).slice(-4);}
function draw(){
 g.setTransform(DPR,0,0,DPR,0,0);var w=wx.wet;
 g.fillStyle='rgb('+(14-6*w|0)+','+(16-6*w|0)+','+(24-6*w|0)+')';g.fillRect(0,0,W,H);
 var Z=Math.min(W,H)/300*(1.25-Math.min(.35,car.v/250));
 g.save();g.translate(W/2,H*.68);g.scale(Z,Z);g.rotate(-car.a-Math.PI/2);g.translate(-car.x,-car.y);
 // kerbs/road
 g.lineJoin='round';g.lineCap='round';
 function path(){g.beginPath();g.moveTo(T[0][0],T[0][1]);for(var j=1;j<N;j++)g.lineTo(T[j][0],T[j][1]);g.closePath();}
 path();g.strokeStyle='#2a2d36';g.lineWidth=HALF*2+20;g.stroke();
 path();g.setLineDash([8,8]);g.strokeStyle='#8a1f22';g.lineWidth=HALF*2+8;g.stroke();g.setLineDash([]);
 path();var rc=40-18*w;g.strokeStyle='rgb('+rc+','+rc+','+(rc+6)+')';g.lineWidth=HALF*2;g.stroke();
 path();g.setLineDash([14,22]);g.strokeStyle='rgba(230,225,210,'+(.35-.15*w)+')';g.lineWidth=1.5;g.stroke();g.setLineDash([]);
 // start line
 var a=T[0],b=T[1],ang=Math.atan2(b[1]-a[1],b[0]-a[0]);g.save();g.translate(a[0],a[1]);g.rotate(ang);for(var r=-HALF;r<HALF;r+=6)for(var c=0;c<2;c++){g.fillStyle=((r/6+c)&1)?'#eee':'#111';g.fillRect(c*4,r,4,6);}g.restore();
 // lamp pools (reflections stretch when wet)
 g.globalCompositeOperation='lighter';
 for(i=0;i<lamps.length;i++){var L=lamps[i];if(Math.abs(L[0]-car.x)>400||Math.abs(L[1]-car.y)>400)continue;var rad=45+30*w;var gr=g.createRadialGradient(L[0],L[1],0,L[0],L[1],rad);gr.addColorStop(0,'rgba(255,200,120,'+(.22+.25*w)+')');gr.addColorStop(1,'rgba(255,180,90,0)');g.fillStyle=gr;g.fillRect(L[0]-rad,L[1]-rad,rad*2,rad*2);}
 g.globalCompositeOperation='source-over';
 for(i=0;i<lamps.length;i++){L=lamps[i];g.fillStyle='#ffd9a0';g.fillRect(L[0]-1.5,L[1]-1.5,3,3);}
 // buildings
 for(i=0;i<blds.length;i++){var B=blds[i];if(Math.abs(B[0]-car.x)>420||Math.abs(B[1]-car.y)>420)continue;g.fillStyle='#0b0d14';g.fillRect(B[0]-B[2]/2,B[1]-B[2]/2,B[2],B[2]);g.fillStyle=B[3]>.5?'rgba(212,175,106,.35)':'rgba(120,150,220,.25)';g.fillRect(B[0]-B[2]/2+3,B[1]-B[2]/2+3,B[2]/4,B[2]/4);}
 // spray
 for(i=0;i<spray.length;i++){var s=spray[i];g.fillStyle='rgba(200,210,230,'+(s[4]*.35)+')';g.beginPath();g.arc(s[0],s[1],2+(.6-s[4])*8,0,7);g.fill();}
 // car
 g.save();g.translate(car.x,car.y);g.rotate(car.a);
 g.globalCompositeOperation='lighter';var hl=g.createRadialGradient(40,0,0,40,0,60);hl.addColorStop(0,'rgba(255,245,220,.35)');hl.addColorStop(1,'rgba(255,245,220,0)');g.fillStyle=hl;g.beginPath();g.moveTo(8,-5);g.lineTo(100,-35);g.lineTo(100,35);g.lineTo(8,5);g.fill();g.globalCompositeOperation='source-over';
 g.fillStyle='#111';g.fillRect(-9,-6.5,5,3);g.fillRect(-9,3.5,5,3);g.fillRect(5,-6.5,4,3);g.fillRect(5,3.5,4,3);
 g.fillStyle='#d4af6a';g.beginPath();g.moveTo(12,0);g.lineTo(6,-3);g.lineTo(-10,-4);g.lineTo(-11,4);g.lineTo(6,3);g.fill();
 g.fillStyle='#14161c';g.fillRect(-3,-2,5,4);g.fillStyle='#d4af6a';g.fillRect(-12,-6,2.5,12);g.fillRect(11,-5,2,10);
 g.fillStyle='rgba(255,40,40,'+((K.KeyS||K.ArrowDown||TC.b)?1:.4)+')';g.fillRect(-12.5,-1,1,2);
 g.restore();g.restore();
 // rain streaks
 if(wx.rain>.03){var n=Math.floor(500*wx.rain);g.strokeStyle='rgba(180,195,230,'+(.25+.25*wx.rain)+')';g.lineWidth=1;g.beginPath();var t=performance.now()/1000;
 for(i=0;i<n;i++){var D=drops[i],x=(D[0]*W+t*60*D[2])%W,y=(D[1]*H+t*900*D[2])%H;g.moveTo(x,y);g.lineTo(x-3,y-14*D[2]);}g.stroke();
 g.fillStyle='rgba(40,50,70,'+(.18*w)+')';g.fillRect(0,0,W,H);}
 if(wx.flash>0){g.fillStyle='rgba(200,210,255,'+(wx.flash*.35)+')';g.fillRect(0,0,W,H);}
 var vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.7)');g.fillStyle=vg;g.fillRect(0,0,W,H);
 document.getElementById('hud').innerHTML='<b>'+Math.round(car.v*3.6)+'</b> km/h<br>Lap '+car.lap+' · '+ft(car.lapT)+'<br>Best '+ft(car.best)+'<br>'+wxName()+' · Wet '+Math.round(w*100)+'% · '+wx.temp.toFixed(0)+'°C<br>Grip '+Math.round((1-.45*w)*100)+'%'+(wx.target!==wx.rain&&Math.abs(wx.target-wx.rain)>.05?' · forecast '+WX[wx.idx].n:'');
}
var last=performance.now();
function loop(now){var dt=Math.min(.05,(now-last)/1000);last=now;if(running&&!paused)update(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
})();
