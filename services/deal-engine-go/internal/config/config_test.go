package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseDotEnvLine(t *testing.T) {
	cases := []struct {
		in, k, v string
		ok       bool
	}{
		{`FOO="bar baz"`, "FOO", "bar baz", true},
		{`export A='x#y'`, "A", "x#y", true},
		{`B=plain # comment`, "B", "plain", true},
		{`# comment`, "", "", false},
		{`=nokey`, "", "", false},
		{`C=`, "C", "", true},
	}
	for _, c := range cases {
		k, v, ok := ParseDotEnvLine(c.in)
		if k != c.k || v != c.v || ok != c.ok {
			t.Errorf("%q -> %q %q %v", c.in, k, v, ok)
		}
	}
}

func TestDotEnvDoesNotOverride(t *testing.T) {
	p := filepath.Join(t.TempDir(), ".env")
	os.WriteFile(p, []byte("DE_TEST_A=fromfile\nDE_TEST_B=fromfile\n"), 0o600)
	t.Setenv("DE_TEST_A", "fromenv")
	os.Unsetenv("DE_TEST_B")
	defer os.Unsetenv("DE_TEST_B")
	if err := ParseDotEnvFile(p, false); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("DE_TEST_A") != "fromenv" || os.Getenv("DE_TEST_B") != "fromfile" {
		t.Fatalf("A=%s B=%s", os.Getenv("DE_TEST_A"), os.Getenv("DE_TEST_B"))
	}
}

func TestPlaceholderAndMaskDatabaseURL(t *testing.T) {
	if !IsPlaceholderDatabaseURL("") || !IsPlaceholderDatabaseURL("postgresql://postgres:[YOUR-PASSWORD]@localhost:5432/mudra_os") {
		t.Fatal("expected placeholder DSNs")
	}
	if IsPlaceholderDatabaseURL("postgresql://postgres:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres") {
		t.Fatal("live pooler DSN must not be treated as a placeholder")
	}
	masked := MaskDatabaseURL("postgresql://postgres:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require")
	if strings.Contains(masked, "secret") || masked != "aws-1-ap-south-1.pooler.supabase.com:5432/postgres" {
		t.Fatalf("mask = %q", masked)
	}
}

func TestLoadDefaults(t *testing.T) {
	t.Setenv("GO_DEAL_ENGINE_PORT", "")
	t.Setenv("MUDRA_JWT_SECRET", "")
	t.Setenv("ASSAY_ED25519_PRIVATE_KEY_HEX", "zz")
	c := Load()
	if c.Port != 4002 || !c.UsingDevJWT || len(c.Ed25519Seed) != 32 || !c.UsingDevSigningKey {
		t.Fatalf("%+v", c)
	}
}
