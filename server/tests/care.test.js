import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerDoctor, registerUser } from './helpers/testApp.js';

describe('profile, targets and the care team', () => {
  /** @type {import('supertest').Test} */
  let api;
  /** @type {import('../src/db/index.js').Database} */
  let db;
  let counter = 0;

  beforeAll(async () => {
    const created = await createTestApp();
    db = created.db;
    api = request(created.app);
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * @returns {Promise<string>}
   */
  async function createUser() {
    counter += 1;
    const { token } = await registerUser(api, { email: `care-${counter}@example.com` });
    return token;
  }

  describe('profile', () => {
    it('returns the user, the targets and the care team', async () => {
      const token = await createUser();

      const response = await api.get('/api/profile').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('patient');
      expect(response.body.targets).toEqual({
        fastingMin: 70,
        fastingMax: 130,
        postMealMin: 70,
        postMealMax: 180,
        tirGoal: 70,
        a1cGoal: 7,
      });
      expect(response.body.careTeam).toEqual([]);
    });

    it('needs a token', async () => {
      const response = await api.get('/api/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('personal targets', () => {
    it('changes the target and the readings follow it', async () => {
      const token = await createUser();

      const created = await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'morning', value: 110 });

      expect(created.body.reading.status).toBe('in-range');

      const updated = await api.put('/api/profile/targets').set(bearer(token)).send({
        fastingMin: 70,
        fastingMax: 100,
        postMealMin: 70,
        postMealMax: 160,
        tirGoal: 80,
        a1cGoal: 6.5,
      });

      expect(updated.status).toBe(200);
      expect(updated.body.targets.fastingMax).toBe(100);

      const reading = await api.get(`/api/readings/${created.body.reading.id}`).set(bearer(token));

      expect(reading.body.reading.status).toBe('high');
      expect(reading.body.reading.target.max).toBe(100);
    });

    it('rejects a target where the low limit is above the high limit', async () => {
      const token = await createUser();

      const response = await api.put('/api/profile/targets').set(bearer(token)).send({
        fastingMin: 140,
        fastingMax: 100,
        postMealMin: 70,
        postMealMax: 180,
        tirGoal: 70,
        a1cGoal: 7,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        'The fasting target must be a range, not a single value.',
      );
    });
  });

  describe('the care team', () => {
    it('does not let a patient see a list of patients', async () => {
      const token = await createUser();

      const response = await api.get('/api/care/patients').set(bearer(token));

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Only a doctor can see a list of patients.');
    });

    it('lets a doctor add a patient and see their report', async () => {
      const doctor = await registerDoctor(api, db, { email: 'doc-care@example.com' });
      const patient = await registerUser(api, { email: 'patient-care@example.com' });

      // A date inside the window that the care team looks at.
      const recent = new Date();
      recent.setDate(recent.getDate() - 2);
      const recentDate = `${recent.getFullYear()}-${String(recent.getMonth() + 1).padStart(2, '0')}-${String(recent.getDate()).padStart(2, '0')}`;

      await api
        .post('/api/readings')
        .set(bearer(patient.token))
        .send({ date: recentDate, slot: 'morning', value: 118 });

      const linked = await api
        .post('/api/care/patients')
        .set(bearer(doctor.token))
        .send({ email: 'patient-care@example.com' });

      expect(linked.status).toBe(201);
      expect(linked.body.patient.email).toBe('patient-care@example.com');

      const list = await api.get('/api/care/patients').set(bearer(doctor.token));

      expect(list.status).toBe(200);
      expect(list.body.patients).toHaveLength(1);
      expect(list.body.patients[0].email).toBe('patient-care@example.com');
      expect(list.body.patients[0].stats.count).toBe(1);

      const report = await api
        .get(`/api/care/patients/${patient.user.id}/report?type=daily&date=${recentDate}`)
        .set(bearer(doctor.token));

      expect(report.status).toBe(200);
      expect(report.body.stats.count).toBe(1);
      expect(report.body.readings[0].value).toBe(118);
    });

    it('does not let a doctor read a patient that is not in their care team', async () => {
      const doctor = await registerDoctor(api, db, { email: 'doc-stranger@example.com' });
      const patient = await registerUser(api, { email: 'stranger@example.com' });

      const response = await api
        .get(`/api/care/patients/${patient.user.id}/report?type=daily`)
        .set(bearer(doctor.token));

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('That patient is not in your care team.');
    });

    it('reports an unknown email when a doctor adds a patient', async () => {
      const doctor = await registerDoctor(api, db, { email: 'doc-unknown@example.com' });

      const response = await api
        .post('/api/care/patients')
        .set(bearer(doctor.token))
        .send({ email: 'nobody@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('There is no account with that email address.');
    });

    it('removes a patient from the care team', async () => {
      const doctor = await registerDoctor(api, db, { email: 'doc-remove@example.com' });
      const patient = await registerUser(api, { email: 'remove@example.com' });

      await api
        .post('/api/care/patients')
        .set(bearer(doctor.token))
        .send({ email: 'remove@example.com' });

      const removed = await api
        .delete(`/api/care/patients/${patient.user.id}`)
        .set(bearer(doctor.token));

      expect(removed.status).toBe(204);

      const list = await api.get('/api/care/patients').set(bearer(doctor.token));
      expect(list.body.patients).toHaveLength(0);
    });

    it('shows the doctor in the care team of the patient', async () => {
      const doctor = await registerDoctor(api, db, { email: 'doc-team@example.com' });
      const patient = await registerUser(api, { email: 'team@example.com' });

      await api
        .post('/api/care/patients')
        .set(bearer(doctor.token))
        .send({ email: 'team@example.com' });

      const profile = await api.get('/api/profile').set(bearer(patient.token));

      expect(profile.body.careTeam).toHaveLength(1);
      expect(profile.body.careTeam[0].email).toBe('doc-team@example.com');
    });
  });
});
