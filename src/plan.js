const Context = require('./context');

module.exports = class Plan {
  constructor(_entries = []) {
    this._entries = _entries;
    this._stepsWalk = [];
  }

  static newPlan(...args) {
    return new Plan(...args);
  }

  static init(plan) {
    Plan.execute(plan, Plan._instance = new Context());
  }

  static inject() {
    if (!Plan._instance) throw new Error('Context not initiated');
    return Plan._instance.get();
  }

  static execute(plan, context = new Context(), _deep = 0) {
    if (!plan) throw new Error('missing plan');
    const planIsAFunction = typeof plan === 'function';
    const planIsAPlan = plan instanceof Plan;
    const planIsAnArray = Array.isArray(plan);
    const planIsInvalid = !planIsAFunction && !planIsAnArray && !planIsAPlan;

    if (planIsAFunction) {
      const planFunction = plan;
      const newPlan = Plan.newPlan();
      planFunction(newPlan);
      Plan.execute(newPlan, context, _deep + 1);
    } else if (planIsAPlan) {
      plan
        ._getEntries()
        .forEach((entry) => Plan.applyEntry(entry, context));
      if (_deep === 0) context.flushPrivates('');
    } else if (planIsAnArray) {
      const deeper = _deep + 1;
      plan.forEach((step) => Plan.execute(step, context, deeper));
    } else if (planIsInvalid) {
      throw new Error(`Invalid plan: received '${typeof plan}' instead of 'Plan', 'function' or 'Array'`);
    }

    if (_deep === 0 && plan.metadataHook) plan.metadataHook(context.getMetadata());
    return context.get();
  }

  static applyEntry(entry, context) {
    const {
      path, type, name, value, options,
    } = entry;
    switch (type) {
      case 'value':
        context.addValue(path, name, value, options);
        break;
      case 'instance':
        context.addInstance(path, name, value, options);
        break;
      case 'function':
        context.addFunction(path, name, value, options);
        break;
      case 'class':
        context.addUsingClass(path, name, value, options);
        break;
      case 'function*':
        context.addFactoryFunction(path, name, value, options);
        break;
      case 'module':
        context.addModule(path, name, value, options);
        break;
      case 'work':
        context.with(value.name, value.work, options);
        break;
      case 'step-in':
        context.openStep(path, value, options);
        break;
      case 'step-out':
        context.closeStep(path, value, options);
        break;
      default:
        throw new Error(`invalid entry ${path} ${name}`);
    }
  }

  _addEntry(name, type, value, options) {
    if (name === 'assertPresent') throw new Error('reserved keyword "assertPresent"');
    const path = this._stepsWalk.join('/');
    const entry = { path, name, type, value };
    if (options) entry.options = options;
    this._entries.push(entry);
  }

  _getPathAndName(relativePath) {
    const absoluteSteps = [...this._stepsWalk, ...relativePath.split('/')];
    const name = absoluteSteps.pop();
    const path = absoluteSteps.join('/');
    return { path, name };
  }

  _getAbsolutePath(relativePath) {
    return [...this._stepsWalk, ...relativePath.split('/')].join('/');
  }

  replace(relativePath, value, options) {
    const valueReplacedPlan = this._replaceValue(relativePath, value, options);
    if (valueReplacedPlan) return valueReplacedPlan;

    const stepReplacedPlan = this._replaceStep(relativePath, value, options);
    if (stepReplacedPlan) return stepReplacedPlan;

    throw new Error(`entry not found: '${relativePath}'`);
  }

  _replaceValue(relativePath, value, options) {
    const { path, name } = this._getPathAndName(relativePath);
    const replacedIndex = this._entries.findIndex(
      ({ path: entryPath, name: entryName }) => path === entryPath && name === entryName,
    );
    if (replacedIndex === -1) return null;

    const replaced = this._entries[replacedIndex];
    const replacingEntry = {
      path, name, type: 'value', value, options, replaced,
    };
    const newEntries = this._entries.slice();
    newEntries.splice(replacedIndex, 1, replacingEntry);
    return new Plan(newEntries);
  }

  _replaceStep(relativePath, valueObject, options) {
    const absolutePath = this._getAbsolutePath(relativePath);
    const replacedSteps = this._entries.filter(
      ({ path: entryPath }) => entryPath.startsWith(absolutePath),
    );
    if (replacedSteps.length === 0) return null;

    const replacedIndex = this._entries.indexOf(replacedSteps[0]);
    const deleteCount = replacedSteps.length;

    const replacingEntries = Object
      .entries(valueObject)
      .map(([key, value]) => ({
        path: absolutePath, name: key, type: 'value', value, options,
      }));
    replacingEntries[0].replaced = replacedSteps;
    const newEntries = this._entries.slice();
    newEntries.splice(replacedIndex, deleteCount, ...replacingEntries);
    return new Plan(newEntries);
  }

  addStep(name, stepFunction, options) {
    this._stepsWalk.push(name);
    this._addEntry(Symbol('step-in'), 'step-in', name, options);
    const plan = stepFunction(this);
    this._addEntry(Symbol('step-out'), 'step-out', name, options);
    this._stepsWalk.pop();
    return plan;
  }

  addValue(name, value, options) {
    this._addEntry(name, 'value', value, options);
    return this;
  }

  addInstance(name, instance, options) {
    this._addEntry(name, 'instance', instance, options);
    return this;
  }

  addFunction(name, value, options) {
    this._addEntry(name, 'function', value, options);
    return this;
  }

  addUsingClass(name, Class, options) {
    this._addEntry(name, 'class', Class, options);
    return this;
  }

  /**
   * @deprecated Use addUsingClass instead.
   */
  addClass(Class, options) {
    const name = Plan._getInstanceName(Class, options);
    this._addEntry(name, 'class', Class, options);
    return this;
  }

  /**
   * @deprecated Use addUsingClass instead addClass.
   */
  static _getInstanceName(Class, { name } = {}) {
    if (name) return name;
    const className = Class.name;
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  addFactoryFunction(name, factoryFunction, options) {
    this._addEntry(name, 'function*', factoryFunction, options);
    return this;
  }

  addModule(name, module, options) {
    this._addEntry(name, 'module', module, options);
    return this;
  }

  addAllKeysFrom(object, options) {
    Object
      .entries(object)
      .forEach(([name, value]) => this.addValue(name, value, options));
    return this;
  }

  with(name, work, options) {
    this._addEntry(Symbol('work'), 'work', { name, work }, options);
    return this;
  }

  _getEntries() {
    return this._entries;
  }
};
