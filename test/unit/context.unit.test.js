const Context = require('../../src/context');

describe('Context', () => {
  it('makeMapping', () => {
    const map = {
      to: 'from',
      bar: 'foo',
    };
    const bag = {
      from: 42,
      foo: 43,
      bla: 44,
    };
    const actualMappedBag = Context._makeMapping(bag, map);
    const expectedMappedBag = {
      to: 42,
      bar: 43,
    };
    expect(actualMappedBag).toStrictEqual(expectedMappedBag);
  });

  it('makeMapping when a key is not found', () => {
    const map = {
      from: 'to',
      foo: 'bar',
    };
    const bag = {};

    expect(() => Context._makeMapping(bag, map))
      .toThrow('mapping error, key(s) not found: from, foo');
  });
});
