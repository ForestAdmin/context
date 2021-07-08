/* eslint-disable global-require */
/* eslint-disable no-new */
const { newPlan, execute } = require('../../../src');

describe('a sequelize plan', () => {
  it.skip('sequelize', () => {
    const sequelizePlan = newPlan()
      .addStep('sequelize', (context) => context
        .addValue('databaseUrl', 'postgres://forest:secret@localhost:5454/turnkey')
        .addValue('options', {
          dialect: 'postgres',
        })
        // eslint-disable-next-line global-require
        .addValue('Sequelize', require('sequelize'))
        .addUsingFunction('sequelize', ({ databaseUrl, options, Sequelize }) => new Sequelize(databaseUrl, options)));

    const modelsPlan = newPlan()
      .addStep('models', (context) => context
        .addValue('models', {}));

    execute([sequelizePlan, modelsPlan]);
  });
});
