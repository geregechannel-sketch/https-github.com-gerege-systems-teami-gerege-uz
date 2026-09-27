-- Real-time monitor: the simulated DAS writes source='SIM' rows every tick and
-- prunes them after an hour; this index keeps both the prune and the
-- "latest per point/parameter" scan cheap.
CREATE INDEX IF NOT EXISTS idx_reading_values_recent
    ON reading_values (reading_time DESC, point_id, parameter_code);
CREATE INDEX IF NOT EXISTS idx_reading_values_sim_time
    ON reading_values (reading_time) WHERE source = 'SIM';
