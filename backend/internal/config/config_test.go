package config

import "testing"

func TestSimulationRequiresExplicitOptIn(t *testing.T) {
	for _, value := range []string{"", "false", "1", "TRUE", "true"} {
		t.Setenv("DEVICE_SIMULATION_ENABLED", value)
		if got := Load().DeviceSimulation; got != (value == "true") {
			t.Errorf("%q: unexpected simulation %v", value, got)
		}
	}
}
