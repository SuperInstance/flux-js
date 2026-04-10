const Op = {MOV:0x01,IADD:0x08,ISUB:0x09,IMUL:0x0A,IDIV:0x0B,INC:0x0E,DEC:0x0F,PUSH:0x10,POP:0x11,MOVI:0x2B,CMP:0x2D,JZ:0x2E,JNZ:0x06,JMP:0x07,HALT:0x80};
class FluxVM{constructor(b){this.g=new Int32Array(16);this.p=0;this.h=false;this.c=0;this.s=[];this.b=b instanceof Uint8Array?b:new Uint8Array(b)}
u(){return this.b[this.p++]}
i(){const l=this.b[this.p++],h=this.b[this.p++];return(h<<8)|l|(h>=128?-65536:0)}
x(){while(!this.h&&this.p<this.b.length&&this.c<1e7){const o=this.u();this.c++;switch(o){case 0x80:this.h=true;break;case 0x01:{const d=this.u(),s=this.u();this.g[d]=this.g[s];break}case 0x2B:{const d=this.u();this.g[d]=this.i();break}case 0x08:{const d=this.u(),a=this.u(),b=this.u();this.g[d]=this.g[a]+this.g[b];break}case 0x09:{const d=this.u(),a=this.u(),b=this.u();this.g[d]=this.g[a]-this.g[b];break}case 0x0A:{const d=this.u(),a=this.u(),b=this.u();this.g[d]=this.g[a]*this.g[b];break}case 0x0B:{const d=this.u(),a=this.u(),b=this.u();this.g[d]=(this.g[a]/this.g[b])|0;break}case 0x0E:{this.g[this.u()]++;break}case 0x0F:{this.g[this.u()]--;break}case 0x06:{const d=this.u(),off=this.i();if(this.g[d]!==0)this.p+=off;break}case 0x2E:{const d=this.u(),off=this.i();if(this.g[d]===0)this.p+=off;break}case 0x07:{this.p+=this.i();break}case 0x10:{this.s.push(this.g[this.u()]);break}case 0x11:{this.g[this.u()]=this.s.pop();break}case 0x2D:{const a=this.u(),b=this.u();this.g[13]=this.g[a]>this.g[b]?1:this.g[a]<this.g[b]?-1:0;break}default:throw Error(`Unknown opcode: 0x${o.toString(16)}`)}}return this.c}}

// Demo
console.log("╔════════════════════════════════════════╗");
console.log("║   FLUX.js — JavaScript Bytecode VM    ║");
console.log("║   SuperInstance / Oracle1              ║");
console.log("╚════════════════════════════════════════╝\n");

const f=new Uint8Array([0x2B,0x00,0x07,0x00,0x2B,0x01,0x01,0x00,0x0A,0x01,0x01,0x00,0x0F,0x00,0x06,0x00,0xF6,0xFF,0x80]);
const v=new FluxVM(f);v.x();
console.log(`Factorial(7): R1 = ${v.g[1]} (expect 5040)`);

const N=100000,t0=performance.now();
for(let i=0;i<N;i++){new FluxVM(f).x()}
const t=performance.now()-t0;
console.log(`Benchmark (100K): ${t.toFixed(1)} ms | ${(t*1e6/N).toFixed(0)} ns/iter`);

// A2A Agent demo
class A2AAgent{constructor(id,bc,role="worker"){this.id=id;this.vm=new FluxVM(bc);this.role=role;this.trust=1.0;this.inbox=[]}
step(){this.vm.x()}
tell(other,payload){other.inbox.push({from:this.id,type:"TELL",payload,trust:this.trust})}}

const a1=new A2AAgent("navigator",f,"navigator");
const a2=new A2AAgent("scout",f,"scout");
a1.tell(a2,"heading=270");
console.log(`\nA2A: ${a2.inbox[0].from} told scout: "${a2.inbox[0].payload}"`);
console.log("\n✓ FLUX.js implementation working!");
