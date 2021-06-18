/* eslint-disable  sonarjs/no-duplicate-string */
/* eslint-disable global-require */
/* eslint-disable max-classes-per-file */
const Context = require('../../src/context');
const { execute, newPlan, init, inject } = require('../../src/index');

describe('Plan', () => {
  const stepNameSymbol = expect.any(Symbol);

  it('constructor', () => {
    const entries = Symbol('entries');

    const plan = newPlan(entries);

    expect(plan._entries).toStrictEqual(entries);
    expect(plan._stepsWalk).toStrictEqual([]);
  });

  describe('execute a plan', () => {
    it('execute a plan instance', () => {
      const plan = newPlan().addValue('one', 1);

      const { one } = execute(plan);

      expect(one).toBe(1);
    });

    it('execute a plan function', () => {
      const planFunction = (plan) => plan.addValue('one', 1);

      const { one } = execute(planFunction);

      expect(one).toBe(1);
    });

    it('execute a plan function array', () => {
      const planA = (plan) => plan.addValue('one', 1);
      const planB = (plan) => plan.addFactoryFunction('doubleOfOne', (({ one: o }) => 2 * o));

      const { one, doubleOfOne } = execute([planA, planB]);

      expect(one).toBe(1);
      expect(doubleOfOne).toBe(2);
    });

    it('execute a mix', () => {
      const planA = (plan) => plan.addValue('one', 1);
      const planB = newPlan().addFactoryFunction('doubleOfOne', (({ one: o }) => 2 * o));

      const { one, doubleOfOne } = execute([planA, planB]);

      expect(one).toBe(1);
      expect(doubleOfOne).toBe(2);
    });

    it('throw an invalidPlan', () => {
      expect(() => execute('BAD_PLAN'))
        .toThrow('Invalid plan: received \'string\' instead of \'Plan\', \'function\' or \'Array\'');
    });

    describe('executing the same plan twice', () => {
      it('produces two times the same context', () => {
        expect.assertions(1);

        const plan = newPlan()
          .addStep('step1', (step1Context) => step1Context
            .addInstance('visible', 'visibleValue'))
          .addStep('step2', (step1Context) => step1Context
            .addInstance('visible2', 'visibleValue2'));

        const { assertPresent: v1, ...context1 } = execute(plan);
        const { assertPresent: v2, ...context2 } = execute(plan);

        expect(context1).toStrictEqual(context2);
      });
    });
  });

  describe('init/inject', () => {
    it('nominal case', () => {
      const planFunction = (plan) => plan.addValue('key', 'value');

      init(planFunction);
      const { key } = inject();

      expect(key).toBe('value');
    });

    it('check that assertPresent is defined with init/inject', () => {
      init((plan) => plan.addValue('key', 'value'));
      const { assertPresent, key } = inject();
      assertPresent({ key });
      expect(key).toBe('value');
    });
  });

  describe('the "addXXX" methods', () => {
    it('add a value', () => {
      expect.assertions(1);

      const plan = (rootPlan) => rootPlan.addValue('key', 'value');

      const { key } = execute(plan);
      expect(key).toBe('value');
    });

    it('add an instance', () => {
      expect.assertions(1);
      const instance = Symbol('instance');

      const plan = (rootPlan) => rootPlan.addInstance('key', instance);

      const { key } = execute(plan);
      expect(key).toBe(instance);
    });

    it('add an function', () => {
      expect.assertions(1);
      const fct = Symbol('fct');

      const plan = (rootPlan) => rootPlan.addFunction('key', fct);

      const { key } = execute(plan);
      expect(key).toBe(fct);
    });

    it('add a class deprecated', () => {
      expect.assertions(1);
      class FakeClass {}

      const { fakeClass } = execute(newPlan().addClass(FakeClass));

      expect(fakeClass instanceof FakeClass).toBe(true);
    });

    it('add a class', () => {
      expect.assertions(1);
      class FakeClass {}

      const { fakeClass } = execute(newPlan().addUsingClass('fakeClass', FakeClass));

      expect(fakeClass instanceof FakeClass).toBe(true);
    });

    it('add a class two times with a context mapping', () => {
      expect.assertions(2);
      class FakeClass {
        constructor({ param }) {
          this.param = param;
        }
      }
      const firstSymbol = Symbol('first');
      const secondSymbol = Symbol('second');
      const { one, two } = execute(newPlan()
        .addValue('first', firstSymbol)
        .addValue('second', secondSymbol)
        .addClass(FakeClass, { name: 'one', map: ({ first }) => ({ param: first }) })
        .addClass(FakeClass, { name: 'two', map: ({ second }) => ({ param: second }) }));

      expect(one.param).toBe(firstSymbol);
      expect(two.param).toBe(secondSymbol);
    });

    it('add a factory function', () => {
      expect.assertions(1);
      const myFactoryFunction = ({ key }) => key + 1;

      const planWithFactoryFunction = (plan) => plan
        .addValue('key', 1)
        .addFactoryFunction('keyPlusOne', myFactoryFunction);

      const { keyPlusOne } = execute(planWithFactoryFunction);
      expect(keyPlusOne).toBe(2);
    });

    describe('add a module', () => {
      it('add a module function', () => {
        expect.assertions(1);
        const planWithAModule = newPlan()
          .addModule('fs', () => require('fs'));

        const { fs } = execute(planWithAModule);

        expect(fs).toBe(require('fs'));
      });

      it('add a module', () => {
        expect.assertions(1);
        const planWithAModule = newPlan()
          .addModule('fs', require('fs'));

        const { fs } = execute(planWithAModule);

        expect(fs).toBe(require('fs'));
      });
    });

    it('add an object keys', () => {
      expect.assertions(1);
      const planUsingObjectKeys = newPlan()
        .addValue('zero', 0)
        .addAllKeysFrom({
          one: 1,
          two: 2,
        })
        .addValue('three', 3);

      const { assertPresent, ...context } = execute(planUsingObjectKeys);

      expect(context).toStrictEqual({
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
      });
    });

    it('add a step', () => {
      expect.assertions(1);
      const subPlan = (firstStepPlan) => firstStepPlan.addValue('key', 'value');
      const planWithAStep = (rootPlan) => rootPlan.addStep('the-first-step', subPlan);

      const { key } = execute(planWithAStep);

      expect(key).toBe('value');
    });

    describe('enhanced addStep', () => {
      it('add a plan function as a step', () => {
        const firstPlan = (plan) => plan.addValue('one', 'value');
        const planUsingFirstPlan = (plan) => plan
          .addStep('first', firstPlan);

        const { one } = execute(planUsingFirstPlan);

        expect(one).toBe('value');
      });

      it('add a plan as a step', () => {
        const firstPlan = newPlan().addValue('one', 'value');
        const planUsingFirstPlan = (plan) => plan
          .addStep('first', firstPlan);

        const { one } = execute(planUsingFirstPlan);

        expect(one).toBe('value');
      });

      it('add a plan function array as a step', () => {
        const fragmentA = (plan) => plan.addValue('one', 'value');
        const fragmentB = (plan) => plan.addValue('two', 'other-value');
        const planArray = [fragmentA, fragmentB];

        const { one, two } = execute((plan) => plan.addStep('first', planArray));

        expect(one).toBe('value');
        expect(two).toBe('other-value');
      });

      it('add a plan array as a step', () => {
        const fragmentA = newPlan().addValue('one', 'value');
        const fragmentB = newPlan().addValue('two', 'other-value');
        const planArray = [fragmentA, fragmentB];

        const { one, two } = execute((plan) => plan.addStep('first', planArray));

        expect(one).toBe('value');
        expect(two).toBe('other-value');
      });

      it('add a plan as a nested plan step', () => {
        const { one } = execute(
          (plan) => plan
            .addStep('zero', newPlan()
              .addStep('first', newPlan()
                .addValue('one', 'value'))),
        );
        expect(one).toBe('value');
      });
    });

    it('runs a callback "with" specific context element', () => {
      const callback = jest.fn();
      const planWithCallback = (plan) => plan
        .addValue('key', 'value')
        .with('key', callback);

      expect(callback).not.toHaveBeenCalled();

      execute(planWithCallback);

      expect(callback).toHaveBeenCalledWith('value');
    });

    it('runs a callback "with" specific context elements', () => {
      const callback = jest.fn();
      const planWithCallback = (plan) => plan
        .addValue('key', 'value')
        .addValue('key2', 'value2')
        .with(['key', 'key2'], callback);

      expect(callback).not.toHaveBeenCalled();

      execute(planWithCallback);

      expect(callback)
        .toHaveBeenCalledWith({
          key: 'value',
          key2: 'value2',
        });
    });
  });

  describe('private scope', () => {
    it('a global private is not exposed to context', () => {
      expect.assertions(1);

      const plan = newPlan()
        .addValue('hidden', 'toto', { private: true });
      const { hidden } = execute(plan);

      expect(hidden).toBe(undefined);
    });

    it('a private value in step is not exposed to context', () => {
      expect.assertions(1);

      const plan = newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true }));
      const { hidden } = execute(plan);

      expect(hidden).toBe(undefined);
    });

    it('private value is accessible from same step', () => {
      expect.assertions(1);

      class HiddenService {
        constructor({ privateValue }) {
          this._privateValue = privateValue;
        }
      }

      const { hiddenService } = execute(newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addValue('privateValue', 'toto', { private: true })
          .addUsingClass('hiddenService', HiddenService)));

      expect(hiddenService._privateValue).toBe('toto');
    });

    it('a value from a private step is not exposed to context ', () => {
      expect.assertions(1);

      const plan = newPlan()
        .addStep('main',
          (planMain) => planMain.addStep(
            'privateStep',
            (privateStep) => privateStep.addValue('invisibleKey', 'invisibleValue'),
            { private: true },
          ));

      const context = new Context();
      const { invisibleKey } = execute(plan, context);

      expect(invisibleKey).toBeUndefined();
    });

    it('private value is not exposed to other steps', () => {
      expect.assertions(7);

      const receiveUndefined = jest.fn();
      const receiveTheValue = jest.fn();

      const plan = newPlan()
        .addStep('root', (rootPlan) => rootPlan
          .addValue('rootPrivate', 'value seen by root and sons', { private: true })
          .addStep('step_0', (step0plan) => step0plan
            .addStep('step_0_1', (step1Plan) => step1Plan
              .addValue('step01Private', 'visible only in step_0_1', { private: true })
              .with('step01Private', receiveTheValue)
              .with('rootPrivate', receiveTheValue))
            .with('step01Private', receiveUndefined))
          .addStep('step_1', (step2Plan) => step2Plan
            .with('step01Private', receiveUndefined)
            .with('rootPrivate', receiveTheValue)));

      const {
        rootPrivate, step01Private,
      } = execute(plan);

      expect(rootPrivate).toBeUndefined();
      expect(step01Private).toBeUndefined();

      expect(receiveTheValue).toHaveBeenNthCalledWith(1, 'visible only in step_0_1');
      expect(receiveTheValue).toHaveBeenNthCalledWith(2, 'value seen by root and sons');
      expect(receiveTheValue).toHaveBeenNthCalledWith(3, 'value seen by root and sons');
      expect(receiveUndefined).toHaveBeenNthCalledWith(1, undefined);
      expect(receiveUndefined).toHaveBeenNthCalledWith(2, undefined);
    });

    it('not private value is accessible from other steps', () => {
      expect.assertions(1);

      const step2hiddenNotAccessibleFunction = jest.fn();

      execute(newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: false }))
        .addStep('step2', (step2Context) => step2Context
          .with('hidden', step2hiddenNotAccessibleFunction)));

      expect(step2hiddenNotAccessibleFunction).toHaveBeenCalledWith('toto');
    });
  });

  describe('replace', () => {
    it('correctly replace a value in a plan', () => {
      const plan = newPlan()
        .addValue('key', 'previous')
        .replace('key', 'now');
      const { key } = execute(plan);

      expect(key).toBe('now');
    });

    it('should throw when entry is not found', () => {
      expect(() => execute((plan) => plan.replace('BAD_NAME')))
        .toThrow('entry not found: \'BAD_NAME\'');
    });

    it('replace a value inside a plan inside a nested plan step', () => {
      const planA = newPlan()
        .addStep('zero', newPlan()
          .addStep('first', newPlan()
            .addValue('one', 'value')));

      const planAChanger = (plan) => plan
        .replace('zero/first/one', 'other-value');

      const { one } = execute([planA, planAChanger]);

      expect(one).toBe('other-value');
    });

    it('correctly replace a step in a plan', () => {
      const plan = newPlan()
        .addStep('first', (context) => context.addValue('one', () => 1))
        .addStep('second', (context) => context.addValue('two', () => 2));

      const oneMock = jest.fn().mockReturnValue('hello');
      const modifiedPlan = plan
        .replace('first', { one: oneMock });

      const { one, two } = execute(modifiedPlan);

      // using the context
      const oneResult = one();
      const twoResult = two();

      // asserting on the context usage
      expect(oneMock).toHaveBeenCalledWith();
      expect(oneResult).toBe('hello');
      expect(twoResult).toBe(2);
    });

    it('replace step and values in chain and nested', () => {
      const v1 = Symbol('value1');
      const v2 = Symbol('value2');
      const v3 = Symbol('value3');
      const v4 = Symbol('value4');
      const v5 = Symbol('value5');
      const v6 = Symbol('value6');

      const plan = newPlan()
        .addStep('base', (planBase) => planBase
          .addStep('one', (planOne) => planOne.addValue('one', () => v1))
          .addStep('two', (planTwo) => planTwo.addValue('two', () => v2)))
        .addStep('extension', (planExtension) => planExtension
          .addStep('three', (planThree) => planThree.addValue('three', () => v3)));

      const modifiedPlan1 = plan
        .replace('base/one/one', () => v4);

      const modifiedPlan2 = plan
        .replace('base/one', { one: () => v5 });

      const modifiedPlan3 = modifiedPlan2
        .replace('base/two', { two: () => v6 });

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

    it('keep initial the plan non-muted', () => {
      const plan = newPlan()
        .addStep('first', (context) => context.addValue('one', 1))
        .addStep('second', (context) => context.addValue('two', 2));

      const modifiedPlan = plan
        .replace('first', { one: 'uno' });

      const { assertPresent: v1, ...context } = execute(plan);
      const { assertPresent: v2, ...modifiedContext } = execute(modifiedPlan);

      expect(context).toStrictEqual({ one: 1, two: 2 });
      expect(modifiedContext).toStrictEqual({ one: 'uno', two: 2 });
    });

    it('replace a value from another function', () => {
      const plans = [
        (plan) => plan.addValue('key', 'value'),
        (plan) => plan.replace('key', 'new-value'),
      ];
      const { key } = execute(plans);
      expect(key).toBe('new-value');
    });

    it('replace a value from another nested function', () => {
      const plans = [
        (plan) => plan
          .addStep('step', (planStep) => planStep
            .addValue('key', 'value')),
        (plan) => plan.replace('step/key', 'new-value'),
      ];
      const { key } = execute(plans);
      expect(key).toBe('new-value');
    });

    it('replace a value from another plan', () => {
      const plans = [
        newPlan().addValue('key', 'value'),
        (plan) => plan.replace('key', 'new-value'),
      ];
      const { key } = execute(plans);
      expect(key).toBe('new-value');
    });
  });

  describe('check plan entries (plan internal data)', () => {
    it('replace a simple value', () => {
      const options = Symbol('options');
      const entries = newPlan()
        .addValue('one', 1, options)
        .replace('one', 2, options)
        ._getEntries();

      const expectedEntries = [
        {
          path: '',
          name: 'one',
          type: 'value',
          options,
          value: 2,
          replaced: {
            path: '', name: 'one', type: 'value', options, value: 1,
          },
        },
      ];

      expect(entries).toStrictEqual(expectedEntries);
    });
    it('add anything to a plan', () => {
      const options = Symbol('options');
      const st1Value = Symbol('st1Value');
      const subSt1Value = Symbol('subSt1Value');
      const addOneFct = ({ assertPresent, one }) => {
        assertPresent({ one });
        return (value) => value + one;
      };
      const fct = () => {};
      const classe = class Classe {};
      const module = Symbol('module');
      const work = ({ one }) => console.log(one);

      const plan = newPlan()
        .addValue('one', 1, options)
        .addInstance('three', 3, options)
        .addFunction('fct', fct, options)
        .addFactoryFunction('addOne', addOneFct, options)
        .addUsingClass('classe', classe, options)
        .addModule('module', module, options)
        .addStep('st1', (planSt1) => planSt1
          .addValue('st1Value', st1Value, options)
          .addStep(
            'subSt1',
            (subPlanSt1) => subPlanSt1
              .addValue('subSt1Value', subSt1Value, options),
            options,
          ), options)
        .addAllKeysFrom({ key1: 1, key2: 2 }, options)
        .with('one', work, options);

      const entries = plan._getEntries();

      const expectedEntries = [
        { path: '', name: 'one', options, type: 'value', value: 1 },
        { path: '', name: 'three', type: 'instance', options, value: 3 },
        { path: '', name: 'fct', type: 'function', options, value: fct },
        { path: '', name: 'addOne', type: 'function*', options, value: addOneFct },
        { path: '', name: 'classe', type: 'class', options, value: classe },
        { path: '', name: 'module', type: 'module', options, value: module },
        { path: 'st1', name: stepNameSymbol, type: 'step-in', value: 'st1', options },
        { path: 'st1', name: 'st1Value', type: 'value', options, value: st1Value },
        { path: 'st1/subSt1', name: stepNameSymbol, type: 'step-in', value: 'subSt1', options },
        { path: 'st1/subSt1', name: 'subSt1Value', type: 'value', options, value: subSt1Value },
        { path: 'st1/subSt1', name: stepNameSymbol, type: 'step-out', value: 'subSt1', options },
        { path: 'st1', name: stepNameSymbol, type: 'step-out', value: 'st1', options },
        { path: '', name: 'key1', type: 'value', options, value: 1 },
        { path: '', name: 'key2', type: 'value', options, value: 2 },
        { path: '', name: stepNameSymbol, type: 'work', options, value: { name: 'one', work } },
      ];

      expect(entries).toStrictEqual(expectedEntries);
    });
    it('replace a nested value', () => {
      const options = Symbol('options');
      const entries = newPlan()
        .addStep(
          'step1',
          (plan) => plan.addValue('one', 1, options),
          options,
        )
        .replace('step1/one', 2, options)
        ._getEntries();

      const expectedEntries = [
        { path: 'step1', name: stepNameSymbol, type: 'step-in', value: 'step1', options },
        {
          path: 'step1',
          name: 'one',
          type: 'value',
          options,
          value: 2,
          replaced: {
            path: 'step1', name: 'one', type: 'value', options, value: 1,
          },
        },
        { path: 'step1', name: stepNameSymbol, type: 'step-out', value: 'step1', options },
      ];

      expect(entries).toStrictEqual(expectedEntries);
    });
    it('replace a deep nested value', () => {
      const options = Symbol('options');
      const entries = newPlan()
        .addStep('root', (rootPlan) => rootPlan
          .addStep('stepA', (plan) => plan
            .addStep('stepB', (planS1) => planS1
              .addValue('one', 1, options))))
        .replace('root/stepA/stepB/one', 2, options)
        ._getEntries();

      const expectedEntries = [
        { path: 'root', name: stepNameSymbol, type: 'step-in', value: 'root' },
        { path: 'root/stepA', name: stepNameSymbol, type: 'step-in', value: 'stepA' },
        { path: 'root/stepA/stepB', name: stepNameSymbol, type: 'step-in', value: 'stepB' },
        {
          path: 'root/stepA/stepB',
          name: 'one',
          type: 'value',
          options,
          value: 2,
          replaced: {
            path: 'root/stepA/stepB', name: 'one', type: 'value', options, value: 1,
          },
        },
        { path: 'root/stepA/stepB', name: stepNameSymbol, type: 'step-out', value: 'stepB' },
        { path: 'root/stepA', name: stepNameSymbol, type: 'step-out', value: 'stepA' },
        { path: 'root', name: stepNameSymbol, type: 'step-out', value: 'root' },
      ];

      expect(entries).toStrictEqual(expectedEntries);
    });
    it('replace a step', () => {
      const options = Symbol('options');
      const entries = newPlan()
        .addStep('root', (rootPlan) => rootPlan
          .addStep('step0', (plan) => plan
            .addStep('step1', (planS1) => planS1
              .addValue('one', 1, options)
              .addValue('two', 2, options))))
        .replace('root', { yes: 'no', white: 'black' }, options)
        ._getEntries();

      const expectedEntries = [
        {
          path: 'root',
          name: 'yes',
          type: 'value',
          options,
          value: 'no',
          replaced: [
            { path: 'root', name: stepNameSymbol, type: 'step-in', value: 'root' },
            { path: 'root/step0', name: stepNameSymbol, type: 'step-in', value: 'step0' },
            { path: 'root/step0/step1', name: stepNameSymbol, type: 'step-in', value: 'step1' },
            { path: 'root/step0/step1', name: 'one', type: 'value', options, value: 1 },
            { path: 'root/step0/step1', name: 'two', type: 'value', options, value: 2 },
            { path: 'root/step0/step1', name: stepNameSymbol, type: 'step-out', value: 'step1' },
            { path: 'root/step0', name: stepNameSymbol, type: 'step-out', value: 'step0' },
            { path: 'root', name: stepNameSymbol, type: 'step-out', value: 'root' },
          ],
        }, {
          path: 'root', name: 'white', type: 'value', options, value: 'black',
        },
      ];

      expect(entries).toStrictEqual(expectedEntries);
    });
    it('keep a valid entries with a nested plan step', () => {
      const entries = newPlan()
        .addStep('zero', newPlan()
          .addStep('first', newPlan()
            .addValue('one', 'value')))
        ._getEntries();

      const expectedEntries = [
        { path: 'zero', name: stepNameSymbol, type: 'step-in', value: 'zero' },
        { path: 'zero/first', name: stepNameSymbol, type: 'step-in', value: 'first' },
        { path: 'zero/first', name: 'one', type: 'value', value: 'value' },
      ];
      expect(entries).toStrictEqual(expectedEntries);
    });
  });
});
