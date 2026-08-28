package auth

import (
	"testing"
	"time"
)

func TestIssueParseRoundtrip(t *testing.T) {
	m := NewManager("secret", time.Hour)
	tok, err := m.Issue(42, "erdenebatt", []string{"config", "reports"})
	if err != nil {
		t.Fatal(err)
	}
	c, err := m.Parse(tok)
	if err != nil {
		t.Fatal(err)
	}
	if c.UserID != 42 || c.UserName != "erdenebatt" {
		t.Fatalf("claims mismatch: %+v", c)
	}
	if !c.Has("config") || !c.Has("reports") {
		t.Fatal("expected privileges present")
	}
	if c.Has("admin") {
		t.Fatal("did not expect 'admin' privilege")
	}
}

func TestParseRejectsTampered(t *testing.T) {
	m := NewManager("secret", time.Hour)
	tok, _ := m.Issue(1, "u", nil)
	if _, err := m.Parse(tok + "x"); err == nil {
		t.Fatal("expected tampered token to be rejected")
	}
	// wrong secret must fail too
	other := NewManager("different", time.Hour)
	if _, err := other.Parse(tok); err == nil {
		t.Fatal("expected token signed with different secret to be rejected")
	}
}

func TestParseRejectsExpired(t *testing.T) {
	m := NewManager("secret", -time.Minute) // already expired
	tok, _ := m.Issue(1, "u", nil)
	if _, err := m.Parse(tok); err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestHasWildcard(t *testing.T) {
	c := &Claims{Privileges: []string{"*"}}
	if !c.Has("anything") {
		t.Fatal("wildcard should grant any privilege")
	}
}
