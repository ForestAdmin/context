const Plan = require('../../src/plan');

describe('Plan', () => {
  it('should clone a plan', () => {
    const plan = new Plan();
    plan._steps = [0, 1, 2, 3];

    const clone = plan.clone();
    expect(clone._steps).toStrictEqual([0, 1, 2, 3]);
    expect(plan._steps).toStrictEqual([0, 1, 2, 3]);

    clone._steps.push(4);

    expect(clone._steps).toStrictEqual([0, 1, 2, 3, 4]);
    expect(plan._steps).toStrictEqual([0, 1, 2, 3]);
  });
});
