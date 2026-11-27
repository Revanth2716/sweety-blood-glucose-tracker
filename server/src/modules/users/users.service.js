import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { buildTargets } from '../../lib/targets.js';
import { createUsersRepository } from './users.repository.js';

/**
 * Business rules for the profile, the personal targets and the care team.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createUsersService({ db }) {
  const users = createUsersRepository(db);

  return {
    /**
     * The profile of the signed in user, with their targets and their care team.
     *
     * @param {string} userId
     */
    async getProfile(userId) {
      const user = await users.findById(userId);
      if (!user) {
        throw notFound('User not found.');
      }

      const doctors = await users.listDoctorsOf(userId);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? 'patient',
        },
        targets: buildTargets(user),
        careTeam: doctors.map((doctor) => ({
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
        })),
      };
    },

    /**
     * Change the targets of the signed in user.
     *
     * @param {string} userId
     * @param {typeof import('../../lib/targets.js').DEFAULT_TARGETS} targets
     */
    async updateTargets(userId, targets) {
      const user = await users.updateTargets(userId, targets);
      if (!user) {
        throw notFound('User not found.');
      }
      return buildTargets(user);
    },

    /**
     * The patients a doctor looks after.
     *
     * @param {string} doctorId
     */
    async listPatients(doctorId) {
      const doctor = await users.findById(doctorId);
      if (!doctor) {
        throw notFound('User not found.');
      }
      if (doctor.role !== 'doctor') {
        throw forbidden('Only a doctor can see a list of patients.');
      }

      return users.listPatientsOf(doctorId);
    },

    /**
     * Connect a patient with a doctor.
     *
     * @param {string} doctorId
     * @param {string} email
     */
    async linkPatient(doctorId, email) {
      const doctor = await users.findById(doctorId);
      if (!doctor) {
        throw notFound('User not found.');
      }
      if (doctor.role !== 'doctor') {
        throw forbidden('Only a doctor can add a patient.');
      }

      const patient = await users.findByEmail(email);
      if (!patient) {
        throw notFound('There is no account with that email address.');
      }
      if (patient.id === doctorId) {
        throw badRequest('A doctor cannot be their own patient.', 'email', 'INVALID_LINK');
      }
      if (patient.role === 'doctor') {
        throw badRequest('That account belongs to a doctor.', 'email', 'INVALID_LINK');
      }

      const created = await users.linkPatient(doctorId, patient.id);

      return {
        linked: created,
        patient: { id: patient.id, name: patient.name, email: patient.email },
      };
    },

    /**
     * Remove a patient from the care team of a doctor.
     *
     * @param {string} doctorId
     * @param {string} patientId
     */
    async unlinkPatient(doctorId, patientId) {
      const removed = await users.unlinkPatient(doctorId, patientId);
      if (!removed) {
        throw notFound('That patient is not in your care team.');
      }
    },

    /**
     * Check that a doctor is allowed to see the data of a patient.
     *
     * @param {string} doctorId
     * @param {string} patientId
     */
    async assertCaringFor(doctorId, patientId) {
      const allowed = await users.isCaringFor(doctorId, patientId);
      if (!allowed) {
        throw forbidden('That patient is not in your care team.');
      }
    },

    /**
     * The targets of a user, used by the other modules.
     *
     * @param {string} userId
     */
    async getTargets(userId) {
      const user = await users.findById(userId);
      if (!user) {
        throw notFound('User not found.');
      }
      return buildTargets(user);
    },

    /**
     * The name and the email of a patient, for a doctor.
     *
     * @param {string} patientId
     */
    async getPatient(patientId) {
      const patient = await users.findById(patientId);
      if (!patient) {
        throw notFound('Patient not found.');
      }
      return { id: patient.id, name: patient.name, email: patient.email };
    },
  };
}
