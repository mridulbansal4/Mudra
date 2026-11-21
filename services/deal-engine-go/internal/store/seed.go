package store

import "time"

// Persona is a demo persona preset (P-01..P-05).
type Persona struct {
	Preset, ID, NexconnID, Name, Role, Locale string
}

// Personas are the fixed demo personas; the seeded demo deal uses P-01/P-02.
var Personas = []Persona{
	{"P-01_RAJESH", "e01_7b91a2c0-1122-4455-8899-aabbccddeeff", "buyer_rajesh_ta_8821", "Rajesh Natarajan", "buyer", "ta-IN"},
	{"P-02_VIKRAM", "e01_8c02b3d1-2233-4566-99aa-bbccddeeff00", "seller_vikram_hi_8821", "Vikram Singh", "seller", "hi-IN"},
	{"P-03_AARAV", "e01_9d13c4e2-3344-4677-aabb-ccddeeff0011", "buyer_aarav_en_8821", "Aarav Mehta", "buyer", "en-IN"},
	{"P-04_MEERA", "e01_ae24d5f3-4455-4788-bbcc-ddeeff001122", "arbitrator_meera_sg_8821", "Meera Iyer", "arbitrator", "en-SG"},
	{"P-05_JUDGE_GUEST", "e01_bf35e604-5566-4899-ccdd-eeff00112233", "guest_judge_8821", "Hackathon Judge", "guest", "en-IN"},
}

// PersonaByPreset finds a persona.
func PersonaByPreset(p string) (Persona, bool) {
	for _, x := range Personas {
		if x.Preset == p {
			return x, true
		}
	}
	return Persona{}, false
}

// Seed constants.
const (
	SeedDealID         = "d_8821_juki"
	SeedChannelID      = "grp_mudra_juki_8821"
	SeedDealTitle      = "Juki MO-6814S High-Speed Overlock Machine"
	SeedAmountPaise    = 14500000
	SeedSerial         = "JUKI-MO-6814S-8821"
	SeedMinRPM         = 4800
	SeedReferencePHash = "a4f19c83e2b0771d"
	OpenChannelID      = "open_mudra_flash_mandi_01"
	CommunityChannelID = "comm_mudra_bharat_trade"
)

// DefaultChecklist is the Juki checklist from API-03.
func DefaultChecklist() []ChecklistItem {
	return []ChecklistItem{
		{ID: "chk_serial", Label: "Verify Serial Plate JUKI-MO-6814S-8821 on Live Video"},
		{ID: "chk_rpm", Label: "Verify Servo Motor >= 4,800 RPM Audio FFT"},
	}
}

// SeedStatic seeds personas, the open lot and community subchannels.
// The demo deal itself is seeded by the handlers engine (it needs the signer).
func (s *Store) SeedStatic(now time.Time) {
	for _, p := range Personas {
		s.PutUser(&User{ID: p.ID, NexconnUserID: p.NexconnID, DisplayName: p.Name, Role: p.Role, Locale: p.Locale, KYCTier: "GUEST_SANDBOX", CreatedAt: now})
	}
	s.AddLot(&OpenLot{
		LotID: "lot_juki_8821", OpenChannelID: OpenChannelID,
		Title: "Juki MO-6814S Overlock Lot (Assay Verified 4,820 RPM)", SellerNexconnID: "seller_vikram_hi_8821",
		ReservePricePaise: 14000000, CurrentBidPaise: 14500000, AssayVerified: true, EndsAt: now.Add(6 * time.Hour),
	})
	s.mu.Lock()
	s.subchannels = append(s.subchannels,
		&Subchannel{SubchannelID: "sub_machinery_01", Slug: "sub/machinery", Title: "Industrial Machinery & CNC", ActiveMembers: 312, CommunityChannelID: CommunityChannelID},
		&Subchannel{SubchannelID: "sub_refurb_02", Slug: "sub/refurb-tech", Title: "Refurbished Laptops & GPUs", ActiveMembers: 489, CommunityChannelID: CommunityChannelID},
	)
	s.mu.Unlock()
}
