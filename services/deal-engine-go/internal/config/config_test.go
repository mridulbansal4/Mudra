package config

import (
	"os"
	"path/filepath"
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

func TestLoadDefaults(t *testing.T) {
	t.Setenv("GO_DEAL_ENGINE_PORT", "")
	t.Setenv("SAMADHAN_JWT_SECRET", "")
	t.Setenv("ASSAY_ED25519_PRIVATE_KEY_HEX", "zz")
	c := Load()
	if c.Port != 4002 || !c.UsingDevJWT || len(c.Ed25519Seed) != 32 || !c.UsingDevSigningKey {
		t.Fatalf("%+v", c)
	}
}
