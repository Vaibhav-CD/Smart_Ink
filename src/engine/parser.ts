/**
 * Smart_Ink Deterministic Mathematical Parser & Evaluator
 * Strictly follows BODMAS/PEMDAS operator precedence with zero eval().
 * Supports variables, functions, implicit multiplication, and safe edge-case handling.
 */

import { Lexer, Token, TokenType } from './lexer';

export type EvalStatus = 'success' | 'undefined' | 'error' | 'assignment';

export interface EvalResult {
  status: EvalStatus;
  value?: number;
  displayText: string;
  variableAssigned?: { name: string; value: number };
  expressionString: string;
}

export type ASTNode =
  | { type: 'Number'; value: number }
  | { type: 'Variable'; name: string }
  | { type: 'UnaryOp'; op: '+' | '-'; right: ASTNode }
  | { type: 'BinaryOp'; op: '+' | '-' | '*' | '/' | '^' | '%'; left: ASTNode; right: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'Assignment'; name: string; value: ASTNode };

export class MathEngine {
  private variables: Map<string, number> = new Map();

  constructor() {
    this.resetDefaults();
  }

  public resetDefaults() {
    this.variables.clear();
    this.variables.set('pi', Math.PI);
    this.variables.set('PI', Math.PI);
    this.variables.set('e', Math.E);
    this.variables.set('E', Math.E);
  }

  public getVariable(name: string): number | undefined {
    return this.variables.get(name);
  }

  public setVariable(name: string, value: number) {
    this.variables.set(name, value);
  }

  public getAllVariables(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [k, v] of this.variables.entries()) {
      if (k !== 'pi' && k !== 'PI' && k !== 'e' && k !== 'E') {
        res[k] = v;
      }
    }
    return res;
  }

  public evaluate(rawInput: string): EvalResult {
    const input = rawInput.trim();
    if (!input) {
      return { status: 'error', displayText: '', expressionString: '' };
    }

    try {
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      if (tokens.length === 0 || tokens[0].type === 'EOF') {
        return { status: 'error', displayText: '', expressionString: input };
      }

      const parser = new ExpressionParser(tokens, this.variables);
      const ast = parser.parse();

      if (!ast) {
        return { status: 'error', displayText: 'Syntax Error', expressionString: input };
      }

      if (ast.type === 'Assignment') {
        const val = this.evaluateNode(ast.value);
        if (isNaN(val) || !isFinite(val)) {
          return { status: 'undefined', displayText: 'Undefined', expressionString: input };
        }
        this.variables.set(ast.name, val);
        return {
          status: 'assignment',
          value: val,
          displayText: `${this.formatNumber(val)}`,
          variableAssigned: { name: ast.name, value: val },
          expressionString: input,
        };
      }

      const result = this.evaluateNode(ast);

      if (isNaN(result) || !isFinite(result)) {
        return {
          status: 'undefined',
          displayText: 'Undefined',
          expressionString: input,
        };
      }

      return {
        status: 'success',
        value: result,
        displayText: this.formatNumber(result),
        expressionString: input,
      };
    } catch (e: any) {
      if (e?.message === 'DIVISION_BY_ZERO' || e?.message === 'UNDEFINED_RESULT') {
        return { status: 'undefined', displayText: 'Undefined', expressionString: input };
      }
      return {
        status: 'error',
        displayText: 'Syntax Error',
        expressionString: input,
      };
    }
  }

  private evaluateNode(node: ASTNode): number {
    switch (node.type) {
      case 'Number':
        return node.value;

      case 'Variable': {
        const val = this.variables.get(node.name);
        if (val === undefined) {
          throw new Error(`UNKNOWN_VARIABLE: ${node.name}`);
        }
        return val;
      }

      case 'UnaryOp': {
        const r = this.evaluateNode(node.right);
        return node.op === '-' ? -r : r;
      }

      case 'BinaryOp': {
        const left = this.evaluateNode(node.left);
        const right = this.evaluateNode(node.right);

        switch (node.op) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            if (Math.abs(right) < 1e-15) {
              throw new Error('DIVISION_BY_ZERO');
            }
            return left / right;
          case '%':
            if (Math.abs(right) < 1e-15) {
              throw new Error('DIVISION_BY_ZERO');
            }
            return left % right;
          case '^':
            if (left < 0 && Math.floor(right) !== right) {
              throw new Error('UNDEFINED_RESULT');
            }
            const powRes = Math.pow(left, right);
            if (!isFinite(powRes)) throw new Error('UNDEFINED_RESULT');
            return powRes;
        }
        break;
      }

      case 'FunctionCall': {
        const args = node.args.map((a) => this.evaluateNode(a));
        return this.evaluateFunction(node.name.toLowerCase(), args);
      }

      case 'Assignment': {
        return this.evaluateNode(node.value);
      }
    }
    throw new Error('UNKNOWN_NODE_TYPE');
  }

  private evaluateFunction(name: string, args: number[]): number {
    if (args.length === 0) throw new Error('MISSING_ARGUMENT');
    const x = args[0];

    switch (name) {
      case 'sin':
        return Math.sin(x);
      case 'cos':
        return Math.cos(x);
      case 'tan': {
        // Check for tan(pi/2) asymptotic undefined
        const cosVal = Math.cos(x);
        if (Math.abs(cosVal) < 1e-12) throw new Error('UNDEFINED_RESULT');
        return Math.tan(x);
      }
      case 'sqrt':
        if (x < 0) throw new Error('UNDEFINED_RESULT');
        return Math.sqrt(x);
      case 'abs':
        return Math.abs(x);
      case 'log':
      case 'log10':
        if (x <= 0) throw new Error('UNDEFINED_RESULT');
        return Math.log10(x);
      case 'ln':
        if (x <= 0) throw new Error('UNDEFINED_RESULT');
        return Math.log(x);
      case 'exp':
        return Math.exp(x);
      case 'round':
        return Math.round(x);
      case 'floor':
        return Math.floor(x);
      case 'ceil':
        return Math.ceil(x);
      default:
        throw new Error(`UNKNOWN_FUNCTION: ${name}`);
    }
  }

  public formatNumber(num: number): string {
    if (Math.abs(num) < 1e-12) return '0';
    // Format to avoid 0.30000000000000004
    const precision = 8;
    const factor = Math.pow(10, precision);
    const rounded = Math.round(num * factor) / factor;

    // Check if within standard integer range
    if (Number.isInteger(rounded) && Math.abs(rounded) < 1e14) {
      return rounded.toString();
    }

    if (Math.abs(rounded) >= 1e10 || (Math.abs(rounded) < 1e-4 && Math.abs(rounded) > 0)) {
      return rounded.toExponential(4).replace(/\.0+e/, 'e');
    }

    return rounded.toString();
  }
}

/**
 * Recursive Descent Expression Parser for BODMAS/PEMDAS
 */
class ExpressionParser {
  private tokens: Token[];
  private current: number = 0;
  private variables: Map<string, number>;

  constructor(tokens: Token[], variables: Map<string, number>) {
    this.tokens = tokens;
    this.variables = variables;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', position: -1 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  public parse(): ASTNode | null {
    // If expression ends with '=', ignore trailing '=' for calculation
    const expr = this.assignment();

    // Consume trailing equals sign if present (e.g. "18 + 4 * 3 =")
    if (this.match('EQUALS')) {
      // trailing equals consumed
    }

    return expr;
  }

  // Assignment: identifier = expression (e.g. x = 10, y = 2 * x)
  private assignment(): ASTNode {
    if (this.check('IDENTIFIER')) {
      const nextToken = this.tokens[this.current + 1];
      if (nextToken && nextToken.type === 'EQUALS') {
        const idToken = this.advance(); // consume identifier
        this.advance(); // consume equals
        const valNode = this.addition();
        return {
          type: 'Assignment',
          name: idToken.value,
          value: valNode,
        };
      }
    }
    return this.addition();
  }

  // Addition & Subtraction: left-associative (+, -)
  private addition(): ASTNode {
    let node = this.multiplication();

    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous().value as '+' | '-';
      const right = this.multiplication();
      node = { type: 'BinaryOp', op, left: node, right };
    }

    return node;
  }

  // Multiplication & Division: (*, /, %)
  // Also supports implicit multiplication (e.g., 2(3+4), 5x)
  private multiplication(): ASTNode {
    let node = this.exponentiation();

    while (
      this.match('MULTIPLY', 'DIVIDE', 'MODULO') ||
      this.isImplicitMultiplication()
    ) {
      let op: '*' | '/' | '%' = '*';
      if (this.previous().type === 'DIVIDE') {
        op = '/';
      } else if (this.previous().type === 'MODULO') {
        op = '%';
      } else if (this.previous().type === 'MULTIPLY') {
        op = '*';
      } // else implicit multiplication detected, op is '*'

      const right = this.exponentiation();
      node = { type: 'BinaryOp', op, left: node, right };
    }

    return node;
  }

  private isImplicitMultiplication(): boolean {
    const next = this.peek().type;
    return next === 'LPAREN' || next === 'IDENTIFIER';
  }

  // Exponentiation: right-associative (2^3^2 = 2^(3^2) = 512)
  private exponentiation(): ASTNode {
    let node = this.unary();

    if (this.match('POWER')) {
      const right = this.exponentiation();
      node = { type: 'BinaryOp', op: '^', left: node, right };
    }

    return node;
  }

  // Unary operators: + or -
  private unary(): ASTNode {
    if (this.match('PLUS', 'MINUS')) {
      const op = this.previous().value as '+' | '-';
      const right = this.unary();
      return { type: 'UnaryOp', op, right };
    }

    return this.primary();
  }

  // Primary: Number, Parenthesized expression, Function call, Variable
  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      const val = parseFloat(this.previous().value);
      return { type: 'Number', value: val };
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;

      // Check if function call e.g. sin(x)
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.addition());
          } while (this.match('COMMA'));
        }
        if (!this.match('RPAREN')) {
          throw new Error('MISSING_CLOSING_PAREN');
        }
        return { type: 'FunctionCall', name, args };
      }

      // Standalone variable or constant
      return { type: 'Variable', name };
    }

    if (this.match('LPAREN')) {
      const node = this.addition();
      if (!this.match('RPAREN')) {
        throw new Error('MISSING_CLOSING_PAREN');
      }
      return node;
    }

    throw new Error(`UNEXPECTED_TOKEN: ${this.peek().value || 'EOF'}`);
  }
}
