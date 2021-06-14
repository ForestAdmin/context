const fs = require('fs');
const { sep, relative, join } = require('path');

const Plan = require('../../src/index');
const { execute } = require('../../src/index');

describe('generate the dependancies graph', () => {
  it('write a file structure matching a plan', () => {
    // eslint-disable-next-line no-unused-vars
    class PlanWritter extends Plan {
      // eslint-disable-next-line class-methods-use-this
      metadataHook(entries) {
        entries.forEach(({ path: entryPath, name: entryName, type, requires }) => {
          if (type === 'step') {
            const folder = join(__dirname, 'generated', ...entryPath.split('/'));
            fs.mkdirSync(folder, { recursive: true });
          } else {
            const filename = `${entryName}.js`;
            const filepath = join(__dirname, 'generated', ...entryPath.split('/'), filename);
            const requirePaths = requires
              .map(({ path, name }) => `${join(relative(entryPath, path), name)}`)
              .map((path) => (path.startsWith('.') ? path : `.${sep}${path}`));
            const fileContent = `${requirePaths.map((require) => `require('${require}');`).join('\n')}\n\nmodule.exports = 'hello!';\n`;

            fs.writeFileSync(filepath, fileContent);
          }
        });
      }
    }

    execute(new PlanWritter()
      .addStep('root', (rootPlan) => rootPlan
        .addStep('stepA', (plan) => plan
          .addValue('one', 1, { private: true })
          .addStep('stepB', (planS1) => planS1
            .addValue('two', 2)
            .addFactoryFunction(
              'plusOne',
              ({ assertPresent, one, two }) => assertPresent({ one, two }) && (() => one + two),
            ), { private: true }))));
  });
});
