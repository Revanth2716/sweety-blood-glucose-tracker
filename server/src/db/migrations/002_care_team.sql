-- Care teams, personal targets and the context of a reading.

-- A user is either a patient or a doctor.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient', 'doctor'));

-- The personal targets of a user. The defaults are the usual ones.
ALTER TABLE users ADD COLUMN IF NOT EXISTS fasting_target_min INTEGER NOT NULL DEFAULT 70;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fasting_target_max INTEGER NOT NULL DEFAULT 130;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_meal_target_min INTEGER NOT NULL DEFAULT 70;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_meal_target_max INTEGER NOT NULL DEFAULT 180;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tir_goal INTEGER NOT NULL DEFAULT 70;
ALTER TABLE users ADD COLUMN IF NOT EXISTS a1c_goal NUMERIC NOT NULL DEFAULT 7;

-- The context of a reading: a note and a list of tags.
ALTER TABLE readings ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE readings ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- The doctors who look after a patient.
CREATE TABLE IF NOT EXISTS care_relationships (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  patient_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT care_relationships_pair_key UNIQUE (doctor_id, patient_id),
  CONSTRAINT care_relationships_not_self CHECK (doctor_id <> patient_id)
);

CREATE INDEX IF NOT EXISTS care_relationships_patient_idx ON care_relationships (patient_id);
