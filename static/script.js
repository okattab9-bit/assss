let animationId;
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// نجوم في الخلفية
const stars = [];
for(let i=0;i<160;i++){
  stars.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:Math.random()*1.6});
}
function drawStars(){
  ctx.fillStyle='white';
  stars.forEach(s=>{
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 2*Math.PI);
    ctx.fill();
  });
}

// صور الأرض والنيزك
const earthImg = new Image();
earthImg.src = "/static/assets/earth.png";
const meteorImg = new Image();
meteorImg.src = "/static/assets/meteor.png";

function runSimulation(){
  if(animationId) cancelAnimationFrame(animationId);

  const size = Number(document.getElementById('size').value);
  const speed = Number(document.getElementById('speed').value);
  const angle = Number(document.getElementById('angle').value);
  const direction = document.getElementById('direction').value;

  if(!size||!speed||!angle){ alert("Please fill all fields!"); return; }

  // حساب الكتلة والطاقة
  const density = 3000; // kg/m3
  const volume = (4/3)*Math.PI*Math.pow(size/2,3);
  const mass = density*volume;
  const kineticEnergy = 0.5*mass*Math.pow(speed*1000,2); // J
  const tntEquivalent = kineticEnergy/4.184e9; // tons TNT

  document.getElementById('resultsText').innerText=
    `Mass: ${mass.toFixed(2)} kg | Impact Energy: ${kineticEnergy.toExponential(2)} J (~${tntEquivalent.toFixed(2)} tons TNT)`;

  // موقع الأرض
  const earthX = canvas.width/2, earthY = canvas.height/2+40;
  const earthRadius = 120;

  // هدف النيزك
  let targetX = earthX, targetY = earthY;
  switch(direction){
    case 'N': targetY -= 100; break;
    case 'S': targetY += 100; break;
    case 'E': targetX += 150; break;
    case 'W': targetX -= 150; break;
    case 'NE': targetX += 120; targetY -= 80; break;
    case 'NW': targetX -= 120; targetY -= 80; break;
    case 'SE': targetX += 120; targetY += 80; break;
    case 'SW': targetX -= 120; targetY += 80; break;
  }

  // نقطة البداية للنيزك
  let meteorX=0, meteorY=0;
  switch(direction){
    case 'N': meteorX=targetX; meteorY=-size; break;
    case 'S': meteorX=targetX; meteorY=canvas.height+size; break;
    case 'E': meteorX=canvas.width+size; meteorY=targetY; break;
    case 'W': meteorX=-size; meteorY=targetY; break;
    case 'NE': meteorX=canvas.width+size; meteorY=-size; break;
    case 'NW': meteorX=-size; meteorY=-size; break;
    case 'SE': meteorX=canvas.width+size; meteorY=canvas.height+size; break;
    case 'SW': meteorX=-size; meteorY=canvas.height+size; break;
  }

  const dxTotal = targetX - meteorX;
  const dyTotal = targetY - meteorY;
  const totalDistance = Math.sqrt(dxTotal*dxTotal + dyTotal*dyTotal);
  const speedPx = speed*2.2;

  // إعدادات الاصطدام والانفجار
  let impactOccurred=false, impactX=0, impactY=0, impactStartTime=null, shakeIntensity=0;
  const ejecta=[], smoke=[], shards=[], impactDuration=3500;

  function spawnEjecta(x,y,count,baseSpeed){
    for(let i=0;i<count;i++){
      const dir=Math.random()*Math.PI*2;
      const spd=baseSpeed*(0.6+Math.random()*1.2);
      ejecta.push({x,y,vx:Math.cos(dir)*spd,vy:Math.sin(dir)*spd-(Math.random()*1.5),life:800+Math.random()*1000,size:2+Math.random()*4,age:0});
    }
  }
  function spawnSmoke(x,y,count){
    for(let i=0;i<count;i++){
      smoke.push({x:x+(Math.random()-0.5)*30,y:y+(Math.random()-0.5)*20,vx:(Math.random()-0.5)*0.3,vy:-0.2-Math.random()*0.6,r:12+Math.random()*18,life:900+Math.random()*1200,age:0,alpha:0.6+Math.random()*0.3});
    }
  }
  function spawnShards(x,y,count){
    for(let i=0;i<count;i++){
      const dir=Math.random()*Math.PI*2;
      const spd=2+Math.random()*4;
      const color=`hsl(${Math.random()*40+20},100%,60%)`;
      shards.push({x,y,vx:Math.cos(dir)*spd,vy:Math.sin(dir)*spd,life:1000+Math.random()*500,age:0,size:2+Math.random()*3,color});
    }
  }

  function animate(timestamp){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let shakeX=0, shakeY=0;
    if(shakeIntensity>0){shakeX=(Math.random()-0.5)*shakeIntensity; shakeY=(Math.random()-0.5)*shakeIntensity;}
    ctx.save(); ctx.translate(shakeX,shakeY);
    drawStars();

    // الأرض
    ctx.drawImage(earthImg,earthX-earthRadius,earthY-earthRadius,earthRadius*2,earthRadius*2);

    // تحقق من الاصطدام
    const dx = meteorX - earthX;
    const dy = meteorY - earthY;
    const distanceFromEarth = Math.sqrt(dx*dx + dy*dy);

    if(distanceFromEarth <= earthRadius && !impactOccurred){
      impactOccurred=true;
      impactX=meteorX;
      impactY=meteorY;
      impactStartTime=performance.now();
      shakeIntensity = 30;
      spawnEjecta(impactX,impactY,Math.min(80,Math.round(size*1.2)),3+Math.min(6,size/20));
      spawnSmoke(impactX,impactY+8,14+Math.round(size/8));
      spawnShards(impactX,impactY,30+Math.round(size/3));
    }

    if(!impactOccurred){
      // حركة النيزك
      ctx.drawImage(meteorImg,meteorX-size/2,meteorY-size/2,size,size);
      meteorX += dxTotal/totalDistance*speedPx*0.02;
      meteorY += dyTotal/totalDistance*speedPx*0.02;
    } else {
      // انفجار واهتزاز
      const now=performance.now(), elapsed=now-impactStartTime;

      // Flash
      const flashProgress=Math.min(elapsed/200,1);
      if(flashProgress>0){
        const alpha=1-flashProgress;
        ctx.fillStyle=`rgba(255,140,0,${0.7*alpha})`;
        ctx.beginPath();ctx.arc(impactX,impactY,40+flashProgress*200,0,2*Math.PI);ctx.fill();
      }

      // Shockwave
      const shockProgress=Math.min(elapsed/700,1);
      if(shockProgress<1){
        const r=20+shockProgress*250;
        ctx.beginPath(); ctx.strokeStyle=`rgba(255,180,120,${1-shockProgress})`;
        ctx.lineWidth=6*(1-shockProgress)+1; ctx.arc(impactX,impactY,r,0,2*Math.PI); ctx.stroke();
      }

      // تأثير على الأرض
      ctx.save();
      const gradient = ctx.createRadialGradient(impactX, impactY, 0, impactX, impactY, 120);
      gradient.addColorStop(0, "rgba(255,140,0,0.6)");
      gradient.addColorStop(0.5, "rgba(255,60,0,0.4)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(impactX, impactY, 120,0,2*Math.PI); ctx.fill();
      ctx.restore();

      // تحديث الجزيئات
      for(let i=ejecta.length-1;i>=0;i--){
        const p=ejecta[i]; p.age+=16; p.x+=p.vx; p.y+=p.vy; p.vy+=0.05;
        ctx.fillStyle='rgba(130,130,130,0.9)'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,2*Math.PI); ctx.fill();
        if(p.age>p.life) ejecta.splice(i,1);
      }
      for(let i=smoke.length-1;i>=0;i--){
        const s=smoke[i]; s.age+=16; s.x+=s.vx; s.y+=s.vy;
        const lifeRatio=s.age/s.life; const alpha=s.alpha*(1-lifeRatio);
        ctx.fillStyle=`rgba(120,120,120,${Math.max(0,alpha)})`;
        ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*(0.6+lifeRatio),s.r*(0.35+lifeRatio*0.9),0,0,2*Math.PI); ctx.fill();
        if(s.age>s.life) smoke.splice(i,1);
      }
      for(let i=shards.length-1;i>=0;i--){
        const s=shards[i]; s.age+=16; s.x+=s.vx; s.y+=s.vy; s.age+=16;
        ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,2*Math.PI); ctx.fill();
        if(s.age>s.life) shards.splice(i,1);
      }

      shakeIntensity*=0.88;
      if(elapsed>impactDuration && ejecta.length===0 && smoke.length===0 && shards.length===0){
        ctx.restore(); cancelAnimationFrame(animationId); animationId=null; return;
      }
    }

    ctx.restore();
    animationId=requestAnimationFrame(animate);
  }

  if(earthImg.complete && meteorImg.complete){animate(0);}
  else{earthImg.onload=meteorImg.onload=()=>{animate(0);}}
}
