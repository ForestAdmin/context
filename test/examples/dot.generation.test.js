const { newPlan, execute, makeDotWrite } = require('../../src/index');

describe('generate the dependancies graph', () => {
  it('write a file structure matching a plan', () => {
    const somePlan = newPlan()
      .addStep('root', (rootPlan) => rootPlan
        .addStep('stepA', (plan) => plan
          .addValue('one', 1, { private: true })
          .addNumber('six', 6, { private: true })
          .addStep('stepB', (planS1) => planS1
            .addValue('two', 2)
            .addUsingFunction(
              'plusOne',
              ({ assertPresent, one, two }) => assertPresent({ one, two }) && (() => one + two),
            ), { private: true })))
      .addStep('root2', (p) => p);

    execute([
      somePlan,
      (plan) => plan.addMetadataHook(makeDotWrite(__dirname, 'generated', 'graph.dot')),
    ]);
  });
});
