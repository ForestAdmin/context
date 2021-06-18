const { execute, makeWriteFilesystem } = require('../../../src');
const plan = require('./plan');

const { start } = execute([
  plan,
  (p) => p.addMetadataHook(makeWriteFilesystem(__dirname, 'generated'))]);

start();
