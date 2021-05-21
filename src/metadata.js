module.exports = class Metadata {
  constructor() {
    this._data = [];
    this._lastAdded = null;
  }

  add(name, type) {
    this._data.push({ name, type, requires: [] });
    this._lastAdded = name;
  }

  get() {
    return this._data;
  }

  setRequisites(requisites) {
    // console.log('setRequisites', this._lastAdded, requisites)
    if(!this._lastAdded) throw new Error(`setRequisites() without lastAdded. last seen '${this._lastSeen}'`)

    const lastAdded = this._lookup(this._lastAdded)
    if(!lastAdded) throw new Error(`last added ${this._lastAdded} is not in data`)
    if(lastAdded.requires.length > 0) throw new Error(`last added requires '${this._lastAdded}' not empty`)

    lastAdded.requires = requisites;

    this._lastSeen = this._lastAdded;
    this._lastAdded = null;
  }

  _lookup(nameToFind){
    return this._data.find(({ name }) => name === nameToFind)
  }
};
