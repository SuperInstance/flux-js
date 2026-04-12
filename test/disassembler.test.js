/**
 * Disassembler Tests — flux-js
 * Tests for disassemble() function: bytecode → human-readable text.
 */
import { describe, it, expect } from 'vitest';
import { disassemble, assemble, OP } from '../flux.js';

describe('disassemble', () => {
  it('disassembles HALT', () => {
    const lines = disassemble(new Uint8Array([0x80]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/HALT/);
  });

  it('disassembles NOP', () => {
    const lines = disassemble(new Uint8Array([0x00]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/NOP/);
  });

  it('disassembles MOVI with value', () => {
    const lines = disassemble(new Uint8Array([0x2B, 0, 0x2A, 0x00]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/MOVI/);
    expect(lines[0]).toMatch(/R0/);
    expect(lines[0]).toMatch(/42/);
  });

  it('disassembles MOV with two registers', () => {
    const lines = disassemble(new Uint8Array([0x01, 1, 0]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/MOV/);
    expect(lines[0]).toMatch(/R1/);
    expect(lines[0]).toMatch(/R0/);
  });

  it('disassembles IADD', () => {
    const lines = disassemble(new Uint8Array([0x08, 2, 0, 1]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/IADD/);
    expect(lines[0]).toMatch(/R2/);
    expect(lines[0]).toMatch(/R0/);
    expect(lines[0]).toMatch(/R1/);
  });

  it('disassembles ISUB', () => {
    const lines = disassemble(new Uint8Array([0x09, 0, 1, 2]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/ISUB/);
  });

  it('disassembles IMUL', () => {
    const lines = disassemble(new Uint8Array([0x0A, 0, 1, 2]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/IMUL/);
  });

  it('disassembles IDIV', () => {
    const lines = disassemble(new Uint8Array([0x0B, 0, 1, 2]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/IDIV/);
  });

  it('disassembles INC', () => {
    const lines = disassemble(new Uint8Array([0x0E, 5]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/INC/);
    expect(lines[0]).toMatch(/R5/);
  });

  it('disassembles DEC', () => {
    const lines = disassemble(new Uint8Array([0x0F, 3]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/DEC/);
    expect(lines[0]).toMatch(/R3/);
  });

  it('disassembles PUSH', () => {
    const lines = disassemble(new Uint8Array([0x10, 0]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/PUSH/);
    expect(lines[0]).toMatch(/R0/);
  });

  it('disassembles POP', () => {
    const lines = disassemble(new Uint8Array([0x11, 1]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/POP/);
    expect(lines[0]).toMatch(/R1/);
  });

  it('disassembles CMP', () => {
    const lines = disassemble(new Uint8Array([0x2D, 0, 1]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/CMP/);
  });

  it('disassembles JMP with offset', () => {
    const lines = disassemble(new Uint8Array([0x07, 0x08, 0x00]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/JMP/);
  });

  it('disassembles JNZ with register and offset', () => {
    const lines = disassemble(new Uint8Array([0x06, 0, 0xF6, 0xFF]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/JNZ/);
    expect(lines[0]).toMatch(/R0/);
  });

  it('disassembles JZ with register and offset', () => {
    const lines = disassemble(new Uint8Array([0x2E, 1, 0x04, 0x00]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/JZ/);
    expect(lines[0]).toMatch(/R1/);
  });

  it('shows hex address prefixes', () => {
    const lines = disassemble(new Uint8Array([0x80]));
    expect(lines[0]).toMatch(/^0000:/);
  });

  it('handles unknown opcodes', () => {
    const lines = disassemble(new Uint8Array([0xFF]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/0xff/i);
  });

  it('disassembles multi-instruction program', () => {
    const bc = assemble('MOVI R0, 42\nHALT');
    const lines = disassemble(bc);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/MOVI/);
    expect(lines[1]).toMatch(/HALT/);
  });

  it('round-trips: assemble → disassemble preserves instruction count', () => {
    const program = 'MOVI R0, 10\nMOVI R1, 20\nIADD R2, R0, R1\nHALT';
    const bc = assemble(program);
    const lines = disassemble(bc);
    expect(lines).toHaveLength(4);
  });

  it('handles empty bytecode', () => {
    const lines = disassemble(new Uint8Array(0));
    expect(lines).toHaveLength(0);
  });

  it('accepts ArrayBuffer', () => {
    const buf = new ArrayBuffer(1);
    new Uint8Array(buf)[0] = 0x80;
    const lines = disassemble(buf);
    expect(lines).toHaveLength(1);
  });
});
