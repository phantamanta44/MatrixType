class ParsingContext {
  constructor() {
    this.compiled = '';
    this.error = null;
  }

  callback(mutator) {
    this.compiled = mutator(this.compiled);
    return {newContext: this};
  }
}

class ChildParsingContext extends ParsingContext {
  constructor(parent) {
    super();
    this.parent = parent;
  }
}

class RootParsingContext extends ParsingContext {
  accept(char) {
    if (char === '[') {
      return {
        newContext: new MatrixParsingContext(this),
      };
    } else if (operatorChars.indexOf(char) !== -1) {
      return {
        newContext: new OperatorParsingContext(this),
        ignored: true,
      };
    } else if (char === ';') {
      this.compiled += '\\\\\n';
    } else {
      this.compiled += char;
    }
  }
}


const operatorChars = '+\-*=<>^;';
const operators = {
  '+': '+',
  '-': '-',
  '*': '\\times',
  '>': '>',
  '!>': '\\nless',
  '<': '<',
  '!>': '\\ngtr',
  '=': '=',
  '!=': '\\neq',
  '<=': '\\leq',
  '!<=': '\\nleq',
  '>=': '\\geq',
  '!>=': '\\ngeq',
  '~=': '\\approx',
  '=>': '\\Rightarrow',
  '->': '\\rightarrow',
  '==>': '\\implies',
  '<==>': '\\iff',
  '<=>': '\\Leftrightarrow',
  ';': '\\\\\n',
};
class OperatorParsingContext extends ChildParsingContext {
  accept(char) {
    if (operatorChars.indexOf(char) !== -1) {
      this.compiled += char;
    } else {
      if (operators.hasOwnProperty(this.compiled)) {
        this.compiled = operators[this.compiled];
      }
      return {
        ...this.parent.callback((c) => `${c.trimRight()} ${this.compiled} `),
        ignored: true,
      };
    }
  }
}

class MatrixParsingContext extends ChildParsingContext {
  constructor(parent) {
    super(parent);
    this.aggregate = '';
    this.rows = [[]];
    this.barIndex = -1;
  }

  accept(char) {
    if (char === ']') {
      if (this.aggregate.trim().length > 0) {
        this.rows[this.rows.length - 1].push(this.aggregate.trim());
      }
      this.compiled = '\\left[\n\\begin{array}{';
      for (let i = 0; i < this.rows[0].length; i++) {
        this.compiled += 'c';
        if (i === this.barIndex - 1) {
          this.compiled += '|';
        }
      }
      this.compiled += '}\n';
      const compiledRows = [];
      for (const row of this.rows) {
        compiledRows.push(row.join(' & '));
      }
      this.compiled += compiledRows.join('\\\\\n');
      this.compiled += '\n\\end{array}\n\\right]';
      return this.parent.callback((c) => c + this.compiled);
    } else if (char === '\n') {
      let row = this.rows.length - 1;
      this.rows[row].push(this.aggregate.trim());
      if (row !== 0 && this.rows[row].length !== this.rows[0].length) {
        this.error = 'Inconsistent row size!';
      } else {
        this.rows.push([]);
        this.aggregate = '';
      }
    } else if (char === ',') {
      this.rows[this.rows.length - 1].push(this.aggregate.trim());
      this.aggregate = '';
    } else if (char === '|') {
      this.rows[this.rows.length - 1].push(this.aggregate.trim());
      this.aggregate = '';
      const index = this.rows[this.rows.length - 1].length;
      if (this.barIndex != -1) {
        if (index !== this.barIndex) {
          this.error = 'Inconsistent matrix bar index!';
        }
      } else {
        this.barIndex = index;
      }
    } else {
      this.aggregate += char;
    }
  }
}

class Parser {
  constructor() {
    this.parsingContext = new RootParsingContext();
    this.line = 1;
    this.column = 0;
    this.result = null;
  }

  done() {
    if (!!this.result) {
      throw new Error('Parser already done!');
    }
    if (!!this.parsingContext.error) {
      this.result = {
        result: null,
        error: `${this.parsingContext.error} (${this.line}:${this.column})\n`,
      };
    } else if (!(this.parsingContext instanceof RootParsingContext)) {
      this.result = {
        result: null,
        error: 'Reached end of input, but not root parsing context!',
      };
    } else {
      this.result = {
        result: this.parsingContext.compiled
          .replace(/ +/g, ' ')
          .trim()
          .replace(/\\\\$/g, ''),
        error: null,
      };
    }
    return this.result;
  }

  parse(section) {
    for (const char of section) {
      let needsParse = true;
      while (needsParse) {
        needsParse = this._nextChar(char);
        if (!!this.result) {
          return false;
        }
      }
    }
    return true;
  }

  _nextChar(char) {
    if (char === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }
    const result = this.parsingContext.accept(char);
    if (!!this.parsingContext.error) {
      this.done();
      return false;
    } else if (!!result && !!result.newContext) {
      this.parsingContext = result.newContext;
    }
    return !!result && !!result.ignored;
  }
}

function parse(text) {
  const parser = new Parser();
  return parser.parse(text) ? parser.done() : parser.result;
}

module.exports = {
  Parser,
  parse,
};
