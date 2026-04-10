# flux-js

FLUX bytecode VM in JavaScript. 373ns/iter via V8 JIT with A2A agent messaging.

## Quick Start

```javascript
const bc = new Uint8Array([0x2B,0x00,0x07,0x00, 0x2B,0x01,0x01,0x00, 0x0A,0x01,0x01,0x00, 0x0F,0x00, 0x06,0x00,0xF6,0xFF, 0x80]);
const vm = new FluxVM(bc);
vm.x(); // Execute
console.log(vm.g[1]); // 5040 = 7!
```

## Running

```bash
node flux.js
```

## Performance: 373ns/iter (V8 JIT)

## Part of the FLUX Ecosystem
See [flux-research](https://github.com/SuperInstance/flux-research) for architecture docs.
