//! Protocol capability identity and oracle-value coverage.
//!
//! Two 2026 corrections are encoded here as types rather than conventions:
//!
//! 1. **Protocol major version is part of capability identity.** Aave v3 and
//!    Aave v4 have different liquidation mathematics (fixed close factor vs
//!    target health factor with a health-scaled bonus). Morpho Blue and Morpho
//!    V2 are different protocols. A registry entry for one can never satisfy a
//!    requirement for the other.
//!
//! 2. **Oracle-extractable value may be auctioned by the protocol.** On feeds
//!    covered by a recapture mechanism there is no gas race to win, only an
//!    auction to bid into. Unknown coverage is fail-closed.
//!
//! No addresses live in this module. Addresses come from the signed registry
//! described in `docs/PROTOCOL_REGISTRY.md`.

use core::fmt;

/// A narrow, version-specific protocol capability.
///
/// Closed on purpose: a new integration must be handled everywhere it matters
/// before it compiles.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Capability {
    AaveV3Pool,
    AaveV4Hub,
    AaveV4Spoke,
    MorphoBlue,
    MorphoV2Market,
    BalancerFlashLoan,
    UniswapV3Router,
    CowSettlement,
    UniswapXReactor,
    OracleFeed,
    BundleTransport,
    OevAuctionVenue,
    ExpressLaneVenue,
}

impl Capability {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::AaveV3Pool => "aave_v3_pool",
            Self::AaveV4Hub => "aave_v4_hub",
            Self::AaveV4Spoke => "aave_v4_spoke",
            Self::MorphoBlue => "morpho_blue",
            Self::MorphoV2Market => "morpho_v2_market",
            Self::BalancerFlashLoan => "balancer_flash_loan",
            Self::UniswapV3Router => "uniswap_v3_router",
            Self::CowSettlement => "cow_settlement",
            Self::UniswapXReactor => "uniswapx_reactor",
            Self::OracleFeed => "oracle_feed",
            Self::BundleTransport => "bundle_transport",
            Self::OevAuctionVenue => "oev_auction_venue",
            Self::ExpressLaneVenue => "express_lane_venue",
        }
    }

    pub const ALL: [Self; 13] = [
        Self::AaveV3Pool,
        Self::AaveV4Hub,
        Self::AaveV4Spoke,
        Self::MorphoBlue,
        Self::MorphoV2Market,
        Self::BalancerFlashLoan,
        Self::UniswapV3Router,
        Self::CowSettlement,
        Self::UniswapXReactor,
        Self::OracleFeed,
        Self::BundleTransport,
        Self::OevAuctionVenue,
        Self::ExpressLaneVenue,
    ];

    /// Whether the capability's parameters may change without a governance
    /// vote (e.g. an Aave v4 Risk Steward acting within governance bounds).
    ///
    /// Such parameters must be read at the pinned block for every candidate
    /// and may never be cached across blocks.
    pub const fn parameters_may_change_without_vote(self) -> bool {
        matches!(self, Self::AaveV4Spoke)
    }
}

impl fmt::Display for Capability {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Whether oracle-extractable value on a feed/market is auctioned by a
/// protocol recapture mechanism.
///
/// `Unknown` is the default for any feed whose coverage has not been reviewed,
/// and it disables every oracle-triggered strategy for that market.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash)]
pub enum SvrCoverage {
    #[default]
    Unknown,
    /// Value is auctioned; participation means bidding, not racing.
    Covered,
    /// No recapture mechanism; a conventional backrun may be evaluated.
    Uncovered,
}

impl SvrCoverage {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Covered => "covered",
            Self::Uncovered => "uncovered",
        }
    }
}

impl fmt::Display for SvrCoverage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// The two mutually exclusive oracle-triggered strategies.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OracleRow {
    /// Backrun an unauctioned feed update.
    BackrunUncovered,
    /// Bid into a protocol-run recapture auction.
    OevAuction,
}

impl OracleRow {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::BackrunUncovered => "oracle_backrun_uncovered",
            Self::OevAuction => "oev_auction_svr",
        }
    }
}

/// Why an oracle-triggered candidate was refused.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OracleReject {
    /// Coverage of at least one dependent feed is unreviewed.
    CoverageUnknown,
    /// A covered feed has no reviewed recapture venue entry.
    RecaptureVenueMissing,
    /// Racing a feed whose value is auctioned.
    RaceOnCoveredFeed,
    /// Bidding into an auction for a feed that has none.
    AuctionOnUncoveredFeed,
}

/// Resolve which oracle row, if any, may act on a market.
///
/// `feeds` is the coverage of **every** feed the candidate depends on, not just
/// the trigger: a position can be liquidatable via one feed while the seized
/// collateral is priced by another. Any unknown makes the whole decision
/// unknown.
///
/// `venue_reviewed` records whether a covered feed's recapture venue has a
/// reviewed registry entry.
pub fn permitted_oracle_row(
    feeds: &[SvrCoverage],
    venue_reviewed: bool,
) -> Result<OracleRow, OracleReject> {
    if feeds.is_empty() || feeds.contains(&SvrCoverage::Unknown) {
        return Err(OracleReject::CoverageUnknown);
    }
    // If any dependent feed is auctioned, the opportunity is auctioned.
    if feeds.contains(&SvrCoverage::Covered) {
        if !venue_reviewed {
            return Err(OracleReject::RecaptureVenueMissing);
        }
        return Ok(OracleRow::OevAuction);
    }
    Ok(OracleRow::BackrunUncovered)
}

/// Check that a strategy's required capability is satisfied by an attested
/// registry entry. Version mismatch is a rejection, never a fallback.
pub fn capability_satisfies(required: Capability, attested: Capability) -> bool {
    required == attested
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capability_labels_are_unique() {
        let mut labels: Vec<&str> = Capability::ALL.iter().map(|c| c.as_str()).collect();
        labels.sort_unstable();
        let count = labels.len();
        labels.dedup();
        assert_eq!(labels.len(), count);
    }

    #[test]
    fn aave_versions_are_not_interchangeable() {
        assert!(!capability_satisfies(
            Capability::AaveV4Spoke,
            Capability::AaveV3Pool
        ));
        assert!(!capability_satisfies(
            Capability::AaveV3Pool,
            Capability::AaveV4Spoke
        ));
        assert!(capability_satisfies(
            Capability::AaveV3Pool,
            Capability::AaveV3Pool
        ));
    }

    #[test]
    fn morpho_versions_are_not_interchangeable() {
        assert!(!capability_satisfies(
            Capability::MorphoBlue,
            Capability::MorphoV2Market
        ));
    }

    #[test]
    fn only_v4_spokes_have_vote_free_parameter_changes() {
        for capability in Capability::ALL {
            assert_eq!(
                capability.parameters_may_change_without_vote(),
                capability == Capability::AaveV4Spoke,
                "{capability}"
            );
        }
    }

    #[test]
    fn coverage_defaults_to_unknown() {
        assert_eq!(SvrCoverage::default(), SvrCoverage::Unknown);
    }

    #[test]
    fn unknown_coverage_disables_every_oracle_row() {
        assert_eq!(
            permitted_oracle_row(&[SvrCoverage::Unknown], true),
            Err(OracleReject::CoverageUnknown)
        );
        // One unknown among several known feeds still fails closed.
        assert_eq!(
            permitted_oracle_row(
                &[
                    SvrCoverage::Uncovered,
                    SvrCoverage::Unknown,
                    SvrCoverage::Uncovered
                ],
                true
            ),
            Err(OracleReject::CoverageUnknown)
        );
    }

    #[test]
    fn no_feeds_is_not_an_implicit_permission() {
        assert_eq!(
            permitted_oracle_row(&[], true),
            Err(OracleReject::CoverageUnknown)
        );
    }

    #[test]
    fn covered_feed_selects_the_auction_row() {
        assert_eq!(
            permitted_oracle_row(&[SvrCoverage::Covered, SvrCoverage::Uncovered], true),
            Ok(OracleRow::OevAuction)
        );
    }

    #[test]
    fn covered_feed_without_reviewed_venue_is_rejected() {
        assert_eq!(
            permitted_oracle_row(&[SvrCoverage::Covered], false),
            Err(OracleReject::RecaptureVenueMissing)
        );
    }

    #[test]
    fn fully_uncovered_market_selects_the_backrun_row() {
        assert_eq!(
            permitted_oracle_row(&[SvrCoverage::Uncovered, SvrCoverage::Uncovered], false),
            Ok(OracleRow::BackrunUncovered)
        );
    }
}
