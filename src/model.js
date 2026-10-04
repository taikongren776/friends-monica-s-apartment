import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// All dimensions are in miniature scene units. The floor is y=0; +z is the open front.
const geometries = new Map();
const materials = new Map();
const P = {
  wall: '#a28ab8', trim: '#8a709e', door: '#816599', teal: '#287e7f', tealDark: '#205558',
  cream: '#f0e2c9', ivory: '#fff0d7', wood: '#ae8059', walnut: '#8a6149', darkWood: '#654d43',
  sofa: '#e7dfcd', seat: '#f1eadb', rust: '#bc725b', brass: '#d6ad57', copper: '#bf815d',
  green: '#759269', greenDark: '#50755b', pot: '#cf9072', navy: '#637b8b', plum: '#9981a8',
};

function mat(color, extras = {}) {
  const key = `${color}:${JSON.stringify(extras)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extras }));
  return materials.get(key);
}

function geometry(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}

function mesh(parent, geom, material, x = 0, y = 0, z = 0, shadow = true) {
  const item = new THREE.Mesh(geom, typeof material === 'string' ? mat(material) : material);
  item.position.set(x, y, z);
  item.castShadow = shadow;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function box(parent, w, h, d, material, x, y, z, radius = .025) {
  const r = Math.min(radius, w / 3, h / 3, d / 3);
  const geom = geometry(`b:${w},${h},${d},${r}`, () => r > 0
    ? new RoundedBoxGeometry(w, h, d, 2, r)
    : new THREE.BoxGeometry(w, h, d));
  return mesh(parent, geom, material, x, y, z);
}

function cylinder(parent, rt, rb, h, material, x, y, z, segments = 10) {
  return mesh(parent, geometry(`c:${rt},${rb},${h},${segments}`, () => new THREE.CylinderGeometry(rt, rb, h, segments)), material, x, y, z);
}

function ico(parent, r, material, x, y, z, scale = [1, 1, 1]) {
  const item = mesh(parent, geometry(`i:${r}`, () => new THREE.IcosahedronGeometry(r, 0)), material, x, y, z);
  item.scale.set(...scale);
  return item;
}

function group(parent, x = 0, y = 0, z = 0, rotation = 0) {
  const result = new THREE.Group();
  result.position.set(x, y, z);
  result.rotation.y = rotation;
  parent.add(result);
  return result;
}

function rod(parent, start, end, radius, color, segments = 6) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const length = a.distanceTo(b);
  const result = cylinder(parent, radius, radius, length, color, ...a.clone().add(b).multiplyScalar(.5).toArray(), segments);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return result;
}

function texture(draw, width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

function random(seed = 7) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

function floorTexture() {
  const rand = random(11);
  return texture((ctx, w, h) => {
    ctx.fillStyle = '#9e7752'; ctx.fillRect(0, 0, w, h);
    const colors = ['#caa477', '#bf976a', '#d2ae83', '#b58e64', '#c49b6f'];
    const size = 64;
    for (let x = 0; x < w; x += size) for (let y = 0; y < h; y += size) {
      ctx.save(); ctx.translate(x + size / 2, y + size / 2);
      if ((x / size + y / size) % 2) ctx.rotate(Math.PI / 2);
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.fillRect(-31, -31 + j * 16, 62, 15);
        ctx.strokeStyle = 'rgba(91,61,38,.13)'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(-26, -26 + j * 16); ctx.lineTo(28, -27 + j * 16); ctx.stroke();
      }
      ctx.restore();
    }
  }, 1024, 768);
}

function rugTexture() {
  return texture((ctx, w, h) => {
    ctx.fillStyle='#303034';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#dfcfa2';ctx.fillRect(42,42,w-84,h-84);
    ctx.fillStyle='#eee2bd';ctx.fillRect(62,62,w-124,h-124);
    const flower=(x,y,r)=>{
      ctx.save();ctx.translate(x,y);
      for(let i=0;i<9;i++){
        ctx.rotate(Math.PI*2/9);ctx.fillStyle=i%2?'#c59c6e':'#c3aa7b';
        ctx.beginPath();ctx.ellipse(0,r*.65,r*.3,r*.64,0,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle='#96795e';ctx.beginPath();ctx.arc(0,0,r*.28,0,Math.PI*2);ctx.fill();ctx.restore();
    };
    // Large botanical border and a light, open centre, as in the photographed rug.
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const x=90+i*(w-180)/7,y=side<0?57:h-57;
      ctx.save();ctx.translate(x,y);ctx.rotate(side*.5+(i%2)*.7);
      ctx.strokeStyle='#a28e58';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-42,18);ctx.quadraticCurveTo(0,-22,44,15);ctx.stroke();
      for(const sign of [-1,1]){ctx.fillStyle='#718576';ctx.beginPath();ctx.ellipse(sign*27,0,24,10,sign*.65,0,Math.PI*2);ctx.fill();}
      flower(0,0,22);ctx.restore();
    }
    for(const x of [55,w-55])for(let y=130;y<h-70;y+=88){
      ctx.fillStyle='#7e8b79';ctx.beginPath();ctx.ellipse(x,y+24,13,31,.55,0,Math.PI*2);ctx.fill();flower(x,y,24);
    }
    ctx.strokeStyle='#c7ad7b';ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(w/2,h/2,w*.26,h*.25,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,x=w/2+Math.cos(a)*w*.27,y=h/2+Math.sin(a)*h*.26;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,24,9,.65,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    flower(w/2,h/2,35);
    ctx.globalAlpha=.07;
    for(let y=0;y<h;y+=3){ctx.fillStyle=y%2?'#fff':'#000';ctx.fillRect(0,y,w,1);}
  }, 1024, 640);
}

function quiltTexture(redOnly=false) {
  return texture((ctx,w,h)=>{
    const colors=redOnly?['#923345','#f0e3c6','#aa3547','#eee0c5']:['#813746','#d6b752','#2d5554','#d8b1a4','#242f41','#648176'];
    ctx.fillStyle='#39333a';ctx.fillRect(0,0,w,h);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      ctx.fillStyle=colors[(row*3+col)%colors.length];ctx.fillRect(7+col*61,7+row*61,60,60);
      ctx.strokeStyle='rgba(255,244,210,.30)';ctx.lineWidth=1;ctx.strokeRect(11+col*61,11+row*61,52,52);
    }
  },256,256);
}

function floralTexture() {
  return texture((ctx,w,h)=>{
    ctx.fillStyle='#b99770';ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=52){
      const px=x+(y%128?20:0);
      ctx.strokeStyle='#485e4b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px-7,y+34);ctx.quadraticCurveTo(px+24,y+8,px,y-16);ctx.stroke();
      for(const side of [-1,1]){ctx.fillStyle='#62765a';ctx.beginPath();ctx.ellipse(px+side*12,y+16,12,5,side*.6,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#873c4c';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(px+Math.cos(a)*6,y+Math.sin(a)*6,6,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#d1b477';ctx.fillRect(px-2,y-2,4,4);
    }
  },256,256);
}

function pillowTexture(striped = false) {
  return texture((ctx,w,h) => {
    ctx.fillStyle = '#ecddba'; ctx.fillRect(0,0,w,h);
    if (striped) {
      for(let x=0;x<w;x+=36){ctx.fillStyle='#a88684';ctx.fillRect(x,0,10,h);ctx.fillStyle='#748c8c';ctx.fillRect(x+15,0,5,h);}
    } else {
      ctx.strokeStyle='#869399';ctx.lineWidth=3;
      for(let x=-35;x<w+35;x+=50)for(let y=-35;y<h+35;y+=50){ctx.beginPath();ctx.moveTo(x,y-20);ctx.lineTo(x+17,y);ctx.lineTo(x,y+20);ctx.lineTo(x-17,y);ctx.closePath();ctx.stroke();ctx.fillStyle='#b27f68';ctx.fillRect(x-3,y-3,6,6);}
    }
  }, 256, 256);
}

function plant(parent, x, y, z, size = 1, seed = 2) {
  const pot = group(parent,x,y,z); pot.scale.setScalar(size);
  cylinder(pot,.24,.18,.38,P.pot,0,.19,0,9);
  cylinder(pot,.25,.25,.07,'#e1ab88',0,.36,0,9);
  cylinder(pot,.205,.205,.02,'#645143',0,.385,0,9);
  const rand=random(seed);
  for(let i=0;i<8;i++){
    const angle=i*2.4, height=.65+rand()*.6;
    const end=[Math.cos(angle)*(.22+rand()*.2),height,Math.sin(angle)*.36];
    rod(pot,[0,.37,0],end,.018,P.greenDark);
    const leaf=ico(pot,.17,i%2?P.green:P.greenDark,...end,[.75,1.75,.50]);
    leaf.rotation.set(Math.cos(angle)*.6,angle,Math.sin(angle)*.5);
    ico(pot,.15,P.green,end[0]*.6,height*.8,end[2]*.6,[1.1,.5,.65]);
  }
  return pot;
}

function bouquet(parent,x,y,z,size=1) {
  const vase=group(parent,x,y,z); vase.scale.setScalar(size);
  cylinder(vase,.16,.13,.34,'#e8e3c5',0,.17,0,9);
  cylinder(vase,.10,.16,.16,'#e8e3c5',0,.41,0,9);
  const flowers=['#e8c466','#f6efd9','#b69ac4','#f6efd9','#cc9ca8','#b69ac4','#efdcac'];
  for(let i=0;i<7;i++){
    const a=i*2.4, r=i===0?0:.22, top=.73+(i%3)*.10;
    const px=Math.cos(a)*r,pz=Math.sin(a)*r;
    rod(vase,[0,.4,0],[px,top,pz],.012,P.greenDark,5);
    const petals=mesh(vase,geometry('flower',()=>new THREE.CircleGeometry(.12,8)),mat(flowers[i]),px,top,pz,false);
    petals.rotation.x=-Math.PI/2+.35; petals.rotation.z=a;
    ico(vase,.037,'#cfaa56',px,top+.012,pz);
    if(i%2===0)ico(vase,.10,P.green,px*.7,top*.78,pz*.7,[1.5,.3,.8]);
  }
  return vase;
}

function mug(parent,x,y,z,color=P.ivory,scale=1) {
  const cup=group(parent,x,y,z); cup.scale.setScalar(scale);
  cylinder(cup,.13,.11,.20,color,0,.10,0,10);
  cylinder(cup,.105,.105,.012,'#655246',0,.205,0,10);
  const handle=mesh(cup,geometry('mug-handle',()=>new THREE.TorusGeometry(.08,.025,4,10)),color,.13,.12,0);
  handle.rotation.y=Math.PI/2;
  return cup;
}

function picture(parent,x,y,z,width,height,accent,rotY=0) {
  const item=group(parent,x,y,z,rotY);
  box(item,width,height,.07,P.walnut,0,0,0,.02);
  box(item,width-.09,height-.09,.02,P.cream,0,0,.046,.005);
  const canvas=texture((ctx,w,h)=>{
    ctx.fillStyle='#e9dabb';ctx.fillRect(0,0,w,h);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(w*.52,h*.45,w*.25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7b957c';ctx.fillRect(w*.24,h*.65,w*.52,h*.08);ctx.fillStyle='#bc8d74';ctx.beginPath();ctx.moveTo(w*.35,h*.70);ctx.lineTo(w*.65,h*.7);ctx.lineTo(w*.57,h*.9);ctx.lineTo(w*.43,h*.9);ctx.fill();
  },128,128);
  mesh(item,new THREE.PlaneGeometry(width-.15,height-.15),mat('#fff',{map:canvas}),0,0,.061,false);
}

function chair(parent,x,z,color,rotation=0) {
  const g=group(parent,x,0,z,rotation);
  for(const sx of [-1,1])for(const sz of [-1,1])rod(g,[sx*.28,.03,sz*.28],[sx*.24,.72,sz*.24],.045,P.walnut);
  box(g,.72,.12,.72,color,0,.76,0,.06);
  box(g,.57,.055,.55,'#e5cfad',0,.837,.035,.05);
  for(const sx of [-1,1])box(g,.055,1.02,.055,color,sx*.30,1.16,-.28,.018);
  box(g,.67,.16,.07,color,0,1.64,-.28,.025);
  for(const sx of [-.19,0,.19])box(g,.035,.60,.035,color,sx,1.26,-.28,.008);
  return g;
}

function armchair(parent,x,z,rotation=0,floral=false) {
  const g=group(parent,x,0,z,rotation);
  g.name=floral?'Foreground floral chair':'Ivory rolled-arm chair';
  const upholstery=floral?mat('#fff',{map:floralTexture()}):mat('#e9dfc9');
  for(const sx of [-1,1])for(const sz of [-1,1])cylinder(g,.055,.043,.29,P.walnut,sx*.44,.145,sz*.39,6);
  box(g,1.15,.42,1.08,upholstery,0,.53,0,.13);
  box(g,1.0,.24,.89,upholstery,0,.84,.10,.10);
  box(g,1.15,.95,.32,upholstery,0,1.06,-.44,.13).rotation.x=-.08;
  for(const side of [-1,1]){
    box(g,.24,.52,1.02,upholstery,side*.55,.86,0,.10);
    const roll=cylinder(g,.17,.17,1.03,floral?'#684845':upholstery,side*.55,1.10,.02,12);roll.rotation.x=Math.PI/2;
  }
  const throwMat=mat('#fff',{map:quiltTexture(true)});
  box(g,.83,.045,.33,throwMat,0,1.54,-.42,.014);
  box(g,.83,.36,.035,throwMat,0,1.37,-.24,.012);
  box(g,.50,.47,.16,mat('#fff',{map:pillowTexture()}),.1,1.2,-.22,.075).rotation.z=.12;
  return g;
}

// The rear is a small decorative hallway, designed for the model's 360-degree view.
function buildExterior(apartment,windowRoot,lamps,glowMaterials) {
  const exterior=group(apartment,-.14,0,-6.47,Math.PI);
  exterior.name='Decorated exterior hallway';
  const plaster='#c4b5c9',panel='#809184',moulding='#abb7a1';
  const tiles=texture((ctx,w,h)=>{
    ctx.fillStyle='#d8cbb6';ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64){
      ctx.fillStyle=(x/64+y/64)%2?'#d6c8b1':'#e4d8c4';ctx.fillRect(x+2,y+2,60,60);
      ctx.fillStyle='#a69783';ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.restore();
    }
  },1024,256);
  const floor=mesh(exterior,new THREE.PlaneGeometry(17.15,2.26),mat('#fff',{map:tiles}),0,.025,1.13,false);floor.rotation.x=-Math.PI/2;
  box(exterior,17.20,.075,.09,P.walnut,0,.055,2.29,.014);
  // Split the cladding around the existing opening instead of covering the room-facing doorway.
  for(const [x,w] of [[-4.155,8.29],[5.015,6.57]]){
    box(exterior,w,5.52,.035,plaster,x,2.76,.014,.006);
    box(exterior,w,1.30,.075,panel,x,.68,.045,.009);
    box(exterior,w,.09,.115,moulding,x,1.37,.072,.012);
    box(exterior,w,.17,.12,moulding,x,.12,.075,.013);
    for(let px=x-w/2+.18;px<x+w/2-.12;px+=.66)box(exterior,.03,1.12,.03,'#a5b09d',px,.69,.094,.004);
  }
  box(exterior,1.74,1.94,.035,plaster,.86,4.55,.014,.006);
  box(exterior,16.62,.12,.12,'#b4a3be',0,5.45,.075,.018);

  const door=group(exterior,.86,0,.04);door.name='Exterior door 20';
  box(door,1.59,3.60,.085,P.door,0,1.81,.03,.025);
  for(const x of [-.90,.90])box(door,.18,3.68,.18,'#dacbbf',x,1.84,.052,.021);
  box(door,1.99,.20,.20,'#dacbbf',0,3.71,.055,.02);
  box(door,1.91,.07,.34,P.cream,0,.045,.09,.012);
  for(const [y,h] of [[.72,.94],[1.89,.95],[2.96,.55]]){
    box(door,1.32,h,.036,'#a48bb5',0,y,.09,.014);
    box(door,1.19,h-.12,.024,P.door,0,y,.117,.012);
  }
  const numberTexture=texture((ctx,w,h)=>{
    ctx.fillStyle='#d0b56f';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#80613d';ctx.lineWidth=8;ctx.strokeRect(5,5,w-10,h-10);
    ctx.fillStyle='#4b4037';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 84px Georgia';ctx.fillText('20',w/2,h/2+4);
  },256,128);
  box(door,.46,.24,.033,mat('#fff',{map:numberTexture}),0,2.97,.146,.03);
  ico(door,.043,P.brass,0,2.36,.153,[1,1,.50]);
  box(door,.11,.27,.035,P.brass,-.55,1.44,.15,.02);
  ico(door,.076,P.brass,-.55,1.45,.22);
  box(door,.43,.09,.024,P.brass,0,.96,.15,.009);
  box(door,.33,.023,.013,'#564638',0,.96,.169,.003);
  const welcome=texture((ctx,w,h)=>{
    ctx.fillStyle='#b08c5b';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#69533e';ctx.lineWidth=9;ctx.strokeRect(14,14,w-28,h-28);
    ctx.fillStyle='#554631';ctx.font='bold 49px Georgia';ctx.textAlign='center';ctx.fillText('WELCOME',w/2,h*.64);
  },512,192);
  const matMesh=mesh(door,new THREE.PlaneGeometry(1.83,.74),mat('#fff',{map:welcome}),0,.042,.84,false);matMesh.rotation.x=-Math.PI/2;

  // Mailboxes and a cork noticeboard add everyday detail to the broad blank wall.
  const mailboxes=group(exterior,-2.37,0,.14);mailboxes.name='Hallway mailboxes';
  box(mailboxes,1.65,1.64,.12,P.darkWood,0,1.96,0,.028);
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){
    const x=(col-.5)*.76,y=1.45+row*.51;
    box(mailboxes,.69,.45,.18,'#547b76',x,y,.13,.033);
    box(mailboxes,.40,.035,.014,'#253c3b',x,y+.10,.23,.005);
    box(mailboxes,.25,.075,.014,P.cream,x-.08,y-.08,.23,.005);
    ico(mailboxes,.028,P.brass,x+.22,y-.07,.243,[1,1,.35]);
  }
  const notices=texture((ctx,w,h)=>{
    ctx.fillStyle='#aa8154';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f0dec0';ctx.font='bold 31px Georgia';ctx.textAlign='center';ctx.fillText('NEIGHBORS',w/2,46);
    for(let i=0;i<4;i++){
      const x=22+(i%2)*117,y=78+Math.floor(i/2)*117;
      ctx.save();ctx.translate(x+48,y+48);ctx.rotate((i%2?1:-1)*.055);ctx.fillStyle=['#ead9a9','#c5d0bc','#e6c5b6','#e9dfcf'][i];ctx.fillRect(-45,-43,90,93);
      ctx.fillStyle='#a5574e';ctx.beginPath();ctx.arc(0,-36,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#89816d';for(let j=0;j<4;j++)ctx.fillRect(-31,-12+j*11,49+(j%2)*11,2);ctx.restore();
    }
  },256,336);
  box(exterior,1.46,1.87,.10,P.walnut,-4.89,2.42,.11,.032);
  mesh(exterior,new THREE.PlaneGeometry(1.29,1.69),mat('#fff',{map:notices}),-4.89,2.42,.168,false);
  const bench=group(exterior,4.75,0,.69);bench.name='Hallway bench';
  for(const x of [-.82,.82])for(const z of [-.23,.23])box(bench,.085,.61,.085,P.darkWood,x,.34,z,.012);
  box(bench,2.0,.12,.71,P.walnut,0,.65,0,.032);
  box(bench,1.89,.13,.63,'#b8ac90',0,.77,0,.055);
  box(bench,1.82,.075,.57,P.wood,0,.22,0,.015);
  for(let i=0;i<3;i++)box(bench,.41,.055,.33,[P.cream,P.navy,P.rust][i],-.47,.285+i*.055,.10,.006);
  plant(exterior,7.12,.025,.71,1.18,39);
  plant(exterior,-7.15,.025,.66,1.15,41);
  // A narrow umbrella basket beside the door keeps the walkway clear.
  const umbrellas=group(exterior,2.54,0,.56);
  cylinder(umbrellas,.24,.19,.55,'#b18b62',0,.30,0,10);
  for(const [x,z,col] of [[-.10,0,'#587477'],[.09,.04,'#886478']]){
    cylinder(umbrellas,.045,.085,.60,col,x,.70,z,8);
    rod(umbrellas,[x,1.0,z],[x,1.29,z],.025,P.darkWood);
    const handle=mesh(umbrellas,new THREE.TorusGeometry(.075,.024,5,10,Math.PI),P.darkWood,x+.075,1.29,z);handle.rotation.z=0;
  }

  function lantern(x){
    const g=group(exterior,x,3.03,.15);
    box(g,.16,.37,.09,P.darkWood,0,0,0,.025);
    rod(g,[0,.12,.03],[0,.12,.37],.035,P.brass);
    const glass=mat('#f7e4b7',{emissive:'#ffd392',emissiveIntensity:0});glowMaterials.push(glass);
    box(g,.27,.43,.25,glass,0,-.13,.36,.025);
    for(const sx of [-1,1])for(const sz of [-1,1])box(g,.025,.45,.025,P.darkWood,sx*.14,-.13,.36+sz*.13,.004);
    cylinder(g,0,.24,.16,P.darkWood,0,.17,.36,4).rotation.y=Math.PI/4;
    box(g,.34,.065,.31,P.darkWood,0,-.37,.36,.012);
    const light=new THREE.PointLight('#ffc989',0,5.6,1.7);light.position.set(0,-.09,.61);light.userData.intensityScale=.70;g.add(light);lamps.push(light);
  }
  lantern(-.69);lantern(2.41);lantern(-6.34);

  // Finish the back of the sky card as an exterior window, preserving the interior sky.
  const outerWindow=group(windowRoot,0,0,-.625,Math.PI);outerWindow.name='Exterior window finish';
  // Deep jambs close the reveal between the outside glass and the room-facing window.
  for(const x of [-2.85,2.85])box(windowRoot,.17,4.06,.77,'#c5b59c',x,3.24,-.30,.015);
  for(const y of [1.27,5.21])box(windowRoot,5.86,.15,.77,'#c5b59c',0,y,-.30,.015);
  const reflection=texture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#96abb6');gradient.addColorStop(1,'#607d86');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(239,231,203,.15)';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(i*120-90,0);ctx.lineTo(i*120-35,0);ctx.lineTo(i*120+150,h);ctx.lineTo(i*120+95,h);ctx.fill();}
  },512,512);
  const glass=mat('#fff',{map:reflection,emissive:'#d8ad70',emissiveIntensity:0});glowMaterials.push(glass);
  box(outerWindow,5.62,3.87,.035,glass,0,3.235,.025,.009);
  for(const x of [-2.85,2.85])box(outerWindow,.17,4.06,.13,'#c5b59c',x,3.24,.06,.015);
  for(const y of [1.27,5.21])box(outerWindow,5.86,.15,.13,'#c5b59c',0,y,.06,.015);
  for(const x of [-1.40,0,1.40])box(outerWindow,.075,3.80,.10,'#647b71',x,3.24,.10,.008);
  for(const y of [2.57,3.86])box(outerWindow,5.55,.075,.10,'#647b71',0,y,.10,.008);
  box(outerWindow,6.04,.14,.39,P.cream,0,1.19,.10,.022);
  box(outerWindow,3.65,.27,.38,'#a67759',0,1.02,.16,.022);
  for(const x of [-1.27,0,1.27])bouquet(outerWindow,x,1.17,.20,.46);
}

export function buildApartment(scene) {
  const apartment=group(scene); apartment.name='Monica apartment';
  const lamps=[], glowMaterials=[];

  // A wooden dollhouse plinth and a lightly textured parquet floor.
  box(apartment,17.6,.45,15.8,'#dcc6ac',0,-.29,-1,.18);
  box(apartment,17.48,.11,15.68,'#eee0c8',0,-.045,-1,.065);
  const floor=mesh(apartment,new THREE.PlaneGeometry(17.15,13.35),mat('#fff',{map:floorTexture()}),0,.018,0,false);floor.rotation.x=-Math.PI/2;
  box(apartment,16.70,.10,.10,P.walnut,-.10,.06,-6.36,.015);
  const plaqueTexture=texture((ctx,w,h)=>{ctx.fillStyle='#c7a873';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#9e8055';ctx.lineWidth=3;ctx.strokeRect(8,8,w-16,h-16);ctx.fillStyle='#604d44';ctx.textAlign='center';ctx.font='500 52px Georgia';ctx.fillText('20',w/2,h*.7);},256,128);
  box(apartment,1.0,.27,.032,mat('#fff',{map:plaqueTexture,metalness:.15,roughness:.65}),0,-.24,6.915,.03);

  // A deeper L-shaped plan: kitchen/hall on the rear wall, tall windows on the right.
  // Furniture keeps its original size; the extra floor area becomes usable circulation.
  const wallZ=-6.32, height=5.55;
  box(apartment,6.57,height,.22,P.wall,-5.155,height/2,wallZ,.018);
  box(apartment,8.29,height,.22,P.wall,4.015,height/2,wallZ,.018);
  box(apartment,1.74,2.0,.22,P.wall,-1.0,4.55,wallZ,.018);
  box(apartment,16.60,.10,.29,P.trim,-.14,5.60,wallZ,.025);
  box(apartment,16.52,.19,.08,P.cream,-.14,.11,-6.16,.015);
  // Only a low left return is kept in the cutaway, exposing the kitchen from the new view.
  box(apartment,.18,.46,3.90,P.wall,-8.35,.23,-4.43,.018);
  box(apartment,.25,.065,3.96,P.trim,-8.35,.48,-4.43,.018);
  const rightWall=group(apartment,8.05,0,-3.20,-Math.PI/2);
  rightWall.name='Right window wall';
  for(const x of [-3.02,3.02])box(rightWall,.40,height,.22,P.wall,x,height/2,0,.018);
  box(rightWall,5.65,1.32,.22,P.wall,0,.66,0,.018);
  box(rightWall,5.65,.40,.22,P.wall,0,5.35,0,.018);
  box(rightWall,6.45,.10,.29,P.trim,0,5.60,0,.025);
  box(rightWall,6.34,.19,.08,P.cream,0,.39,.15,.015);

  // Recessed bathroom glimpse, purple casing, and the adjacent green-panelled nook.
  const hall=group(apartment,-1.0,0,-6.17);hall.name='Purple hall doorway';
  box(hall,1.55,3.46,.08,'#554c50',0,1.73,-.36,.01);
  for(const x of [-.79,.79])box(hall,.15,3.53,.21,P.trim,x,1.765,.04,.012);
  box(hall,1.74,.15,.21,P.trim,0,3.55,.04,.012);
  box(hall,1.36,.43,.035,'#d1c8a9',0,3.16,-.30,.009);
  box(hall,1.39,.075,.07,P.trim,0,2.91,.025,.008);
  box(hall,.69,.91,.055,'#b99559',.12,2.08,-.28,.02);
  box(hall,.56,.78,.022,'#76898b',.12,2.08,-.239,.012);
  cylinder(hall,.15,.20,.75,P.ivory,.12,.41,-.11,10);
  box(hall,.77,.19,.42,P.ivory,.12,.91,-.09,.10);
  box(hall,.47,.04,.23,'#b6c4b9',.12,1.01,-.06,.06);
  rod(hall,[.12,1.02,-.22],[.12,1.20,-.22],.025,P.brass);
  box(hall,.98,.02,.37,'#a99173',0,.03,-.12,.003);
  // The gallery wall separates the doorway from the window alcove.
  const gallery=group(apartment,2.70,0,-6.13);
  box(gallery,4.78,1.58,.075,'#537869',0,.84,0,.009);
  for(let x=-2.25;x<2.4;x+=.34)box(gallery,.035,1.43,.027,'#809082',x,.83,.055,.003);
  box(gallery,4.86,.08,.12,'#79917d',0,1.66,.075,.01);
  picture(gallery,0,2.73,.05,.97,1.28,'#5a7664');
  picture(gallery,-1.06,3.21,.05,.52,.75,'#a5835b');
  picture(gallery,-1.13,2.17,.05,.48,.60,'#826473');
  picture(gallery,1.15,3.16,.05,.60,.90,'#988768');
  picture(gallery,1.15,2.03,.05,.45,.52,'#b18c43');
  picture(apartment,-2.24,2.73,-6.12,.43,.62,'#b18c43');

  // Teal kitchen: cupboards, tiled backsplash, cooker, sink, open shelves, refrigerator.
  const kitchen=group(apartment,-1.65,0,-1.75);kitchen.name='Kitchen';
  box(kitchen,4.47,1.22,1.16,P.tealDark,-4.12,.66,-3.78,.045);
  box(kitchen,4.68,.14,1.29,P.cream,-4.12,1.33,-3.74,.035);
  const tiles=texture((ctx,w,h)=>{ctx.fillStyle='#eee4cf';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#d8cfbb';ctx.lineWidth=2;for(let y=0;y<h;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();for(let x=(y/42%2)*42;x<w;x+=84){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+42);ctx.stroke();}}},512,128);
  mesh(kitchen,new THREE.PlaneGeometry(4.68,.84),mat('#fff',{map:tiles}),-4.12,1.84,-4.436,false);
  for(let i=0;i<5;i++){
    const cx=-6.02+i*.89;
    box(kitchen,.80,.81,.08,P.teal,cx,.65,-3.17,.025);
    box(kitchen,.68,.66,.023,'#338b87',cx,.65,-3.116,.010);
    box(kitchen,.80,.18,.08,P.teal,cx,1.17,-3.17,.018);
    box(kitchen,.23,.035,.05,P.brass,cx,1.17,-3.10,.01);
    box(kitchen,.036,.18,.04,P.brass,cx+.26,.75,-3.095,.009);
  }
  // Stainless oven and four dark burners.
  box(kitchen,.98,1.17,1.12,'#eee8d8',-5.75,.66,-3.75,.03);
  box(kitchen,.82,.62,.027,'#585f5b',-5.75,.60,-3.172,.025);
  box(kitchen,.68,.44,.016,'#6e7771',-5.75,.60,-3.147,.014);
  box(kitchen,.74,.035,.072,'#e1dfca',-5.75,.975,-3.12,.015);
  for(let i=0;i<4;i++)ico(kitchen,.052,'#5c605a',-6.08+i*.22,1.15,-3.145,[1,1,.7]);
  box(kitchen,.94,.036,1.03,'#b5b8af',-5.75,1.437,-3.75,.005);
  for(const sx of [-.24,.24])for(const sz of [-.23,.23])cylinder(kitchen,.145,.145,.035,'#525b56',-5.75+sx,1.464,-3.75+sz,8);
  cylinder(kitchen,.21,.17,.20,P.copper,-5.99,1.585,-3.98,10);
  cylinder(kitchen,.23,.23,.035,'#dcae73',-5.99,1.706,-3.98,10);
  ico(kitchen,.04,P.walnut,-5.99,1.75,-3.98);
  box(kitchen,.16,.38,.035,mat('#fff',{map:pillowTexture(true)}),-5.52,.80,-3.113,.008);
  // Sink and faceted curved tap.
  box(kitchen,.87,.038,.63,'#bec4b8',-3.85,1.418,-3.76,.065);
  box(kitchen,.69,.018,.48,'#7f9a93',-3.85,1.439,-3.76,.06);
  rod(kitchen,[-3.85,1.44,-4.08],[-3.85,1.93,-4.08],.035,'#c6b784',8);
  rod(kitchen,[-3.85,1.93,-4.08],[-3.85,1.99,-3.92],.035,'#c6b784',8);
  rod(kitchen,[-3.85,1.99,-3.92],[-3.85,1.87,-3.80],.035,'#c6b784',8);
  // A little kitchen window and open shelves with crockery.
  box(kitchen,.98,1.27,.05,P.cream,-3.91,3.02,-4.41,.018);
  box(kitchen,.82,1.11,.023,'#d6dbc5',-3.91,3.02,-4.37,.009);
  box(kitchen,.048,1.12,.05,P.cream,-3.91,3.02,-4.34,.008);
  box(kitchen,.84,.055,.05,P.cream,-3.91,3.03,-4.34,.008);
  for(const cx of [-5.61,-2.95]){
    box(kitchen,1.32,1.57,.42,P.tealDark,cx,3.10,-4.20,.018);
    box(kitchen,1.18,1.41,.04,'#496f70',cx,3.10,-3.961,.008);
    for(const cy of [2.35,2.87,3.39,3.87])box(kitchen,1.35,.075,.50,P.teal,cx,cy,-4.155,.009);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const jx=cx-.41+col*.40, jy=2.50+row*.51;
      cylinder(kitchen,.108,.105,.19,[P.cream,'#b6bca0','#c2a77a'][(row+col)%3],jx,jy,-4.02,8);
      cylinder(kitchen,.115,.115,.035,P.ivory,jx,jy+.11,-4.02,8);
    }
  }
  for(let i=0;i<4;i++){
    cylinder(kitchen,.085,.095,.24,['#c78f64','#d4ad56','#a4ad8b','#dba071'][i],-2.61+i*.20,1.51,-4.04,8);
    cylinder(kitchen,.057,.057,.08,P.cream,-2.61+i*.20,1.67,-4.04,8);
  }
  cylinder(kitchen,.13,.10,.23,P.cream,-4.62,1.53,-3.90,8);
  for(let i=0;i<4;i++)rod(kitchen,[-4.68+i*.045,1.60,-3.90],[-4.70+i*.06,1.97,-3.88],.018,P.walnut,5);
  box(kitchen,.41,.34,.30,'#858b7e',-2.7,1.57,-3.70,.04);
  box(kitchen,.29,.20,.018,'#445f5c',-2.7,1.57,-3.539,.025);
  // Copper pans suspended inside the timber kitchen opening.
  rod(kitchen,[-6.18,3.22,-2.95],[-4.60,3.22,-2.95],.028,'#5b5147');
  for(const x of [-6.18,-4.60])rod(kitchen,[x,3.22,-2.95],[x,4.0,-2.95],.015,P.darkWood);
  for(let i=0;i<4;i++){
    const x=-6.03+i*.42, y=2.68+(i%2)*.13;
    const pan=cylinder(kitchen,.18,.19,.06,i%2?P.brass:P.copper,x,y,-2.95,12);pan.rotation.x=Math.PI/2;
    box(kitchen,.05,.26,.055,P.walnut,x,y+.22,-2.95,.015);
    rod(kitchen,[x,y+.35,-2.95],[x,3.23,-2.95],.012,'#6e6657');
  }

  // White refrigerator with tiny postcards and magnets.
  const fridge=group(kitchen,-1.72,0,-3.78);
  box(fridge,1.17,2.59,1.12,'#eee9d8',0,1.33,0,.08);
  box(fridge,1.10,.81,.09,'#faf0db',0,2.13,.577,.045);
  box(fridge,1.10,1.56,.09,'#f4ecd7',0,.91,.577,.045);
  box(fridge,.052,.53,.055,'#b5b4a5',-.42,1.31,.656,.02);
  box(fridge,.052,.35,.055,'#b5b4a5',-.42,2.18,.656,.02);
  for(let i=0;i<8;i++){
    const mx=-.26+(i%3)*.26,my=1.85+Math.floor(i/3)*.24;
    const card=box(fridge,.17,.18,.012,['#bb927b','#8095a0','#bfb78b','#ad83a5'][i%4],mx,my,.638,.006);card.rotation.z=(i%3-1)*.12;
    ico(fridge,.022,P.brass,mx,my+.08,.658);
  }
  box(fridge,.28,.17,.01,'#b5c49d',.18,1.05,.638,.004).rotation.z=-.13;
  plant(fridge,.08,2.66,.02,.65,15);

  // Dining area tucked behind the sofa, with a timber kitchen opening.
  const timber='#996a3d';
  box(kitchen,5.20,.24,.25,timber,-4.02,4.06,-2.94,.025);
  box(kitchen,.23,4.08,.25,timber,-1.50,2.04,-2.94,.022);
  const brace=box(kitchen,.16,1.64,.17,timber,-2.08,3.43,-2.94,.015);brace.rotation.z=.72;
  box(kitchen,.75,.13,.65,P.wood,-1.56,1.42,-2.99,.02);
  bouquet(kitchen,-1.53,1.49,-2.91,.60);
  const table=group(apartment,-5.53,0,-2.70);table.name='Kitchen dining table';
  cylinder(table,.19,.33,1.15,P.walnut,0,.61,0,10);
  cylinder(table,.63,.55,.10,P.walnut,0,.10,0,10);
  cylinder(table,.96,.96,.13,'#bd9157',0,1.27,0,28);
  bouquet(table,-.18,1.34,-.15,.54);
  cylinder(table,.22,.15,.10,P.cream,.37,1.39,.16,12);
  ico(table,.10,'#d6a054',.33,1.49,.15);ico(table,.085,'#b88364',.45,1.49,.19);
  mug(table,-.38,1.34,.33,P.navy,.65);
  for(const [dx,dz,color] of [[-1.34,.02,'#d2ad58'],[.08,-1.30,P.teal],[1.33,0,'#a97f4e'],[0,1.32,P.plum]])
    chair(apartment,-5.53+dx,-2.70+dz,color,Math.atan2(-dx,-dz));

  // Pale floral rug with a broad charcoal border; all artwork is procedural.
  box(apartment,11.30,.026,6.20,'#383537',-.92,.040,2.70,.020);
  const rug=mesh(apartment,new THREE.PlaneGeometry(11.26,6.16),mat('#fff',{map:rugTexture()}),-.92,.058,2.70,false);rug.rotation.x=-Math.PI/2;
  for(let i=0;i<36;i++)for(const side of [-1,1])box(apartment,.025,.012,.10,P.cream,-6.38+i*.312,.045,2.70+side*3.14,.003);

  // The reference has an ivory three-seat sofa in front of the kitchen.
  const couch=group(apartment,-3.15,0,.45);couch.name='Ivory sofa';
  for(const sx of [-2.0,2.0])for(const sz of [-.49,.49])cylinder(couch,.077,.058,.29,P.walnut,sx,.17,sz,8);
  box(couch,4.65,.43,1.47,P.sofa,0,.49,0,.13);
  box(couch,4.45,1.11,.37,P.sofa,0,1.07,-.56,.14);
  for(let i=0;i<3;i++){
    const px=(i-1)*1.26;
    box(couch,1.24,.27,1.08,P.seat,px,.84,.08,.12);
    box(couch,1.25,.82,.27,P.seat,px,1.25,-.355,.12).rotation.x=-.09;
  }
  for(const side of [-1,1]){
    box(couch,.37,.63,1.40,P.sofa,side*2.20,.89,0,.14);
    const roll=cylinder(couch,.20,.20,1.29,P.seat,side*2.19,1.13,.02,12);roll.rotation.x=Math.PI/2;
  }
  const patchwork=mat('#fff',{map:quiltTexture()});
  for(const [px,angle] of [[-1.62,-.24],[1.59,.22]]){
    const pillow=box(couch,.77,.73,.25,patchwork,px,1.23,.12,.10);pillow.rotation.set(-.20,0,angle);
  }

  // Square oak coffee table with turned legs and a lower magazine shelf.
  const coffee=group(apartment,-1.28,0,3.65);coffee.name='Square oak coffee table';
  for(const sx of [-1.47,1.47])for(const sz of [-.96,.96]){
    cylinder(coffee,.085,.105,.68,'#8f603a',sx,.42,sz,10);
    for(const y of [.14,.30,.68])cylinder(coffee,.13,.11,.11,P.wood,sx,y,sz,10);
  }
  box(coffee,3.26,.08,2.13,P.walnut,0,.32,0,.025);
  box(coffee,3.48,.17,2.38,'#b98b4e',0,.87,0,.045);
  box(coffee,3.40,.025,2.30,'#cca669',0,.968,0,.013);
  for(let i=0;i<4;i++)box(coffee,.64,.038,.44,[P.navy,P.cream,P.rust,'#c4aa70'][i],-.96+i*.63,.38,-.03,.006).rotation.y=(i-1)*.10;
  const tray=group(coffee,.62,.998,-.19,.06);
  box(tray,1.10,.052,.71,'#69756b',0,0,0,.055);
  for(const side of [-1,1])box(tray,1.10,.055,.045,P.brass,0,.03,side*.33,.01);
  box(tray,.56,.035,.37,P.ivory,0,.04,0,.008).rotation.y=-.12;
  mug(tray,.31,.056,.10,P.cream,.66);
  const vase=group(coffee,-.63,.997,-.13);
  cylinder(vase,.18,.23,.38,'#49637f',0,.20,0,10);
  cylinder(vase,.14,.18,.12,'#405a77',0,.44,0,10);
  bouquet(vase,0,.43,0,.56);
  mug(coffee,-.81,.997,.51,P.ivory,.90);
  ico(coffee,.13,P.ivory,-.47,1.105,.60,[1.3,.80,.85]);

  const readingChair=armchair(apartment,2.12,.60,-.36);readingChair.scale.setScalar(1.33);
  const foregroundChair=armchair(apartment,-6.04,4.75,1.98,true);foregroundChair.scale.setScalar(1.02);
  const ottoman=group(apartment,-4.08,0,4.45,.12);ottoman.name='Green velvet ottoman';
  for(const x of [-.38,.38])for(const z of [-.31,.31])box(ottoman,.09,.20,.09,P.walnut,x,.11,z,.02);
  box(ottoman,1.05,.36,.86,'#33635d',0,.37,0,.12);
  box(ottoman,1.10,.15,.90,'#48796c',0,.58,0,.11);

  // Spacious raised alcove along the right wall, with access from front and left.
  const platform=group(apartment,5.77,0,-2.85);platform.name='Window platform';
  box(platform,4.54,.26,6.42,'#906644',0,.15,0,.018);
  const platformFloor=mesh(platform,new THREE.PlaneGeometry(4.46,6.34),mat('#fff',{map:floorTexture()}),0,.284,0,false);platformFloor.rotation.x=-Math.PI/2;
  box(platform,4.58,.13,.42,'#ae8658',0,.085,3.42,.018);
  box(platform,.42,.13,6.45,'#ae8658',-2.47,.085,0,.018);
  box(platform,4.54,.065,.09,'#5d4939',0,.262,3.20,.008);
  box(platform,.09,.065,6.42,'#5d4939',-2.27,.262,0,.008);

  // All window details and weather share the same rotated coordinate frame.
  // Local +z faces the room; rain occupies local -z beyond the outside wall surface.
  const windowRoot=group(apartment,7.91,0,-3.20,-Math.PI/2);
  windowRoot.name='Tall right-side window';
  const windowBounds={left:-2.77,right:2.77,bottom:1.32,top:5.15,outside:-.25};
  const windowFrame=group(windowRoot);
  for(const x of [-2.84,2.84])box(windowFrame,.16,3.98,.22,P.walnut,x,3.24,0,.018);
  for(const y of [1.30,5.20])box(windowFrame,5.82,.14,.22,P.walnut,0,y,0,.018);
  box(windowFrame,5.92,.16,.57,P.cream,0,1.27,.12,.03);
  for(const x of [-1.40,0,1.40])box(windowFrame,.078,3.81,.12,'#344744',x,3.24,.035,.008);
  for(const y of [2.57,3.86])box(windowFrame,5.53,.078,.12,'#344744',0,y,.035,.008);
  const curtain=mat('#fff',{map:floralTexture()});
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const panel=box(windowFrame,.14,3.93,.14,curtain,side*(2.48+i*.10),3.23,.21,.035);panel.rotation.z=side*.009;
  }
  const blind=group(windowFrame,0,0,.17);blind.name='Bamboo Roman blinds';
  for(let i=0;i<24;i++)box(blind,5.34,.049,.045,i%3===0?'#8a663e':'#ae8656',0,5.10-i*.052,0,.006);
  for(const x of [-2.32,-1.13,1.13,2.32])box(blind,.028,1.25,.012,'#68583c',x,4.51,.036,.003);
  for(const x of [-1.8,0,1.8]){const swag=box(windowFrame,1.88,.30,.20,curtain,x,5.22,.30,.12);swag.rotation.z=x*.06;}
  rod(windowFrame,[-3.07,5.37,.22],[3.07,5.37,.22],.037,P.brass,8);
  for(const side of [-1,1])ico(windowFrame,.07,P.brass,side*3.10,5.37,.22);
  const skyMaterial=new THREE.MeshBasicMaterial({color:'#d9e5dd',toneMapped:false,side:THREE.DoubleSide});
  mesh(windowRoot,new THREE.PlaneGeometry(5.58,3.86),skyMaterial,0,3.235,-.58,false);
  const city=group(windowRoot,0,0,-.47);
  for(const [x,w,h,col] of [[-2.10,1.10,1.45,'#b5b0a0'],[-.74,1.32,1.95,'#c5a18f'],[.72,1.15,1.54,'#b3b9ab'],[2.07,1.18,1.72,'#cfb19d']]){
    box(city,w,h,.05,col,x,1.32+h*.5,0,0);box(city,w+.06,.065,.08,P.cream,x,1.32+h,.02,.008);
    for(let row=0;row<3;row++)for(const side of [-1,1]){
      box(city,.17,.23,.015,'#747e7e',x+side*w*.25,1.63+row*.45,.032,.003);
      box(city,.20,.034,.025,P.cream,x+side*w*.25,1.51+row*.45,.048,.003);
    }
  }
  const sunMat=new THREE.MeshBasicMaterial({color:'#f7d594',transparent:true,toneMapped:false});
  mesh(windowRoot,new THREE.CircleGeometry(.26,18),sunMat,.49,3.57,-.55,false);
  const cloudMat=new THREE.MeshBasicMaterial({color:'#f1eee1',transparent:true,opacity:.78,toneMapped:false});
  for(const [x,y,s] of [[-1.70,3.53,.22],[-.49,3.75,.16]])for(let i=0;i<3;i++)ico(windowRoot,s,cloudMat,x+i*s*1.22,y+(i===1?s*.25:0),-.54,[1.25,.72,.18]);
  const moonMat=new THREE.MeshBasicMaterial({color:'#ffdfa6',transparent:true,opacity:0,toneMapped:false});
  mesh(windowRoot,new THREE.CircleGeometry(.27,24),moonMat,.49,3.58,-.53,false);
  const moonMask=mesh(windowRoot,new THREE.CircleGeometry(.24,24),skyMaterial,.61,3.64,-.525,false);
  const starMat=new THREE.MeshBasicMaterial({color:'#f4e3b9',transparent:true,opacity:0,toneMapped:false});
  const rand=random(31);
  for(let i=0;i<14;i++){
    const star=mesh(windowRoot,new THREE.CircleGeometry(.017+rand()*.016,4),starMat,-2.60+rand()*5.15,3.30+rand()*.51,-.52,false);star.rotation.z=Math.PI/4;
  }

  // Desk below the blinds, with a simple timber chair and flowers.
  const desk=group(apartment,7.33,.28,-3.32,-Math.PI/2);desk.name='Window writing desk';
  box(desk,3.21,.13,.72,P.walnut,0,1.09,0,.025);
  box(desk,1.04,.28,.61,P.wood,-.95,.89,0,.02);
  for(const x of [-1.41,1.41])for(const z of [-.25,.25])box(desk,.09,1.02,.09,P.darkWood,x,.55,z,.013);
  ico(desk,.035,P.brass,-.95,.90,.33);
  bouquet(desk,-.58,1.16,-.08,.72);
  box(desk,.53,.065,.36,P.cream,.43,1.16,.09,.006).rotation.y=.12;
  const deskChair=chair(apartment,6.08,-3.32,'#79613e',Math.PI/2);deskChair.position.y=.28;deskChair.scale.setScalar(.9);
  plant(apartment,7.22,.28,-.83,1.25,21);
  plant(apartment,-7.91,0,-3.15,.72,19);
  plant(apartment,.13,0,-5.72,.83,17);

  // Round magazine table beside the ivory armchair.
  const magazine=group(apartment,3.88,0,1.32);
  cylinder(magazine,.66,.66,.11,P.walnut,0,.94,0,18);
  box(magazine,.89,.68,.71,P.wood,0,.54,0,.022);
  box(magazine,.74,.41,.04,'#4f443b',0,.53,.38,.008);
  box(magazine,.83,.065,.80,P.walnut,0,.24,0,.015);
  for(let i=0;i<5;i++)box(magazine,.59,.05,.38,[P.cream,P.navy,P.rust][i%3],0,.31+i*.06,.29,.005);
  mug(magazine,.14,1.003,.10,'#39343e',.8);

  // Centre the television on the coffee table and face it squarely across the gap.
  const tv=group(apartment,coffee.position.x,0,6.02,Math.PI);tv.name='CRT television';
  for(const x of [-.77,.77])for(const z of [-.36,.36])box(tv,.10,.17,.10,P.darkWood,x,.10,z,.018);
  box(tv,1.85,.09,.99,P.walnut,0,.23,0,.025);
  box(tv,1.96,.12,1.07,P.wood,0,.76,0,.028);
  for(const x of [-.86,.86])box(tv,.12,.48,.96,P.wood,x,.49,0,.018);
  box(tv,1.66,.48,.055,'#5b4535',0,.49,-.45,.014);
  box(tv,1.66,.065,.94,P.walnut,0,.46,0,.015);
  // A VHS player and tapes on the open shelf make the console recognisably 1990s.
  box(tv,1.15,.18,.58,'#414441',-.13,.59,.12,.022);
  box(tv,.62,.035,.015,'#1c2727',-.28,.61,.419,.006);
  box(tv,.18,.040,.018,'#85a190',.31,.61,.420,.004);
  for(let i=0;i<3;i++)box(tv,.35,.060,.43,['#b19a7c','#7f8b91','#845b59'][i],-.48,.30+i*.053,.21,.008);
  box(tv,1.49,1.10,.94,'#353b39',0,1.38,-.015,.10);
  box(tv,1.23,.88,.075,'#1e292a',-.055,1.40,.479,.076);
  const glass=mat('#4c7079',{emissive:'#527985',emissiveIntensity:.10,roughness:.25});
  box(tv,1.09,.73,.038,glass,-.062,1.43,.537,.075);
  const reflection=box(tv,.035,.45,.008,'#93aeb2',-.46,1.47,.563,.012);reflection.rotation.z=-.22;
  ico(tv,.038,P.brass,.615,1.08,.493);
  for(let i=0;i<5;i++)box(tv,.020,.34,.013,'#1b2727',.51+i*.032,1.47,.493,.004);
  for(let i=0;i<6;i++)box(tv,.74,.023,.011,'#202927',0,1.27+i*.070,-.493,.004);
  cylinder(tv,.12,.15,.055,'#535953',0,1.956,-.10,10);
  rod(tv,[0,1.98,-.10],[-.37,2.42,-.18],.016,'#8d968e');
  rod(tv,[0,1.98,-.10],[.33,2.35,-.18],.016,'#8d968e');
  const remote=group(coffee,1.06,1.002,.58,-.14);
  box(remote,.18,.038,.43,'#3a4140',0,.019,0,.020);
  for(let i=0;i<3;i++)for(const x of [-.040,.040])box(remote,.026,.006,.030,P.cream,x,.042,-.06+i*.075,.005);
  box(remote,.045,.007,.040,P.rust,-.04,.043,-.15,.008);
  plant(apartment,7.60,0,5.22,.96,23);

  const side=group(apartment,.01,0,.52);
  box(side,.91,.13,.84,P.wood,0,.99,0,.04);
  box(side,.83,.07,.71,P.walnut,0,.29,0,.012);
  for(const x of [-.33,.33])for(const z of [-.30,.30])box(side,.065,.92,.065,P.walnut,x,.52,z,.01);
  picture(side,.20,1.24,.10,.26,.34,'#ae8a80',-.20);
  mug(side,.19,1.06,.25,P.cream,.60);

  function lamp(parent,x,y,z,scale=1){
    const g=group(parent,x,y,z);g.scale.setScalar(scale);
    cylinder(g,.20,.25,.11,P.brass,0,.07,0,10);
    cylinder(g,.09,.14,.47,'#d1ad7e',0,.31,0,10);
    rod(g,[0,.52,0],[0,.81,0],.037,P.brass,8);
    const shade=mat('#f8e4b9',{emissive:'#ffc66c',emissiveIntensity:.0,roughness:1});
    glowMaterials.push(shade);
    cylinder(g,.24,.43,.48,shade,0,.90,0,12);
    cylinder(g,.055,.055,.08,P.brass,0,1.18,0,8);
    const light=new THREE.PointLight('#ffbf71',0,5.1*scale,1.8);light.position.set(0,.90,0);g.add(light);lamps.push(light);
    return g;
  }
  lamp(side,-.15,1.06,-.16,.99);
  lamp(desk,1.10,1.16,-.05,.83);
  const doorConsole=group(apartment,2.26,0,-5.75);
  box(doorConsole,.62,.10,.52,P.walnut,0,.99,0,.03);
  box(doorConsole,.49,.36,.41,P.wood,0,.76,0,.02);
  for(const sx of [-.22,.22])for(const sz of [-.18,.18])box(doorConsole,.052,.58,.052,P.walnut,sx,.30,sz,.012);
  ico(doorConsole,.025,P.brass,0,.77,.225);
  picture(doorConsole,0,1.25,.05,.31,.40,'#d3b273');
  const wallLamp=group(windowRoot,3.04,3.90,.15);
  box(wallLamp,.12,.24,.04,P.brass,0,0,0,.035);
  rod(wallLamp,[0,-.06,.02],[0,-.08,.24],.025,P.brass,8);
  rod(wallLamp,[0,-.08,.24],[0,.14,.24],.025,P.brass,8);
  const sconceMat=mat('#f8e4b9',{emissive:'#ffc66c',emissiveIntensity:0,roughness:1});glowMaterials.push(sconceMat);
  cylinder(wallLamp,.11,.18,.23,sconceMat,0,.21,.24,10);
  const sconceLight=new THREE.PointLight('#ffc57e',0,4.3,2);sconceLight.position.set(0,.18,.4);wallLamp.add(sconceLight);lamps.push(sconceLight);
  buildExterior(apartment,windowRoot,lamps,glowMaterials);
  const patchMaterial=new THREE.MeshBasicMaterial({color:'#ffdfa2',transparent:true,opacity:.14,depthWrite:false,toneMapped:false});
  for(let i=0;i<3;i++){
    const patch=mesh(apartment,new THREE.PlaneGeometry(2.56,.62),patchMaterial,5.80,.290,-4.5+i*1.04,false);patch.rotation.x=-Math.PI/2;patch.rotation.z=-.18;
  }

  return {apartment,windowRoot,windowBounds,lamps,glowMaterials,skyMaterial,sunMat,cloudMat,moonMat,moonMask,starMat,patchMaterial};
}
