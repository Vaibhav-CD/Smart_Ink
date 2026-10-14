import { describe, it, expect, beforeEach } from 'vitest';
import { MathEngine } from '../parser';

describe('MathEngine Evaluator & BODMAS Precedence', () => {
  let engine: MathEngine;

  beforeEach(() => {
    engine = new MathEngine();
  });

  describe('Basic Arithmetic & Multi-digit Integers', () => {
    it('evaluates simple addition and subtraction', () => {
      expect(engine.evaluate('15 + 27 =').displayText).toBe('42');
      expect(engine.evaluate('100 - 45 =').displayText).toBe('55');
    });

    it('evaluates multiplication and division', () => {
      expect(engine.evaluate('14 * 5 =').displayText).toBe('70');
      expect(engine.evaluate('144 / 12 =').displayText).toBe('12');
      expect(engine.evaluate('14 × 5 =').displayText).toBe('70');
      expect(engine.evaluate('144 ÷ 12 =').displayText).toBe('12');
    });
  });

  describe('BODMAS / PEMDAS Order of Operations', () => {
    it('prioritizes multiplication over addition (18 + 4 * 3 = 30)', () => {
      const res = engine.evaluate('18 + 4 * 3 =');
      expect(res.status).toBe('success');
      expect(res.value).toBe(30);
      expect(res.displayText).toBe('30');
    });

    it('respects parentheses precedence: (18 + 4) * 3 = 66', () => {
      const res = engine.evaluate('(18 + 4) * 3 =');
      expect(res.status).toBe('success');
      expect(res.value).toBe(66);
    });

    it('handles nested parentheses: 2 * (3 + (4 * 2)) = 22', () => {
      const res = engine.evaluate('2 * (3 + (4 * 2)) =');
      expect(res.value).toBe(22);
    });

    it('handles exponentiation right-associativity: 2 ^ 3 ^ 2 = 512', () => {
      expect(engine.evaluate('2 ^ 3 ^ 2 =').value).toBe(512);
      expect(engine.evaluate('2 ^ 3 + 1 =').value).toBe(9);
    });

    it('handles implicit multiplication: 2(3+4) = 14', () => {
      expect(engine.evaluate('2(3+4) =').value).toBe(14);
    });
  });

  describe('Floating-Point Decimals & Negatives', () => {
    it('handles decimal addition without precision leak: 0.1 + 0.2 = 0.3', () => {
      expect(engine.evaluate('0.1 + 0.2 =').displayText).toBe('0.3');
    });

    it('evaluates decimal multiplication: 3.14 * 2 = 6.28', () => {
      expect(engine.evaluate('3.14 * 2 =').displayText).toBe('6.28');
    });

    it('evaluates negative numbers and unary minus', () => {
      expect(engine.evaluate('-5 + 12 =').value).toBe(7);
      expect(engine.evaluate('10 - -5 =').value).toBe(15);
      expect(engine.evaluate('-3 * -4 =').value).toBe(12);
    });
  });

  describe('Safe Fault Tolerance & Edge Cases', () => {
    it('safely handles division by zero as Undefined', () => {
      const res1 = engine.evaluate('10 / 0 =');
      expect(res1.status).toBe('undefined');
      expect(res1.displayText).toBe('Undefined');

      const res2 = engine.evaluate('5 / (2 - 2) =');
      expect(res2.status).toBe('undefined');
      expect(res2.displayText).toBe('Undefined');
    });

    it('handles malformed syntax without runtime crashing', () => {
      const res = engine.evaluate('10 + * 5 =');
      expect(res.status).toBe('error');
    });

    it('handles unclosed parentheses safely', () => {
      const res = engine.evaluate('(10 + 5 =');
      expect(res.status).toBe('error');
    });
  });

  describe('Variables & Memory Persistence', () => {
    it('stores variable assignments: x = 10, then computes x + 5 = 15', () => {
      const assign = engine.evaluate('x = 10');
      expect(assign.status).toBe('assignment');
      expect(assign.value).toBe(10);
      expect(engine.getVariable('x')).toBe(10);

      const calc = engine.evaluate('x + 5 =');
      expect(calc.status).toBe('success');
      expect(calc.value).toBe(15);
    });

    it('supports chained variable operations', () => {
      engine.evaluate('a = 4');
      engine.evaluate('b = 5');
      const res = engine.evaluate('a * b + 2 =');
      expect(res.value).toBe(22);
    });

    it('supports built-in constants: pi and e', () => {
      const piTest = engine.evaluate('2 * pi =');
      expect(piTest.value).toBeCloseTo(6.2831853, 5);
    });
  });

  describe('Mathematical Functions', () => {
    it('evaluates sqrt, sin, cos, abs', () => {
      expect(engine.evaluate('sqrt(16) =').value).toBe(4);
      expect(engine.evaluate('abs(-42) =').value).toBe(42);
      expect(engine.evaluate('sin(0) =').value).toBe(0);
      expect(engine.evaluate('cos(0) =').value).toBe(1);
    });
  });
});
