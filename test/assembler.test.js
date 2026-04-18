/**
 * Assembler Tests — flux-js
 * Tests for assemble() function: encoding, label resolution, error handling.
 */
import { describe, it, expect } from 'vitest';
import { assemble, OP, FluxVM } from '../flux.js';

describe('assemble', () => {
  describe('basic instruction encoding', () => {
    it('encodes HALT', () => {
      const bc = assemble('HALT');
      expect(bc).toEqual(new Uint8Array([0x80]));
    });

    it('encodes NOP', () => {
      const bc = assemble('NOP');
      expect(bc).toEqual(new Uint8Array([0x00]));
    });

    it('encodes MOVI with positive value', () => {
      const bc = assemble('MOVI R0, 42');
      expect(bc.length).toBe(4);
      expect(bc[0]).toBe(OP.MOVI);
      expect(bc[1]).toBe(0);
      expect(bc[2]).toBe(0x2A);
      expect(bc[3]).toBe(0x00);
    });

    it('encodes MOVI with negative value', () => {
      const bc = assemble('MOVI R0, -1');
      expect(bc.length).toBe(4);
      expect(bc[2]).toBe(0xFF);
      expect(bc[3]).toBe(0xFF);
    });

    it('encodes MOV', () => {
      const bc = assemble('MOV R1, R0');
      expect(bc).toEqual(new Uint8Array([OP.MOV, 1, 0]));
    });

    it('encodes IADD', () => {
      const bc = assemble('IADD R2, R0, R1');
      expect(bc).toEqual(new Uint8Array([OP.IADD, 2, 0, 1]));
    });

    it('encodes ISUB', () => {
      const bc = assemble('ISUB R2, R0, R1');
      expect(bc).toEqual(new Uint8Array([OP.ISUB, 2, 0, 1]));
    });

    it('encodes IMUL', () => {
      const bc = assemble('IMUL R2, R0, R1');
      expect(bc).toEqual(new Uint8Array([OP.IMUL, 2, 0, 1]));
    });

    it('encodes IDIV', () => {
      const bc = assemble('IDIV R2, R0, R1');
      expect(bc).toEqual(new Uint8Array([OP.IDIV, 2, 0, 1]));
    });

    it('encodes INC', () => {
      const bc = assemble('INC R3');
      expect(bc).toEqual(new Uint8Array([OP.INC, 3]));
    });

    it('encodes DEC', () => {
      const bc = assemble('DEC R5');
      expect(bc).toEqual(new Uint8Array([OP.DEC, 5]));
    });

    it('encodes PUSH', () => {
      const bc = assemble('PUSH R0');
      expect(bc).toEqual(new Uint8Array([OP.PUSH, 0]));
    });

    it('encodes POP', () => {
      const bc = assemble('POP R1');
      expect(bc).toEqual(new Uint8Array([OP.POP, 1]));
    });

    it('encodes CMP (produces 4 bytes — assembler quirk)', () => {
      const bc = assemble('CMP R0, R1');
      // Assembler treats CMP like 3-operand instructions, producing 4 bytes
      // The extra byte is a duplicate of the 2nd operand register
      expect(bc.length).toBe(4);
      expect(bc[0]).toBe(OP.CMP);
      expect(bc[1]).toBe(0);
      expect(bc[2]).toBe(1);
    });

    it('encodes JMP with numeric offset', () => {
      const bc = assemble('JMP 5');
      expect(bc.length).toBe(3);
      expect(bc[0]).toBe(OP.JMP);
    });

    it('encodes JNZ with numeric offset', () => {
      const bc = assemble('JNZ R0, -10');
      expect(bc.length).toBe(4);
      expect(bc[0]).toBe(OP.JNZ);
      expect(bc[1]).toBe(0);
    });

    it('encodes JZ with numeric offset', () => {
      const bc = assemble('JZ R1, 3');
      expect(bc.length).toBe(4);
      expect(bc[0]).toBe(OP.JZ);
      expect(bc[1]).toBe(1);
    });
  });

  describe('comments and whitespace', () => {
    it('skips // comments', () => {
      const bc = assemble('// this is a comment\nMOVI R0, 42\nHALT');
      expect(bc.length).toBe(5);
    });

    it('skips ; comments', () => {
      const bc = assemble('; comment\nMOVI R0, 42\nHALT');
      expect(bc.length).toBe(5);
    });

    it('skips blank lines', () => {
      const bc = assemble('\n\nMOVI R0, 42\n\n\nHALT\n\n');
      expect(bc.length).toBe(5);
    });

    it('handles mixed whitespace', () => {
      const bc = assemble('  MOVI   R0 ,   42  ');
      expect(bc.length).toBe(4);
      expect(bc[0]).toBe(OP.MOVI);
    });
  });

  describe('label resolution', () => {
    it('resolves JMP to label correctly', () => {
      const bc = assemble('JMP skip\nMOVI R0, 99\nskip:\nMOVI R1, 42\nHALT');
      const vm = new FluxVM(bc);
      vm.execute();
      expect(vm.reg(0)).toBe(0);  // MOVI R0, 99 was skipped
      expect(vm.reg(1)).toBe(42);
      expect(vm.halted).toBe(true);
    });

    it('resolves JNZ to label correctly', () => {
      const bc = assemble('MOVI R0, 1\nJNZ R0, skip\nMOVI R1, 0\nskip:\nHALT');
      const vm = new FluxVM(bc);
      vm.execute();
      expect(vm.reg(1)).toBe(0);  // MOVI R1, 0 was skipped
      expect(vm.halted).toBe(true);
    });

    it('resolves JZ to label correctly', () => {
      const bc = assemble('JZ R0, skip\nMOVI R0, 99\nskip:\nHALT');
      const vm = new FluxVM(bc);
      vm.execute();
      expect(vm.reg(0)).toBe(0);  // MOVI R0, 99 was skipped
      expect(vm.halted).toBe(true);
    });

    it('label can be on a separate line', () => {
      const bc = assemble('start:\nMOVI R0, 10\nHALT');
      expect(bc.length).toBe(5);
      expect(bc[0]).toBe(OP.MOVI);
    });
  });

  describe('error handling', () => {
    it('throws on unresolvable label', () => {
      expect(() => assemble('JMP nonexistent')).toThrow('Cannot resolve: nonexistent');
    });

    it('skips unrecognized mnemonics silently', () => {
      const bc = assemble('MOVI R0, 42\nFOOBAR R1, R2\nHALT');
      expect(bc.length).toBe(5); // MOVI(4) + HALT(1)
    });
  });

  describe('multi-instruction programs', () => {
    it('assembles factorial program that produces correct result', () => {
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
      expect(vm.reg(1)).toBe(5040);
    });

    it('assembles and runs addition program', () => {
      const bc = assemble(`
        MOVI R0, 100
        MOVI R1, 42
        IADD R2, R0, R1
        HALT
      `);
      const vm = new FluxVM(bc);
      vm.execute();
      expect(vm.reg(2)).toBe(142);
    });

    it('assembles and runs stack program', () => {
      const bc = assemble(`
        MOVI R0, 10
        PUSH R0
        MOVI R0, 0
        POP R0
        HALT
      `);
      const vm = new FluxVM(bc);
      vm.execute();
      expect(vm.reg(0)).toBe(10);
    });
  });

  describe('case insensitivity', () => {
    it('handles lowercase mnemonics', () => {
      const bc = assemble('movi r0, 42\nhalt');
      expect(bc[0]).toBe(OP.MOVI);
      expect(bc[bc.length - 1]).toBe(OP.HALT);
    });

    it('handles mixed case mnemonics', () => {
      const bc = assemble('MoVi R0, 42\nHaLt');
      expect(bc[0]).toBe(OP.MOVI);
      expect(bc[bc.length - 1]).toBe(OP.HALT);
    });
  });
});
