/**
 * All SQL for the users table and for the care relationships lives here.
 *
 * @param {import('../../db/index.js').Database} db
 */
export function createUsersRepository(db) {
  return {
    /**
     * @param {string} email
     * @returns {Promise<any | null>}
     */
    async findByEmail(email) {
      const { rows } = await db.getQuery(
        `SELECT id, name, email, password_hash, role, created_at,
                fasting_target_min, fasting_target_max,
                post_meal_target_min, post_meal_target_max,
                tir_goal, a1c_goal
           FROM users
          WHERE lower(email) = lower($1)`,
        [email],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {string} id
     * @returns {Promise<any | null>}
     */
    async findById(id) {
      const { rows } = await db.getQuery(
        `SELECT id, name, email, role, created_at,
                fasting_target_min, fasting_target_max,
                post_meal_target_min, post_meal_target_max,
                tir_goal, a1c_goal
           FROM users
          WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {{ name: string, email: string, passwordHash: string, role?: string }} input
     * @returns {Promise<any>}
     */
    async create({ name, email, passwordHash, role = 'patient' }) {
      const { rows } = await db.getQuery(
        `INSERT INTO users (name, email, password_hash, role)
              VALUES ($1, $2, $3, $4)
           RETURNING id, name, email, role, created_at,
                     fasting_target_min, fasting_target_max,
                     post_meal_target_min, post_meal_target_max,
                     tir_goal, a1c_goal`,
        [name, email, passwordHash, role],
      );
      return rows[0];
    },

    /**
     * @param {string} id
     * @param {typeof import('../../lib/targets.js').DEFAULT_TARGETS} targets
     * @returns {Promise<any | null>}
     */
    async updateTargets(id, targets) {
      const { rows } = await db.getQuery(
        `UPDATE users
            SET fasting_target_min = $2,
                fasting_target_max = $3,
                post_meal_target_min = $4,
                post_meal_target_max = $5,
                tir_goal = $6,
                a1c_goal = $7
          WHERE id = $1
        RETURNING id, name, email, role, created_at,
                  fasting_target_min, fasting_target_max,
                  post_meal_target_min, post_meal_target_max,
                  tir_goal, a1c_goal`,
        [
          id,
          targets.fastingMin,
          targets.fastingMax,
          targets.postMealMin,
          targets.postMealMax,
          targets.tirGoal,
          targets.a1cGoal,
        ],
      );
      return rows[0] ?? null;
    },

    /**
     * The doctors that look after a patient.
     *
     * @param {string} patientId
     * @returns {Promise<any[]>}
     */
    async listDoctorsOf(patientId) {
      const { rows } = await db.getQuery(
        `SELECT u.id, u.name, u.email
           FROM care_relationships c
           JOIN users u ON u.id = c.doctor_id
          WHERE c.patient_id = $1
          ORDER BY u.name`,
        [patientId],
      );
      return rows;
    },

    /**
     * The patients that a doctor looks after.
     *
     * @param {string} doctorId
     * @returns {Promise<any[]>}
     */
    async listPatientsOf(doctorId) {
      const { rows } = await db.getQuery(
        `SELECT u.id, u.name, u.email, c.created_at
           FROM care_relationships c
           JOIN users u ON u.id = c.patient_id
          WHERE c.doctor_id = $1
          ORDER BY u.name`,
        [doctorId],
      );
      return rows;
    },

    /**
     * Connect a doctor with a patient.
     *
     * @param {string} doctorId
     * @param {string} patientId
     * @returns {Promise<boolean>} false when the connection already existed
     */
    async linkPatient(doctorId, patientId) {
      const { rowCount } = await db.getQuery(
        `INSERT INTO care_relationships (doctor_id, patient_id)
              VALUES ($1, $2)
         ON CONFLICT (doctor_id, patient_id) DO NOTHING`,
        [doctorId, patientId],
      );
      return rowCount > 0;
    },

    /**
     * @param {string} doctorId
     * @param {string} patientId
     * @returns {Promise<boolean>}
     */
    async unlinkPatient(doctorId, patientId) {
      const { rowCount } = await db.getQuery(
        `DELETE FROM care_relationships WHERE doctor_id = $1 AND patient_id = $2`,
        [doctorId, patientId],
      );
      return rowCount > 0;
    },

    /**
     * Whether a doctor looks after a patient.
     *
     * @param {string} doctorId
     * @param {string} patientId
     * @returns {Promise<boolean>}
     */
    async isCaringFor(doctorId, patientId) {
      const { rows } = await db.getQuery(
        `SELECT 1 FROM care_relationships WHERE doctor_id = $1 AND patient_id = $2`,
        [doctorId, patientId],
      );
      return rows.length > 0;
    },
  };
}
