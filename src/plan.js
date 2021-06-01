module.exports = class Plan {
  constructor() {
    this._steps = [];
  }

  addStep(key, plan) {
    if (this.has(key)) throw new Error(`Already contain "${key}"`);
    const step = Plan._createStep(key, plan);
    this._steps.push(step);
    return this;
  }

  step(keyPath, offset = 0) {
    const keysArray = keyPath.split('.');
    let step = this;
    for (let i = 0; i < keysArray.length + offset; i += 1) {
      const deeperKey = keysArray[i];
      const deeperStep = step._steps.find(({ key }) => key === deeperKey);
      step = deeperStep && deeperStep.plan;
      if (!step) break;
    }
    return step;
  }

  replace(stepPath, replaceBy) {
    if (!this.has(stepPath)) throw new Error(`Does not contain "${stepPath}"`);

    const clone = this._clone();
    const parentStep = clone.step(stepPath, -1);
    const stepKey = Plan._last(stepPath);
    const existingStepIndex = parentStep._steps.findIndex(({ key }) => key === stepKey);
    const newStep = Plan._createStep(stepKey, replaceBy);

    parentStep._steps.splice(existingStepIndex, 1, newStep);

    return clone;
  }

  _clone() {
    const clone = new Plan();
    clone._steps = Plan._cloneSteps(this._steps);
    return clone;
  }

  static _cloneSteps(steps) {
    const clonedSteps = steps.slice();
    for (let i = 0; i < clonedSteps.length; i += 1) {
      const step = clonedSteps[i];
      const { key, plan } = step;
      if (plan instanceof Plan) clonedSteps[i] = { key, plan: plan._clone() };
      else if (typeof plan === 'function') clonedSteps[i] = step; // no change
      else throw new Error('invalid step found');
    }
    return clonedSteps;
  }

  has(keyToFind) {
    return !!this.step(keyToFind);
  }

  deliverSteps() {
    return Object.freeze(this._steps);
  }

  static _createStep(key, plan) {
    return { key, plan };
  }

  static _last(term) {
    return term.split('.')[term.split('.').length - 1];
  }
};
