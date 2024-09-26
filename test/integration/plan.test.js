/* eslint-disable  sonarjs/no-duplicate-string */
/* eslint-disable global-require */
/* eslint-disable max-classes-per-file */
const { execute, newPlan, init, inject } = require('../../src/index');

describe('Plan', () => {
  const stepNameSymbol = expect.any(Symbol);

  it('constructor', () => {
    const entries = Symbol('entries');
    const verbose = Symbol('verbose');

    const plan = newPlan(entries, verbose);

    expect(plan._entries).toStrictEqual(entries);
    expect(plan._stepsWalk).toStrictEqual([]);
    expect(plan._verbose).toBe(verbose);
  });

  describe('verbose mode', () => {
    it('saves the addValue stack', () => {
      expect.assertions(1);
      const plan = newPlan(undefined, true)
        .addValue('value', 1);

      expect(plan._getEntries()[0].stack)
        .toMatch(/.*test\/integration\/plan\.test\.js/);
    });
    it('print the *failing* addFunction stack when executing a plan', () => {
      expect.assertions(1);
      const notAFunction = Symbol('not-a function');
      const plan = newPlan(undefined, true)
        .addUsingFunction('my-failing-function', notAFunction);

      try {
        execute(plan);
      } catch (error) {
        expect(error.stack).toMatch(/.*\.addUsingFunction/);
      }
    });
    it('print nothing when verbose deactivated', () => {
      expect.assertions(1);
      const notAFunction = Symbol('not-a function');
      const plan = newPlan()
        .addUsingFunction('my-failing-function', notAFunction);

      try {
        execute(plan);
      } catch (error) {
        expect(error.stack).toMatch(/.*Problem origin - verbose-not-activated/);
      }
    });
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
      const planB = (plan) => plan.addUsingFunction('doubleOfOne', (({ one: o }) => 2 * o));

      const { one, doubleOfOne } = execute([planA, planB]);

      expect(one).toBe(1);
      expect(doubleOfOne).toBe(2);
    });

    it('execute a mix', () => {
      const planA = (plan) => plan.addValue('one', 1);
      const planB = newPlan().addUsingFunction('doubleOfOne', (({ one: o }) => 2 * o));

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
    it('init with an object', () => {
      const context = {
        assertPresent: Symbol('assertPresent'),
        cool: 'and the gang',
        func: () => 'result',
      };
      init(context);

      expect(inject()).toStrictEqual(context);
    });
  });

  describe('assertPresent', () => {
    it('is injected with init/inject', () => {
      expect.assertions(1);
      init((plan) => plan.addValue('key', 'value'));
      const { assertPresent, key } = inject();
      assertPresent({ key });
      expect(key).toBe('value');
    });

    it('is injected with execute', () => {
      expect.assertions(1);
      const { assertPresent, key } = execute((plan) => plan.addValue('key', 'value'));
      assertPresent({ key });
      expect(key).toBe('value');
    });

    it('can be called multiple times on same entry', () => {
      class Mother {
        constructor({ assertPresent, keyMother }) {
          assertPresent({ keyMother });
        }
      }
      class Child extends Mother {
        constructor({ assertPresent, keyChild, ...motherContext }) {
          super({ assertPresent, ...motherContext });
          assertPresent({ keyChild });
        }
      }
      const planWithTwoAssert = (plan) => plan
        .addValue('keyMother', 'mother')
        .addValue('keyChild', 'child')
        .addUsingClass('child', Child);

      const { child } = execute(planWithTwoAssert);
      expect(child).toBeInstanceOf(Child);
    });

    it('throws when an entry is missing', () => {
      expect.assertions(1);

      execute((plan) => plan
        .addPackage('package', (subPlan) => subPlan
          .addUsingFunction('one', ({ assertPresent, badValue }) => {
            expect(() => assertPresent({ badValue })).toThrow('Asserting dependencies on path "package/one": Missing dependencies: "badValue"');

            return 1;
          })));
    });
  });

  describe('the "addXXX" methods', () => {
    describe('addAlias', () => {
      it('adds an alias', () => {
        expect.assertions(2);
        const value = Symbol('value');
        const plan = (rootPlan) => rootPlan
          .addValue('key', value)
          .addAlias('alias', 'key');

        const { key, alias } = execute(plan);
        expect(key).toBe(value);
        expect(alias).toBe(value);
      });

      it('add a public alias from private key', () => {
        expect.assertions(2);
        const value = Symbol('value');
        const plan = (rootPlan) => rootPlan
          .addValue('key', value, { private: true })
          .addAlias('alias', 'key', { private: false });

        const { key, alias } = execute(plan);
        expect(key).toBeUndefined();
        expect(alias).toBe(value);
      });

      it('add a private alias from public key', () => {
        expect.assertions(2);
        const value = Symbol('value');
        const plan = (rootPlan) => rootPlan
          .addValue('key', value)
          .addAlias('alias', 'key', { private: true });

        const { key, alias } = execute(plan);
        expect(key).toBe(value);
        expect(alias).toBeUndefined();
      });
    });

    describe('addNumber method', () => {
      it('adds a number', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', 3);
        const { key } = execute(plan);
        expect(key).toBe(3);
      });
      it('adds a NaN without default', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', NaN);
        expect(() => execute(plan)).toThrow('Adding number on path "/key": Specified value is not a number: "NaN"');
      });
      it('adds a NaN with a default', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', NaN, { default: 42 });
        const { key } = execute(plan);
        expect(key).toBe(42);
      });
      it('adds a number lazily', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => 3);
        const { key } = execute(plan);
        expect(key).toBe(3);
      });
      it('add null throws', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => null);
        expect(() => execute(plan)).toThrow();
      });
      it('add {} throws', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => ({}));
        expect(() => execute(plan)).toThrow('Adding number on path "/key": Specified value is not a number: "[object Object]"');
      });
      it('add \'string\' throws', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => ('string'));
        expect(() => execute(plan)).toThrow('Adding number on path "/key": Specified value is not a number: "string"');
      });
      it('add a number lower than min throws', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => -1, { min: 0 });
        expect(() => execute(plan)).toThrow();
      });
      it('add a number upper than max throws', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => 11, { max: 10 });
        expect(() => execute(plan)).toThrow();
      });
      it('add null using default value', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => null, { min: 0, default: 5, max: 10 });
        expect(() => execute(plan)).toThrow();
      });
      it('add undefined using default value', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => undefined, { min: 0, default: 5, max: 10 });
        const { key } = execute(plan);
        expect(key).toBe(5);
      });
      it('default value is under max value', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => null, { min: 0, default: -5, max: 10 });
        expect(() => execute(plan)).toThrow();
      });
      it('default value is upper min value', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => null, { min: 0, default: 15, max: 10 });
        expect(() => execute(plan)).toThrow();
      });
      it('add lazy null using default null', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => null, { min: 0, max: 10, nullable: true });
        const { key } = execute(plan);
        expect(key).toBe(null);
      });
      it('add null using default null', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', null, { min: 0, max: 10, nullable: true });
        const { key } = execute(plan);
        expect(key).toBe(null);
      });
      it('add lazy undefined using default null', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', () => undefined, { min: 0, default: null, max: 10, nullable: true });
        const { key } = execute(plan);
        expect(key).toBe(null);
      });
      it('add undefined using default null', () => {
        expect.assertions(1);
        const plan = (rootPlan) => rootPlan.addNumber('key', undefined, { min: 0, default: null, max: 10, nullable: true });
        const { key } = execute(plan);
        expect(key).toBe(null);
      });
    });

    describe('addValue', () => {
      it('add a value', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addValue('key', 'value');

        const { key } = execute(plan);
        expect(key).toBe('value');
      });

      it('adding twice a value', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan
          .addPackage('packageOne', (planOne) => planOne
            .addValue('key', 'value'))
          .addPackage('packageTwo', (planTwo) => planTwo
            .addValue('key', 'conflictValue'));

        expect(() => execute(plan)).toThrow('Adding value on path "packageTwo/key": Key already exists on another path: "packageOne/key"');
      });

      it('add a value lazily', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addValue('key', () => 'value');

        const { key } = execute(plan);
        expect(key).toBe('value');
      });

      it('throws an error if the value is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addValue('key', undefined);

        expect(() => execute(plan)).toThrow('Value is undefined: key');
      });

      it('throws an error if the value is undefined when added lazily', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addValue('key', () => undefined);

        expect(() => execute(plan)).toThrow('Specified value is undefined: /key');
      });
    });

    describe('addRawValue', () => {
      it('add a raw value', () => {
        expect.assertions(1);

        const value = Symbol('value');
        const plan = (rootPlan) => rootPlan._addRawValue('key', () => value);

        const { key } = execute(plan);
        expect(key()).toBe(value);
      });

      it('should throw when the value is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan._addRawValue('key', undefined);

        expect(() => execute(plan)).toThrow('Raw value is undefined: key');
      });
    });

    describe('addInstance', () => {
      it('add an instance', () => {
        expect.assertions(1);
        const instance = Symbol('instance');

        const plan = (rootPlan) => rootPlan.addInstance('key', instance);

        const { key } = execute(plan);
        expect(key).toBe(instance);
      });

      it('add an instance lazily', () => {
        expect.assertions(1);
        const instance = Symbol('instance');

        const plan = (rootPlan) => rootPlan.addInstance('key', () => instance);

        const { key } = execute(plan);
        expect(key).toBe(instance);
      });

      it('should throw when the instance is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addInstance('key', undefined);

        expect(() => execute(plan)).toThrow('Specified instance is undefined: key');
      });
    });

    describe('addFunction', () => {
      it('add an function', () => {
        expect.assertions(1);
        const fct = Symbol('fct');

        const plan = (rootPlan) => rootPlan.addFunction('key', fct);

        const { key } = execute(plan);
        expect(key).toBe(fct);
      });

      it('should throw when the function is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addFunction('key', undefined);

        expect(() => execute(plan)).toThrow('Specified function is undefined: key');
      });
    });

    describe('addClass (deprecated)', () => {
      it('add a class deprecated', () => {
        expect.assertions(1);
        class FakeClass {}

        const { fakeClass } = execute(newPlan().addClass(FakeClass));

        expect(fakeClass instanceof FakeClass).toBe(true);
      });

      it('should throw when the class is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addClass(undefined);

        expect(() => execute(plan)).toThrow('Specified class is undefined');
      });
    });

    describe('addUsingClass', () => {
      it('add a class', () => {
        expect.assertions(1);
        class FakeClass {}

        const { fakeClass } = execute(newPlan().addUsingClass('fakeClass', FakeClass));

        expect(fakeClass instanceof FakeClass).toBe(true);
      });

      it('passing anything but a function factory or a class to addUsingClass', () => {
        expect(() => execute(newPlan().addUsingClass('fakeClass', 'bad-value')))
          .toThrow('Instanciating class on path "/fakeClass" - FunctionFactory is not a function');
      });

      it('passing a function factory that returns anything but a class to addUsingClass', () => {
        expect(() => execute(newPlan().addUsingClass('fakeClass', () => 'bad-value')))
          .toThrow('Instanciating class on path "/fakeClass" - ClassToInstanciate is not a constructor');
      });

      it('add lazily a class', () => {
        expect.assertions(1);
        class FakeClass {}

        const { fakeClass } = execute(newPlan().addUsingClass('fakeClass', () => FakeClass));

        expect(fakeClass instanceof FakeClass).toBe(true);
      });

      it('should throw when the class is undefined', () => {
        expect.assertions(1);

        const plan = (rootPlan) => rootPlan.addUsingClass('key', undefined);

        expect(() => execute(plan)).toThrow('Specified class is undefined: key');
      });
    });

    it('uses map', () => {
      class FakeClass {
        constructor({ assertPresent, param }) {
          assertPresent({ param });
          this.param = param;
        }
      }
      const { one, two } = execute(newPlan()
        .addValue('paramOne', 1)
        .addValue('paramTwo', 2)
        .addUsingClass('one', FakeClass, { map: { param: 'paramOne' } })
        .addUsingClass('two', FakeClass, { map: { param: 'paramTwo' } }));

      expect(one.param).toBe(1);
      expect(two.param).toBe(2);
    });

    describe('addUsingFunction', () => {
      it('add a factory function', () => {
        expect.assertions(1);
        const myFactoryFunction = ({ key }) => key + 1;

        const planWithFactoryFunction = (plan) => plan
          .addValue('key', 1)
          .addUsingFunction('keyPlusOne', myFactoryFunction);

        const { keyPlusOne } = execute(planWithFactoryFunction);
        expect(keyPlusOne).toBe(2);
      });

      it('add a null factory function', () => {
        expect(() => execute((plan) => plan.addUsingFunction('key', null)))
          .toThrow('Using factory function on path "/key": factoryFunction is not a function');
      });

      it('add anything but a function as a factory function', () => {
        expect(() => execute((plan) => plan.addUsingFunction('key', 'bad-value')))
          .toThrow('Using factory function on path "/key": factoryFunction is not a function');
      });

      it('should throw when the factory function returns undefined', () => {
        const plan = (rootPlan) => rootPlan.addUsingFunction('key', () => undefined);

        expect(() => execute(plan)).toThrow('Using factory function on path "/key": Factory function returned undefined');
      });
    });

    describe('addUsingFunctionStack', () => {
      it('add a factory function stack', () => {
        expect.assertions(1);
        const myFactoryFunction = ({ key }) => key + 1;

        const planWithFactoryFunction = (plan) => plan
          .addValue('key', 1)
          .addUsingFunctionStack('keyPlusOne', [myFactoryFunction, ({ keyPlusOne }) => keyPlusOne * 2]);

        const { keyPlusOne } = execute(planWithFactoryFunction);
        expect(keyPlusOne).toBe(4);
      });

      it('add a private factory function stack', () => {
        expect.assertions(1);
        const myFactoryFunction = ({ key }) => key + 1;

        const planWithFactoryFunction = (plan) => plan
          .addValue('key', 1)
          .addUsingFunctionStack(
            'keyPlusOne',
            [myFactoryFunction, ({ keyPlusOne }) => keyPlusOne * 2],
            { private: true },
          );

        const { keyPlusOne } = execute(planWithFactoryFunction);
        expect(keyPlusOne).toBeUndefined();
      });

      it('should throw if one of the functions is undefined', () => {
        const plan = (rootPlan) => rootPlan.addUsingFunctionStack('key', [() => 1, undefined]);

        expect(() => execute(plan)).toThrow('Using factory function stack on path "/key": factoryFunction is not a function');
      });

      it('should throw when the factory function returns undefined', () => {
        const plan = (rootPlan) => rootPlan.addUsingFunctionStack('key', [() =>
          undefined]);

        expect(() => execute(plan)).toThrow('Using factory function stack on path "/key": Factory function returned undefined');
      });
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

    it('add an object keys containing a function', () => {
      expect.assertions(1);
      const value = Symbol('value');

      const { getValue } = execute(newPlan()
        .addAllKeysFrom({ getValue: () => value }));

      expect(getValue()).toBe(value);
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

    it('runs a callback "with" missing context elements', () => {
      const callback = jest.fn();
      const planWithCallback = (plan) => plan
        .addValue('key', 'value')
        .addValue('key2', 'value2')
        .with('not-existing-key', callback);

      expect(() => execute(planWithCallback)).toThrow('Using with on path "/not-existing-key": Key does not exists: not-existing-key');

      expect(callback).not.toHaveBeenCalled();
    });

    it('with receiving an array with missing key', () => {
      const callback = jest.fn();
      const planWithCallback = (plan) => plan
        .addValue('key', 'value')
        .addValue('key2', 'value2')
        .with(['not-existing-key', 'key2'], callback);

      expect(() => execute(planWithCallback)).toThrow('Using with on path "/not-existing-key,key2": Key does not exists: not-existing-key');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('{ private: true }', () => {
    it('key is exposed to package1', () => {
      expect(() => execute(newPlan()
        .addValue('key', 'value')
        .addPackage('p1', p1 => p1.with('key', jest.fn()))))
        .not.toThrow();
    });

    it('private-key is not exposed outside', () => {
      expect(execute(newPlan()
        .addValue('key', 'value', {private: true})).key).toBeUndefined();
    });

    it('private-key is exposed to package1', () => {
      expect(() => execute(newPlan()
        .addValue('key', 'value', {private: true})
        .addPackage('p1', p1 => p1.with('key', jest.fn()))))
        .not.toThrow();
    });

    it('private-package1/value is exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', p1 => p1
          .addValue('key', 'value'), {private: true})).key)
        .toBe('value');
    });

    it('private-package1/value is exposed to root', () => {
      expect(() => execute(newPlan()
        .addPackage('p1', (p1) => p1.addValue('key', 'value'), {private: true})
        .with('key', jest.fn())))
        .not.toThrow();
    });

    it('private-package1/value is exposed to package2', () => {
      expect(() => execute(newPlan()
        .addPackage('p1', (p1) => p1
          .addValue('key', 'value'), {private: true})
        .addPackage('p2', (p2) => p2
          .with('key', jest.fn()))))
        .not.toThrow();
    });

    it('package1/private-key is not exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', p1 => p1.addValue('key', 'value', {private: true}))).key)
        .toBeUndefined();
    });

    it('package1/private-key is exposed to package1', () => {
      expect(() => execute(newPlan()
        .addPackage('p1', p1 => p1
          .addValue('key', 'value', {private: true})
          .with('key', jest.fn()))))
        .not.toThrow();
    });

    it('package1/private-package2/key is not exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', p1 => p1
          .addPackage('p2', p2 => p2
            .addValue('key', 'value'), {private: true}))).key)
        .toBeUndefined();
    });

    it('package1/private-package2/key is exposed to package1', () => {
      expect(() => expect(execute(newPlan()
        .addPackage('p1', p1 => p1
          .addPackage('p2', p2 => p2
            .addValue('key', 'value'), {private: true})
          .with('key', jest.fn())))))
        .not.toThrow();
    });

    it('package1/private-package2/key is not exposed to package1/private-package3', () => {
      expect(() => expect(execute(newPlan()
        .addPackage('p1', p1 => p1
          .addPackage('p2', p2 => p2
            .addValue('key', 'value'), {private: true})
          .addPackage('p3', p3 => p3
            .with('key', jest.fn()), {private: true})))))
        .not.toThrow();
    });

    it('package1/private-package2/key is exposed to package2', () => {
      expect(() => expect(execute(newPlan()
        .addPackage('p1', p1 => p1
          .addPackage('private-p2', p2 => p2
            .addValue('key', 'value')
            .with('key', jest.fn()), {private: true})))))
        .not.toThrow();
    });

    it('package1/private-value is not exposed to package2', () => {
      expect(() => execute(newPlan()
        .addPackage('p1', (p1) => p1
          .addValue('key', 'value', {private: true}))
        .addPackage('p2', (step2Context) => step2Context
          .with('key', jest.fn()))))
        .toThrow('Using with on path "p2/key": Key does not exists: key');
    });

    it('p1/p2/private-p3/p4/key is not exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', (p1) => p1
          .addPackage('p2', p2 => p2
            .addPackage('p3', p3 => p3
              .addPackage('p4', p4 => p4
                .addValue('key', 'value')), { private: true })))).key).toBeUndefined();
    });

    it('private-p1/p2/p3/p4/key is exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', (p1) => p1
          .addPackage('p2', p2 => p2
            .addPackage('p3', p3 => p3
              .addPackage('p4', p4 => p4
                .addValue('key', 'value')))), { private: true })).key).toBe('value');
    });

    it('p1/p2/p3/p4/private-key is not exposed to outside', () => {
      expect(execute(newPlan()
        .addPackage('p1', (p1) => p1
          .addPackage('p2', p2 => p2
            .addPackage('p3', p3 => p3
              .addPackage('p4', p4 => p4
                .addValue('key', 'value', { private: true })))))).key).toBeUndefined();
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
        .toThrow('Invalid replace operation: relativePath not found \'BAD_NAME\'');
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
        .addStep('first', (context) => context.addFunction('one', () => 1))
        .addStep('second', (context) => context.addFunction('two', () => 2));

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
          .addStep('one', (planOne) => planOne.addFunction('one', () => v1))
          .addStep('two', (planTwo) => planTwo.addFunction('two', () => v2)))
        .addStep('extension', (planExtension) => planExtension
          .addStep('three', (planThree) => planThree.addFunction('three', () => v3)));

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
          type: 'replacement',
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
        .addUsingFunction('addOne', addOneFct, options)
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
        { path: '', name: 'key1', type: 'rawValue', options, value: 1 },
        { path: '', name: 'key2', type: 'rawValue', options, value: 2 },
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
          type: 'replacement',
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
          type: 'replacement',
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
          type: 'replacement',
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
          path: 'root', name: 'white', type: 'replacement', options, value: 'black',
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

  describe('conditional package (options.if)', () => {
    describe('when parameter is a boolean', () => {
      describe('when true', () => {
        it('should include the package to the context', () => {
          const packageValue = Symbol('packageValue');
          const { value, foo } = execute((plan) => plan.addPackage(
            'package',
            (packagePlan) => packagePlan.addValue('value', packageValue),
            { if: true },
          ).addValue('foo', 'bar'));

          expect(value).toStrictEqual(packageValue);
          expect(foo).toStrictEqual('bar');
        });
      });

      describe('when false', () => {
        it('should not include the package to the context', () => {
          const packageValue = Symbol('packageValue');
          const { value, foo } = execute((plan) => plan.addPackage(
            'package',
            (packagePlan) => packagePlan.addValue('value', packageValue),
            { if: false },
          ).addValue('foo', 'bar'));

          expect(value).toBeUndefined();
          expect(foo).toStrictEqual('bar');
        });
      });
    });

    describe('when parameter is a string', () => {
      describe('when it does not match a key in the context', () => {
        it('throws', () => {
          const throwingPlan = (plan) => plan.addPackage(
            'package',
            (packagePlan) => packagePlan.addValue('value', Symbol('packageValue')),
            { if: 'key' },
          );

          expect(() => execute(throwingPlan)).toThrow('Adding package on path \'package\': Invalid option \'if\': Key \'key\' does not exist in the context');
        });
      });

      describe('when it match a key in the context', () => {
        describe('when the value is truthy', () => {
          it('should include the package to the context', () => {
            const packageValue = Symbol('packageValue');
            const conditionalPlan = (plan) => plan
              .addValue('condition', 'truthyValue')
              .addPackage(
                'package',
                (packagePlan) => packagePlan.addValue('value', packageValue),
                { if: 'condition' },
              );

            expect(execute(conditionalPlan).value).toStrictEqual(packageValue);
          });
        });

        describe('when the value is falsy', () => {
          it('should not include the package to the context', () => {
            const packageValue = Symbol('packageValue');
            const conditionalPlan = (plan) => plan
              .addValue('falsyValue', '')
              .addPackage(
                'package',
                (packagePlan) => packagePlan
                  .addValue('value', packageValue)
                  .addPackage('nestedPackage', (nestedPackagePlan) => nestedPackagePlan.addValue('nestedValue', 'nestedValue')),
                { if: 'falsyValue' },
              ).addValue('foo', 'bar');

            const { value, nestedValue, foo } = execute(conditionalPlan);

            expect(value).toBeUndefined();
            expect(nestedValue).toBeUndefined();
            expect(foo).toStrictEqual('bar');
          });
        });
      });
    });
  });
});
