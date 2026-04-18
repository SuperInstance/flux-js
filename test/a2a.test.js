/**
 * A2A Agent & Swarm Tests — flux-js
 * Tests for A2AAgent and Swarm classes.
 */
import { describe, it, expect } from 'vitest';
import { A2AAgent, Swarm, assemble, FluxVM } from '../flux.js';

describe('A2AAgent', () => {
  it('creates with id, bytecode, and default role', () => {
    const bc = assemble('MOVI R0, 42\nHALT');
    const agent = new A2AAgent('test-agent', bc);
    expect(agent.id).toBe('test-agent');
    expect(agent.role).toBe('worker');
    expect(agent.trust).toBe(1.0);
    expect(agent.inbox).toEqual([]);
    expect(agent.generation).toBe(0);
    expect(agent.vm).toBeInstanceOf(FluxVM);
  });

  it('creates with custom role', () => {
    const bc = assemble('MOVI R0, 1\nHALT');
    const agent = new A2AAgent('scout-1', bc, 'scout');
    expect(agent.role).toBe('scout');
  });

  it('step() executes VM and increments generation', () => {
    const bc = assemble('MOVI R0, 42\nHALT');
    const agent = new A2AAgent('a1', bc);
    expect(agent.generation).toBe(0);
    const cycles = agent.step();
    expect(agent.generation).toBe(1);
    expect(cycles).toBe(2); // MOVI + HALT = 2 cycles
  });

  it('step() returns cycle count', () => {
    const bc = assemble('MOVI R0, 10\nMOVI R1, 20\nIADD R2, R0, R1\nHALT');
    const agent = new A2AAgent('a1', bc);
    const cycles = agent.step();
    expect(cycles).toBe(4);
  });

  it('VM result accessible after step()', () => {
    const bc = assemble('MOVI R0, 42\nHALT');
    const agent = new A2AAgent('a1', bc);
    agent.step();
    expect(agent.vm.reg(0)).toBe(42);
    expect(agent.vm.halted).toBe(true);
  });

  it('tell() sends message to another agent inbox', () => {
    const bc = assemble('HALT');
    const sender = new A2AAgent('sender', bc);
    const receiver = new A2AAgent('receiver', bc);
    sender.tell(receiver, { data: 'hello' });
    expect(receiver.inbox).toHaveLength(1);
    expect(receiver.inbox[0]).toEqual({
      from: 'sender',
      type: 'TELL',
      payload: { data: 'hello' },
      gen: 0,
      trust: 1.0,
    });
  });

  it('tell() includes current generation', () => {
    const bc = assemble('MOVI R0, 1\nHALT');
    const sender = new A2AAgent('s', bc);
    const receiver = new A2AAgent('r', bc);
    sender.step(); // gen=1
    sender.tell(receiver, 'msg');
    expect(receiver.inbox[0].gen).toBe(1);
  });

  it('ask() sends ASK message and returns result for halted VM', () => {
    const bc = assemble('MOVI R0, 99\nHALT');
    const asker = new A2AAgent('asker', bc);
    const target = new A2AAgent('target', bc);
    target.step(); // Execute target's VM
    const result = asker.ask(target);
    expect(result).toBe(99);
    expect(target.inbox).toHaveLength(1);
    expect(target.inbox[0].type).toBe('ASK');
  });

  it('ask() returns null for non-halted VM', () => {
    const bc = assemble('MOVI R0, 99'); // No HALT
    const asker = new A2AAgent('asker', bc);
    const target = new A2AAgent('target', bc);
    const result = asker.ask(target);
    expect(result).toBeNull();
  });

  it('multiple tell() calls accumulate in inbox', () => {
    const bc = assemble('HALT');
    const sender = new A2AAgent('s', bc);
    const receiver = new A2AAgent('r', bc);
    sender.tell(receiver, 'msg1');
    sender.tell(receiver, 'msg2');
    sender.tell(receiver, 'msg3');
    expect(receiver.inbox).toHaveLength(3);
  });
});

describe('Swarm', () => {
  it('starts with no agents', () => {
    const swarm = new Swarm();
    expect(swarm.agents.size).toBe(0);
  });

  it('add() adds agents', () => {
    const swarm = new Swarm();
    const bc = assemble('HALT');
    swarm.add(new A2AAgent('a0', bc));
    swarm.add(new A2AAgent('a1', bc));
    expect(swarm.agents.size).toBe(2);
  });

  it('tick() executes all agents', () => {
    const swarm = new Swarm();
    const bc = assemble('MOVI R0, 42\nHALT');
    for (let i = 0; i < 5; i++) {
      swarm.add(new A2AAgent(`a${i}`, bc));
    }
    const totalCycles = swarm.tick();
    expect(totalCycles).toBe(10); // 5 agents × 2 cycles each
  });

  it('vote() counts register values across halted agents', () => {
    const swarm = new Swarm();
    swarm.add(new A2AAgent('a0', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a1', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a2', assemble('MOVI R0, 7\nHALT')));
    swarm.tick();
    const votes = swarm.vote(0);
    expect(votes[42]).toBe(2);
    expect(votes[7]).toBe(1);
  });

  it('vote() ignores non-halted agents', () => {
    const swarm = new Swarm();
    swarm.add(new A2AAgent('a0', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a1', assemble('MOVI R0, 0'))); // No halt
    swarm.tick();
    const votes = swarm.vote(0);
    expect(votes[42]).toBe(1);
    expect(votes[0]).toBeUndefined();
  });

  it('consensus() returns most common value', () => {
    const swarm = new Swarm();
    const bc = assemble('MOVI R0, 42\nHALT');
    for (let i = 0; i < 5; i++) swarm.add(new A2AAgent(`a${i}`, bc));
    swarm.tick();
    expect(swarm.consensus(0)).toBe(42);
  });

  it('consensus() returns null when no agents halted', () => {
    const swarm = new Swarm();
    swarm.add(new A2AAgent('a0', assemble('MOVI R0, 42'))); // No halt
    swarm.tick();
    expect(swarm.consensus(0)).toBeNull();
  });

  it('consensus() with split votes returns highest count', () => {
    const swarm = new Swarm();
    swarm.add(new A2AAgent('a0', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a1', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a2', assemble('MOVI R0, 42\nHALT')));
    swarm.add(new A2AAgent('a3', assemble('MOVI R0, 7\nHALT')));
    swarm.add(new A2AAgent('a4', assemble('MOVI R0, 7\nHALT')));
    swarm.tick();
    expect(swarm.consensus(0)).toBe(42); // 3 votes vs 2
  });

  it('vote() with different register index', () => {
    const swarm = new Swarm();
    swarm.add(new A2AAgent('a0', assemble('MOVI R5, 100\nHALT')));
    swarm.tick();
    const votes = swarm.vote(5);
    expect(votes[100]).toBe(1);
  });
});

describe('A2A integration scenarios', () => {
  it('agents message each other and compute', () => {
    const bc1 = assemble('MOVI R0, 10\nHALT');
    const bc2 = assemble('MOVI R0, 20\nHALT');
    const agent1 = new A2AAgent('a1', bc1);
    const agent2 = new A2AAgent('a2', bc2);

    agent1.step();
    agent2.step();

    agent1.tell(agent2, { result: agent1.vm.reg(0) });
    agent2.tell(agent1, { result: agent2.vm.reg(0) });

    expect(agent1.inbox).toHaveLength(1);
    expect(agent2.inbox).toHaveLength(1);
    expect(agent1.inbox[0].payload.result).toBe(20);
    expect(agent2.inbox[0].payload.result).toBe(10);
  });

  it('swarm computes factorial via consensus', () => {
    const swarm = new Swarm();
    const bc = assemble(`
      MOVI R0, 7
      MOVI R1, 1
      IMUL R1, R1, R0
      DEC R0
      JNZ R0, -10
      HALT
    `);
    for (let i = 0; i < 5; i++) {
      swarm.add(new A2AAgent(`agent-${i}`, bc, ['worker', 'scout', 'navigator'][i % 3]));
    }

    const totalCycles = swarm.tick();
    expect(totalCycles).toBeGreaterThan(0);
    expect(swarm.consensus(1)).toBe(5040);
  });
});
