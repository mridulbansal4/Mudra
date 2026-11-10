package fsm

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
)

func TestNextStateValidTransitions(t *testing.T) {
	cases := []struct {
		from State
		act  Action
		to   State
	}{
		{StateCreated, ActionLockEscrow, StateFunded},
		{StateFunded, ActionStartAssay, StateInspectionLive},
		{StateInspectionLive, ActionMarkAssayVerified, StateAssayVerified},
		{StateAssayVerified, ActionReleaseFunds, StateReleased},
		{StateFunded, ActionRaiseDispute, StateDisputedFrozen},
		{StateInspectionLive, ActionRaiseDispute, StateDisputedFrozen},
		{StateAssayVerified, ActionRaiseDispute, StateDisputedFrozen},
		{StateDisputedFrozen, ActionResolveSplit, StateArbitratedSplit},
		{StateDisputedFrozen, ActionRefundBuyer, StateRefunded},
	}
	for _, c := range cases {
		got, err := NextState(c.from, c.act)
		if err != nil || got != c.to {
			t.Errorf("NextState(%s,%s) = %s,%v want %s", c.from, c.act, got, err, c.to)
		}
	}
}

// Exhaustively check every (state, action) pair: exactly the 9 listed pairs are legal.
func TestNextStateExhaustiveInvalid(t *testing.T) {
	legal := 0
	for _, s := range AllStates {
		for _, a := range AllActions {
			next, err := NextState(s, a)
			if err == nil {
				legal++
				continue
			}
			if !errors.Is(err, ErrInvalidTransition) {
				t.Errorf("%s/%s: unexpected err %v", s, a, err)
			}
			if next != s {
				t.Errorf("%s/%s: invalid transition must return current state, got %s", s, a, next)
			}
		}
	}
	if legal != 9 {
		t.Fatalf("expected 9 legal transitions, got %d", legal)
	}
}

func TestUnknownAction(t *testing.T) {
	if _, err := NextState(StateCreated, "TELEPORT"); !errors.Is(err, ErrUnknownAction) {
		t.Fatalf("want ErrUnknownAction, got %v", err)
	}
}

func TestTerminalStates(t *testing.T) {
	for _, s := range []State{StateReleased, StateArbitratedSplit, StateRefunded} {
		if !IsTerminal(s) {
			t.Errorf("%s should be terminal", s)
		}
	}
	for _, s := range []State{StateCreated, StateFunded, StateInspectionLive, StateAssayVerified, StateDisputedFrozen} {
		if IsTerminal(s) {
			t.Errorf("%s should not be terminal", s)
		}
	}
}

func TestStoryStage(t *testing.T) {
	want := map[State]int{
		StateCreated: 1, StateFunded: 2, StateInspectionLive: 3, StateAssayVerified: 3,
		StateReleased: 4, StateDisputedFrozen: 4, StateArbitratedSplit: 4, StateRefunded: 4,
	}
	for s, w := range want {
		if got := StoryStage(s); got != w {
			t.Errorf("StoryStage(%s)=%d want %d", s, got, w)
		}
	}
}

func TestVoucherTypes(t *testing.T) {
	want := map[Action]string{
		ActionLockEscrow: "ESCROW_LOCKED", ActionStartAssay: "ASSAY_STARTED",
		ActionMarkAssayVerified: "ASSAY_VERIFIED", ActionReleaseFunds: "FUNDS_RELEASED",
		ActionRaiseDispute: "DISPUTE_FROZEN", ActionResolveSplit: "ARBITRATED_SPLIT",
		ActionRefundBuyer: "BUYER_REFUNDED",
	}
	for a, w := range want {
		if got := VoucherType(a); got != w {
			t.Errorf("VoucherType(%s)=%s want %s", a, got, w)
		}
	}
}

func TestMachineHappyPathAndVersioning(t *testing.T) {
	m := NewMachine(StateCreated)
	steps := []Action{ActionLockEscrow, ActionStartAssay, ActionMarkAssayVerified, ActionReleaseFunds}
	for i, a := range steps {
		res, err := m.Apply(a, int64(i+1))
		if err != nil {
			t.Fatalf("step %d %s: %v", i, a, err)
		}
		if res.Version != int64(i+2) {
			t.Fatalf("version after %s = %d", a, res.Version)
		}
	}
	s, v := m.Snapshot()
	if s != StateReleased || v != 5 {
		t.Fatalf("final %s v%d", s, v)
	}
}

func TestMachineStaleVersion(t *testing.T) {
	m := NewMachine(StateCreated)
	if _, err := m.Apply(ActionLockEscrow, 1); err != nil {
		t.Fatal(err)
	}
	_, err := m.Apply(ActionStartAssay, 1)
	var ce *ConflictError
	if !errors.As(err, &ce) || !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("want ConflictError, got %v", err)
	}
	if ce.ActualVersion != 2 || ce.ActualState != StateFunded {
		t.Fatalf("bad conflict details %+v", ce)
	}
}

func TestMachineInvalidDoesNotBumpVersion(t *testing.T) {
	m := NewMachine(StateCreated)
	if _, err := m.Apply(ActionReleaseFunds, 1); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("want invalid transition, got %v", err)
	}
	if s, v := m.Snapshot(); s != StateCreated || v != 1 {
		t.Fatalf("state mutated: %s v%d", s, v)
	}
}

// N goroutines race the same transition with the same expected_version:
// exactly one must win, the rest must get ErrVersionConflict.
func TestMachineConcurrentOptimisticLock(t *testing.T) {
	for round := 0; round < 50; round++ {
		m := NewMachine(StateFunded)
		const n = 64
		var wins, conflicts, other atomic.Int64
		var wg sync.WaitGroup
		start := make(chan struct{})
		for i := 0; i < n; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				<-start
				act := ActionRaiseDispute
				if i%2 == 0 {
					act = ActionStartAssay // buyer disputes while seller starts assay
				}
				_, err := m.Apply(act, 1)
				switch {
				case err == nil:
					wins.Add(1)
				case errors.Is(err, ErrVersionConflict):
					conflicts.Add(1)
				default:
					other.Add(1)
				}
			}(i)
		}
		close(start)
		wg.Wait()
		if wins.Load() != 1 || conflicts.Load() != n-1 || other.Load() != 0 {
			t.Fatalf("round %d: wins=%d conflicts=%d other=%d", round, wins.Load(), conflicts.Load(), other.Load())
		}
		if _, v := m.Snapshot(); v != 2 {
			t.Fatalf("version = %d want 2", v)
		}
	}
}

func BenchmarkMachineApply(b *testing.B) {
	for i := 0; i < b.N; i++ {
		m := NewMachine(StateCreated)
		_, _ = m.Apply(ActionLockEscrow, 1)
	}
}
