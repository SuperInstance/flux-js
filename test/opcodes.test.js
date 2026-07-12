/**
 * Opcodes Constants Test — flux-js
 * Verifies all opcode constants are correct and cross-compatible with Python/Rust.
 */
import { describe, it, expect } from 'vitest';
import { OP } from '../flux.js';

describe('OP opcode constants', () => {
  it('defines all expected opcodes', () => {
    expect(OP.NOP).toBe(0x00);
    expect(OP.MOV).toBe(0x01);
    expect(OP.LOAD).toBe(0x02);
    expect(OP.STORE).toBe(0x03);
    expect(OP.JMP).toBe(0x04);
    expect(OP.JZ).toBe(0x05);
    expect(OP.JNZ).toBe(0x06);
    expect(OP.CALL).toBe(0x07);
    expect(OP.IADD).toBe(0x08);
    expect(OP.ISUB).toBe(0x09);
    expect(OP.IMUL).toBe(0x0A);
    expect(OP.IDIV).toBe(0x0B);
    expect(OP.IMOD).toBe(0x0C);
    expect(OP.INEG).toBe(0x0D);
    expect(OP.INC).toBe(0x0E);
    expect(OP.DEC).toBe(0x0F);
    expect(OP.IAND).toBe(0x10);
    expect(OP.IOR).toBe(0x11);
    expect(OP.IXOR).toBe(0x12);
    expect(OP.INOT).toBe(0x13);
    expect(OP.ISHL).toBe(0x14);
    expect(OP.ISHR).toBe(0x15);
    expect(OP.PUSH).toBe(0x20);
    expect(OP.POP).toBe(0x21);
    expect(OP.DUP).toBe(0x22);
    expect(OP.RET).toBe(0x28);
    expect(OP.MOVI).toBe(0x2B);
    expect(OP.CMP).toBe(0x2D);
    expect(OP.JE).toBe(0x2E);
    expect(OP.JNE).toBe(0x2F);
    expect(OP.HALT).toBe(0x80);
    expect(OP.YIELD).toBe(0x81);
  });

  it('has no duplicate opcode values (all unique)', () => {
    const values = new Set(Object.values(OP));
    expect(values.size).toBe(Object.keys(OP).length);
  });

  it('all values are numbers', () => {
    for (const [key, val] of Object.entries(OP)) {
      expect(typeof val).toBe('number', `OP.${key} should be a number`);
    }
  });

  it('keys match expected mnemonic names', () => {
    const expectedKeys = ['NOP', 'MOV', 'LOAD', 'STORE', 'JMP', 'JZ', 'JNZ', 'CALL',
      'IADD', 'ISUB', 'IMUL', 'IDIV', 'IMOD', 'INEG', 'INC', 'DEC',
      'IAND', 'IOR', 'IXOR', 'INOT', 'ISHL', 'ISHR',
      'PUSH', 'POP', 'DUP', 'RET', 'MOVI', 'CMP', 'JE', 'JNE',
      'HALT', 'YIELD'];
    for (const key of expectedKeys) {
      expect(OP).toHaveProperty(key);
    }
  });

  it('PUSH is 0x20 not 0x10 (cross-compat with Python/Rust)', () => {
    expect(OP.PUSH).not.toBe(0x10); // 0x10 is IAND
    expect(OP.PUSH).toBe(0x20);
  });

  it('POP is 0x21 not 0x11 (cross-compat with Python/Rust)', () => {
    expect(OP.POP).not.toBe(0x11); // 0x11 is IOR
    expect(OP.POP).toBe(0x21);
  });

  it('JMP is 0x04 not 0x07 (0x07 is CALL)', () => {
    expect(OP.JMP).toBe(0x04);
    expect(OP.CALL).toBe(0x07);
  });
});
