#!/usr/bin/env node
const fs = require('fs');
const {RootParsingContext} = require('./parsing');

const args = process.argv.slice(2);
let input;
let output;
switch (args.length) {
  case 0:
    input = process.stdin;
    output = process.stdout;
    break;
  case 1:
    input = fs.createReadStream(args[0]);
    output = process.stdout;
    break;
  case 2:
    input = fs.createReadStream(args[0]);
    output = fs.createWriteStream(args[1], 'w');
    break;
  default:
    console.log('Usage: matype [input] [output]');
    process.exitCode = 1;
    break;
}

if (!!input && !!output) {
  let parsingContext = new RootParsingContext();
  let line = 1;
  let column = 0;
  function done() {
    if (!(parsingContext instanceof RootParsingContext)) {
      output.write('Reached end of file, but not root parsing context!!\n');
      process.exitCode = 1;
    } else if (!parsingContext.error) {
      output.write(parsingContext.compiled + '\n');
    } else {
      output.write('Failed to parse!\n');
      if (!!parsingContext.error) {
        output.write(`${parsingContext.error} (${line}:${column})\n`);
      }
      process.exitCode = 1;
    }
  }
  input.on('data', (chunk) => {
    for (const char of chunk.toString()) {
      if (char === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
      let newContext = parsingContext.accept(char);
      if (!!parsingContext.error) {
        done();
      } else if (!!newContext) {
        parsingContext = newContext;
      }
    }
  });
  input.on('end', done);
}
