import { describe, it, expect } from 'vitest';
import { QuestionSolver } from '../questionSolver';

describe('QuestionSolver Natural Language & Advanced Math Questions', () => {
  it('solves "what is the value of cos(0)"', () => {
    const sol = QuestionSolver.solve('what is the value of cos(0)');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('1');
    expect(sol.detectedType).toBe('arithmetic');
  });

  it('solves natural language arithmetic inquiries like "find the value of sqrt(144) + 6"', () => {
    const sol = QuestionSolver.solve('find the value of sqrt(144) + 6');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('18');
  });

  it('solves percentage word problems: "what is 20% of 150"', () => {
    const sol = QuestionSolver.solve('what is 20% of 150');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('30');
    expect(sol.detectedType).toBe('percentage');
  });

  it('solves linear equations: "solve 2x + 6 = 16"', () => {
    const sol = QuestionSolver.solve('solve 2x + 6 = 16');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('x = 5');
    expect(sol.detectedType).toBe('linear_equation');
  });

  it('solves linear equation "3x + 5 = 7"', () => {
    const sol = QuestionSolver.solve('3x + 5 = 7');
    expect(sol.isSuccess).toBe(true);
    expect(sol.detectedType).toBe('linear_equation');
    expect(sol.result).toContain('2/3');
    expect(sol.variableValue).toBeCloseTo(0.6667, 3);
  });

  it('solves linear equation with trailing equals "3x + 5 = 7 ="', () => {
    const sol = QuestionSolver.solve('3x + 5 = 7 =');
    expect(sol.isSuccess).toBe(true);
    expect(sol.detectedType).toBe('linear_equation');
    expect(sol.result).toContain('2/3');
  });

  it('solves linear equation with variables on both sides "4x + 2 = 2x + 10"', () => {
    const sol = QuestionSolver.solve('4x + 2 = 2x + 10');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('x = 4');
  });


  it('solves derivatives: "derivative of x^3"', () => {
    const sol = QuestionSolver.solve('derivative of x^3');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('3x^2');
    expect(sol.detectedType).toBe('derivative');
  });

  it('solves integrals: "integral of x^2"', () => {
    const sol = QuestionSolver.solve('integral of x^2');
    expect(sol.isSuccess).toBe(true);
    expect(sol.result).toBe('(1/3)x^3 + C');
    expect(sol.detectedType).toBe('integral');
  });
});
