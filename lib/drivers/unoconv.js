'use strict';

const
  Bluebird = require('bluebird'),
  { readFile, writeFile, unlink } = require('fs'),
  { join, extname } = require('path'),
  { exec } = require('child_process');

const
  read = Bluebird.promisify(readFile),
  write = Bluebird.promisify(writeFile),
  del = Bluebird.promisify(unlink),
  execute = Bluebird.promisify(exec);


module.exports = async (yggdrasil, doc, returnBuffer = true, outputPath, doctype = 'docx') => {
  const
    isBuffer = doc instanceof Buffer,
    tempFilePrefix = join('/', 'tmp', yggdrasil.uuid(true)),
    inputFilename = isBuffer ? tempFilePrefix + '.' + doctype : doc,
    outputFilename = isBuffer ? tempFilePrefix + '.pdf' : doc.replace(extname(doc), '.pdf');

  let responseBuffer;

  if (isBuffer) {
    await write(inputFilename, doc);
  }

  await execute('unoconv -f pdf ' + inputFilename);

  if (isBuffer) {
    await del(inputFilename);
  }

  if (returnBuffer || outputPath) {
    responseBuffer = await read(outputFilename);
    await del(outputFilename);
  }

  if (returnBuffer) {
    return Bluebird.resolve(responseBuffer);
  }
  if (outputPath) {
    try {
      await write(outputPath, responseBuffer);
    } catch(e) {
      return Bluebird.reject(e);
    }
    return Bluebird.resolve(outputPath);
  }
  return Bluebird.resolve(outputFilename);
};
