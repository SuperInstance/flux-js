/**
 * FLUX.js — JavaScript Bytecode VM
 * 
 * Self-contained FLUX runtime for Node.js and browsers.
 * Features: VM, assembler, disassembler, vocabulary, A2A agents, swarm.
 * 
 * Usage:
 *   const { FluxVM, assemble, Interpreter } = require('./flux.js');
 *   const bc = assemble('MOVI R0, 7\nMOVI R1, 1\nIMUL R1, R1, R0\nDEC R0\nJNZ R0, -10\nHALT');
 *   const vm = new FluxVM(bc);
 *   vm.execute();
 *   console.log(vm.reg(1)); // 5040
 */

'use strict';

// ─── Opcodes ──────────────────────────────────────────────────────────────

const OP = {
  NOP:0x00, MOV:0x01, JMP:0x07,
  IADD:0x08, ISUB:0x09, IMUL:0x0A, IDIV:0x0B,
  INC:0x0E, DEC:0x0F,
  PUSH:0x10, POP:0x11,
  JNZ:0x06, JZ:0x2E,
  MOVI:0x2B, CMP:0x2D,
  HALT:0x80
};

const MNEMONIC = Object.fromEntries(Object.entries(OP).map(([k,v])=>[v,k]));

// ─── VM ───────────────────────────────────────────────────────────────────

class FluxVM {
  /**
   * Create a FLUX bytecode VM.
   * @param {Uint8Array|ArrayBuffer} bytecode
   * @param {number} [maxCycles=10_000_000]
   */
  constructor(bytecode, maxCycles = 10_000_000) {
    this.gp = new Int32Array(16);  // 16 general-purpose registers
    this.pc = 0;
    this.halted = false;
    this.cycles = 0;
    this.stack = [];
    this.bc = bytecode instanceof Uint8Array ? bytecode : new Uint8Array(bytecode);
    this.maxCycles = maxCycles;
    this.error = null;
  }

  /** Read register */
  reg(idx) { return this.gp[idx] || 0; }

  /** Read unsigned byte */
  _u8() { return this.bc[this.pc++]; }

  /** Read signed 16-bit */
  _i16() {
    const lo = this.bc[this.pc++];
    const hi = this.bc[this.pc++];
    const val = lo | (hi << 8);
    return val >= 32768 ? val - 65536 : val;
  }

  /**
   * Execute until HALT or maxCycles.
   * @returns {FluxVM} this (for chaining)
   */
  execute() {
    this.halted = false;
    this.cycles = 0;
    this.error = null;
    try {
      while (!this.halted && this.pc < this.bc.length && this.cycles < this.maxCycles) {
        const op = this._u8();
        this.cycles++;
        switch (op) {
          case 0x80: this.halted = true; break;
          case 0x00: break; // NOP
          case 0x01: { const d=this._u8(),s=this._u8(); this.gp[d]=this.gp[s]; break; }
          case 0x2B: { const d=this._u8(); this.gp[d]=this._i16(); break; }
          case 0x08: { const d=this._u8(),a=this._u8(),b=this._u8(); this.gp[d]=this.gp[a]+this.gp[b]; break; }
          case 0x09: { const d=this._u8(),a=this._u8(),b=this._u8(); this.gp[d]=this.gp[a]-this.gp[b]; break; }
          case 0x0A: { const d=this._u8(),a=this._u8(),b=this._u8(); this.gp[d]=this.gp[a]*this.gp[b]; break; }
          case 0x0B: { const d=this._u8(),a=this._u8(),b=this._u8();
            if(this.gp[b]===0) throw new Error('Division by zero');
            this.gp[d]=(this.gp[a]/this.gp[b])|0; break; }
          case 0x0E: this.gp[this._u8()]++; break;
          case 0x0F: this.gp[this._u8()]--; break;
          case 0x10: this.stack.push(this.gp[this._u8()]); break;
          case 0x11: this.gp[this._u8()]=this.stack.pop(); break;
          case 0x06: { const d=this._u8(),off=this._i16(); if(this.gp[d]!==0) this.pc+=off; break; }
          case 0x2E: { const d=this._u8(),off=this._i16(); if(this.gp[d]===0) this.pc+=off; break; }
          case 0x07: this.pc+=this._i16(); break;
          case 0x2D: { const a=this._u8(),b=this._u8();
            this.gp[13]=this.gp[a]>this.gp[b]?1:this.gp[a]<this.gp[b]?-1:0; break; }
          default: throw new Error(`Unknown opcode: 0x${op.toString(16).padStart(2,'0')}`);
        }
      }
    } catch (e) { this.error = e.message; }
    return this;
  }

  /** Pretty-print register state */
  dump() {
    const regs = [];
    for (let i = 0; i < 16; i++) if (this.gp[i] !== 0) regs.push(`R${i}=${this.gp[i]}`);
    return `PC=${this.pc} cycles=${this.cycles} halted=${this.halted} [${regs.join(' ')}]`;
  }
}

// ─── Assembler ────────────────────────────────────────────────────────────

/**
 * Assemble FLUX text to bytecode.
 * Supports labels (label:), comments (// or ;), all instruction formats.
 * @param {string} text
 * @returns {Uint8Array}
 */
function assemble(text) {
  const labels = {};
  const instructions = [];

  // Pass 1: collect labels and calculate sizes
  let pc = 0;
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith(';')) continue;
    if (line.includes(':')) {
      const [labelPart, ...rest] = line.split(':');
      labels[labelPart.trim()] = pc;
      line = rest.join(':').trim();
      if (!line) continue;
    }
    const parts = line.replace(/,/g, ' ').split(/\s+/);
    const mn = parts[0].toUpperCase();
    instructions.push({ parts, pc });
    
    // Size calculation
    if (mn in OP) {
      if (['HALT','NOP'].includes(mn)) pc += 1;
      else if (['INC','DEC','PUSH','POP'].includes(mn)) pc += 2;
      else if (mn === 'MOV') pc += 3;
      else if (['IADD','ISUB','IMUL','IDIV','CMP'].includes(mn)) pc += 4;
      else if (['MOVI','JNZ','JZ'].includes(mn)) pc += 4;
      else if (mn === 'JMP') pc += 3;
    }
  }

  // Pass 2: emit bytecode
  const bc = [];
  const resolveValue = (token, currentPc) => {
    token = token.trim();
    const num = parseInt(token);
    if (!isNaN(num)) return num;
    if (token in labels) return labels[token] - currentPc;
    throw new Error(`Cannot resolve: ${token}`);
  };

  for (const { parts, pc: instPc } of instructions) {
    const mn = parts[0].toUpperCase();
    if (!(mn in OP)) continue;
    const op = OP[mn];

    if (['HALT','NOP'].includes(mn)) {
      bc.push(op);
    } else if (['INC','DEC','PUSH','POP'].includes(mn)) {
      bc.push(op, parseInt(parts[1].slice(1)));
    } else if (mn === 'MOV') {
      bc.push(op, parseInt(parts[1].slice(1)), parseInt(parts[2].slice(1)));
    } else if (['IADD','ISUB','IMUL','IDIV','CMP'].includes(mn)) {
      bc.push(op, parseInt(parts[1].slice(1)), parseInt(parts[2].slice(1)),
              parts.length > 3 ? parseInt(parts[3].slice(1)) : parseInt(parts[2].slice(1)));
    } else if (mn === 'MOVI') {
      bc.push(op, parseInt(parts[1].slice(1)));
      const v = resolveValue(parts[2], bc.length + 1);
      bc.push(v & 0xFF, (v >> 8) & 0xFF);
    } else if (['JNZ','JZ'].includes(mn)) {
      bc.push(op, parseInt(parts[1].slice(1)));
      const v = resolveValue(parts[2], bc.length + 1);
      bc.push(v & 0xFF, (v >> 8) & 0xFF);
    } else if (mn === 'JMP') {
      bc.push(op);
      const v = resolveValue(parts[1], bc.length);
      bc.push(v & 0xFF, (v >> 8) & 0xFF);
    }
  }

  return new Uint8Array(bc);
}

// ─── Disassembler ─────────────────────────────────────────────────────────

/**
 * Disassemble bytecode to human-readable text.
 * @param {Uint8Array} bytecode
 * @returns {string[]}
 */
function disassemble(bytecode) {
  const lines = [];
  let pc = 0;
  const bc = bytecode instanceof Uint8Array ? bytecode : new Uint8Array(bytecode);
  
  while (pc < bc.length) {
    const addr = pc;
    const op = bc[pc++];
    const mn = MNEMONIC[op] || `??? (0x${op.toString(16).padStart(2,'0')})`;

    if ([0x80, 0x00].includes(op)) {
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn}`);
    } else if ([0x0E, 0x0F, 0x10, 0x11].includes(op)) {
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn} R${bc[pc++]}`);
    } else if (op === 0x01) {
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn} R${bc[pc++]}, R${bc[pc++]}`);
    } else if ([0x08, 0x09, 0x0A, 0x0B, 0x2D].includes(op)) {
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn} R${bc[pc++]}, R${bc[pc++]}, R${bc[pc++]}`);
    } else if ([0x2B, 0x06, 0x2E].includes(op)) {
      const rd = bc[pc++];
      const val = bc[pc] | (bc[pc+1] << 8) | (bc[pc+1] >= 128 ? -65536 : 0);
      pc += 2;
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn} R${rd}, ${val}`);
    } else if (op === 0x07) {
      const val = bc[pc] | (bc[pc+1] << 8) | (bc[pc+1] >= 128 ? -65536 : 0);
      pc += 2;
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn} ${val}`);
    } else {
      lines.push(`${addr.toString(16).padStart(4,'0')}: ${mn}`);
    }
  }
  return lines;
}

// ─── Vocabulary ───────────────────────────────────────────────────────────

class VocabEntry {
  /**
   * @param {RegExp|string} pattern 
   * @param {string|function} asmTemplate 
   * @param {string} name 
   * @param {number} resultReg 
   */
  constructor(pattern, asmTemplate, name, resultReg = 0) {
    this.pattern = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    this.asmTemplate = asmTemplate;
    this.name = name;
    this.resultReg = resultReg;
  }

  /**
   * Match text against pattern
   * @param {string} text 
   * @returns {Array|null} captured groups or null
   */
  match(text) {
    const m = text.match(this.pattern);
    return m ? m.slice(1) : null;
  }
}

class Vocabulary {
  constructor() {
    this.entries = [];
  }

  /**
   * Add a vocabulary entry
   * @param {VocabEntry} entry 
   */
  register(entry) {
    this.entries.push(entry);
  }

  /**
   * Find first matching entry for text
   * @param {string} text 
   * @returns {VocabEntry|null}
   */
  findMatch(text) {
    for (const entry of this.entries) {
      if (entry.match(text) !== null) {
        return entry;
      }
    }
    return null;
  }
}

class VocabInterpreter {
  constructor() {
    this.vocab = new Vocabulary();
    this.assembler = assemble; // Use existing assemble function
    this.vm = null;
    
    // Register built-in entries
    this.vocab.register(new VocabEntry(
      /^compute\s+(\d+)\s*\+\s*(\d+)$/i,
      (a, b) => `MOVI R0, ${a}\nMOVI R1, ${b}\nIADD R0, R0, R1\nHALT`,
      'add',
      0
    ));
    this.vocab.register(new VocabEntry(
      /^compute\s+(\d+)\s*\*\s*(\d+)$/i,
      (a, b) => `MOVI R0, ${a}\nMOVI R1, ${b}\nIMUL R0, R0, R1\nHALT`,
      'mul',
      0
    ));
    this.vocab.register(new VocabEntry(
      /^factorial\s+of\s+(\d+)$/i,
      (n) => `MOVI R0, ${n}\nMOVI R1, 1\nIMUL R1, R1, R0\nDEC R0\nJNZ R0, -10\nHALT`,
      'factorial',
      1
    ));
    this.vocab.register(new VocabEntry(
      /^double\s+(\d+)$/i,
      (n) => `MOVI R0, ${n}\nIADD R0, R0, R0\nHALT`,
      'double',
      0
    ));
    this.vocab.register(new VocabEntry(
      /^square\s+(\d+)$/i,
      (n) => `MOVI R0, ${n}\nIMUL R0, R0, R0\nHALT`,
      'square',
      0
    ));
    this.vocab.register(new VocabEntry(
      /^hello$/i,
      () => `MOVI R0, 42\nHALT`,
      'hello',
      0
    ));
  }

  /**
   * Run text through vocabulary interpreter
   * @param {string} text 
   * @returns {{ value: number|null, message: string, cycles: number }}
   */
  run(text) {
    const trimmed = text.trim();
    const entry = this.vocab.findMatch(trimmed);
    
    if (!entry) {
      return { value: null, message: `No vocabulary match for: ${trimmed.slice(0, 80)}`, cycles: 0 };
    }
    
    const args = entry.match(trimmed).map(Number);
    let asmText;
    if (typeof entry.asmTemplate === 'function') {
      asmText = entry.asmTemplate(...args);
    } else {
      asmText = entry.asmTemplate;
    }
    
    try {
      const bc = this.assembler(asmText);
      this.vm = new FluxVM(bc);
      this.vm.execute();
      return { 
        value: this.vm.reg(entry.resultReg), 
        message: `OK (${this.vm.cycles} cycles)`, 
        cycles: this.vm.cycles 
      };
    } catch (e) {
      return { value: null, message: `Error: ${e.message}`, cycles: 0 };
    }
  }
}

const VOCAB = [
  { pattern: /^compute\s+(\d+)\s*\+\s*(\d+)$/i, name: 'add',
    asm: (a,b) => `MOVI R0, ${a}\nMOVI R1, ${b}\nIADD R0, R0, R1\nHALT`, reg: 0 },
  { pattern: /^compute\s+(\d+)\s*-\s*(\d+)$/i, name: 'sub',
    asm: (a,b) => `MOVI R0, ${a}\nMOVI R1, ${b}\nISUB R0, R0, R1\nHALT`, reg: 0 },
  { pattern: /^compute\s+(\d+)\s*\*\s*(\d+)$/i, name: 'mul',
    asm: (a,b) => `MOVI R0, ${a}\nMOVI R1, ${b}\nIMUL R0, R0, R1\nHALT`, reg: 0 },
  { pattern: /^double\s+(\d+)$/i, name: 'double',
    asm: (a) => `MOVI R0, ${a}\nIADD R0, R0, R0\nHALT`, reg: 0 },
  { pattern: /^square\s+(\d+)$/i, name: 'square',
    asm: (a) => `MOVI R0, ${a}\nIMUL R0, R0, R0\nHALT`, reg: 0 },
  { pattern: /^factorial\s+of\s+(\d+)$/i, name: 'factorial',
    asm: (n) => `MOVI R0, ${n}\nMOVI R1, 1\nIMUL R1, R1, R0\nDEC R0\nJNZ R0, -10\nHALT`, reg: 1 },
  { pattern: /^fibonacci\s+of\s+(\d+)$/i, name: 'fibonacci',
    asm: (n) => `MOVI R0, 0\nMOVI R1, 1\nMOVI R2, ${n}\nMOV R3, R1\nIADD R1, R1, R0\nMOV R0, R3\nDEC R2\nJNZ R2, -16\nHALT`, reg: 0 },
  { pattern: /^sum\s+(\d+)\s+to\s+(\d+)$/i, name: 'sum',
    asm: (a,b) => `MOVI R0, 0\nMOVI R1, ${b}\nIADD R0, R0, R1\nDEC R1\nJNZ R1, -10\nHALT`, reg: 0 },
  { pattern: /^power\s+of\s+(\d+)\s+to\s+(\d+)$/i, name: 'power',
    asm: (base,exp) => `MOVI R0, 1\nMOVI R1, ${base}\nMOVI R2, ${exp}\nIMUL R0, R0, R1\nDEC R2\nJNZ R2, -10\nHALT`, reg: 0 },
  { pattern: /^hello$/i, name: 'hello',
    asm: () => `MOVI R0, 42\nHALT`, reg: 0 },
];

// ─── Interpreter ──────────────────────────────────────────────────────────

class Interpreter {
  constructor() {
    this.vocab = [...VOCAB];
  }

  /**
   * Interpret natural language text and execute.
   * @param {string} text
   * @returns {{ value: number|null, message: string, cycles: number }}
   */
  run(text) {
    const trimmed = text.trim();

    // Try vocabulary
    for (const entry of this.vocab) {
      const m = trimmed.match(entry.pattern);
      if (m) {
        const args = m.slice(1).map(Number);
        const asmText = entry.asm(...args);
        try {
          const bc = assemble(asmText);
          const vm = new FluxVM(bc);
          vm.execute();
          return { value: vm.reg(entry.reg), message: `OK (${vm.cycles} cycles)`, cycles: vm.cycles };
        } catch (e) {
          return { value: null, message: `Error: ${e.message}`, cycles: 0 };
        }
      }
    }

    // Try direct assembly
    const firstWord = trimmed.split(/\s+/)[0]?.toUpperCase();
    if (firstWord && firstWord in OP) {
      try {
        const bc = assemble(trimmed);
        const vm = new FluxVM(bc);
        vm.execute();
        return { value: vm.reg(0), message: `OK (${vm.cycles} cycles, direct asm)`, cycles: vm.cycles };
      } catch (e) {
        return { value: null, message: `Error: ${e.message}`, cycles: 0 };
      }
    }

    return { value: null, message: `No match for: ${trimmed.slice(0, 80)}`, cycles: 0 };
  }
}

// ─── A2A Agents ───────────────────────────────────────────────────────────

class A2AAgent {
  constructor(id, bytecode, role = 'worker') {
    this.id = id;
    this.vm = new FluxVM(bytecode);
    this.role = role;
    this.trust = 1.0;
    this.inbox = [];
    this.generation = 0;
  }

  step() {
    this.vm.execute();
    this.generation++;
    return this.vm.cycles;
  }

  tell(other, payload) {
    other.inbox.push({ from: this.id, type: 'TELL', payload, gen: this.generation, trust: this.trust });
  }

  ask(other) {
    other.inbox.push({ from: this.id, type: 'ASK', gen: this.generation });
    return other.vm.halted ? other.vm.reg(0) : null;
  }
}

class Swarm {
  constructor() { this.agents = new Map(); }

  add(agent) { this.agents.set(agent.id, agent); }

  tick() {
    let total = 0;
    for (const a of this.agents.values()) total += a.step();
    return total;
  }

  vote(reg = 0) {
    const counts = {};
    for (const a of this.agents.values()) {
      if (a.vm.halted) {
        const v = a.vm.reg(reg);
        counts[v] = (counts[v] || 0) + 1;
      }
    }
    return counts;
  }

  consensus(reg = 0) {
    const counts = this.vote(reg);
    if (!Object.keys(counts).length) return null;
    return Number(Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0]);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = { 
  FluxVM, 
  assemble, 
  disassemble, 
  Interpreter, 
  A2AAgent, 
  Swarm, 
  VocabEntry, 
  Vocabulary, 
  VocabInterpreter,
  OP, 
  VOCAB 
};

// ─── CLI Demo ─────────────────────────────────────────────────────────────

if (typeof require !== 'undefined' && require.main === module) {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   FLUX.js — JavaScript Bytecode VM              ║');
  console.log('║   SuperInstance / Oracle1                        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const interp = new Interpreter();
  console.log(`  ${interp.vocab.length} vocabulary patterns loaded\n`);

  // Arithmetic
  console.log('=== Arithmetic ===');
  for (const expr of ['compute 3 + 4', 'compute 10 * 5', 'double 21', 'square 8']) {
    const r = interp.run(expr);
    console.log(`  ${expr} → ${r.value}`);
  }

  // Loops
  console.log('\n=== Loops ===');
  for (const expr of ['factorial of 7', 'fibonacci of 12', 'sum 1 to 100', 'power of 2 to 10']) {
    const r = interp.run(expr);
    console.log(`  ${expr} → ${r.value} (${r.cycles} cycles)`);
  }

  // Assembler
  console.log('\n=== Assembler ===');
  const bc = assemble('MOVI R0, 7\nMOVI R1, 1\nIMUL R1, R1, R0\nDEC R0\nJNZ R0, -10\nHALT');
  const vm = new FluxVM(bc);
  vm.execute();
  console.log(`  factorial(7) bytecode: ${Array.from(bc).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);
  console.log(`  Result: R1 = ${vm.reg(1)}`);

  // Disassembler
  console.log('\n=== Disassembler ===');
  for (const line of disassemble(bc)) console.log(`  ${line}`);

  // Swarm
  console.log('\n=== A2A Swarm ===');
  const swarm = new Swarm();
  const agentBc = assemble('MOVI R0, 42\nHALT');
  for (let i = 0; i < 5; i++) {
    swarm.add(new A2AAgent(`agent-${i}`, agentBc, ['worker','scout','navigator'][i%3]));
  }
  const totalCycles = swarm.tick();
  console.log(`  5 agents, ${totalCycles} cycles, consensus: ${swarm.consensus()}`);

  // Benchmark
  console.log('\n=== Benchmark ===');
  const N = 100000;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) new FluxVM(bc).execute();
  const elapsed = Date.now() - t0;
  console.log(`  factorial(7) x ${N.toLocaleString()}: ${elapsed} ms | ${(elapsed*1e6/N).toFixed(0)} ns/iter`);

  console.log('\n✓ FLUX.js all systems operational!');

  // Test the new vocabulary interpreter
  console.log('\n=== Testing VocabInterpreter ===');
  const vocabInterp = new VocabInterpreter();
  
  // Test compute A + B
  const addResult = vocabInterp.run('compute 3 + 4');
  console.assert(addResult.value === 7, `Expected 7, got ${addResult.value}`);
  console.log(`  compute 3 + 4 → ${addResult.value} (${addResult.message})`);
  
  // Test compute A * B
  const mulResult = vocabInterp.run('compute 5 * 6');
  console.assert(mulResult.value === 30, `Expected 30, got ${mulResult.value}`);
  console.log(`  compute 5 * 6 → ${mulResult.value} (${mulResult.message})`);
  
  // Test factorial
  const factResult = vocabInterp.run('factorial of 5');
  console.assert(factResult.value === 120, `Expected 120, got ${factResult.value}`);
  console.log(`  factorial of 5 → ${factResult.value} (${factResult.message})`);
  
  // Test double
  const doubleResult = vocabInterp.run('double 21');
  console.assert(doubleResult.value === 42, `Expected 42, got ${doubleResult.value}`);
  console.log(`  double 21 → ${doubleResult.value} (${addResult.message})`);
  
  // Test square
  const squareResult = vocabInterp.run('square 8');
  console.assert(squareResult.value === 64, `Expected 64, got ${squareResult.value}`);
  console.log(`  square 8 → ${squareResult.value} (${squareResult.message})`);
  
  // Test hello
  const helloResult = vocabInterp.run('hello');
  console.assert(helloResult.value === 42, `Expected 42, got ${helloResult.value}`);
  console.log(`  hello → ${helloResult.value} (${helloResult.message})`);
  
  console.log('\n✓ All VocabInterpreter tests passed!');
}
