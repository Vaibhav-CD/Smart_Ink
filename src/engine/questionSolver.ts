/**
 * Smart_Ink Natural Language Question & Symbolic Math Solver
 * Interprets natural language questions ("what is the value of cos(0)", "solve 2x+6=12", "20% of 150")
 * and computes step-by-step mathematical answers on-device.
 */

import { MathEngine, EvalResult } from './parser';

export interface QuestionSolution {
  originalQuestion: string;
  detectedType: 'arithmetic' | 'percentage' | 'linear_equation' | 'derivative' | 'integral' | 'general';
  normalizedExpression: string;
  result: string;
  steps: string[];
  isSuccess: boolean;
}

export class QuestionSolver {
  private static mathEngine = new MathEngine();

  /**
   * Main entry point: solves text or natural language questions
   */
  public static solve(rawText: string): QuestionSolution {
    const text = rawText.trim();
    if (!text) {
      return {
        originalQuestion: rawText,
        detectedType: 'general',
        normalizedExpression: '',
        result: '',
        steps: [],
        isSuccess: false,
      };
    }

    // 1. Check for Percentage problem: e.g. "what is 20% of 150" or "15% of 80"
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
    if (percentMatch) {
      const p = parseFloat(percentMatch[1]);
      const base = parseFloat(percentMatch[2]);
      const val = (p / 100) * base;
      return {
        originalQuestion: rawText,
        detectedType: 'percentage',
        normalizedExpression: `${p}% × ${base}`,
        result: `${val}`,
        steps: [
          `Convert percentage to decimal: ${p}% = ${p / 100}`,
          `Multiply by base value: ${p / 100} × ${base} = ${val}`,
        ],
        isSuccess: true,
      };
    }

    // 2. Check for Derivative: e.g. "derivative of x^3", "d/dx(x^2)", "d/dx (3x^2)"
    const derivMatch = text.match(/(?:derivative\s+of|d\/dx\s*\(?)\s*([a-zA-Z0-9^+\-* ]+)\)?/i);
    if (derivMatch) {
      const expr = derivMatch[1].trim();
      const sol = this.solvePolynomialDerivative(expr);
      if (sol) {
        return {
          originalQuestion: rawText,
          detectedType: 'derivative',
          normalizedExpression: `d/dx (${expr})`,
          result: sol.result,
          steps: sol.steps,
          isSuccess: true,
        };
      }
    }

    // 3. Check for Integral: e.g. "integral of x^2", "integrate x^3"
    const intMatch = text.match(/(?:integral\s+of|integrate)\s+([a-zA-Z0-9^+\-* ]+)/i);
    if (intMatch) {
      const expr = intMatch[1].trim();
      const sol = this.solvePolynomialIntegral(expr);
      if (sol) {
        return {
          originalQuestion: rawText,
          detectedType: 'integral',
          normalizedExpression: `∫ (${expr}) dx`,
          result: sol.result,
          steps: sol.steps,
          isSuccess: true,
        };
      }
    }

    // 4. Check for Linear Equation: e.g. "solve 2x + 6 = 16" or "3x - 5 = 10"
    const solveMatch = text.match(/(?:solve\s+)?([0-9xX+\-*/. ]+)=([0-9xX+\-*/. ]+)/i);
    if (solveMatch && /[xX]/.test(text) && !text.endsWith('=')) {
      const lhs = solveMatch[1].trim();
      const rhs = solveMatch[2].trim();
      const sol = this.solveLinearEquation(lhs, rhs);
      if (sol) {
        return {
          originalQuestion: rawText,
          detectedType: 'linear_equation',
          normalizedExpression: `${lhs} = ${rhs}`,
          result: `x = ${sol.value}`,
          steps: sol.steps,
          isSuccess: true,
        };
      }
    }

    // 5. Natural Language Arithmetic Inquiry:
    // Strips conversational prefixes like "what is the value of", "calculate", "find", "what is"
    let clean = text
      .replace(/^(?:what\s+(?:is|are)(?:\s+the\s+value\s+of)?|calculate|find(?:\s+the\s+value\s+of)?|evaluate|what's)\s+/i, '')
      .replace(/\?+$/, '')
      .trim();

    if (!clean.endsWith('=')) {
      clean += ' =';
    }

    // Evaluate clean mathematical expression
    const evalRes: EvalResult = this.mathEngine.evaluate(clean);

    if (evalRes.status === 'success' || evalRes.status === 'assignment' || evalRes.status === 'undefined') {
      const resVal = evalRes.status === 'undefined' ? 'Undefined' : evalRes.displayText;
      return {
        originalQuestion: rawText,
        detectedType: 'arithmetic',
        normalizedExpression: clean.replace(/\s*=$/, ''),
        result: resVal,
        steps: [
          `Parsed expression: ${clean.replace(/\s*=$/, '')}`,
          `Evaluated using BODMAS precedence: ${resVal}`,
        ],
        isSuccess: true,
      };
    }

    return {
      originalQuestion: rawText,
      detectedType: 'general',
      normalizedExpression: clean,
      result: 'Syntax Error',
      steps: ['Unable to safely interpret the mathematical query.'],
      isSuccess: false,
    };
  }

  /**
   * Solves linear equation of form ax + b = c
   */
  private static solveLinearEquation(lhs: string, rhs: string): { value: number; steps: string[] } | null {
    try {
      // Evaluate RHS as constant
      const rhsVal = this.mathEngine.evaluate(rhs).value;
      if (rhsVal === undefined || isNaN(rhsVal)) return null;

      // Parse ax + b on LHS
      const cleanLhs = lhs.replace(/\s+/g, '');
      const match = cleanLhs.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x([+-]\d+(?:\.\d+)?)?$/i);
      if (!match) return null;

      let aStr = match[1];
      let bStr = match[2];

      let a = 1;
      if (aStr === '' || aStr === '+') a = 1;
      else if (aStr === '-') a = -1;
      else a = parseFloat(aStr);

      let b = bStr ? parseFloat(bStr) : 0;

      if (a === 0) return null;

      const steps: string[] = [
        `Given linear equation: ${lhs} = ${rhs}`,
      ];

      let remaining = rhsVal;
      if (b !== 0) {
        remaining = rhsVal - b;
        steps.push(`Subtract ${b} from both sides: ${a}x = ${remaining}`);
      }

      const x = remaining / a;
      if (a !== 1) {
        steps.push(`Divide both sides by ${a}: x = ${remaining} / ${a} = ${x}`);
      } else {
        steps.push(`Solution: x = ${x}`);
      }

      return { value: x, steps };
    } catch {
      return null;
    }
  }

  /**
   * Polynomial power rule derivative d/dx (a * x^n)
   */
  private static solvePolynomialDerivative(expr: string): { result: string; steps: string[] } | null {
    const clean = expr.replace(/\s+/g, '');
    const match = clean.match(/^([+-]?(?:\d+)?)x(?:\^(\d+))?$/i);
    if (!match) return null;

    let coeff = match[1] === '' || match[1] === '+' ? 1 : match[1] === '-' ? -1 : parseFloat(match[1]);
    let power = match[2] ? parseInt(match[2], 10) : 1;

    const newCoeff = coeff * power;
    const newPower = power - 1;

    let res = '';
    if (newPower === 0) res = `${newCoeff}`;
    else if (newPower === 1) res = `${newCoeff === 1 ? '' : newCoeff === -1 ? '-' : newCoeff}x`;
    else res = `${newCoeff === 1 ? '' : newCoeff === -1 ? '-' : newCoeff}x^${newPower}`;

    return {
      result: res,
      steps: [
        `Apply power rule: d/dx (a·x^n) = a·n·x^(n-1)`,
        `Multiply coefficient by exponent: ${coeff} × ${power} = ${newCoeff}`,
        `Decrement exponent: ${power} - 1 = ${newPower}`,
        `Result: ${res}`,
      ],
    };
  }

  /**
   * Polynomial power rule integral ∫ (a * x^n) dx
   */
  private static solvePolynomialIntegral(expr: string): { result: string; steps: string[] } | null {
    const clean = expr.replace(/\s+/g, '');
    const match = clean.match(/^([+-]?(?:\d+)?)x(?:\^(\d+))?$/i);
    if (!match) return null;

    let coeff = match[1] === '' || match[1] === '+' ? 1 : match[1] === '-' ? -1 : parseFloat(match[1]);
    let power = match[2] ? parseInt(match[2], 10) : 1;

    const newPower = power + 1;
    let res = '';

    if (coeff % newPower === 0) {
      const c = coeff / newPower;
      res = `${c === 1 ? '' : c === -1 ? '-' : c}x^${newPower} + C`;
    } else {
      res = `(${coeff}/${newPower})x^${newPower} + C`;
    }

    return {
      result: res,
      steps: [
        `Apply power rule for integration: ∫ x^n dx = (x^(n+1))/(n+1) + C`,
        `Increment exponent: ${power} + 1 = ${newPower}`,
        `Divide coefficient by new exponent: ${coeff}/${newPower}`,
        `Result: ${res}`,
      ],
    };
  }
}
