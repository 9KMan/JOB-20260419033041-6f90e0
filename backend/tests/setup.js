const { sequelize } = require('../src/models');

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  const tables = await sequelize.showAllSchemas();
  await Promise.all(
    tables.map(table =>
      sequelize.query(`DELETE FROM "${table}"`)
    )
  );
});