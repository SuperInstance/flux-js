# FLUX.js — JavaScript Bytecode VM

> Self-contained FLUX runtime for Node.js and browsers. ~400ns/iter via V8 JIT.

[![npm](https://img.shields.io/npm/v/flux-js.svg)](https://www.npmjs.com/package/flux-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

FLUX.js brings the FLUX bytecode VM to JavaScript. Run deterministic agent programs in Node.js or the browser with zero native dependencies. The V8 JIT optimizes hot loops to ~400ns per iteration.

## Install

```bash
npm install flux-js
```

## Quick Start

### Bytecode Assembly & Execution

```javascript
const { FluxVM, assemble } = require('flux-js');

const bc = assemble(`
    MOVI R0, 7
    MOVI R1, 1
    IMUL R1, R1, R0
    DEC R0
    JNZ R0, -10
    HALT
`);
const vm = new FluxVM(bc);
vm.execute();
console.log(vm.reg(1)); // 5040
```

### Natural Language Interface

```javascript
const { Interpreter } = require('flux-js');
const interp = new Interpreter();

interp.run('factorial of 7');     // { value: 5040, cycles: 24 }
interp.run('sum 1 to 100');       // { value: 5050, cycles: 303 }
interp.run('power of 2 to 10');   // { value: 1024, cycles: 34 }
```

## Features

- **VM** — 16 registers, all opcodes, cycle-limited execution
- **Assembler** — Text → bytecode with labels and comments
- **Disassembler** — Bytecode → human-readable listing
- **Vocabulary** — 10 natural language patterns
- **A2A Agents** — Multi-agent coordination with messaging
- **Swarm** — Vote and consensus across agents

## Assembly Syntax

```
MOVI R0, 42        # Load immediate
MOV R0, R1         # Copy register
IADD R0, R1, R2    # R0 = R1 + R2
IMUL R0, R1, R2    # R0 = R1 * R2
CMP R0, R1          # Compare → flags
JNZ R0, offset      # Jump if not zero
PUSH R0 / POP R0    # Stack operations
HALT                # Stop
```

## Resources

- [GitHub Repository](https://github.com/SuperInstance/flux-js)
- [npm Package](https://www.npmjs.com/package/flux-js)
- [FLUX Core (Rust)](https://github.com/SuperInstance/flux-core)
- [FLUX Runtime (Python)](https://github.com/SuperInstance/flux-runtime)
- [SuperInstance Ecosystem](https://github.com/SuperInstance/SuperInstance)

---

*Part of the [SuperInstance](https://github.com/SuperInstance) ecosystem.*
