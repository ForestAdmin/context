const { newPlan, execute } = require('../../src/index');

describe('Examples > multiple class instances', () => {
  describe('Using two different steps', () => {
    it('Creates two private instances from one class', () => {
      class SampleClass {
        constructor({ assertPresent, value }) {
          assertPresent({ value });
          this.value = value;
        }
      }
      const valueASymbol = Symbol('a');
      const valueBSymbol = Symbol('b');

      const plan = newPlan()
        .addStep('wrappers', (wplan) => wplan
          .addStep('wrapper a', (context) => context
            .addValue('value', valueASymbol, { private: true })
            .addUsingClass('a', SampleClass))
          .addStep('wrapper b', (context) => context
            .addValue('value', valueBSymbol, { private: true })
            .addUsingClass('b', SampleClass)));

      const { a, b, value } = execute(plan);

      expect(a.value).toBe(valueASymbol);
      expect(b.value).toBe(valueBSymbol);
      expect(value).toBe(undefined);
    });
  });
});
