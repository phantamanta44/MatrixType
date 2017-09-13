#!/usr/bin/env node
const fs = require('fs');
const {Parser} = require('./parsing');

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
  const parser = new Parser();
  input.on('data', (chunk) => parser.parse(chunk.toString()));
  input.on('end', () => {
    const result = parser.result || parser.done();
    if (!!result.error) {
      output.write(result.error + '\n');
      process.exitCode = 1;
    } else {
      output.write(result.result + '\n');
    }
  });
}
