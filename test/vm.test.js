/**
 * VM Core Tests — flux-js
 * Tests for FluxVM execution engine: opcodes, registers, stack, jumps, errors.
 * Updated for cross-compatible opcodes (Python/Rust/JS alignment).
 */
import { describe, it, expect } from 'vitest';
import { FluxVM, OP } from '../flux.js';

// Helper: build a Uint8Array from decimal values
const bc = (...bytes) => new Uint8Array(bytes);

// Helper: signed i16 → [lo, hi] bytes
const i16 = (v) => {
  v = v & 0xFFFF;
  return [v & 0xFF, (v >> 8) & 0xFF];
};

describe('FluxVM', () => {
  describe('constructor', () => {
    it('initializes with zero registers and empty stack', () => {
      const vm = new FluxVM(bc(0x80));
      expect(vm.reg(0)).toBe(0);
      expect(vm.reg(15)).toBe(0);
      expect(vm.stack).toEqual([]);
      expect(vm.pc).toBe(0);
      expect(vm.halted).toBe(false);
      expect(vm.cycles).toBe(0);
      expect(vm.error).toBeNull();
    });

    it('accepts ArrayBuffer and converts to Uint8Array', () => {
      const buf = new ArrayBuffer(1);
      new Uint8Array(buf)[0] = 0x80;
      const vm = new FluxVM(buf);
      vm.execute();
      expect(vm.halted).toBe(true);
    });

    it('accepts Uint8Array directly', () => {
      const vm = new FluxVM(bc(0x80));
      vm.execute();
      expect(vm.halted).toBe(true);
    });
  });

  describe('HALT (0x80)', () => {
    it('stops execution and sets halted flag', () => {
      const vm = new FluxVM(bc(0x80));
      vm.execute();
      expect(vm.halted).toBe(true);
      expect(vm.cycles).toBe(1);
    });

    it('returns this for chaining', () => {
      const vm = new FluxVM(bc(0x80));
      const result = vm.execute();
      expect(result).toBe(vm);
    });
  });

  describe('NOP (0x00)', () => {
    it('does nothing but advances PC and cycles', () => {
      const vm = new FluxVM(bc(0x00, 0x00, 0x00, 0x80));
      vm.execute();
      expect(vm.halted).toBe(true);
      expect(vm.cycles).toBe(4);
    });
  });

  describe('MOVI (0x2B)', () => {
    it('loads immediate value into register', () => {
      const vm = new FluxVM(bc(0x2B, 0, ...i16(42), 0x80));
      vm.execute();
      expect(vm.reg(0)).toBe(42);
    });

    it('loads value into any register', () => {
      const vm = new FluxVM(bc(0x2B, 5, ...i16(100), 0x80));
      vm.execute();
      expect(vm.reg(5)).toBe(100);
    });

    it('loads negative values via signed i16', () => {
      const vm = new FluxVM(bc(0x2B, 3, ...i16(-1), 0x80));
      vm.execute();
      expect(vm.reg(3)).toBe(-1);
    });

    it('loads maximum i16 value (32767)', () => {
      const vm = new FluxVM(bc(0x2B, 0, ...i16(32767), 0x80));
      vm.execute();
      expect(vm.reg(0)).toBe(32767);
    });

    it('loads minimum i16 value (-32768)', () => {
      const vm = new FluxVM(bc(0x2B, 0, ...i16(-32768), 0x80));
      vm.execute();
      expect(vm.reg(0)).toBe(-32768);
    });
  });

  describe('MOV (0x01)', () => {
    it('copies value from one register to another', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(99),   // MOVI R0, 99
        0x01, 1, 0,             // MOV R1, R0
        0x80                    // HALT
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(99);
      expect(vm.reg(1)).toBe(99);
    });

    it('overwrites destination register', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(10),    // MOVI R0, 10
        0x2B, 1, ...i16(20),    // MOVI R1, 20
        0x01, 1, 0,             // MOV R1, R0
        0x80                    // HALT
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(10);
    });
  });

  describe('IADD (0x08)', () => {
    it('adds two registers and stores in destination', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(15),   // MOVI R0, 15
        0x2B, 1, ...i16(27),   // MOVI R1, 27
        0x08, 2, 0, 1,          // IADD R2, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(42);
    });

    it('adds negative values', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(10),    // MOVI R0, 10
        0x2B, 1, ...i16(-3),    // MOVI R1, -3
        0x08, 0, 0, 1,          // IADD R0, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(7);
    });
  });

  describe('ISUB (0x09)', () => {
    it('subtracts two registers', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(100),
        0x2B, 1, ...i16(37),
        0x09, 2, 0, 1,  // ISUB R2, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(63);
    });

    it('produces negative results', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(10),
        0x2B, 1, ...i16(25),
        0x09, 0, 0, 1,  // ISUB R0, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(-15);
    });
  });

  describe('IMUL (0x0A)', () => {
    it('multiplies two registers', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(7),
        0x2B, 1, ...i16(6),
        0x0A, 2, 0, 1,  // IMUL R2, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(42);
    });

    it('multiplies by negative values', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(8),
        0x2B, 1, ...i16(-5),
        0x0A, 0, 0, 1,  // IMUL R0, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(-40);
    });
  });

  describe('IDIV (0x0B)', () => {
    it('divides two registers (integer)', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(100),
        0x2B, 1, ...i16(7),
        0x0B, 2, 0, 1,  // IDIV R2, R0, R1
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(14); // 100 / 7 = 14 (truncated)
    });

    it('truncates toward zero', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(-17),
        0x2B, 1, ...i16(5),
        0x0B, 2, 0, 1,
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(-3); // -17/5 = -3.4 → -3
    });

    it('throws error on division by zero', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(42),
        // R1 defaults to 0
        0x0B, 2, 0, 1,  // IDIV R2, R0, R1 (R1=0)
        0x80
      ));
      vm.execute();
      expect(vm.error).toBe('Division by zero');
      expect(vm.halted).toBe(false);
    });
  });

  describe('INC (0x0E) and DEC (0x0F)', () => {
    it('increments a register', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(41),
        0x0E, 0,  // INC R0
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(42);
    });

    it('decrements a register', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(43),
        0x0F, 0,  // DEC R0
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(42);
    });

    it('decrement below zero produces negative', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(1),
        0x0F, 0,  // DEC R0
        0x0F, 0,  // DEC R0
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(-1);
    });
  });

  describe('PUSH (0x20) and POP (0x21)', () => {
    it('pushes and pops a value', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(99),  // MOVI R0, 99
        0x20, 0,              // PUSH R0 (0x20, not 0x10)
        0x2B, 0, ...i16(0),   // MOVI R0, 0
        0x21, 0,              // POP R0 (0x21, not 0x11)
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(99);
    });

    it('stack is LIFO (last in, first out)', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(10),
        0x2B, 1, ...i16(20),
        0x20, 0,  // PUSH R0 (10)
        0x20, 1,  // PUSH R1 (20)
        0x21, 0,  // POP R0 → 20
        0x21, 1,  // POP R1 → 10
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(20);
      expect(vm.reg(1)).toBe(10);
    });

    it('stores 0 on pop from empty stack (undefined coerced to 0)', () => {
      const vm = new FluxVM(bc(
        0x21, 0,  // POP R0 (stack empty)
        0x80
      ));
      vm.execute();
      // JS array pop returns undefined; Int32Array coerces to 0
      expect(vm.reg(0)).toBe(0);
    });
  });

  describe('CMP (0x2D)', () => {
    it('sets flagZero=true when a == b', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(42),
        0x2B, 1, ...i16(42),
        0x2D, 0, 1,  // CMP R0, R1
        0x80
      ));
      vm.execute();
      expect(vm._flagZero).toBe(true);
      expect(vm._flagSign).toBe(false);
    });

    it('sets flagSign=true when a < b', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(3),
        0x2B, 1, ...i16(8),
        0x2D, 0, 1,  // CMP R0, R1
        0x80
      ));
      vm.execute();
      expect(vm._flagZero).toBe(false);
      expect(vm._flagSign).toBe(true);
    });

    it('sets neither flag when a > b', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(10),
        0x2B, 1, ...i16(5),
        0x2D, 0, 1,  // CMP R0, R1
        0x80
      ));
      vm.execute();
      expect(vm._flagZero).toBe(false);
      expect(vm._flagSign).toBe(false);
    });
  });

  describe('JNZ (0x06)', () => {
    it('jumps when register is non-zero', () => {
      // MOVI R0, 1; JNZ R0, 4 (skip MOVI R1, 99); HALT
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(1),    // MOVI R0, 1 (4 bytes, pc 0-3)
        0x06, 0, ...i16(4),    // JNZ R0, 4 (4 bytes, pc 4-7) → jump to pc=12
        0x2B, 1, ...i16(99),   // MOVI R1, 99 (4 bytes, pc 8-11, skipped)
        0x80,                   // HALT (1 byte, pc 12)
        0x2B, 1, ...i16(0)     // MOVI R1, 0 (4 bytes, unreachable)
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(0); // MOVI R1, 99 was skipped
      expect(vm.halted).toBe(true);
    });

    it('falls through when register is zero', () => {
      // R0 defaults to 0, so JNZ R0, 4 should not jump
      const vm = new FluxVM(bc(
        0x06, 0, ...i16(4),    // JNZ R0, 4 (no jump, R0=0)
        0x2B, 1, ...i16(99),   // MOVI R1, 99 (should execute)
        0x80
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(99);
    });
  });

  describe('JZ (0x05)', () => {
    it('jumps when register is zero', () => {
      const vm = new FluxVM(bc(
        0x05, 0, ...i16(5),    // JZ R0, 5 (jump, R0=0) → pc=9
        0x2B, 1, ...i16(99),   // MOVI R1, 99 (4 bytes, pc 4-7, skipped)
        0x80                    // HALT (1 byte, pc 8... actually 9)
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(0);
    });

    it('falls through when register is non-zero', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(1),    // MOVI R0, 1
        0x05, 0, ...i16(5),    // JZ R0, 5 (no jump, R0=1)
        0x2B, 1, ...i16(99),   // MOVI R1, 99 (should execute)
        0x80
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(99);
    });
  });

  describe('JE (0x2E) and JNE (0x2F)', () => {
    it('JE jumps when flagZero is set', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(5),
        0x2B, 1, ...i16(5),
        0x2D, 0, 1,         // CMP R0, R1 → flagZero=true
        0x2E, 0, ...i16(5), // JE R0, 5 (jump)
        0x2B, 2, ...i16(99),// MOVI R2, 99 (skipped)
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(0);
    });

    it('JNE jumps when flagZero is NOT set', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(5),
        0x2B, 1, ...i16(6),
        0x2D, 0, 1,         // CMP R0, R1 → flagZero=false
        0x2F, 0, ...i16(5), // JNE R0, 5 (jump)
        0x2B, 2, ...i16(99),// MOVI R2, 99 (skipped)
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(0);
    });
  });

  describe('JMP (0x04)', () => {
    it('jumps unconditionally (Format D: opcode + reg + i16 offset)', () => {
      // JMP is now Format D: [0x04][reg:u8][off:i16] = 4 bytes
      const vm = new FluxVM(bc(
        0x04, 0, ...i16(5),    // JMP R0, 5 (4 bytes, pc 0-3) → pc=8
        0x2B, 1, ...i16(99),   // MOVI R1, 99 (4 bytes, pc 4-7, skipped)
        0x80                    // HALT (1 byte, pc 8)
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(0); // MOVI R1, 99 skipped
    });
  });

  describe('bitwise ops', () => {
    it('IAND, IOR, IXOR work correctly', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(0b1100),
        0x2B, 1, ...i16(0b1010),
        0x10, 2, 0, 1,  // IAND R2, R0, R1 → 0b1000 = 8
        0x11, 3, 0, 1,  // IOR  R3, R0, R1 → 0b1110 = 14
        0x12, 4, 0, 1,  // IXOR R4, R0, R1 → 0b0110 = 6
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(8);
      expect(vm.reg(3)).toBe(14);
      expect(vm.reg(4)).toBe(6);
    });

    it('ISHL and ISHR work correctly', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(1),
        0x2B, 1, ...i16(4),
        0x14, 2, 0, 1,  // ISHL R2, R0, R1 → 1 << 4 = 16
        0x2B, 3, ...i16(256),
        0x2B, 4, ...i16(2),
        0x15, 5, 3, 4,  // ISHR R5, R3, R4 → 256 >> 2 = 64
        0x80
      ));
      vm.execute();
      expect(vm.reg(2)).toBe(16);
      expect(vm.reg(5)).toBe(64);
    });
  });

  describe('loops', () => {
    it('computes factorial of 5 = 120 via loop', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(5),    // MOVI R0, 5
        0x2B, 1, ...i16(1),    // MOVI R1, 1
        0x0A, 1, 1, 0,          // IMUL R1, R1, R0
        0x0F, 0,                // DEC R0
        0x06, 0, ...i16(-10),  // JNZ R0, -10 (loop body = 4+2+4=10 bytes)
        0x80
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(120);
      expect(vm.halted).toBe(true);
    });

    it('computes factorial of 7 = 5040', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(7),
        0x2B, 1, ...i16(1),
        0x0A, 1, 1, 0,
        0x0F, 0,
        0x06, 0, ...i16(-10),
        0x80
      ));
      vm.execute();
      expect(vm.reg(1)).toBe(5040);
    });

    it('computes sum 1 to 5 = 15', () => {
      const vm = new FluxVM(bc(
        0x2B, 0, ...i16(0),    // MOVI R0, 0 (accumulator)
        0x2B, 1, ...i16(5),    // MOVI R1, 5 (counter)
        0x08, 0, 0, 1,          // IADD R0, R0, R1
        0x0F, 1,                // DEC R1
        0x06, 1, ...i16(-10),  // JNZ R1, -10 (loop body = 4+2+4=10 bytes)
        0x80
      ));
      vm.execute();
      expect(vm.reg(0)).toBe(15);
    });
  });

  describe('error handling', () => {
    it('sets error for unknown opcode', () => {
      const vm = new FluxVM(bc(0xFF, 0x80));
      vm.execute();
      expect(vm.error).toBe('Unknown opcode: 0xff');
      expect(vm.halted).toBe(false);
    });

    it('stops on maxCycles exceeded', () => {
      // JMP is now Format D (4 bytes): [0x04][reg][offset]
      // Infinite loop: JMP R0, -4 → jumps back 4 bytes to itself
      const vm = new FluxVM(bc(
        0x04, 0, ...i16(-4),  // JMP R0, -4 (infinite loop, 4 bytes)
      ), 100);
      vm.execute();
      expect(vm.halted).toBe(false);
      expect(vm.cycles).toBe(100);
      expect(vm.error).toBeNull();
    });

    it('handles empty bytecode gracefully', () => {
      const vm = new FluxVM(new Uint8Array(0));
      vm.execute();
      expect(vm.halted).toBe(false);
      expect(vm.cycles).toBe(0);
    });
  });

  describe('dump()', () => {
    it('shows non-zero registers', () => {
      const vm = new FluxVM(bc(0x2B, 0, ...i16(42), 0x80));
      vm.execute();
      const dump = vm.dump();
      expect(dump).toContain('R0=42');
      expect(dump).toContain('halted=true');
    });

    it('shows empty registers when all zero', () => {
      const vm = new FluxVM(bc(0x80));
      vm.execute();
      const dump = vm.dump();
      expect(dump).toContain('halted=true');
      const regMatches = dump.match(/R\d+=/g);
      expect(regMatches).toBeNull();
    });
  });

  describe('register access', () => {
    it('all 16 registers are independently addressable', () => {
      const bytecode = [];
      for (let i = 0; i < 16; i++) {
        bytecode.push(0x2B, i, ...i16(i + 1));
      }
      bytecode.push(0x80);
      const vm = new FluxVM(new Uint8Array(bytecode));
      vm.execute();
      for (let i = 0; i < 16; i++) {
        expect(vm.reg(i)).toBe(i + 1);
      }
    });
  });

  describe('cross-compatibility', () => {
    it('bytecode for factorial(5) matches Python/Rust format', () => {
      // This is the same bytecode that Python and Rust produce:
      // MOVI R0, 5; MOVI R1, 1; IMUL R1, R1, R0; DEC R0; JNZ R0, -10; HALT
      const expected = [
        0x2B, 0x00, 0x05, 0x00,  // MOVI R0, 5
        0x2B, 0x01, 0x01, 0x00,  // MOVI R1, 1
        0x0A, 0x01, 0x01, 0x00,  // IMUL R1, R1, R0
        0x0F, 0x00,              // DEC R0
        0x06, 0x00, 0xF6, 0xFF,  // JNZ R0, -10
        0x80                     // HALT
      ];
      const vm = new FluxVM(new Uint8Array(expected));
      vm.execute();
      expect(vm.reg(1)).toBe(120);
      expect(vm.halted).toBe(true);
    });
  });
});
