/* eslint-disable global-require, max-classes-per-file */
const Context = require('../../src/index');
const Plan = require('../../src/plan');

describe('Context > unit', () => {
  describe('constructor', () => {
    it('build a context with just an empty _bag', () => {
      expect.assertions(2);
      const context = new Context();
      expect(context._bag).toStrictEqual({});
      expect(context._privates).toStrictEqual([]);
    });
  });
  describe('get', () => {
    it('returns the context bag', () => {
      expect.assertions(1);
      const context = new Context();
      expect(context.get()).toStrictEqual(context._bag);
    });
  });
  describe('lookup', () => {
    it('returns a value from the context bag', () => {
      expect.assertions(2);
      const context = new Context();
      context.get = jest.fn().mockReturnValue({ key: 'value' });

      const actual = context.lookup('key');

      expect(context.get).toHaveBeenCalledWith();
      expect(actual).toBe('value');
    });
  });
  describe('replace', () => {
    it('should replace a value with another', () => {
      expect.assertions(2);
      const name = Symbol('name');
      const value = Symbol('value');
      const contextSymbol = Symbol('context');

      const context = new Context();
      context._setValue = jest.fn().mockReturnValue(contextSymbol);

      const actual = context.replace(name, value);

      expect(context._setValue).toHaveBeenCalledWith(name, value);
      expect(actual).toBe(contextSymbol);
    });
  });
  describe('executePlan', () => {
    it('should execute a plan on the current context', () => {
      const bak = Context.execute;
      try {
        expect.assertions(2);
        const bagSymbol = Symbol('bag');
        Context.execute = jest.fn().mockReturnValue(bagSymbol);

        const plan = Symbol('bag');
        const context = new Context();

        const actual = context.executePlan(plan);

        expect(Context.execute).toHaveBeenCalledWith(plan, context);
        expect(actual).toBe(bagSymbol);
      } finally {
        Context.execute = bak;
      }
    });
  });
  describe('addValue', () => {
    describe('with a not-existing value', () => {
      it('throw existing instance Error', () => {
        expect.assertions(1);
        const context = new Context();
        const value = Symbol('value');
        context._bag.key = value;

        expect(() => context.addValue('key', value))
          .toThrow('existing instance { key: \'key\'} in context');
      });
    });
    describe('with an existing value', () => {
      it('add a value to and return the context', () => {
        expect.assertions(2);
        const context = new Context();
        const value = Symbol('value');

        const actualResult = context.addValue('key', value);

        expect(context._bag.key).toBe(value);
        expect(actualResult).toEqual(context);
      });
    });
  });
  describe('addInstance', () => {
    it('add a instance to the context', () => {
      expect.assertions(2);
      const context = new Context();
      context.addValue = jest.fn(() => context);
      const actualResult = context.addInstance('key', 'value');

      expect(context.addValue).toHaveBeenCalledWith('key', 'value', undefined);
      expect(actualResult).toEqual(context);
    });
  });
  describe('addFunction', () => {
    it('add a function to the context', () => {
      expect.assertions(2);
      const context = new Context();
      context.addValue = jest.fn(() => context);
      const actualResult = context.addFunction('key', 'value');

      expect(context.addValue).toHaveBeenCalledWith('key', 'value', undefined);
      expect(actualResult).toEqual(context);
    });
  });
  describe('addFactoryMethod', () => {
    it('add a function from a factory method to the context', () => {
      expect.assertions(4);

      const contextBag = Symbol('contextBag');
      const fct = Symbol('fct');
      const name = Symbol('name');
      const factory = jest.fn().mockReturnValue(fct);
      const options = Symbol('options');

      const context = new Context();
      context.get = jest.fn().mockReturnValue(contextBag);
      context.addFunction = jest.fn().mockReturnValue(context);

      const actualResult = context.addFactoryMethod(name, factory, options);

      expect(context.get).toHaveBeenCalledWith();
      expect(factory).toHaveBeenCalledWith(contextBag);
      expect(context.addFunction).toHaveBeenCalledWith(name, fct, options);
      expect(actualResult).toBe(context);
    });
  });
  describe('addClassesArray', () => {
    it('add an array with classes instances', () => {
      const name = 'myArrayInContext';
      class TestedClass1 {}
      class TestedClass2 {}
      const testClass1 = Symbol('testClass1');
      const testClass2 = Symbol('testClass2');
      const classesArray = [TestedClass1, TestedClass2];
      const instancesArray = [testClass1, testClass2];
      const options = Symbol('options');

      const context = new Context();
      context._instanciate = jest.fn()
        .mockReturnValueOnce(testClass1)
        .mockReturnValueOnce(testClass2);
      context.addValue = jest.fn().mockReturnValue(context);

      const actualResult = context.addClassesArray(name, classesArray, options);

      expect(context._instanciate).toHaveBeenCalledTimes(2);
      expect(context._instanciate).toHaveBeenCalledWith(TestedClass1);
      expect(context._instanciate).toHaveBeenCalledWith(TestedClass2);
      expect(context.addValue).toHaveBeenCalledWith(name, instancesArray, options);
      expect(actualResult).toBe(context);
    });
  });
  describe('addClass', () => {
    it('add a class instance to the context and return the context', () => {
      expect.assertions(5);

      const dependanciesSymbol = Symbol('dependanciesSymbol');

      class TestedClass {
        constructor(dependancies) {
          expect(dependancies).toStrictEqual(dependanciesSymbol);
        }
      }

      const context = new Context();
      context.addValue = jest.fn(() => context);
      // TODO mock _instanciate and test it separately
      // TODO test _mapContext and mock where used
      context.get = jest.fn(() => dependanciesSymbol);

      const options = Symbol('options');
      const actualResult = context.addClass(TestedClass, options);

      expect(context.get).toHaveBeenCalledWith();
      expect(context.addValue)
        .toHaveBeenCalledWith('testedClass', new TestedClass(dependanciesSymbol), options);
      expect(actualResult).toStrictEqual(context);
    });

    it('add a class instance to the context with a specific name', () => {
      expect.assertions(1);

      const context = new Context();
      context.addValue = jest.fn();
      context._instanciate = jest.fn();

      context.addClass(class TestedClass {}, { name: 'specificName' });

      expect(context.addValue).toHaveBeenCalledWith('specificName', undefined, { name: 'specificName' });
    });

    // TODO _instanciate nominal case

    it('_instanciate with a mapper', () => {
      expect.assertions(1);

      const TestedClass = jest.fn();
      const value = Symbol('value');
      const unchangedValue = Symbol('unchangedValue');

      const context = new Context();
      context
        .addValue('from', value)
        .addValue('unchanged', unchangedValue)
        ._instanciate(
          TestedClass, { name: 'specificName', map: ({ from }) => ({ to: from }) },
        );

      expect(TestedClass).toHaveBeenCalledWith({
        from: value, to: value, unchanged: unchangedValue,
      });
    });
  });
  describe('with', () => {
    describe('some valid work', () => {
      it('run the work with valid dependancy in parameter', () => {
        expect.assertions(2);

        const context = new Context();
        const contextBag = { key: 'value' };
        context.get = jest.fn(() => contextBag);
        const work = (actualValue) => {
          expect(actualValue).toStrictEqual('value');
        };

        const actualResult = context.with('key', work);

        expect(actualResult).toStrictEqual(context);
      });
    });
    it('run a callback via with', () => {
      expect.assertions(1);
      const TestClass = class TestClass {
        constructor() {
          this.calledMethod = jest.fn();
        }

        testMethod() {
          this.calledMethod();
        }
      };

      const { testClass } = new Context()
        .addClass(TestClass)
        .with('testClass', (foo) => foo.testMethod())
        ._bag;

      expect(testClass.calledMethod).toHaveBeenCalledWith();
    });
  });
  describe('newPlan', () => {
    it('create a plan', () => {
      expect(Context.newPlan() instanceof Plan).toBe(true);
    });
  });
  describe('executePlan', () => {
    describe('with a invalid build context', () => {
      it('with a string should throw error', () => {
        expect(() => Context.execute('bad-context'))
          .toThrow('Invalid plan: received \'string\' instead of \'Plan\', \'function\' or \'Array\'');
      });
      it('with null should throw error', () => {
        expect(() => Context.execute(null))
          .toThrow('missing plan');
      });
    });
    describe('with a function build context', () => {
      it('build the function build context', () => {
        const factoryFunction = (context) => context
          .addValue('key', 'value');
        const { key } = Context.execute(factoryFunction);
        expect(key).toEqual('value');
      });
    });
    describe('with an array build context', () => {
      it('build the array build context', () => {
        const factoryFunctionArray = [
          (context) => context.addValue('key', 'value'),
          (context) => context.addValue('key2', 'value2'),
        ];

        const { key, key2 } = Context.execute(factoryFunctionArray);
        expect(key).toEqual('value');
        expect(key2).toEqual('value2');
      });
    });
    describe('with a plan', () => {
      it('build the plan', () => {
        const factoryFunction = (context) => context.addValue('key', 'value');
        const plan = Context.newPlan()
          .addStep('step1', factoryFunction);
        const { key } = Context.execute(plan);
        expect(key).toEqual('value');
      });
    });
    describe('execute', () => {
      it('creates a context given a plan', () => {
        expect.assertions(1);

        const { hello } =
          Context.execute(
            Context.newPlan()
              .addStep('so', Context.newPlan()
                .addStep('deep', Context.newPlan()
                  .addStep('nested', (context) => context.addValue('hello', 'world')))),
          );

        expect(hello).toStrictEqual('world');
      });
      it('executeBuildContext with a plan', () => {
        expect.assertions(1);

        const myFirstBuildContext = Context.newPlan()
          .addStep('values', (context) => context.addValue('one', 1))
          .addStep('utils', (context) => context.addFunction('doubleOne', () => 2 * context.get().one));

        const { doubleOne } = Context.execute(myFirstBuildContext);

        expect(doubleOne()).toBe(2);
      });

      it('executeBuildContext can changes a plan step', () => {
        expect.assertions(1);

        const myFirstBuildContext = Context.newPlan()
          .addStep('values', (context) => context.addValue('one', 1))
          .addStep('utils', (context) => context.addFunction('doubleOne', () => 2 * context.get().one))
          .replace('values', (context) => context.addValue('one', 1));

        const { doubleOne } = Context.execute(myFirstBuildContext);

        expect(doubleOne()).toBe(2);
      });

      it('executeBuildContext with a nested plan', () => {
        expect.assertions(1);

        const myFirstBuildContext = Context.newPlan()
          .addStep('values', Context.newPlan()
            .addStep('small', (context) => context.addValue('one', 1))
            .addStep('big', (context) => context.addValue('mille', 1000)))
          .addStep('utils', (context) => context.addFunction('doubleOne', () => 2 * context.get().one));

        const { doubleOne } = Context.execute(myFirstBuildContext);

        expect(doubleOne()).toBe(2);
      });
    });
  });
  describe('init', () => {
    describe('throws', () => {
      it('throws when init receive nothing', () => {
        expect.assertions(1);
        expect(() => Context.init()).toThrow('missing plan');
      });
      it('throws when init receives a number', () => {
        expect.assertions(1);
        expect(() => Context.init(45)).toThrow('Invalid plan: received \'number\' instead of \'Plan\', \'function\' or \'Array\'');
      });
    });
    it('can creates a singleton context', async () => {
      expect.assertions(3);

      class FakeService {
        constructor({ dependency }) {
          this.dependency = dependency;
        }
      }

      Context.init((context) => context
        .addValue('dependency', 'dependencyValue')
        .addClass(FakeService));

      const { dependency, fakeService } = Context.instance._bag;

      expect(dependency).toStrictEqual('dependencyValue');

      expect(fakeService).toBeInstanceOf(FakeService);
      expect(fakeService.dependency).toStrictEqual('dependencyValue');
    });

    it('with an array of buildFunction', () => {
      expect.assertions(1);

      Context.init([
        (context) => context.addValue('one', 1),
        (context) => context.addFunction('doubleOne', () => 2 * context.get().one),
      ]);

      const { doubleOne } = Context.instance._bag;

      expect(doubleOne()).toBe(2);
    });

    it('with a buildFunction', () => {
      expect.assertions(1);

      Context.init((context) => context.addValue('one', 1));

      const { one } = Context.instance._bag;

      expect(one).toBe(1);
    });
  });
  describe('inject', () => {
    it('inject', () => {
      expect.assertions(1);

      const response = Symbol('get');
      Context.instance = { get: () => response };
      expect(Context.inject()).toBe(response);
    });
  });
  describe('private option', () => {
    it('context constructor defines "_privates" array', () => {
      expect.assertions(1);
      expect(new Context()._privates).toStrictEqual([]);
    });
    it('addValue with private option add name to _privates array', () => {
      expect.assertions(1);
      const context = new Context().addValue('key', 'value', { private: true });
      expect(context._privates).toStrictEqual(['key']);
    });

    it('flushPrivates empty _privates and delete members from _bag', () => {
      expect.assertions(2);
      const context = new Context();
      context._bag = { joe: 'jim', jim: 'joe' };
      context._privates = ['joe'];
      context.flushPrivates();

      expect(context._bag).toStrictEqual({ jim: 'joe' });
      expect(context._privates).toStrictEqual([]);
    });

    it('execute plan call flushPrivates', () => {
      expect.assertions(2);

      const context = {
        flushPrivates: jest.fn(),
        get: jest.fn(),
      };
      const plan = jest.fn();

      Context.execute(plan, context);

      expect(context.flushPrivates).toBeCalledWith();
      expect(plan).toBeCalledWith(context);
    });
  });
  describe('createFactory', () => {
    it('should add the factory', () => {
      const factoryId = 'factoryId';
      const factoryMethod = Symbol('factoryMethod');
      const factory = jest.fn().mockReturnValue(factoryMethod);
      const context = new Context();

      const contextBag = Symbol('contextBag');
      context.get = jest.fn().mockReturnValue(contextBag);

      const contextSymbol = Symbol('context');
      context.addValue = jest.fn().mockReturnValue(contextSymbol);

      const result = context.addFactory(factoryId, factory);

      expect(context.get).toHaveBeenCalledWith();
      expect(factory).toHaveBeenCalledWith(contextBag);
      expect(context.addValue).toHaveBeenCalledWith(factoryId, factoryMethod);
      expect(result).toBe(contextSymbol);
    });
  });
  describe('invokeFactory', () => {
    it('should add a value to context from factory', () => {
      const factoryId = 'factoryId';
      const instanceKey = 'instanceKey';
      const parameters = Symbol('parameters');
      const value = Symbol('value');
      const factoryMethod = jest.fn().mockReturnValue(value);

      const context = new Context();
      context.lookup = jest.fn().mockReturnValue(factoryMethod);

      const contextSymbol = Symbol('context');
      context.addValue = jest.fn().mockReturnValue(contextSymbol);

      const result = context.invokeFactory(factoryId, instanceKey, parameters);

      expect(context.lookup).toHaveBeenCalledWith(factoryId);
      expect(factoryMethod).toHaveBeenCalledWith(instanceKey, parameters);
      expect(context.addValue).toHaveBeenCalledWith(instanceKey, value);
      expect(result).toBe(contextSymbol);
    });
  });
});
