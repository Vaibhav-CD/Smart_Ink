/**
 * Smart_Ink Math Lexer
 * Tokenizes handwritten math expressions into a structured stream of tokens.
 * Handles digits, decimals, operators, parentheses, functions, and variables.
 */

export type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'POWER'
  | 'MODULO'
  | 'LPAREN'
  | 'RPAREN'
  | 'EQUALS'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export class Lexer {
  private input: string;
  private pos: number = 0;
  private length: number;

  constructor(input: string) {
    this.input = input.trim();
    this.length = this.input.length;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.length) {
      const char = this.input[this.pos];

      // Skip whitespace
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Numbers (integers and floating-point decimals)
      if (/\d/.test(char) || (char === '.' && this.isNextDigit())) {
        tokens.push(this.readNumber());
        continue;
      }

      // Operators and Symbols
      if (char === '+') {
        tokens.push({ type: 'PLUS', value: '+', position: this.pos++ });
        continue;
      }
      if (char === '-' || char === '−' || char === '–') {
        tokens.push({ type: 'MINUS', value: '-', position: this.pos++ });
        continue;
      }
      if (char === '*' || char === '×' || char === 'x' && this.isOperatorContext(tokens)) {
        tokens.push({ type: 'MULTIPLY', value: '*', position: this.pos++ });
        continue;
      }
      if (char === '/' || char === '÷') {
        tokens.push({ type: 'DIVIDE', value: '/', position: this.pos++ });
        continue;
      }
      if (char === '^') {
        tokens.push({ type: 'POWER', value: '^', position: this.pos++ });
        continue;
      }
      if (char === '%') {
        tokens.push({ type: 'MODULO', value: '%', position: this.pos++ });
        continue;
      }
      if (char === '(' || char === '[' || char === '{') {
        tokens.push({ type: 'LPAREN', value: '(', position: this.pos++ });
        continue;
      }
      if (char === ')' || char === ']' || char === '}') {
        tokens.push({ type: 'RPAREN', value: ')', position: this.pos++ });
        continue;
      }
      if (char === '=') {
        tokens.push({ type: 'EQUALS', value: '=', position: this.pos++ });
        continue;
      }
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',', position: this.pos++ });
        continue;
      }

      // Identifiers (variable names: x, y, a, ans, or math functions: sin, cos, tan, sqrt, abs)
      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Unknown character, skip to maintain fault tolerance
      this.pos++;
    }

    tokens.push({ type: 'EOF', value: '', position: this.pos });
    return tokens;
  }

  private isNextDigit(): boolean {
    return this.pos + 1 < this.length && /\d/.test(this.input[this.pos + 1]);
  }

  private isOperatorContext(tokens: Token[]): boolean {
    if (tokens.length === 0) return false;
    const last = tokens[tokens.length - 1];
    // If preceded by a number or closing paren, 'x' is likely multiplication
    return last.type === 'NUMBER' || last.type === 'RPAREN';
  }

  private readNumber(): Token {
    const start = this.pos;
    let hasDot = false;

    while (this.pos < this.length) {
      const char = this.input[this.pos];
      if (/\d/.test(char)) {
        this.pos++;
      } else if (char === '.' && !hasDot) {
        hasDot = true;
        this.pos++;
      } else {
        break;
      }
    }

    const value = this.input.slice(start, this.pos);
    return { type: 'NUMBER', value, position: start };
  }

  private readIdentifier(): Token {
    const start = this.pos;
    while (this.pos < this.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      this.pos++;
    }
    const value = this.input.slice(start, this.pos);
    return { type: 'IDENTIFIER', value, position: start };
  }
}
