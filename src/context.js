const Plan = require('./plan');

module.exports = class Context {
  constructor() {
    this._bag = {};
    this._bag.assertPresent = this._assertPresent.bind(this);
    this._privates = [];
  }

  static newPlan() {
    return new Plan();
  }

  static execute(plan, context = new Context()) {
    if (!plan) throw new Error('missing plan');
    const planIsABuildPlan = plan instanceof Plan;
    const planIsAFunction = typeof plan === 'function';
    const planIsAnArray = Array.isArray(plan);
    const planIsInvalid = !planIsAFunction && !planIsAnArray && !planIsABuildPlan;

    if (planIsABuildPlan) {
      plan.deliverSteps()
        .forEach((step) => Context.execute(step.plan, context));
    } else if (planIsAFunction) {
      plan(context);
      context.flushPrivates();
    } else if (planIsAnArray) {
      plan.forEach((buildPlan) => Context.execute(buildPlan, context));
    } else if (planIsInvalid) {
      throw new Error(`Invalid plan: received '${typeof plan}' instead of 'Plan', 'function' or 'Array'`);
    }

    return context.get();
  }

  static init(buildPlan) {
    Context.execute(buildPlan, Context.instance = new Context());
  }

  static getInstance() {
    if (!Context.instance) throw new Error('Context not initiated');
    return Context.instance;
  }

  static inject() {
    return Context.getInstance().get();
  }

  static _getInstanceName(Class, { name } = {}) {
    if (name) return name;
    const className = Class.name;
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  executePlan(plan) {
    return Context.execute(plan, this);
  }

  _assertPresent(requisites) {
    const missings = Object
      .keys(requisites)
      .map((key) => (!this._bag[key] ? key : null))
      .filter((key) => key);
    if (missings.length > 0) throw new Error(`missing dependencies ${missings}`);
  }

  get() { return this._bag; }

  flushPrivates() {
    this._privates.forEach((name) => delete this._bag[name]);
    this._privates = [];
  }

  _setValue(name, value, options = {}) {
    this._bag[name] = value;
    if (options.private) this._privates.push(name);
    return this;
  }

  addValue(name, value, options) {
    if (this._bag[name]) throw new Error(`existing instance { key: '${name}'} in context`);
    return this._setValue(name, value, options);
  }

  addInstance(name, instance, options) { return this.addValue(name, instance, options); }

  addFunction(name, value, options) { return this.addValue(name, value, options); }

  addClass(Class, options) {
    return this.addValue(
      Context._getInstanceName(Class, options),
      this._instanciate(Class, options),
      options,
    );
  }

  _instanciate(Class, { map } = {}) {
    if (!map) return new Class(this.get());
    return new Class(this._mapContext(map));
  }

  _mapContext(map) {
    const bag = this.get();
    if (!map) return bag;
    return { ...bag, ...map(bag) };
  }

  addClassesArray(name, classesArray, options) {
    const instancesArray = classesArray.map((Class) => this._instanciate(Class));
    return this.addValue(name, instancesArray, options);
  }

  addFactoryFunction(name, value, options) {
    return this.addFunction(name, value(this.get()), options);
  }

  addFactory(name, factory) {
    const context = this.get();
    const value = factory(context);
    return this.addValue(name, value);
  }

  invokeFactory(factoryId, instanceKey, parameters) {
    const factoryMethod = this.lookup(factoryId);
    const value = factoryMethod(instanceKey, parameters);
    return this.addValue(instanceKey, value);
  }

  with(name, work) {
    work(this.lookup(name));
    return this;
  }

  replace(name, value) {
    return this._setValue(name, value);
  }

  lookup(name) {
    const bag = this.get();
    return bag[name];
  }
};
