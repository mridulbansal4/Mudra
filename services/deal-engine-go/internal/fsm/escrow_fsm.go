// Package fsm implements the canonical SAMADHAN-OS escrow finite-state machine
// (IMPLEMENTATION_CONTRACT.md §3) plus an optimistic-concurrency Machine.
package fsm

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/hrtime"
)

// State is an escrow FSM state.
type State string

// Action is an escrow FSM action.
type Action string

// Canonical states (contract §3).
const (
	StateCreated         State = "CREATED"
	StateFunded          State = "FUNDED"
	StateInspectionLive  State = "INSPECTION_LIVE"
	StateAssayVerified   State = "ASSAY_VERIFIED"
	StateReleased        State = "RELEASED"
	StateDisputedFrozen  State = "DISPUTED_FROZEN"
	StateArbitratedSplit State = "ARBITRATED_SPLIT"
	StateRefunded        State = "REFUNDED"
)

// Canonical actions.
const (
	ActionLockEscrow        Action = "LOCK_ESCROW"
	ActionStartAssay        Action = "START_ASSAY"
	ActionMarkAssayVerified Action = "MARK_ASSAY_VERIFIED"
	ActionReleaseFunds      Action = "RELEASE_FUNDS"
	ActionRaiseDispute      Action = "RAISE_DISPUTE"
	ActionResolveSplit      Action = "RESOLVE_SPLIT"
	ActionRefundBuyer       Action = "REFUND_BUYER"
)

// Errors returned by the FSM.
var (
	ErrInvalidTransition = errors.New("ERR_INVALID_FSM_TRANSITION")
	ErrVersionConflict   = errors.New("ERR_FSM_CONFLICT")
	ErrUnknownAction     = errors.New("ERR_UNKNOWN_FSM_ACTION")
)

// AllStates lists every canonical state.
var AllStates = []State{
	StateCreated, StateFunded, StateInspectionLive, StateAssayVerified,
	StateReleased, StateDisputedFrozen, StateArbitratedSplit, StateRefunded,
}

// AllActions lists every canonical action.
var AllActions = []Action{
	ActionLockEscrow, ActionStartAssay, ActionMarkAssayVerified, ActionReleaseFunds,
	ActionRaiseDispute, ActionResolveSplit, ActionRefundBuyer,
}

var transitionTable = map[State]map[Action]State{
	StateCreated: {
		ActionLockEscrow: StateFunded,
	},
	StateFunded: {
		ActionStartAssay:   StateInspectionLive,
		ActionRaiseDispute: StateDisputedFrozen,
	},
	StateInspectionLive: {
		ActionMarkAssayVerified: StateAssayVerified,
		ActionRaiseDispute:      StateDisputedFrozen,
	},
	StateAssayVerified: {
		ActionReleaseFunds: StateReleased,
		ActionRaiseDispute: StateDisputedFrozen,
	},
	StateDisputedFrozen: {
		ActionResolveSplit: StateArbitratedSplit,
		ActionRefundBuyer:  StateRefunded,
	},
}

// voucherTypes maps each action to the system voucher it produces.
var voucherTypes = map[Action]string{
	ActionLockEscrow:        "ESCROW_LOCKED",
	ActionStartAssay:        "ASSAY_STARTED",
	ActionMarkAssayVerified: "ASSAY_VERIFIED",
	ActionReleaseFunds:      "FUNDS_RELEASED",
	ActionRaiseDispute:      "DISPUTE_FROZEN",
	ActionResolveSplit:      "ARBITRATED_SPLIT",
	ActionRefundBuyer:       "BUYER_REFUNDED",
}

// IsValidAction reports whether a is a canonical action.
func IsValidAction(a Action) bool { _, ok := voucherTypes[a]; return ok }

// IsValidState reports whether s is a canonical state.
func IsValidState(s State) bool {
	for _, x := range AllStates {
		if x == s {
			return true
		}
	}
	return false
}

// NextState returns the state reached from curr via act, or ErrInvalidTransition.
func NextState(curr State, act Action) (State, error) {
	if !IsValidAction(act) {
		return curr, ErrUnknownAction
	}
	if next, ok := transitionTable[curr][act]; ok {
		return next, nil
	}
	return curr, ErrInvalidTransition
}

// CanApply reports whether act is legal from curr.
func CanApply(curr State, act Action) bool { _, err := NextState(curr, act); return err == nil }

// VoucherType returns the voucher type emitted by a successful action.
func VoucherType(act Action) string { return voucherTypes[act] }

// IsTerminal reports whether no further action is possible from s.
func IsTerminal(s State) bool { return len(transitionTable[s]) == 0 }

// StoryStage maps a state onto the 4-stage UI story bar (contract §3).
func StoryStage(s State) int {
	switch s {
	case StateCreated:
		return 1
	case StateFunded:
		return 2
	case StateInspectionLive, StateAssayVerified:
		return 3
	default:
		return 4
	}
}

// Result describes a successful transition.
type Result struct {
	Prev     State
	Next     State
	Version  int64
	ExecTime time.Duration
}

// ConflictError carries details for a 409.
type ConflictError struct {
	ExpectedVersion int64
	ActualVersion   int64
	ActualState     State
}

func (e *ConflictError) Error() string {
	return fmt.Sprintf("escrow state transition rejected: expected version %d, found version %d (%s)",
		e.ExpectedVersion, e.ActualVersion, e.ActualState)
}

// Unwrap lets errors.Is(err, ErrVersionConflict) work.
func (e *ConflictError) Unwrap() error { return ErrVersionConflict }

// Machine is a single escrow contract protected by a mutex with an
// optimistic version counter (mirrors `UPDATE ... WHERE version = $expected`).
type Machine struct {
	mu      sync.Mutex
	state   State
	version int64
}

// NewMachine creates a machine in the given state with version 1.
func NewMachine(s State) *Machine { return &Machine{state: s, version: 1} }

// Snapshot returns the current state and version.
func (m *Machine) Snapshot() (State, int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.state, m.version
}

// Apply performs a compare-and-swap transition. The version check happens
// before the transition-table check, so a stale caller always gets 409.
func (m *Machine) Apply(act Action, expectedVersion int64) (Result, error) {
	start := hrtime.Now()
	m.mu.Lock()
	defer m.mu.Unlock()
	if expectedVersion != m.version {
		return Result{}, &ConflictError{ExpectedVersion: expectedVersion, ActualVersion: m.version, ActualState: m.state}
	}
	next, err := NextState(m.state, act)
	if err != nil {
		return Result{}, err
	}
	prev := m.state
	m.state = next
	m.version++
	return Result{Prev: prev, Next: next, Version: m.version, ExecTime: hrtime.Since(start)}, nil
}
