const Context = require('../../src/context');

class StartJob {
  constructor({ bull }) {
    this.bull = bull;
  }

  doThis(one, two) {
    return this.bull.add('doThis', { one, two });
  }

  doThat(solo) {
    return this.bull.add('doThat', { solo });
  }
}

describe('Example > queue', () => {
  const context = new Context()
    .addClass(StartJob);
  const { startJob } = context;

  startJob.doThis('super', 'thing');
  startJob.doThat('stuf');
});
