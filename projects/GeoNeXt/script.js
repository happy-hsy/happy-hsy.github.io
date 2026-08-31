const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element, index) => {
  if (!reducedMotion && element.closest('.hero')) {
    element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  }
  observer.observe(element);
});

const jointCases = Array.from({ length: 19 }, (_, index) => `case${index + 1}`);
let jointIndex = 0, jointModel = 'wan';
const jointExtensions = Object.fromEntries(jointCases.map((key, index) => [key, index >= 10 && index <= 15 ? 'png' : 'jpg']));
const jointSuffixes = {
  input: key => `input/${key}.${jointExtensions[key]}`,
  geowizard_depth: key => `geowizard/depth/${key}.png`,
  geowizard_normal: key => `geowizard/normal/${key}.png`,
  geonext_depth: key => `geonext_${jointModel}/depth/${key}.png`,
  geonext_normal: key => `geonext_${jointModel}/normal/${key}.png`
};

function renderTabs(container, labels, active, callback) {
  container.innerHTML = '';
  labels.forEach((label, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label; button.className = index === active ? 'active' : '';
    button.addEventListener('click', () => callback(index)); container.appendChild(button);
  });
}

function updateJoint() {
  const root = document.querySelector('#joint-comparison');
  const key = jointCases[jointIndex]; root.querySelector('.joint-grid').classList.add('loading');
  root.querySelectorAll('[data-joint]').forEach(img => { img.src = `assets/P1/${jointSuffixes[img.dataset.joint](key)}`; });
  const variant = `GeoNeXt-${jointModel.toUpperCase()}`;
  document.querySelector('#geonext-variant').textContent = variant;
  root.querySelectorAll('[data-joint^="geonext"]').forEach(img => { img.alt = `${variant} ${img.dataset.joint.endsWith('depth') ? 'depth' : 'normal'}`; });
  window.setTimeout(() => root.querySelector('.joint-grid').classList.remove('loading'), 170);
  renderTabs(document.querySelector('[data-tabs="joint"]'), jointCases.map((_, i) => String(i + 1).padStart(2, '0')), jointIndex, i => { jointIndex = i; updateJoint(); });
  requestAnimationFrame(() => {
    const tabs = document.querySelector('[data-tabs="joint"]'), active = tabs.querySelector('.active');
    if (active) {
      const tabsBox = tabs.getBoundingClientRect(), activeBox = active.getBoundingClientRect();
      const activeCenterInScroll = tabs.scrollLeft + activeBox.left - tabsBox.left + activeBox.width / 2;
      tabs.scrollTo({ left: Math.max(0, activeCenterInScroll - tabs.clientWidth / 2), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
}

document.querySelectorAll('[data-joint-model]').forEach(button => button.addEventListener('click', () => {
  jointModel = button.dataset.jointModel;
  document.querySelectorAll('[data-joint-model]').forEach(item => item.classList.toggle('active', item === button));
  updateJoint();
}));
document.querySelectorAll('[data-case-direction]').forEach(button => button.addEventListener('click', () => {
  jointIndex = (jointIndex + (button.dataset.caseDirection === 'next' ? 1 : -1) + jointCases.length) % jointCases.length;
  updateJoint();
}));
const jointTabs = document.querySelector('[data-tabs="joint"]');
let jointWheelLocked = false;
jointTabs.addEventListener('wheel', event => {
  event.preventDefault();
  event.stopPropagation();
  if (jointWheelLocked) return;
  const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(distance) < 1) return;
  jointWheelLocked = true;
  jointIndex = (jointIndex + (distance > 0 ? 1 : -1) + jointCases.length) % jointCases.length;
  updateJoint();
  window.setTimeout(() => { jointWheelLocked = false; }, 180);
}, { passive: false });
const jointGrid = document.querySelector('#joint-comparison .joint-grid');
let magnifierZoom = 2;
jointGrid.querySelectorAll('figure').forEach(figure => {
  const lens = document.createElement('div'); lens.className = 'comparison-lens'; lens.setAttribute('aria-hidden', 'true'); figure.appendChild(lens);
});
function updateComparisonLenses(sourceFigure, event) {
  const sourceImage = sourceFigure.querySelector('img'), box = sourceImage.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
  const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
  jointGrid.querySelectorAll('figure').forEach(figure => {
    const image = figure.querySelector('img'), lens = figure.querySelector('.comparison-lens');
    const width = image.clientWidth, height = image.clientHeight, lensSize = lens.offsetWidth;
    lens.style.left = `${x * width}px`; lens.style.top = `${y * height}px`;
    lens.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
    lens.style.backgroundSize = `${width * magnifierZoom}px ${height * magnifierZoom}px`;
    lens.style.backgroundPosition = `${lensSize / 2 - x * width * magnifierZoom}px ${lensSize / 2 - y * height * magnifierZoom}px`;
    lens.classList.add('visible');
  });
}
jointGrid.querySelectorAll('figure').forEach(figure => {
  figure.addEventListener('pointermove', event => updateComparisonLenses(figure, event));
  figure.addEventListener('pointerenter', event => updateComparisonLenses(figure, event));
  figure.addEventListener('wheel', event => {
    event.preventDefault();
    magnifierZoom = Math.max(1.25, Math.min(5, magnifierZoom + (event.deltaY < 0 ? .25 : -.25)));
    updateComparisonLenses(figure, event);
  }, { passive: false });
});
jointGrid.addEventListener('pointerleave', () => jointGrid.querySelectorAll('.comparison-lens').forEach(lens => lens.classList.remove('visible')));

const benchmarks = {
  depth: [
    { label:'NYUv2', input:'nyu.png', depth_anything:'rgb_0801_depth_vis.png', lotus:'pred_0801.png', geowizard:'depth_0801_pred_aligned_disp_vis.png', geonext:'pred_0801.png', gt:'depth_0801_gt_disp_vis.png' },
    { label:'ETH3D', input:'input.JPG', depth_anything:'depth_anything.png', lotus:'lotus.png', geowizard:'geowizard.png', geonext:'ours.png', gt:'gt.png' },
    { label:'ScanNet', input:'scannet.jpg', depth_anything:'001800_depth_vis.png', lotus:'pred_001800.png', geowizard:'001800_pred_aligned_disp_vis.png', geonext:'pred_001800.png', gt:'001800_gt_disp_vis.png' },
    { label:'DIODE', input:'diode.png', depth_anything:'00023_00198_outdoor_000_020_depth_vis.png', lotus:'pred_00023_00198_outdoor_000_020.png', geowizard:'00023_00198_outdoor_000_020_pred_aligned_disp_vis.png', geonext:'pred_00023_00198_outdoor_000_020 (1).png', gt:'00023_00198_outdoor_000_020_gt_disp_vis.png' },
    { label:'KITTI', input:'kitti.png', depth_anything:'0000000024_depth_vis.png', lotus:'pred_0000000024.png', geowizard:'0000000024_pred_aligned_disp_vis.png', geonext:'pred_0000000024.png', gt:'0000000024_gt_disp_vis.png' }
  ],
  normal: [
    { label:'NYU', input:'nyu.png', DSINE:'nyu.png', lotus:'test_000033_norm.png', geowizard:'nyu.png', geonext:'test_000033_norm.png', gt:'test_000033_gt.png' },
    { label:'ScanNet', input:'scannet.png', DSINE:'scannet.png', lotus:'scene0244_01_000360_norm.png', geowizard:'scannet.png', geonext:'scene0244_01_000360_norm.png', gt:'scene0244_01_000360_gt.png' },
    { label:'iBims-1', input:'ibims.png', DSINE:'ibims.png', lotus:'ibims_restaurant_04_norm.png', geowizard:'ibims.png', geonext:'ibims_restaurant_04_norm.png', gt:'ibims_restaurant_04_gt.png' },
    { label:'OASIS', input:'oasis.png', DSINE:'oasis.png', lotus:'val_249306_ALI_norm.png', geowizard:'oasis.png', geonext:'val_249306_ALI_norm.png', gt:'val_249306_ALI_gt.png' },
    { label:'Sintel', input:'sintel.png', DSINE:'sintel.png', lotus:'lotus.png', geowizard:'sintel.png', geonext:'our.png', gt:'temple_3_frame_0013_gt.png' }
  ]
};
let benchmarkMode = 'depth', benchmarkIndex = 0;

function benchmarkPath(method, item) {
  const base = `assets/P2/${benchmarkMode}_comparison/`;
  return `${base}${method}/${item[method]}`;
}

function updateBenchmark() {
  const item = benchmarks[benchmarkMode][benchmarkIndex];
  const methods = benchmarkMode === 'depth' ? [['input','Input'],['depth_anything','Depth Anything'],['lotus','Lotus'],['geowizard','GeoWizard'],['geonext','GeoNeXt-SVD'],['gt','Ground Truth']] : [['input','Input'],['DSINE','DSINE'],['lotus','Lotus'],['geowizard','GeoWizard'],['geonext','GeoNeXt-SVD'],['gt','Ground Truth']];
  const grid = document.querySelector('#benchmark-grid');
  grid.innerHTML = '';
  methods.forEach(([key,label]) => { const figure=document.createElement('figure'); if(key==='geonext') figure.className='ours'; const caption=document.createElement('figcaption'); caption.textContent=label; const img=document.createElement('img'); img.alt=`${item.label} — ${label}`; img.src=benchmarkPath(key,item); figure.append(caption,img); figure.addEventListener('click',()=>openLightbox(img.src,img.alt)); grid.appendChild(figure); });
  setupBenchmarkMagnifiers(grid);
  document.querySelector('#benchmark-kicker').textContent = `${benchmarkMode === 'depth' ? 'Depth' : 'Surface normal'} benchmark`;
  renderTabs(document.querySelector('[data-tabs="benchmark"]'), benchmarks[benchmarkMode].map(x=>x.label), benchmarkIndex, i=>{benchmarkIndex=i;updateBenchmark();});
}

function setupBenchmarkMagnifiers(grid) {
  grid.querySelectorAll('figure').forEach(figure => {
    const lens = document.createElement('div'); lens.className = 'comparison-lens'; lens.setAttribute('aria-hidden','true'); figure.appendChild(lens);
    const update = event => {
      const sourceImage = figure.querySelector('img'), sourceBox = sourceImage.getBoundingClientRect();
      const x = Math.max(0,Math.min(1,(event.clientX-sourceBox.left)/sourceBox.width));
      const y = Math.max(0,Math.min(1,(event.clientY-sourceBox.top)/sourceBox.height));
      grid.querySelectorAll('figure').forEach(target => {
        const image=target.querySelector('img'), targetLens=target.querySelector('.comparison-lens');
        const width=image.clientWidth,height=image.clientHeight,lensSize=targetLens.offsetWidth;
        targetLens.style.left=`${x*width}px`;targetLens.style.top=`${y*height}px`;targetLens.style.backgroundImage=`url("${image.currentSrc||image.src}")`;targetLens.style.backgroundSize=`${width*magnifierZoom}px ${height*magnifierZoom}px`;targetLens.style.backgroundPosition=`${lensSize/2-x*width*magnifierZoom}px ${lensSize/2-y*height*magnifierZoom}px`;targetLens.classList.add('visible');
      });
    };
    figure.addEventListener('pointermove',update);figure.addEventListener('pointerenter',update);
    figure.addEventListener('wheel',event=>{event.preventDefault();magnifierZoom=Math.max(1.25,Math.min(5,magnifierZoom+(event.deltaY<0?.25:-.25)));update(event)},{passive:false});
  });
  grid.onpointerleave=()=>grid.querySelectorAll('.comparison-lens').forEach(lens=>lens.classList.remove('visible'));
}

document.querySelectorAll('[data-benchmark-mode]').forEach(button => button.addEventListener('click', () => { benchmarkMode=button.dataset.benchmarkMode; benchmarkIndex=0; document.querySelectorAll('[data-benchmark-mode]').forEach(x=>x.classList.toggle('active',x===button)); updateBenchmark(); }));
const lightbox=document.querySelector('#image-lightbox');
function openLightbox(src,label){lightbox.querySelector('img').src=src;lightbox.querySelector('img').alt=label;lightbox.querySelector('p').textContent=label;lightbox.showModal();}
lightbox.querySelector('button').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close();});
const frameworkFigure=document.querySelector('#framework-figure');
frameworkFigure.addEventListener('click',()=>openLightbox(frameworkFigure.querySelector('img').src,'GeoNeXt fine-tuning framework'));
updateJoint(); updateBenchmark();

// Synchronized side-by-side comparison of meshes generated by different methods.
const meshScenes=[['case1','jpg'],['case2','jpg'],['case3','jpg'],['case4','png'],['case5','png'],['case6','png'],['case7','jpg'],['case8','jpg']];
const meshMethods=[['geonext-wan','GeoNeXt-WAN'],['geonext-svd','GeoNeXt-SVD'],['geowizard','GeoWizard'],['lotus','Lotus'],['moge','MoGe-2']];

function initMeshShowcase(){
  const base='assets/mesh_assets/comparison',meshVersion='20260831-original',cache=new Map();
  const state={scene:0,mode:0,yaw:0,pitch:0,zoom:2.23,left:'geonext-wan',right:'moge'};
  const vertexShader=`#version 300 es
    in vec3 aPosition;in vec3 aNormal;in vec3 aColor;uniform float uYaw,uPitch,uZoom,uAspect,uMode;out vec3 vColor;out float vLight;
    void main(){float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);mat3 rx=mat3(1.,0.,0.,0.,cp,sp,0.,-sp,cp);vec3 p=rx*ry*aPosition;vec3 n=normalize(rx*ry*aNormal);float cameraZ=p.z-uZoom;float f=1.7320508,near=.01,far=20.;gl_Position=vec4(p.x*f/uAspect,p.y*f,-((far+near)/(far-near))*cameraZ-(2.*far*near/(far-near)),-cameraZ);vColor=mix(aColor,vec3(.72,.76,.75),uMode);vLight=.52+.48*abs(dot(n,normalize(vec3(.3,.55,1.))));}`;
  const fragmentShader=`#version 300 es
    precision mediump float;in vec3 vColor;in float vLight;out vec4 outColor;void main(){outColor=vec4(vColor*vLight,1.);}`;
  function parsePly(arrayBuffer){const bytes=new Uint8Array(arrayBuffer),headText=new TextDecoder().decode(bytes.subarray(0,2048));let marker='end_header\n',headerEnd=headText.indexOf(marker);if(headerEnd<0){marker='end_header\r\n';headerEnd=headText.indexOf(marker)}if(headerEnd<0)throw new Error('Invalid PLY header');const header=headText.slice(0,headerEnd),vertexCount=Number(header.match(/element vertex (\d+)/)?.[1]),faceCount=Number(header.match(/element face (\d+)/)?.[1]),dataStart=headerEnd+marker.length,view=new DataView(arrayBuffer),stride=27,positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),colors=new Uint8Array(vertexCount*3),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let offset=dataStart;for(let i=0;i<vertexCount;i++,offset+=stride){for(let k=0;k<3;k++){const value=view.getFloat32(offset+k*4,true);positions[i*3+k]=value;min[k]=Math.min(min[k],value);max[k]=Math.max(max[k],value)}for(let k=0;k<3;k++)normals[i*3+k]=view.getFloat32(offset+12+k*4,true);colors.set(bytes.subarray(offset+24,offset+27),i*3)}const center=min.map((v,k)=>(v+max[k])/2),scale=1.65/Math.max(...max.map((v,k)=>v-min[k]));for(let i=0;i<vertexCount;i++){positions[i*3]=(positions[i*3]-center[0])*scale;positions[i*3+1]=(positions[i*3+1]-center[1])*scale;positions[i*3+2]=(positions[i*3+2]-center[2])*scale}const indices=new Uint32Array(faceCount*3);let written=0;for(let f=0;f<faceCount;f++){const count=view.getUint8(offset++),first=view.getUint32(offset,true);offset+=4;let previous=view.getUint32(offset,true);offset+=4;for(let k=2;k<count;k++){const current=view.getUint32(offset,true);offset+=4;if(written+3<=indices.length){indices[written++]=first;indices[written++]=previous;indices[written++]=current}previous=current}}return{positions,normals,colors,indices:written===indices.length?indices:indices.slice(0,written)}}
  function createRenderer(side){const canvas=document.querySelector(`#mesh-canvas-${side}`),loading=document.querySelector(`#mesh-loading-${side}`),gl=canvas?.getContext('webgl2',{antialias:true,alpha:false});if(!gl){if(loading)loading.textContent='WebGL 2 is required.';return null}function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader}const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexShader));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentShader));gl.linkProgram(program);gl.useProgram(program);const buffers={position:gl.createBuffer(),normal:gl.createBuffer(),color:gl.createBuffer(),index:gl.createBuffer()},locations={position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),color:gl.getAttribLocation(program,'aColor')},uniforms={yaw:gl.getUniformLocation(program,'uYaw'),pitch:gl.getUniformLocation(program,'uPitch'),zoom:gl.getUniformLocation(program,'uZoom'),aspect:gl.getUniformLocation(program,'uAspect'),mode:gl.getUniformLocation(program,'uMode')};let indexCount=0,token=0;function bind(buffer,location,size,type=gl.FLOAT,normalized=false){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,type,normalized,0,0)}function render(){const dpr=Math.min(devicePixelRatio,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.clearColor(.945,.955,.95,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(program);gl.uniform1f(uniforms.yaw,state.yaw);gl.uniform1f(uniforms.pitch,state.pitch);gl.uniform1f(uniforms.zoom,state.zoom);gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.mode,state.mode);bind(buffers.position,locations.position,3);bind(buffers.normal,locations.normal,3);bind(buffers.color,locations.color,3,gl.UNSIGNED_BYTE,true);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.index);gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_INT,0)}function upload(mesh){gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.color);gl.bufferData(gl.ARRAY_BUFFER,mesh.colors,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);indexCount=mesh.indices.length;loading.classList.add('hidden');render()}async function load(method,scene){const current=++token,key=`${method}/case${scene+1}`;loading.textContent='Loading mesh…';loading.classList.remove('hidden');try{let mesh=cache.get(key);if(!mesh){const response=await fetch(`${base}/${key}.ply?v=${meshVersion}`);if(!response.ok)throw new Error(`HTTP ${response.status}`);mesh=parsePly(await response.arrayBuffer());cache.set(key,mesh)}if(current===token)upload(mesh)}catch(error){if(current===token)loading.textContent=`Unable to load: ${error.message}`}}new ResizeObserver(render).observe(canvas.parentElement);return{canvas,render,load}}
  const renderers={left:createRenderer('left'),right:createRenderer('right')};if(!renderers.left||!renderers.right)return;
  const renderBoth=()=>{renderers.left.render();renderers.right.render()};
  function loadBoth(reset=true){if(reset){state.yaw=0;state.pitch=0;state.zoom=2.23}renderers.left.load(state.left,state.scene);renderers.right.load(state.right,state.scene);document.querySelectorAll('.mesh-scene').forEach((button,index)=>button.classList.toggle('active',index===state.scene))}
  ['left','right'].forEach(side=>{const select=document.querySelector(`#mesh-method-${side}`);meshMethods.forEach(([value,label])=>select.add(new Option(label,value)));select.value=state[side];select.addEventListener('change',()=>{state[side]=select.value;renderers[side].load(state[side],state.scene)})});
  const sceneBar=document.querySelector('#mesh-scenes');sceneBar.innerHTML='';meshScenes.forEach(([key,ext],index)=>{const visibleIndex=index+1-(index>1?1:0)-(index>5?1:0),caseName=`Case ${visibleIndex}`,button=document.createElement('button');button.className='mesh-scene';button.type='button';button.title=caseName;button.setAttribute('aria-label',caseName);button.innerHTML=`<img src="assets/mesh_assets/input/${key}.${ext}" alt="${caseName}">`;button.addEventListener('click',()=>{state.scene=index;loadBoth(true)});sceneBar.appendChild(button)});
  document.querySelectorAll('[data-mesh-mode]').forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.meshMode==='geometry'?1:0;document.querySelectorAll('[data-mesh-mode]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',active)});renderBoth()}));
  Object.values(renderers).forEach(renderer=>{const canvas=renderer.canvas;let dragging=false,lastX=0,lastY=0;canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId)});canvas.addEventListener('pointermove',event=>{if(!dragging)return;state.yaw+=(event.clientX-lastX)*.008;state.pitch=Math.max(-1.35,Math.min(1.35,state.pitch+(event.clientY-lastY)*.008));lastX=event.clientX;lastY=event.clientY;renderBoth()});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('wheel',event=>{event.preventDefault();state.zoom=Math.max(1,Math.min(7,state.zoom+event.deltaY*.002));renderBoth()},{passive:false});canvas.addEventListener('dblclick',()=>{state.yaw=0;state.pitch=0;state.zoom=2.23;renderBoth()})});
  window.addEventListener('resize',renderBoth);loadBoth(false);
}
const meshShowcase = document.querySelector('.mesh-showcase');
if (meshShowcase) {
  const meshObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    initMeshShowcase();
  }, { rootMargin: '500px 0px' });
  meshObserver.observe(meshShowcase);
}

const copyBibtexButton=document.querySelector('#copy-bibtex');
if(copyBibtexButton)copyBibtexButton.addEventListener('click',async()=>{const entry=document.querySelector('#bibtex-entry').textContent;try{await navigator.clipboard.writeText(entry);copyBibtexButton.textContent='Copied';setTimeout(()=>copyBibtexButton.textContent='Copy BibTeX',1600)}catch{copyBibtexButton.textContent='Select and copy';setTimeout(()=>copyBibtexButton.textContent='Copy BibTeX',1600)}});
