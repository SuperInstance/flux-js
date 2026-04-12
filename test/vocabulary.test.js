/**
 * Vocabulary & Interpreter Tests — flux-js
 * Tests for VocabEntry, Vocabulary, VocabInterpreter, and Interpreter classes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  VocabEntry, Vocabulary, VocabInterpreter, Interpreter, VOCAB
} from '../flux.js';

describe('VocabEntry', () => {
  it('matches text against regex pattern', () => {
    const entry = new VocabEntry(/^hello$/i, 'MOVI R0, 42\nHALT', 'hello');
    expect(entry.match('hello')).toEqual([]);
    expect(entry.match('HELLO')).toEqual([]);
    expect(entry.match('hello world')).toBeNull();
  });

  it('captures groups from pattern', () => {
    const entry = new VocabEntry(/^compute (\d+) \+ (\d+)$/i, 'template', 'add');
    expect(entry.match('compute 3 + 4')).toEqual(['3', '4']);
  });

  it('accepts RegExp object directly', () => {
    const entry = new VocabEntry(new RegExp('test', 'i'), 't', 'test');
    expect(entry.match('TEST')).toEqual([]);
  });

  it('accepts string pattern and converts to RegExp', () => {
    const entry = new VocabEntry('^foo$', 't', 'foo');
    expect(entry.match('foo')).toEqual([]);
    expect(entry.match('bar')).toBeNull();
  });
});

describe('Vocabulary', () => {
  it('starts empty', () => {
    const vocab = new Vocabulary();
    expect(vocab.entries).toHaveLength(0);
  });

  it('registers entries', () => {
    const vocab = new Vocabulary();
    const entry = new VocabEntry(/^test$/i, '', 'test');
    vocab.register(entry);
    expect(vocab.entries).toHaveLength(1);
  });

  it('finds first matching entry', () => {
    const vocab = new Vocabulary();
    vocab.register(new VocabEntry(/^hello$/i, '', 'hello'));
    vocab.register(new VocabEntry(/^compute (\d+)$/i, '', 'compute'));
    const match = vocab.findMatch('compute 42');
    expect(match).not.toBeNull();
    expect(match.name).toBe('compute');
  });

  it('returns null when no match', () => {
    const vocab = new Vocabulary();
    expect(vocab.findMatch('unknown text')).toBeNull();
  });

  it('returns first match when multiple patterns match', () => {
    const vocab = new Vocabulary();
    vocab.register(new VocabEntry(/^compute/i, '', 'broad'));
    vocab.register(new VocabEntry(/^compute \d+$/i, '', 'narrow'));
    const match = vocab.findMatch('compute 42');
    expect(match.name).toBe('broad');
  });
});

describe('VocabInterpreter', () => {
  let interp;
  beforeEach(() => {
    interp = new VocabInterpreter();
  });

  it('interprets "hello" → 42', () => {
    const result = interp.run('hello');
    expect(result.value).toBe(42);
    expect(result.cycles).toBeGreaterThan(0);
  });

  it('interprets "compute 3 + 4" → 7', () => {
    const result = interp.run('compute 3 + 4');
    expect(result.value).toBe(7);
  });

  it('interprets "compute 10 * 5" → 50', () => {
    const result = interp.run('compute 10 * 5');
    expect(result.value).toBe(50);
  });

  it('interprets "double 21" → 42', () => {
    const result = interp.run('double 21');
    expect(result.value).toBe(42);
  });

  it('interprets "square 8" → 64', () => {
    const result = interp.run('square 8');
    expect(result.value).toBe(64);
  });

  it('interprets "factorial of 5" → 120', () => {
    const result = interp.run('factorial of 5');
    expect(result.value).toBe(120);
  });

  it('returns null value for unrecognized input', () => {
    const result = interp.run('some random text');
    expect(result.value).toBeNull();
    expect(result.message).toMatch(/No vocabulary match/);
  });

  it('returns object with value, message, cycles', () => {
    const result = interp.run('hello');
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('cycles');
  });
});

describe('Interpreter', () => {
  let interp;
  beforeEach(() => {
    interp = new Interpreter();
  });

  it('has 10 built-in vocabulary patterns', () => {
    expect(interp.vocab.length).toBe(10);
  });

  describe('arithmetic patterns', () => {
    it('"compute 3 + 4" → 7', () => {
      const result = interp.run('compute 3 + 4');
      expect(result.value).toBe(7);
    });

    it('"compute 10 - 3" → 7', () => {
      const result = interp.run('compute 10 - 3');
      expect(result.value).toBe(7);
    });

    it('"compute 6 * 7" → 42', () => {
      const result = interp.run('compute 6 * 7');
      expect(result.value).toBe(42);
    });

    it('"double 21" → 42', () => {
      const result = interp.run('double 21');
      expect(result.value).toBe(42);
    });

    it('"square 9" → 81', () => {
      const result = interp.run('square 9');
      expect(result.value).toBe(81);
    });
  });

  describe('loop patterns', () => {
    it('"factorial of 7" → 5040', () => {
      const result = interp.run('factorial of 7');
      expect(result.value).toBe(5040);
      expect(result.cycles).toBeGreaterThan(0);
    });

    it('"factorial of 1" → 1', () => {
      const result = interp.run('factorial of 1');
      expect(result.value).toBe(1);
    });

    it('"fibonacci of 12" → 144', () => {
      const result = interp.run('fibonacci of 12');
      expect(result.value).toBe(144);
    });

    it('"sum 1 to 100" → 5050', () => {
      const result = interp.run('sum 1 to 100');
      expect(result.value).toBe(5050);
    });

    it('"power of 2 to 10" → 1024', () => {
      const result = interp.run('power of 2 to 10');
      expect(result.value).toBe(1024);
    });
  });

  describe('hello pattern', () => {
    it('"hello" → 42', () => {
      const result = interp.run('hello');
      expect(result.value).toBe(42);
    });

    it('case insensitive', () => {
      const result = interp.run('HELLO');
      expect(result.value).toBe(42);
    });
  });

  describe('direct assembly fallback', () => {
    it('executes direct assembly when input starts with a known opcode', () => {
      const result = interp.run('MOVI R0, 99');
      expect(result.value).toBe(99);
      expect(result.message).toMatch(/direct asm/);
    });

    it('reports error for invalid direct assembly', () => {
      const result = interp.run('MOVI R0,');
      expect(result.value).toBeNull();
      expect(result.message).toMatch(/Error/);
    });
  });

  describe('no match', () => {
    it('returns null for unrecognized input', () => {
      const result = interp.run('xyzzy nothing here');
      expect(result.value).toBeNull();
      expect(result.message).toMatch(/No match/);
    });
  });

  describe('result format', () => {
    it('always returns {value, message, cycles}', () => {
      const result = interp.run('hello');
      expect(typeof result.value).toBe('number');
      expect(typeof result.message).toBe('string');
      expect(typeof result.cycles).toBe('number');
    });
  });
});

describe('VOCAB built-in array', () => {
  it('has 10 entries', () => {
    expect(VOCAB).toHaveLength(10);
  });

  it('each entry has pattern, name, asm, and reg', () => {
    for (const entry of VOCAB) {
      expect(entry).toHaveProperty('pattern');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('asm');
      expect(entry).toHaveProperty('reg');
      expect(entry.pattern).toBeInstanceOf(RegExp);
      expect(typeof entry.asm).toBe('function');
      expect(typeof entry.reg).toBe('number');
    }
  });

  it('covers all documented patterns', () => {
    const names = VOCAB.map(e => e.name);
    expect(names).toContain('add');
    expect(names).toContain('sub');
    expect(names).toContain('mul');
    expect(names).toContain('double');
    expect(names).toContain('square');
    expect(names).toContain('factorial');
    expect(names).toContain('fibonacci');
    expect(names).toContain('sum');
    expect(names).toContain('power');
    expect(names).toContain('hello');
  });
});
