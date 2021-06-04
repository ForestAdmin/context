const Plan = require('./plan');
const Metadata = require('./metadata');

module.exports = class Context {
  constructor() {
    this._bag = {};
    this._bag.assertPresent = this._assertPresent.bind(this);
    this._privates = [];
    this._metadata = new Metadata();
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
    const keys = Object.keys(requisites);
    const missings = keys
      .map((key) => (!this._bag[key] ? key : null))
      .filter((key) => key);
    if (missings.length > 0) throw new Error(`missing dependencies ${missings}`);
    this._metadata.setRequisites(keys);
    return true;
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

  _setNewValue(name, value, options = {}) {
    if (this._bag[name]) throw new Error(`existing { key: '${name}'} in context`);
    this._setValue(name, value, options);
  }

  addValue(name, value, options) {
    this._metadata.add(name, 'value');
    this._setNewValue(name, value, options);
    return this;
  }

  addInstance(name, instance, options) {
    this._metadata.add(name, 'instance');
    this._setNewValue(name, instance, options);
    return this;
  }

  addFunction(name, value, options) {
    this._metadata.add(name, 'function');
    this._setNewValue(name, value, options);
    return this;
  }

  /**
   * @deprecated Use addUsingClass instead.
   */
  addClass(Class, options) {
    const name = Context._getInstanceName(Class, options);
    this._metadata.add(name, 'class');
    const instance = this._instanciate(Class, options);
    this._setNewValue(name, instance, options);
    return this;
  }

  addClassesArray(name, classesArray, options) {
    this._metadata.add(name, 'class[]');
    const instancesArray = classesArray.map((Class) => this._instanciate(Class));
    this._setNewValue(name, instancesArray, options);
    return this;
  }

  addFactoryFunction(name, factoryFunction, options) {
    this._metadata.add(name, 'function*');
    const bag = this.get();
    const theFunction = factoryFunction(bag);
    this._setNewValue(name, theFunction, options);
    return this;
  }

  addFactory(name, factory) {
    this._metadata.add(name, 'factory');
    const value = factory(this.get());
    this._setNewValue(name, value);
    return this;
  }

  addUsingClass(name, Class, options) {
    this._metadata.add(name, 'class');
    const instance = this._instanciate(Class, options);
    this._setNewValue(name, instance, options);
    return this;
  }

  addModule(name, module, options) { return this.addValue(name, module, options); }

  addAllKeysFrom(object, options) {
    Object
      .entries(object)
      .forEach(([name, value]) => this.addValue(name, value, options));
    return this;
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
    if (Array.isArray(name)) {
      const dependanciesArray = name.map((key) => bag[key]);
      const dependanciesObject = {};
      name.forEach((key, i) => {
        dependanciesObject[key] = dependanciesArray[i];
      });
      return dependanciesObject;
    }
    return bag[name];
  }

  getMetadata() {
    return this._metadata.get();
  }
};
