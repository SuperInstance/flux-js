# FLUX.js — JavaScript Bytecode VM

> **FLUX — Fluid Language Universal eXecution**
> Self-contained FLUX runtime for Node.js and browsers. ~400ns/iter via V8 JIT.

![FLUX Logo](flux-logo.jpg)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/flux-js.svg)](https://www.npmjs.com/package/flux-js)

---

## Install

```bash
npm install flux-js
```

## Features

- **VM** — 16 registers, all opcodes, cycle-limited execution
- **Assembler** — text → bytecode with labels and comments
- **Disassembler** — bytecode → human-readable listing
- **Vocabulary** — 10 natural language patterns
- **A2A Agents** — multi-agent coordination with messaging
- **Swarm** — vote and consensus across agents
- **~400 ns/iter** on V8 JIT

## Quick Start

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

## Natural Language

```javascript
const { Interpreter } = require('flux-js');
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
const { A2AAgent, Swarm, assemble } = require('flux-js');

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
const { FluxVM, assemble, disassemble, Interpreter, A2AAgent, Swarm } = require('flux-js');
```

| Export | Description |
|--------|-------------|
| `FluxVM` | Bytecode virtual machine |
| `assemble(text)` | Text assembly → Uint8Array |
| `disassemble(bc)` | Bytecode → string[] |
| `Interpreter` | Natural language → execution |
| `A2AAgent` | Single agent with inbox |
| `Swarm` | Multi-agent coordinator |

---

## 📦 Related Packages

FLUX is implemented across multiple languages — same bytecode, different shells:

| Package | Language | Registry | Install |
|---------|----------|----------|---------|
| **[flux-vm](https://pypi.org/project/flux-vm/)** | Python | PyPI | `pip install flux-vm` |
| **[fluxvm](https://crates.io/crates/fluxvm)** | Rust | crates.io | `cargo add fluxvm` |
| **[flux-js](https://www.npmjs.com/package/flux-js)** | JavaScript | npm | `npm install flux-js` |
| **[flux-compiler](https://github.com/SuperInstance/flux-compiler)** | Rust/Python | GitHub | `cargo install flux-compiler` |

Additional implementations: [C](https://github.com/SuperInstance/flux-runtime-c) · [Zig](https://github.com/SuperInstance/flux-zig) · [Go](https://github.com/SuperInstance/flux-swarm) · [Java](https://github.com/SuperInstance/flux-java) · [WASM](https://github.com/SuperInstance/flux-wasm) · [CUDA](https://github.com/SuperInstance/flux-cuda)

## License

MIT

---

*Same bytecode, different shells.* 🦀

## Ecosystem

This repo is part of the **SuperInstance** flagship ecosystem — agent-first computation, constraint theory, and self-improving runtimes.

### FLUX Runtime Family

| Repo | Language | Description |
|------|----------|-------------|
| [flux-runtime](https://github.com/SuperInstance/flux-runtime) | Python | Full FLUX runtime: markdown→bytecode, 2037 tests, zero deps |
| [flux-core](https://github.com/SuperInstance/flux-core) | Rust | Register-based bytecode VM, deterministic agent computation |
| [flux-js](https://github.com/SuperInstance/flux-js) | JavaScript | FLUX VM for Node.js and browsers, ~400ns/iter |
| [flux-compiler](https://github.com/SuperInstance/flux-compiler) | Rust/Python | Formal-methods compiler for safety-critical codegen |
| [flux-vm](https://github.com/SuperInstance/flux-vm) | Rust | Stack-based constraint-checking VM, 50 opcodes, Turing-incomplete |

### PLATO Engine Family

| Repo | Language | Description |
|------|----------|-------------|
| [plato-server](https://github.com/SuperInstance/plato-server) | Python | Knowledge tiles, fleet sync via Matrix, HTTP API |
| [plato-engine-block](https://github.com/SuperInstance/plato-engine-block) | Rust | Original room runtime: no_std + alloc, builder pattern |
| [plato-engine-block-c](https://github.com/SuperInstance/plato-engine-block-c) | C99 | Embedded reference: zero heap alloc, bare-metal portable |
| [plato-engine-block-elixir](https://github.com/SuperInstance/plato-engine-block-elixir) | Elixir | BEAM supervision trees, fault tolerance, hot reload |
| [plato-runtime-kernel](https://github.com/SuperInstance/plato-runtime-kernel) | Rust | Spatial model: tensor grid, batons, assertion traps |

### Constraint / Theory Family

| Repo | Language | Description |
|------|----------|-------------|
| [categorical-agents](https://github.com/SuperInstance/categorical-agents) | Rust | Category theory for agent composition (functors, naturality) |
| [cuda-constraint-engine](https://github.com/SuperInstance/cuda-constraint-engine) | CUDA/C | GPU constraint checking at 1B+ constraints/sec |
| [grand-pattern-rs](https://github.com/SuperInstance/grand-pattern-rs) | Rust | Fibonacci dual-direction cellular graph architecture |
| [lau-hodge-theory](https://github.com/SuperInstance/lau-hodge-theory) | Rust | Hodge decomposition, Betti numbers, spectral sequences |
| [ternary-science](https://github.com/SuperInstance/ternary-science) | Rust | Experimental evidence for ternary intelligence, 5 conservation laws |

### Agent / Infrastructure Family

| Repo | Language | Description |
|------|----------|-------------|
| [construct-core](https://github.com/SuperInstance/construct-core) | Rust | Layered trait system: bare-metal → alloc → async agent runtime |
| [crab](https://github.com/SuperInstance/crab) | Bash | Agent shell for repo entry/leave (MUD-room metaphor) |
| [exocortex](https://github.com/SuperInstance/exocortex) | Rust | Persistent cognitive substrate, S3-compatible memory |
| [git-agent](https://github.com/SuperInstance/git-agent) | Python | The repo IS the agent — autonomous lifecycle via Git |
| [capitaine-1](https://github.com/SuperInstance/capitaine-1) | TypeScript | Git-native repo-agent, Cloudflare Workers heartbeat |
| [codespace-edge-rd](https://github.com/SuperInstance/codespace-edge-rd) | Research | Codespace→Edge agent lifecycle and yoke transfer protocols |
| [git-agent-codespace](https://github.com/SuperInstance/git-agent-codespace) | DevContainer | One-click Codespace template for Git-Agent runtimes |

### Registries

| Registry | Package | Install |
|----------|---------|---------|
| **PyPI** | `flux-vm` | `pip install flux-vm` |
| **crates.io** | `fluxvm` | `cargo add fluxvm` |
| **npm** | `flux-js` | `npm install flux-js` *(coming soon)* |

### Philosophy & Architecture

- 📖 [AI-Writings](https://github.com/SuperInstance/AI-Writings) — Philosophy, essays, and design rationale
- 📦 [PACKAGES.md](https://github.com/SuperInstance/SuperInstance/blob/main/PACKAGES.md) — Full package index
