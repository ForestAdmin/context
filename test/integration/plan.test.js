/* eslint-disable  sonarjs/no-duplicate-string */

const Plan = require('../../src/plan');
const { execute } = require('../../src');

describe('Plan', () => {
  it('constructor', () => {
    const plan = new Plan();
    expect(plan._steps).toStrictEqual([]);
  });
  it('should add a new step', () => {
    const stepKey = Symbol('stepKey');
    const stepPlan = Symbol('stepPlan');
    const plan = new Plan();
    plan.has = jest.fn(() => false);

    plan.addStep(stepKey, stepPlan);

    expect(plan._steps).toStrictEqual([{ key: stepKey, plan: stepPlan }]);
    expect(plan.has).toHaveBeenCalledWith(stepKey);
  });
  it('should not add an existing step', () => {
    const stepKey = 'stepKey';
    const stepPlan = Symbol('stepPlan');
    const plan = new Plan();
    plan.has = jest.fn(() => true);
    expect(() => plan.addStep(stepKey, stepPlan))
      .toThrow(Error, `Already contain "${stepKey}"`);
  });
  describe('step', () => {
    describe('when step key does not exists', () => {
      it('returns falsy', () => {
        const plan = new Plan();
        plan._steps = [
          { key: 'one', plan: 'one value' },
          { key: 'two', plan: 'two value' },
          { key: 'three', plan: 'three value' },
        ];

        expect(plan.step('four')).toBeFalsy();
      });
    });
    describe('when step key exists', () => {
      it('returns the searched step', () => {
        const plan = new Plan();
        plan._steps = [
          { key: 'one', plan: 'one value' },
          { key: 'two', plan: 'two value' },
          { key: 'three', plan: 'three value' },
        ];

        expect(plan.step('two')).toStrictEqual('two value');
      });
    });
    describe('with a nested step', () => {
      it('returns the searched nested step', () => {
        const nestedPlan = new Plan();
        nestedPlan._steps = [
          { key: '1', plan: 'one plan value' },
          { key: 'nested', plan: 'some nested plan value' },
          { key: '3', plan: 'three plan value' },
        ];

        const plan = new Plan();
        plan._steps = [
          { key: 'one', plan: 'one value' },
          { key: 'two', plan: nestedPlan },
          { key: 'three', plan: 'three value' },
        ];

        expect(plan.step('two.nested')).toStrictEqual('some nested plan value');
      });
    });
    describe('with an offset', () => {
      it('returns the searched deep nested step', () => {
        const deepNestedPlan = new Plan();
        deepNestedPlan._steps = [
          { key: '4', plan: 'four plan value' },
          { key: 'nested', plan: 'some nested plan value' },
          { key: '5', plan: 'five plan value' },
        ];

        const nestedPlan = new Plan();
        nestedPlan._steps = [
          { key: '1', plan: 'one plan value' },
          { key: 'deep', plan: deepNestedPlan },
          { key: '3', plan: 'three plan value' },
        ];

        const plan = new Plan();
        plan._steps = [
          { key: 'one', plan: 'one value' },
          { key: 'two', plan: nestedPlan },
          { key: 'three', plan: 'three value' },
        ];

        expect(plan.step('two.deep.nested', -1)).toStrictEqual(deepNestedPlan);
      });
    });
  });

  describe('has', () => {
    describe('when step is found', () => {
      it('should return true', () => {
        const plan = new Plan();
        plan.step = jest.fn(() => true);
        const actualResult = plan.has('keyToFind');

        expect(plan.step).toHaveBeenCalledWith('keyToFind');
        expect(actualResult).toStrictEqual(true);
      });
    });
    describe('when step is not found', () => {
      it('should return false', () => {
        const plan = new Plan();
        plan.step = jest.fn(() => false);
        const actualResult = plan.has('keyToFind');

        expect(plan.step).toHaveBeenCalledWith('keyToFind');
        expect(actualResult).toStrictEqual(false);
      });
    });
  });
  describe('deliverSteps', () => {
    const plan = new Plan();
    const steps = Symbol('value');
    plan._steps = steps;

    const actualSteps = plan.deliverSteps();
    expect(actualSteps).toStrictEqual(steps);
  });

  describe('replace', () => {
    it('can replace an element of a plan', () => {
      const plan = new Plan()
        .addStep('one', (context) => context.addValue('one', 1))
        .addStep('two', (context) => context.addValue('two', 2));

      const modifiedPlan = plan
        .replace('one', (context) => context.addValue('one', 'uno'));

      const { assertPresent: v1, ...context } = execute(plan);
      const { assertPresent: v2, ...modifiedContext } = execute(modifiedPlan);

      expect(context).toStrictEqual({ one: 1, two: 2 });
      expect(modifiedContext).toStrictEqual({ one: 'uno', two: 2 });
    });
  });

  describe('replace using mocks for testing', () => {
    it('can mock elements of a plan', () => {
      // business plan code
      const plan = new Plan()
        .addStep('one', (context) => context.addValue('one', () => 1))
        .addStep('two', (context) => context.addValue('two', () => 2));

      // testing code: replace something
      const oneMock = jest.fn().mockReturnValue('hello');
      const modifiedPlan = plan
        .replace('one', (context) => context.addValue('one', oneMock));

      // executing plan
      const { one, two } = execute(modifiedPlan);

      // using the context
      const oneResult = one();
      const twoResult = two();

      // asserting on the context usage
      expect(oneMock).toHaveBeenCalledWith();
      expect(oneResult).toBe('hello');
      expect(twoResult).toBe(2);
    });

    it('can mock nested elements of a plan', () => {
      const v1 = Symbol('value1');
      const v2 = Symbol('value2');
      const v3 = Symbol('value3');
      const v4 = Symbol('value4');
      const v5 = Symbol('value5');
      const v6 = Symbol('value6');

      const plan = new Plan()
        .addStep('base', new Plan()
          .addStep('one', (context) => context.addValue('one', () => v1))
          .addStep('two', (context) => context.addValue('two', () => v2)))
        .addStep('extension', new Plan()
          .addStep('three', (context) => context.addValue('three', () => v3)));

      const modifiedPlan1 = plan
        .replace('base.one', (context) => context.addValue('one', () => v4));

      const modifiedPlan2 = plan
        .replace('base.one', (context) => context.addValue('one', () => v5));

      const modifiedPlan3 = modifiedPlan2
        .replace('base.two', (context) => context.addValue('two', () => v6));

      const { one, two, three } = execute(plan);
      const {
        one: oneModifiedPlan1, two: twoModifiedPlan1, three: threeModifiedPlan1,
      } = execute(modifiedPlan1);
      const {
        one: oneModifiedPlan2, two: twoModifiedPlan2, three: threeModifiedPlan2,
      } = execute(modifiedPlan2);
      const {
        one: oneModifiedPlan3, two: twoModifiedPlan3, three: threeModifiedPlan3,
      } = execute(modifiedPlan3);

      expect(one()).toBe(v1);
      expect(two()).toBe(v2);
      expect(three()).toBe(v3);

      expect(oneModifiedPlan1()).toBe(v4);
      expect(twoModifiedPlan1()).toBe(v2);
      expect(threeModifiedPlan1()).toBe(v3);

      expect(oneModifiedPlan2()).toBe(v5);
      expect(twoModifiedPlan2()).toBe(v2);
      expect(threeModifiedPlan2()).toBe(v3);

      expect(oneModifiedPlan3()).toBe(v5);
      expect(twoModifiedPlan3()).toBe(v6);
      expect(threeModifiedPlan3()).toBe(v3);
    });
  });
});
