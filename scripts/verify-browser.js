// Run with playwright-cli run-code --filename=scripts/verify-browser.js.
// This exercises the built file:// artifact, not a development server or mocked scene.
async (page) => {
  const checks=[];
  const errors=[];
  const requests=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
  const snapshot=()=>page.evaluate(()=>window.apartmentInspection());
  const close=(a,b,tolerance=.00001)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<tolerance);
  const settle=async()=>{
    await page.waitForFunction(()=>window.apartmentInspection?.().ready&&!window.apartmentInspection().transitioning);
    await page.locator('#loading').waitFor({state:'detached'});
  };
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>requests.push(request.url()));
  await page.context().setOffline(true);
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();
  await settle();
  const initial=await snapshot();
  assert(initial.ready&&initial.weather==='sunny','Offline file:// artifact renders in Chromium');
  assert(initial.geometries>100&&initial.textures>5,'Procedural apartment geometry and textures are present');
  assert(initial.lampIntensities.every(v=>v===0)&&!initial.rainVisible,'Sunny mode starts without rain or lit lamps');
  assert(initial.bounds[0]>17&&initial.bounds[2]>13,'Room floor has real additional width and depth');
  assert(initial.sofaCoffeeClearance>1,'A clear walking gap remains between the sofa and coffee table');
  assert(initial.windowCenter[0]>7&&initial.windowNormal[0]<-.99,'Large window sits on the right wall and faces into the room');
  await page.waitForTimeout(160);
  assert(initial.renderedFrames===(await snapshot()).renderedFrames,'An idle scene stops redrawing to save GPU work');
  await page.screenshot({path:'output/playwright/sunny-desktop.png'});

  await page.getByRole('button',{name:'雨天',exact:true}).click();await settle();
  const rainy=await snapshot();
  assert(rainy.weather==='rainy'&&rainy.rainVisible,'Rainy button enables visible rain');
  assert(close(initial.camera,rainy.camera)&&initial.zoom===rainy.zoom,'Weather switching preserves the camera');
  const drops=rainy.rainPositions;
  let outside=true;
  const w=rainy.windowBounds;
  for(let i=0;i<drops.length;i+=3)outside&&=drops[i]>=w.left&&drops[i]<=w.right&&drops[i+1]>=w.bottom&&drops[i+1]<=w.top&&drops[i+2]<w.outside;
  assert(outside,'All rain streaks stay outside the window and above its sill');
  assert(rainy.rainWorldMin[0]>8.16,'Rotated rain stays beyond the exterior face of the right wall');
  await page.waitForTimeout(160);
  const rainLater=await snapshot();
  assert(!close(rainy.rainPositions,rainLater.rainPositions),'Rain animates over time');
  await page.screenshot({path:'output/playwright/rainy-desktop.png'});

  await page.getByRole('button',{name:'夜景',exact:true}).click();await settle();
  const night=await snapshot();
  assert(night.weather==='night'&&!night.rainVisible&&night.lampIntensities.every(v=>v>0),'Night lights turn on and rain stops');
  assert(close(initial.camera,night.camera)&&initial.zoom===night.zoom,'Night mode also preserves the camera');
  await page.screenshot({path:'output/playwright/night-desktop.png'});

  const canvas=await page.locator('canvas').boundingBox();
  const cx=canvas.x+canvas.width*.50,cy=canvas.y+canvas.height*.52;
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+155,cy+23,{steps:12});await page.mouse.up();
  await page.waitForTimeout(1400);
  const rotated=await snapshot();
  assert(!close(initial.camera,rotated.camera,.1),'Mouse dragging rotates the 3D camera');
  await page.getByRole('button',{name:'晴天',exact:true}).click();await settle();
  const rotatedSunny=await snapshot();
  assert(close(rotated.camera,rotatedSunny.camera,.02),'Switching weather keeps a user-selected orbit angle');
  await page.mouse.move(cx,cy);await page.mouse.wheel(0,-300);await page.waitForTimeout(200);
  const zoomed=await snapshot();
  assert(zoomed.zoom>rotatedSunny.zoom&&zoomed.renderedFrames>rotatedSunny.renderedFrames,'Mouse wheel zooms and redraws the orthographic camera');
  await page.screenshot({path:'output/playwright/rotated-desktop.png'});
  await page.getByRole('button',{name:'复位视角',exact:true}).click();await page.waitForTimeout(250);
  const reset=await snapshot();
  assert(close(initial.camera,reset.camera,.001)&&reset.zoom===initial.zoom&&reset.renderedFrames>zoomed.renderedFrames,'Reset redraws the initial view and zoom');

  for(let i=0;i<12;i++){
    await page.getByRole('button',{name:['雨天','夜景','晴天'][i%3],exact:true}).click();
  }
  await settle();const repeated=await snapshot();
  // GPU buffers are allocated lazily on the first rainy/night visit; compare after all modes have rendered.
  assert(repeated.geometries===night.geometries&&repeated.textures===night.textures,'Repeated switching reuses scene geometry and textures');

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const mobileCanvas=await page.locator('canvas').boundingBox();
  const mx=mobileCanvas.x+mobileCanvas.width*.5,my=mobileCanvas.y+mobileCanvas.height*.5;
  const touchInitial=await snapshot();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mx,y:my}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mx+i*6,y:my+i*1.5}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);
  const touchRotated=await snapshot();
  assert(!close(touchInitial.camera,touchRotated.camera,.1),'One-finger touch gesture rotates the model');
  const prePinch=touchRotated.zoom;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mx-35,y:my},{x:mx+35,y:my}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mx-35-i*5,y:my},{x:mx+35+i*5,y:my}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
  assert((await snapshot()).zoom>prePinch,'Two-finger pinch gesture zooms the model');
  await page.getByRole('button',{name:'复位视角',exact:true}).click();await page.waitForTimeout(200);
  for(const [label,file] of [['晴天','sunny'],['雨天','rainy'],['夜景','night']]){
    await page.getByRole('button',{name:label,exact:true}).click();await settle();
    await page.screenshot({path:`output/playwright/${file}-mobile.png`});
  }
  const mobileFits=await page.evaluate(()=>{
    const targets=[...document.querySelectorAll('button'),document.querySelector('h1'),document.querySelector('.mood')];
    return targets.every(element=>{const b=element.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;})&&document.documentElement.scrollWidth===innerWidth;
  });
  assert(mobileFits,'Mobile controls and content fit the viewport without horizontal overflow');

  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(150);
  assert(await page.locator('canvas').evaluate(el=>el.clientWidth>0&&el.clientHeight>100),'Small mobile viewport retains a usable 3D canvas');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'雨天',exact:true}).click();await settle();
  const reduced=await snapshot();await page.waitForTimeout(160);
  assert(close(reduced.rainPositions,(await snapshot()).rainPositions),'Reduced-motion preference pauses the rain animation');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'晴天',exact:true}).click();await settle();
  await page.getByRole('button',{name:'复位视角',exact:true}).click();
  assert(requests.every(url=>url.startsWith('file:')),'No HTTP requests or external assets are needed');
  assert(errors.length===0,'No browser console errors or uncaught exceptions');
  return {passed:checks.length,checks,errors,networkRequests:requests,desktop:{width:1440,height:1000},mobile:{width:390,height:844},resources:{geometries:repeated.geometries,textures:repeated.textures,drawCalls:initial.rendererCalls}};
}
