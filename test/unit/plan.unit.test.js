const Plan = require('../../src');

describe('Plan', () => {
  describe('_applyEntry', () => {
    it('throw invalid entry type error', () => {
      const context = Symbol('context');
      const entry = { type: 'invalid-type', path: '/entry-path', name: 'entry-name', value: 'value' };

      expect(() => Plan._applyEntry(entry, context))
        .toThrow('invalid entry type invalid-type /entry-path entry-name');
    });
  });
  it('addPackage is a addStep alias', () => {
    const plan = new Plan();
    plan.addStep = jest.fn();

    const name = Symbol('name');
    const item = Symbol('item');
    const options = Symbol('options');
    plan.addPackage(name, item, options);

    expect(plan.addStep).toBeCalledWith(name, item, options);
  });
});
