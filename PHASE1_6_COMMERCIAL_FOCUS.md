# Phase 1.6 — Commercial Focus

- Added relationship_type separate from legacy segment labels: DIRECT_BUYER, SUBCONTRACT_BUYER, INFLUENCER_REFERRER, SUPPLY_SIDE, UNCLASSIFIED.
- Existing consultants remain in the system as INFLUENCER_REFERRER rather than being deleted.
- Added referral_partners and referrals with RLS and anon revoked.
- Added opportunity source attribution.
- Archived all 881 legacy Draft messages as LEGACY_PRE_DECISION_MAKER_DRAFT; active Draft count is now zero.
- Bulk outreach now requires verified decision maker + direct email + a commercial reason (trigger/vendor route/subcontract strategy).
- Current relationship distribution: 102 direct buyers, 66 influencer/referrers, 34 subcontract buyers.
- No referral partner records were fabricated; table starts empty for real human-entered relationships.
