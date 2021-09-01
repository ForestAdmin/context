const Metadata = require('./metadata');

module.exports = class Context {
  constructor() {
    this._bag = {};
    this._bag.assertPresent = this._assertPresent.bind(this);
    this._metadata = new Metadata();
  }

  seal() {
    this.flushPrivates('');
    this._metadata.seal();
  }

  get() { return this._bag; }

  getMetadata() {
    return this._metadata.get();
  }

  _assertPresent(requisites, rest) {
    if (rest) throw new Error('Only one parameter should be specified.');
    const keys = Object.keys(requisites);
    const missings = keys
      .map((key) => (!this._bag[key] ? key : null))
      .filter((key) => key);
    if (missings.length > 0) throw new Error(`missing dependencies ${missings}. Existing: ${Object.keys(this._bag)}`);
    this._metadata.setRequisites(keys);
    return true;
  }

  openStep(path, name, options) {
    this._metadata.add(path, name, 'step', null, options);
  }

  closeStep(path) {
    this.flushPrivates(path);
  }

  flushPrivates(path) {
    [
      ...this._metadata.findPrivateValuesInStep(path),
      ...this._metadata.findValuesInPrivateSubSteps(path),
    ].forEach((name) => delete this._bag[name]);
  }

  _setValue(name, value) {
    this._bag[name] = value;
    return this;
  }

  _setNewValue(name, value, options = {}) {
    if (this._bag[name]) throw new Error(`existing { key: '${name}'} in context`);
    this._setValue(name, value, options);
  }

  addReplacement(path, name, value, options) {
    this._metadata.add(path, name, 'replacement', value, options);
    this._setNewValue(name, value, options);
    return this;
  }

  addValue(path, name, value, options) {
    this._metadata.add(path, name, 'value', value, options);
    this._setNewValue(
      name,
      (typeof value === 'function') ? value(this.get()) : value,
      options,
    );
    return this;
  }

  addRawValue(path, name, value, options) {
    this._metadata.add(path, name, 'value', value, options);
    this._setNewValue(name, value, options);
    return this;
  }

  addNumber(path, name, value, options = {}) {
    this._metadata.add(path, name, 'number', value, options);
    const rawValue = (typeof value === 'function') ? value(this.get()) : value;
    const expectedNumber = Number(rawValue);
    if (Number.isNaN(expectedNumber)) throw new Error(`Specified value is not a number: ${path}/${name}`);
    const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;
    const number = Math.max(min, Math.min(max, expectedNumber));
    this._setNewValue(name, number, options);
    return this;
  }

  addInstance(path, name, instance, options) {
    this._metadata.add(path, name, 'instance', instance, options);
    this._setNewValue(
      name,
      (typeof instance === 'function') ? instance(this.get()) : instance,
      options,
    );
    return this;
  }

  addFunction(path, name, theFunction, options) {
    this._metadata.add(path, name, 'function', theFunction, options);
    this._setNewValue(name, theFunction, options);
    return this;
  }

  addUsingFunction(path, name, factoryFunction, options) {
    this._metadata.add(path, name, 'function*', factoryFunction, options);
    const bag = this.get();
    const theFunction = factoryFunction(bag);
    this._setNewValue(name, theFunction, options);
    return this;
  }

  addUsingClass(path, name, Class, options) {
    this._metadata.add(path, name, 'class', Class, options);
    const instance = this._instanciate(Class, options);
    this._setNewValue(name, instance, options);
    return this;
  }

  addModule(path, name, module, options) {
    this._metadata.add(path, name, 'module', module, options);
    this._setNewValue(
      name,
      (typeof module === 'function') ? module() : module,
      options,
    );
    return this;
  }

  with(name, work) {
    work(this._lookup(name));
    return this;
  }

  _instanciate(Class, { map } = {}) {
    const RealClass = Class.toString().startsWith('class') ? Class : Class();
    if (!map) return new RealClass(this.get());
    return new RealClass(this._mapContext(map));
  }

  _mapContext(map) {
    const bag = this.get();
    if (!map) return bag;
    return { ...bag, ...map(bag) };
  }

  _lookup(name) {
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
};
