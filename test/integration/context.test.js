/* eslint-disable global-require, max-classes-per-file */
const Context = require('../../src/index');

const PUBLIC_VALUE = 'public value';

class HiddenService {
  constructor({ hidden }) {
    this.hidden = hidden;
  }
}

class FakeService {
  constructor({ dependency }) {
    this.dependency = dependency;
  }
}

describe('Context', () => {
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
      from: value, to: value, unchanged: unchangedValue, assertPresent: expect.any(Function),
    });
  });
  it('should add a value to a context', () => {
    expect.assertions(1);
    const context = new Context().addValue('port', 8080);
    const { port } = context.get();
    expect(port).toStrictEqual(8080);
  });
  it('should add an instance to a context', () => {
    expect.assertions(1);
    const fakeService = new FakeService({});
    const context = new Context().addInstance('instance', fakeService);
    const { instance } = context.get();
    expect(instance).toStrictEqual(fakeService);
  });
  it('should add a function to a context', () => {
    expect.assertions(1);
    const fakeFunction = () => null;
    const context = new Context().addFunction('func', fakeFunction);
    const { func } = context.get();
    expect(func).toStrictEqual(fakeFunction);
  });
  it('should add a module to a context', () => {
    expect.assertions(1);
    const fakeModule = Symbol('fakeModule');
    const context = new Context().addModule('module', fakeModule);
    const { module } = context.get();
    expect(module).toStrictEqual(fakeModule);
  });
  it('should add a class to a context', () => {
    expect.assertions(1);
    class FakeClass {}
    const context = new Context().addClass(FakeClass);
    const { fakeClass } = context.get();
    expect(fakeClass instanceof FakeClass).toBe(true);
  });
  it('should add an instance using a class to a context', () => {
    expect.assertions(1);
    class FakeClass {}
    const context = new Context().addUsingClass('wow', FakeClass);
    const { wow } = context.get();
    expect(wow instanceof FakeClass).toBe(true);
  });
  it('should add a class with a specific name', () => {
    expect.assertions(1);
    class FakeClass {}
    const context = new Context()
      .addClass(FakeClass, { name: 'specificName' });
    const { specificName } = context.get();
    expect(specificName instanceof FakeClass).toBe(true);
  });
  it('should add a class two times with a context mapping', () => {
    expect.assertions(2);
    class FakeClass {
      constructor({ param }) {
        this.param = param;
      }
    }
    const firstSymbol = Symbol('first');
    const secondSymbol = Symbol('second');
    const context = new Context()
      .addValue('first', firstSymbol)
      .addValue('second', secondSymbol)
      .addClass(FakeClass, { name: 'one', map: ({ first }) => ({ param: first }) })
      .addClass(FakeClass, { name: 'two', map: ({ second }) => ({ param: second }) });

    const { one, two } = context.get();
    expect(one.param).toBe(firstSymbol);
    expect(two.param).toBe(secondSymbol);
  });
  it('should limit private values access to current context', () => {
    expect.assertions(4);

    class SameContextService {
      constructor({ secretValue, publicValue }) {
        expect(secretValue).toStrictEqual('secret value');
        expect(publicValue).toStrictEqual(PUBLIC_VALUE);
      }
    }
    class AnotherContextService {
      constructor({ secretValue, publicValue }) {
        expect(secretValue).toBe(undefined);
        expect(publicValue).toStrictEqual(PUBLIC_VALUE);
      }
    }

    const context1 = (context) => context
      .addValue('publicValue', PUBLIC_VALUE)
      .addValue('secretValue', 'secret value', { private: true })
      .addClass(SameContextService);

    const context2 = (context) => context
      .addClass(AnotherContextService);

    Context.execute([context1, context2]);
  });

  describe('should handle private options', () => {
    it('private value is not injectable', () => {
      expect.assertions(1);

      const { hidden } = Context.execute(Context.newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true })));

      expect(hidden).toBe(undefined);
    });

    it('private value is accessible from same step', () => {
      expect.assertions(1);

      const { hiddenService } = Context.execute(Context.newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true })
          .addClass(HiddenService)));

      expect(hiddenService.hidden).toBe('toto');
    });

    it('private value is not accessible from other steps', () => {
      expect.assertions(1);

      const step2hiddenNotAccessibleFunction = jest.fn();

      Context.execute(Context.newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true }))
        .addStep('step2', (step2Context) => step2Context
          .with('hidden', step2hiddenNotAccessibleFunction)));

      expect(step2hiddenNotAccessibleFunction).toHaveBeenCalledWith(undefined);
    });

    it('not private value is accessible from other steps', () => {
      expect.assertions(1);

      const step2hiddenNotAccessibleFunction = jest.fn();

      Context.execute(Context.newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: false }))
        .addStep('step2', (step2Context) => step2Context
          .with('hidden', step2hiddenNotAccessibleFunction)));

      expect(step2hiddenNotAccessibleFunction).toHaveBeenCalledWith('toto');
    });
  });

  describe('factory feature', () => {
    it('add and invoke a env numbers factory', () => {
      const envNumbersFactory = ({ env }) => (key, { min, max, def }) => {
        const envValue = Number(env[key] !== undefined ? env[key] : def);
        return Math.min(Math.max(envValue, min), max);
      };

      const { poolSize } = new Context()
        .addValue('env', { poolSize: '6' })
        .addFactory('numberFactory', envNumbersFactory)
        .invokeFactory('numberFactory', 'poolSize', { min: 0, max: 10, def: 5 })
        .get();

      expect(poolSize).toBe(6);
    });
  });

  describe('assertPresent injection', () => {
    describe('when dependency is present', () => {
      it('should not throw', () => {
        expect.assertions(1);
        const { assertPresent, one } = new Context()
          .addValue('one', 1)
          .get();

        expect(() => assertPresent({ one })).not.toThrow();
      });
    });

    describe('when dependency is not present', () => {
      it('should throw "missing dependency" error', () => {
        expect.assertions(1);
        const { assertPresent, one } = new Context()
          .addValue('one', 1)
          .get();

        expect(() => assertPresent({ one, two: 2 }))
          .toThrow('missing dependencies two');
      });
    });
  });

  describe('dependancies graph', () => {
    it('should give dependancies data', () => {
      const context = new Context()
        .addValue('one', 1)
        .addValue('three', 3)
        .addFactoryFunction('addOne', ({ assertPresent, one }) => {
          assertPresent({ one });
          return (value) => value + one;
        })
        .addFactoryFunction('addOneThenTree', ({ assertPresent, addOne, three }) => {
          assertPresent({ addOne, three });
          return (value) => addOne(value) + three;
        });

      const metadata = context.getMetadata();

      const expectedMetaData = [
        { name: 'one', type: 'value', requires: [] },
        { name: 'three', type: 'value', requires: [] },
        { name: 'addOne', type: 'function*', requires: ['one'] },
        { name: 'addOneThenTree', type: 'function*', requires: ['addOne', 'three'] },
      ];

      expect(metadata).toStrictEqual(expectedMetaData);
    });
  });

  describe('executing the same plan twice', () => {
    it('produces two times the same context', () => {
      expect.assertions(1);

      const plan = Context.newPlan()
        .addStep('step1', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true })
          .addInstance('visible', 'visibleValue'))
        .addStep('step2', (step1Context) => step1Context
          .addInstance('hidden', 'toto', { private: true })
          .addInstance('visible2', 'visibleValue2'));

      const { assertPresent: v1, ...context1 } = Context.execute(plan);
      const { assertPresent: v2, ...context2 } = Context.execute(plan);

      expect(context1).toStrictEqual(context2);
    });
  });
});
