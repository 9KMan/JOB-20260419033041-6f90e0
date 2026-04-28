const request = require('supertest');
const app = require('../src/index');

describe('Health Check', () => {
  it('should return ok status', async () => {
    const res = await request(app)
      .get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});