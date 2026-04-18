/**
 * Opcodes Constants Test — flux-js
 * Verifies all opcode constants are correct.
 */
import { describe, it, expect } from 'vitest';
import { OP } from '../flux.js';

describe('OP opcode constants', () => {
  it('defines all expected opcodes', () => {
    expect(OP.NOP).toBe(0x00);
    expect(OP.JNZ).toBe(0x06);
    expect(OP.MOV).toBe(0x01);
    expect(OP.JMP).toBe(0x07);
    expect(OP.IADD).toBe(0x08);
    expect(OP.ISUB).toBe(0x09);
    expect(OP.IMUL).toBe(0x0A);
    expect(OP.IDIV).toBe(0x0B);
    expect(OP.INC).toBe(0x0E);
    expect(OP.DEC).toBe(0x0F);
    expect(OP.PUSH).toBe(0x10);
    expect(OP.POP).toBe(0x11);
    expect(OP.JZ).toBe(0x2E);
    expect(OP.MOVI).toBe(0x2B);
    expect(OP.CMP).toBe(0x2D);
    expect(OP.HALT).toBe(0x80);
  });

  it('has 16 unique opcodes', () => {
    const values = new Set(Object.values(OP));
    expect(values.size).toBe(16);
  });

  it('all values are numbers', () => {
    for (const [key, val] of Object.entries(OP)) {
      expect(typeof val).toBe('number', `OP.${key} should be a number`);
    }
  });

  it('keys match expected mnemonic names', () => {
    const expectedKeys = ['NOP', 'MOV', 'JMP', 'IADD', 'ISUB', 'IMUL', 'IDIV',
      'INC', 'DEC', 'PUSH', 'POP', 'JNZ', 'JZ', 'MOVI', 'CMP', 'HALT'];
    for (const key of expectedKeys) {
      expect(OP).toHaveProperty(key);
    }
  });
});
