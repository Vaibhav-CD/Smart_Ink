/**
 * Smart_Ink Natural Language Question & Symbolic Math Solver
 * Interprets natural language questions ("what is the value of cos(0)", "solve 2x+6=12", "3x+5=7", "20% of 150")
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
  variableName?: string;
  variableValue?: number;
}

export class QuestionSolver {
  private static mathEngine = new MathEngine();

  /**
   * Main entry point: solves text, natural language questions, or algebraic equations
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

    // Clean trailing equals if present (e.g. "3x + 5 = 7 =" or "18 + 4 * 3 =")
    let cleanText = text;
    if (cleanText.endsWith('=')) {
      cleanText = cleanText.slice(0, -1).trim();
    }

    // 1. Check for Linear Algebraic Equation (e.g. "3x + 5 = 7", "2x + 6 = 16", "x + 4 = 10", "solve 5x = 25")
    if (cleanText.includes('=')) {
      const parts = cleanText.replace(/^(?:solve\s+)/i, '').split('=');
      if (parts.length === 2) {
        const lhs = parts[0].trim();
        const rhs = parts[1].trim();
        // Find single-letter variable (e.g., x, y, z, a, b, n)
        const varMatch = (lhs + rhs).match(/[a-zA-Z]/);
        if (varMatch) {
          const varChar = varMatch[0];
          const sol = this.solveGeneralizedLinear(lhs, rhs, varChar);
          if (sol) {
            return {
              originalQuestion: rawText,
              detectedType: 'linear_equation',
              normalizedExpression: `${lhs} = ${rhs}`,
              result: sol.displayResult,
              steps: sol.steps,
              isSuccess: true,
              variableName: varChar,
              variableValue: sol.value,
            };
          }
        }
      }
    }

    // 2. Check for Percentage problem: e.g. "what is 20% of 150" or "15% of 80"
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

    // 3. Check for Derivative: e.g. "derivative of x^3", "d/dx(x^2)", "d/dx (3x^2)"
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

    // 4. Check for Integral: e.g. "integral of x^2", "integrate x^3"
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
   * Generalized single-variable linear equation solver
   * Supports: 3x + 5 = 7, 2x - 4 = 10, 5x = 25, 4x + 2 = 2x + 10, etc.
   */
  public static solveGeneralizedLinear(
    lhs: string,
    rhs: string,
    varChar: string
  ): { value: number; displayResult: string; steps: string[] } | null {
    try {
      const leftTerms = this.parseLinearSide(lhs, varChar);
      const rightTerms = this.parseLinearSide(rhs, varChar);

      if (!leftTerms || !rightTerms) return null;

      // Equation: leftTerms.a * x + leftTerms.b = rightTerms.a * x + rightTerms.b
      // (leftTerms.a - rightTerms.a) * x = rightTerms.b - leftTerms.b
      const coeff = leftTerms.a - rightTerms.a;
      const constant = rightTerms.b - leftTerms.b;

      if (Math.abs(coeff) < 1e-12) {
        if (Math.abs(constant) < 1e-12) {
          return {
            value: 0,
            displayResult: `${varChar} ∈ ℝ (Infinite Solutions)`,
            steps: ['Both sides are identically equal for all real numbers.'],
          };
        }
        return {
          value: NaN,
          displayResult: 'No Solution',
          steps: ['Contradiction: coefficients cancel out with unequal constants.'],
        };
      }

      const x = constant / coeff;

      // Format clean answer (e.g. "x = 2/3 (0.67)" or "x = 5")
      const displayResult = this.formatLinearSolution(varChar, constant, coeff, x);

      const steps: string[] = [
        `Original equation: ${lhs} = ${rhs}`,
      ];

      if (rightTerms.a !== 0) {
        steps.push(`Move all terms with ${varChar} to left: ${coeff}${varChar} + ${leftTerms.b} = ${rightTerms.b}`);
      }

      if (leftTerms.b !== 0) {
        steps.push(`Move constant terms to right: ${coeff}${varChar} = ${constant}`);
      }

      if (coeff !== 1) {
        steps.push(`Divide both sides by ${coeff}: ${varChar} = ${constant} / ${coeff} = ${this.formatNumber(x)}`);
      } else {
        steps.push(`Solution: ${varChar} = ${this.formatNumber(x)}`);
      }

      return {
        value: x,
        displayResult,
        steps,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parses one side of a linear equation into (a * varChar + b)
   */
  private static parseLinearSide(side: string, varChar: string): { a: number; b: number } | null {
    const s = side.replace(/\s+/g, '');
    if (!s) return { a: 0, b: 0 };

    // Split into signed terms: e.g. "+3x", "-5", "+2x", "7"
    const termRegex = /([+-]?[^+-]+)/g;
    const rawTerms = s.match(termRegex);
    if (!rawTerms) return null;

    let a = 0;
    let b = 0;

    for (const term of rawTerms) {
      if (term.includes(varChar)) {
        // Variable term
        const coeffStr = term.replace(varChar, '');
        let coeff = 1;
        if (coeffStr === '' || coeffStr === '+') coeff = 1;
        else if (coeffStr === '-') coeff = -1;
        else {
          coeff = parseFloat(coeffStr);
          if (isNaN(coeff)) return null;
        }
        a += coeff;
      } else {
        // Constant term
        const val = parseFloat(term);
        if (isNaN(val)) return null;
        b += val;
      }
    }

    return { a, b };
  }

  /**
   * Formats linear equation solution nicely with fraction and decimal if needed
   */
  private static formatLinearSolution(
    varChar: string,
    constant: number,
    coeff: number,
    x: number
  ): string {
    // If integer
    if (Math.abs(x - Math.round(x)) < 1e-9) {
      return `${varChar} = ${Math.round(x)}`;
    }

    // Attempt fraction reduction if integers
    if (Number.isInteger(constant) && Number.isInteger(coeff)) {
      const gcd = this.gcd(Math.abs(constant), Math.abs(coeff));
      let num = constant / gcd;
      let den = coeff / gcd;
      if (den < 0) {
        num = -num;
        den = -den;
      }

      const decStr = x.toFixed(2);
      return `${varChar} = ${num}/${den} (${decStr})`;
    }

    return `${varChar} = ${this.formatNumber(x)}`;
  }

  private static gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  private static formatNumber(num: number): string {
    const factor = 10000;
    return (Math.round(num * factor) / factor).toString();
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
