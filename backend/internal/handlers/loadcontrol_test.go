package handlers

import "testing"

func TestLoadCommandMessages(t *testing.T) {
	for _, test := range []struct{ target, action string }{
		{"RELAY", "ENABLE"}, {"RELAY", "COLLECT"}, {"LIMIT", "SET"}, {"LIMIT", "READ_DB"},
	} {
		if message, ok := loadCommandMessage(test.target, test.action); !ok || message == "" {
			t.Fatalf("missing message for %s/%s", test.target, test.action)
		}
	}
	if _, ok := loadCommandMessage("RELAY", "DROP"); ok {
		t.Fatal("unsupported relay command accepted")
	}
}
