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
});
