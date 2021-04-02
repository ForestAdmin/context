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
      from: value, to: value, unchanged: unchangedValue,
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
  it('should add a class to a context', () => {
    expect.assertions(1);
    class FakeClass {}
    const context = new Context().addClass(FakeClass);
    const { fakeClass } = context.get();
    expect(fakeClass instanceof FakeClass).toBe(true);
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
});
