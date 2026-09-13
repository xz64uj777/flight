const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||`${__dirname}/copter-flight.html`,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
function fn(name){const start=script.indexOf(`function ${name}(`);let i=script.indexOf('{',start),depth=1,j=i+1;for(;depth;j++){if(script[j]==='{')depth++;if(script[j]==='}')depth--;}return script.slice(start,j);}
const ctx=vm.createContext({screen:{orientation:{angle:0}},window:{},setTiltLabel(){},sim:{controls:{collective:.35}},input:{keys:new Set(),stickX:0,stickY:0,yawStick:0,collStick:0,padX:0,padY:0,tiltOn:true,tiltReady:false,tiltLive:false,tiltSrc:'',tiltDeg:18,tiltInvert:false}});
vm.runInContext(['clamp','wrapAngle','tiltCyclic','sampleControls','applyTiltSample','calibrateTilt','bindStick'].map(fn).join('\n'),ctx);
let count=0;function test(name,f){f();count++;console.log('PASS '+name)}
const input=ctx.input,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('whole game JavaScript parses',()=>{});
test('initial sample is neutral',()=>{ctx.applyTiltSample(30,10,'accel');near(ctx.tiltCyclic().p,0)});
test('sensor handover stays neutral',()=>{ctx.applyTiltSample(70,-20,'orient');near(ctx.tiltCyclic().p,0);near(ctx.tiltCyclic().r,0)});
test('absolute and relative orientation share calibration',()=>{ctx.applyTiltSample(79,-11,'abs');near(ctx.tiltCyclic().p,.5);near(ctx.tiltCyclic().r,.5)});
test('tilt and yaw remain simultaneous',()=>{input.yawStick=.7;const c=ctx.sampleControls(.016);near(c.cyclicPitch,.5);near(c.cyclicRoll,.5);near(c.yaw,.7)});
for(const [angle,p,r] of [[90,-.5,.5],[180,-.5,-.5],[270,.5,-.5]])test(`screen rotation ${angle}`,()=>{ctx.screen.orientation.angle=angle;near(ctx.tiltCyclic().p,p);near(ctx.tiltCyclic().r,r)});
test('beta wrap takes short path',()=>{ctx.screen.orientation.angle=0;input.tiltZeroB=179;input.tiltBeta=-179;near(ctx.tiltCyclic().p,2/18)});
test('disabled sensors cannot mutate state',()=>{input.tiltOn=false;const b=input.tiltBeta;ctx.applyTiltSample(0,0,'accel');near(input.tiltBeta,b)});
test('calibrate before data waits for first sample',()=>{input.tiltLive=false;ctx.calibrateTilt();assert.equal(input.tiltReady,false)});
const handlers={},knob={style:{}},el={querySelector:()=>knob,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},addEventListener:(name,f)=>handlers[name]=f};ctx.bindStick(el,'yaw');
const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
test('vertical thumb drift preserves full yaw',()=>{handlers.pointerdown(event(1,92,92));near(input.yawStick,1)});
test('second finger cannot steal yaw',()=>{handlers.pointerdown(event(2,8,50));near(input.yawStick,1)});
test('lost capture releases yaw',()=>{handlers.lostpointercapture(event(1,0,0));near(input.yawStick,0)});
test('listener cleanup matches capture registration',()=>{for(const name of ['deviceorientation','deviceorientationabsolute','devicemotion'])assert.ok(fn('unbindTilt').includes(`removeEventListener('${name}', ${name==='devicemotion'?'onMotion':'onOrient'}, true)`))});
console.log(`${count} checks passed`);
