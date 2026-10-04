import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildApartment } from './model.js';

const stage=document.getElementById('stage');
const loading=document.getElementById('loading');
const weatherButtons=[...document.querySelectorAll('[data-mode]')];
const resetButton=document.getElementById('reset-view');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const modes={
  sunny:{number:'01',name:'阳光来做客',description:'窗边的暖意，刚刚好。',sky:'#d9e5dd',table:'#f4f0e8',sun:'#ffe5b5',sunIntensity:3.0,hemiIntensity:2.45,hemi:'#fff0d5',ground:'#b9a9bf',fill:1.35,lamps:0,glow:0,rain:0,moon:0,stars:0,disc:1,clouds:.80,patch:.12,exposure:1.10},
  rainy:{number:'02',name:'听雨的小午后',description:'雨落在窗外，温柔留在屋里。',sky:'#9caeb9',table:'#e4e9ea',sun:'#c8d9e9',sunIntensity:1.25,hemiIntensity:2.10,hemi:'#d4e2f0',ground:'#b6adb8',fill:1.00,lamps:1.6,glow:.13,rain:.72,moon:0,stars:0,disc:0,clouds:.48,patch:.025,exposure:1.04},
  night:{number:'03',name:'等一盏灯亮起',description:'城市睡着了，小公寓还暖着。',sky:'#3a435f',table:'#242536',sun:'#b8c7ed',sunIntensity:.60,hemiIntensity:.96,hemi:'#a1afd7',ground:'#75678f',fill:.52,lamps:6.8,glow:.76,rain:0,moon:1,stars:.85,disc:0,clouds:0,patch:0,exposure:1.08},
};

function fail(error){
  console.error('Apartment could not start:',error);
  loading.hidden=true;
  // CSS display:flex is intentionally explicit, so hide it directly on failure.
  loading.style.display='none';
  document.getElementById('error-card').hidden=false;
  for(const button of [...weatherButtons,resetButton])button.disabled=true;
}

try { init(); } catch(error) { fail(error); }

function init(){
  let needsRender=true;
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Geometry and the shadow-casting light position stay fixed in every weather mode.
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.setClearColor(0,0);
  renderer.domElement.setAttribute('aria-label','莫妮卡公寓微缩模型；拖动旋转，滚轮或双指缩放。当前环境：晴天。');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('tabindex','0');
  stage.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,120);
  // Look into both arms of the room, including the inside of the right-hand window wall.
  camera.position.set(-16,15.5,21);
  const target=new THREE.Vector3(0,1.60,0);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.addEventListener('change',()=>{needsRender=true;});
  controls.target.copy(target);
  controls.enableDamping=!reduceMotion.matches;
  controls.dampingFactor=.075;
  controls.enablePan=false;
  controls.rotateSpeed=.62;
  controls.zoomSpeed=.70;
  controls.minPolarAngle=THREE.MathUtils.degToRad(22);
  controls.maxPolarAngle=THREE.MathUtils.degToRad(79);
  controls.minZoom=.67;
  controls.maxZoom=2.3;
  controls.update();controls.saveState();

  const hemi=new THREE.HemisphereLight('#fff0d5','#b9a9bf',2.45);scene.add(hemi);
  const sunlight=new THREE.DirectionalLight('#ffe5b5',3.0);sunlight.position.set(9,13,-4);
  sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(2048,2048);
  sunlight.shadow.camera.left=-15;sunlight.shadow.camera.right=15;
  sunlight.shadow.camera.top=15;sunlight.shadow.camera.bottom=-15;
  sunlight.shadow.camera.near=.5;sunlight.shadow.camera.far=50;
  sunlight.shadow.normalBias=.035;sunlight.shadow.bias=-.0002;
  sunlight.shadow.radius=4;
  sunlight.target.position.set(0,0,0);scene.add(sunlight,sunlight.target);
  const fill=new THREE.DirectionalLight('#ffeedd',1.35);fill.position.set(2,6,10);scene.add(fill);
  const tabletopMaterial=new THREE.MeshBasicMaterial({color:'#f4f0e8',toneMapped:false});
  const tabletop=new THREE.Mesh(new THREE.PlaneGeometry(250,250),tabletopMaterial);
  tabletop.rotation.x=-Math.PI/2;tabletop.position.y=-.535;tabletop.receiveShadow=true;scene.add(tabletop);
  const shadowReceiver=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.ShadowMaterial({color:'#6b5868',opacity:.13}));
  shadowReceiver.rotation.x=-Math.PI/2;shadowReceiver.position.y=-.532;shadowReceiver.receiveShadow=true;scene.add(shadowReceiver);
  // Contact shadow adds softness beneath the beveled base without external assets.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
  const shadowCtx=shadowCanvas.getContext('2d');
  const gradient=shadowCtx.createRadialGradient(128,128,30,128,128,125);
  gradient.addColorStop(0,'rgba(67,49,66,.24)');gradient.addColorStop(.5,'rgba(67,49,66,.13)');gradient.addColorStop(1,'rgba(67,49,66,0)');
  shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,256,256);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(25,21),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  contact.rotation.x=-Math.PI/2;contact.position.set(.22,-.526,.45);scene.add(contact);
  const model=buildApartment(scene);
  const windowBounds=model.windowBounds;

  // 280 short rain streaks are confined to the space beyond the window.
  const rainCount=280, rainData=[], positions=new Float32Array(rainCount*6);
  let seed=2749;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<rainCount;i++)rainData.push({
    x:windowBounds.left+.13+rand()*(windowBounds.right-windowBounds.left-.30),
    y:windowBounds.bottom+.15+rand()*(windowBounds.top-windowBounds.bottom-.35),
    z:windowBounds.outside-.06-rand()*.11,speed:1.7+rand()*1.6,length:.07+rand()*.11,
  });
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const rainMaterial=new THREE.LineBasicMaterial({color:'#e2eef2',transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;rain.visible=false;model.windowRoot.add(rain);
  function updateRain(dt){
    for(let i=0;i<rainCount;i++){
      const drop=rainData[i];drop.y-=drop.speed*dt;
      if(drop.y<windowBounds.bottom+.14)drop.y=windowBounds.top-.18;
      const n=i*6;positions[n]=drop.x;positions[n+1]=drop.y;positions[n+2]=drop.z;
      positions[n+3]=drop.x+.035;positions[n+4]=Math.min(windowBounds.top-.06,drop.y+drop.length);positions[n+5]=drop.z;
    }
    rainGeometry.attributes.position.needsUpdate=true;
  }
  updateRain(0);
  const live={};
  const colorKeys=['sky','table','sun','hemi','ground'];
  const numberKeys=['sunIntensity','hemiIntensity','fill','lamps','glow','rain','moon','stars','disc','clouds','patch','exposure'];
  for(const key of colorKeys)live[key]=new THREE.Color(modes.sunny[key]);
  for(const key of numberKeys)live[key]=modes.sunny[key];
  let activeMode='sunny',transition=null;

  function applyEnvironment(){
    model.skyMaterial.color.copy(live.sky);tabletopMaterial.color.copy(live.table);
    sunlight.color.copy(live.sun);sunlight.intensity=live.sunIntensity;
    hemi.color.copy(live.hemi);hemi.groundColor.copy(live.ground);hemi.intensity=live.hemiIntensity;
    fill.intensity=live.fill;
    model.lamps.forEach((light,index)=>{light.intensity=live.lamps*(light.userData.intensityScale??(index===2?.53:1));});
    model.glowMaterials.forEach(material=>{material.emissiveIntensity=live.glow;});
    model.sunMat.opacity=live.disc;model.cloudMat.opacity=live.clouds;
    model.moonMat.opacity=live.moon;model.moonMask.visible=live.moon>.001;
    model.starMat.opacity=live.stars;model.patchMaterial.opacity=live.patch;
    rainMaterial.opacity=live.rain;rain.visible=live.rain>.001;
    renderer.toneMappingExposure=live.exposure;
  }
  applyEnvironment();

  function setWeather(mode){
    if(!modes[mode]||mode===activeMode)return;
    activeMode=mode;document.body.dataset.weather=mode;
    weatherButtons.forEach(button=>{const on=button.dataset.mode===mode;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
    document.getElementById('mood-number').textContent=modes[mode].number;
    document.getElementById('mood-name').textContent=modes[mode].name;
    document.getElementById('mood-description').textContent=modes[mode].description;
    renderer.domElement.setAttribute('aria-label',`莫妮卡公寓微缩模型；拖动旋转，滚轮或双指缩放。当前环境：${{sunny:'晴天',rainy:'雨天',night:'夜景'}[mode]}。`);
    const from={},to={};
    for(const key of colorKeys){from[key]=live[key].clone();to[key]=new THREE.Color(modes[mode][key]);}
    for(const key of numberKeys){from[key]=live[key];to[key]=modes[mode][key];}
    transition={from,to,start:performance.now(),duration:reduceMotion.matches?0:600};
  }
  weatherButtons.forEach(button=>button.addEventListener('click',()=>setWeather(button.dataset.mode)));
  resetButton.addEventListener('click',()=>controls.reset());
  renderer.domElement.addEventListener('keydown',event=>{
    if(event.key==='Home'){event.preventDefault();controls.reset();}
  });
  reduceMotion.addEventListener('change',()=>{controls.enableDamping=!reduceMotion.matches;});

  function resize(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(width,height,false);
    const aspect=width/height;
    // Fit the entire dollhouse to the narrowest dimension, leaving space for its shadow.
    const viewHeight=Math.max(16.8,26.5/aspect);
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
    needsRender=true;
  }
  new ResizeObserver(resize).observe(stage);resize();
  let lastTime=performance.now(),frame=0;
  function animate(time){
    requestAnimationFrame(animate);
    if(document.hidden){lastTime=time;return;}
    const dt=Math.min((time-lastTime)/1000,.04);lastTime=time;
    const changingWeather=!!transition;
    if(transition){
      const t=transition.duration===0?1:Math.min((time-transition.start)/transition.duration,1);
      const eased=t*t*(3-2*t);
      for(const key of colorKeys)live[key].lerpColors(transition.from[key],transition.to[key],eased);
      for(const key of numberKeys)live[key]=THREE.MathUtils.lerp(transition.from[key],transition.to[key],eased);
      applyEnvironment();if(t===1)transition=null;
    }
    const animatingRain=rain.visible&&!reduceMotion.matches;
    if(animatingRain)updateRain(dt);
    const cameraChanged=controls.update();
    if(needsRender||cameraChanged||changingWeather||animatingRain||frame<2){
      renderer.render(scene,camera);needsRender=false;
      if(++frame===2){loading.classList.add('fade');renderer.domElement.dataset.ready='true';setTimeout(()=>loading.remove(),400);}
    }
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();document.getElementById('error-card').hidden=false;
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{document.getElementById('error-card').hidden=true;needsRender=true;renderer.shadowMap.needsUpdate=true;});
  // Opt-in, read-only diagnostics for offline acceptance checks. Normal opening exposes no debug API.
  if(location.hash==='#inspect')Object.defineProperty(window,'apartmentInspection',{value:()=>({
    ready:renderer.domElement.dataset.ready==='true',weather:activeMode,transitioning:!!transition,
    camera:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom,
    geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
    renderedFrames:frame,
    lampIntensities:model.lamps.map(light=>light.intensity),rainVisible:rain.visible,
    rainPositions:Array.from(positions),rendererCalls:renderer.info.render.calls,
    windowBounds,
    windowCenter:model.windowRoot.getWorldPosition(new THREE.Vector3()).toArray(),
    windowNormal:new THREE.Vector3(0,0,1).applyQuaternion(model.windowRoot.getWorldQuaternion(new THREE.Quaternion())).toArray(),
    rainWorldMin:new THREE.Box3().setFromBufferAttribute(rainGeometry.getAttribute('position')).applyMatrix4(rain.matrixWorld).min.toArray(),
    sofaCoffeeClearance:new THREE.Box3().setFromObject(model.apartment.getObjectByName('Square oak coffee table')).min.z-new THREE.Box3().setFromObject(model.apartment.getObjectByName('Ivory sofa')).max.z,
    bounds:new THREE.Box3().setFromObject(model.apartment).getSize(new THREE.Vector3()).toArray(),
  })});
  requestAnimationFrame(animate);
}
