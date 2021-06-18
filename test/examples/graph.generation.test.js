const { newPlan, execute, makeWriteFilesystem } = require('../../src/index');

describe('generate the dependancies graph', () => {
  it('write a file structure matching a plan', () => {
    const somePlan = newPlan()
      .addStep('root', (rootPlan) => rootPlan
        .addStep('stepA', (plan) => plan
          .addValue('one', 1, { private: true })
          .addStep('stepB', (planS1) => planS1
            .addValue('two', 2)
            .addFactoryFunction(
              'plusOne',
              ({ assertPresent, one, two }) => assertPresent({ one, two }) && (() => one + two),
            ), { private: true })));

    execute([
      somePlan,
      (plan) => plan.addMetadataHook(makeWriteFilesystem(__dirname, 'generated')),
    ]);
  });
});
