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

  replace(key, plan) {
    if (!this.has(key)) throw new Error(`Does not contain "${key}"`);
    const parentPlan = this.step(key, -1);
    const step = Plan._createStep(Plan._last(key), plan);
    parentPlan._steps.splice(this._indexOf(key), 1, step);
    return this;
  }

  has(keyToFind) {
    return !!this.step(keyToFind);
  }

  deliverSteps() {
    return Object.freeze(this._steps);
  }

  _indexOf(keyToFind) {
    return this._steps.findIndex(({ key }) => key === keyToFind);
  }

  static _createStep(key, plan) {
    return { key, plan };
  }

  static _last(term) {
    return term.split('.')[term.split('.').length - 1];
  }
};
