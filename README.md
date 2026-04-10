# FLUX.js — JavaScript Bytecode VM

Self-contained FLUX runtime for Node.js and browsers. ~400ns/iter via V8 JIT.

![FLUX Logo](flux-logo.jpg)

## Features

- **VM** — 16 registers, all opcodes, cycle-limited execution
- **Assembler** — text→bytecode with labels and comments
- **Disassembler** — bytecode→human-readable listing
- **Vocabulary** — 10 natural language patterns
- **A2A Agents** — multi-agent coordination with messaging
- **Swarm** — vote and consensus across agents
- **~400 ns/iter** on V8 JIT

## Quick Start

```javascript
const { FluxVM, assemble } = require('./flux.js');

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

## Natural Language

```javascript
const { Interpreter } = require('./flux.js');
const interp = new Interpreter();

interp.run('factorial of 7');     // { value: 5040, cycles: 24 }
interp.run('sum 1 to 100');       // { value: 5050, cycles: 303 }
interp.run('power of 2 to 10');   // { value: 1024, cycles: 34 }
```

## Assembly Syntax

```
MOVI R0, 42        # Load immediate
MOV R0, R1         # Copy register
IADD R0, R1, R2    # R0 = R1 + R2
ISUB R0, R1, R2    # R0 = R1 - R2
IMUL R0, R1, R2    # R0 = R1 * R2
IDIV R0, R1, R2    # R0 = R1 / R2
INC R0              # R0++
DEC R0              # R0--
CMP R0, R1          # Compare → R13
JNZ R0, offset      # Jump if not zero
JZ R0, offset       # Jump if zero
JMP offset          # Unconditional jump
PUSH R0 / POP R0    # Stack operations
HALT                # Stop
```

## A2A Swarm

```javascript
const { A2AAgent, Swarm, assemble } = require('./flux.js');

const bc = assemble('MOVI R0, 42\nHALT');
const swarm = new Swarm();
for (let i = 0; i < 5; i++) swarm.add(new A2AAgent(`a${i}`, bc));
swarm.tick();
console.log(swarm.consensus()); // 42
```

## Built-in Vocabulary

| Pattern | Description |
|---------|-------------|
| `compute X + Y` | Addition |
| `compute X - Y` | Subtraction |
| `compute X * Y` | Multiplication |
| `double X` | Double |
| `square X` | Square |
| `factorial of N` | N! |
| `fibonacci of N` | F(N) |
| `sum A to B` | Sum range |
| `power of BASE to EXP` | Exponentiation |
| `hello` | Returns 42 |

## API

```javascript
const { FluxVM, assemble, disassemble, Interpreter, A2AAgent, Swarm } = require('./flux.js');
```

| Export | Description |
|--------|-------------|
| `FluxVM` | Bytecode virtual machine |
| `assemble(text)` | Text assembly → Uint8Array |
| `disassemble(bc)` | Bytecode → string[] |
| `Interpreter` | Natural language → execution |
| `A2AAgent` | Single agent with inbox |
| `Swarm` | Multi-agent coordinator |

## Part of the FLUX Ecosystem

- **flux-runtime** — Full Python runtime
- **flux-core** — Rust implementation
- **flux-runtime-c** — C implementation
- **flux-zig** — Zig (fastest VM: 210ns)
- **flux-js** — This repo (V8 JIT: ~400ns)
- **flux-swarm** — Go swarm coordinator
- **flux-py** — Clean Python, single file

Same bytecode, different shells. 🦀
