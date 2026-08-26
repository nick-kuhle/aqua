//! Transport identity and semantics.
//!
//! This module contains **no network code, no signer, and no submission
//! function**. It exists so that "how a payload reaches a block" is a closed,
//! exhaustively-matched type with explicit semantics, rather than a boolean or
//! a mode string. See `docs/TRANSPORT.md`.
//!
//! The central rule: there is no generic `send`. Every variant below has
//! different atomicity, privacy, cancellation, refund and payment behaviour,
//! and each gets its own adapter and its own qualification row.

use alloy_primitives::U256;
use core::fmt;

/// How a signed payload is delivered.
///
/// Closed on purpose. Adding a variant is a compile error at every match site
/// — funnel, risk, reconciliation, qualification and console copy — which is
/// exactly the review pressure we want.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Transport {
    /// Public mempool. No privacy, no refund eligibility.
    PublicRaw,
    /// Private endpoint-scoped raw transaction.
    PrivateRaw,
    /// Ethereum L1 bundle; atomic as written.
    Bundle,
    /// Ethereum L1 bundle the builder may drop/merge transactions from.
    BundleMergeable,
    /// Protocol-run oracle-value recapture auction (e.g. SVR/Atlas).
    OevAuction,
    /// Sequencer ordering auction (e.g. Arbitrum Timeboost express lane).
    ExpressLane,
    /// L2 sequencer raw submission.
    SequencerRaw,
}

/// Atomicity actually guaranteed by the transport.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Atomicity {
    /// Single transaction only; no multi-transaction guarantee.
    None,
    /// All listed transactions land together, in order, or none do.
    BundleScoped,
    /// Bundle-scoped, except that listed transactions may be dropped.
    BundlePartial,
    /// Guaranteed by the auction venue's settlement.
    AuctionScoped,
}

/// What the transport charges for ordering.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OrderingPayment {
    /// Ordinary priority fee only.
    PriorityFee,
    /// Direct payment to the block producer.
    CoinbasePayment,
    /// A bid submitted into an auction, owed whether or not execution profits.
    AuctionBid,
}

impl Transport {
    /// Stable operator/metrics label.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PublicRaw => "public_raw",
            Self::PrivateRaw => "private_raw",
            Self::Bundle => "bundle",
            Self::BundleMergeable => "bundle_mergeable",
            Self::OevAuction => "oev_auction",
            Self::ExpressLane => "express_lane",
            Self::SequencerRaw => "sequencer_raw",
        }
    }

    /// Every variant, so tests and config validation cannot silently miss one.
    pub const ALL: [Self; 7] = [
        Self::PublicRaw,
        Self::PrivateRaw,
        Self::Bundle,
        Self::BundleMergeable,
        Self::OevAuction,
        Self::ExpressLane,
        Self::SequencerRaw,
    ];

    pub const fn atomicity(self) -> Atomicity {
        match self {
            Self::PublicRaw | Self::PrivateRaw | Self::SequencerRaw | Self::ExpressLane => {
                Atomicity::None
            }
            Self::Bundle => Atomicity::BundleScoped,
            Self::BundleMergeable => Atomicity::BundlePartial,
            Self::OevAuction => Atomicity::AuctionScoped,
        }
    }

    pub const fn ordering_payment(self) -> OrderingPayment {
        match self {
            Self::PublicRaw | Self::PrivateRaw | Self::SequencerRaw => OrderingPayment::PriorityFee,
            Self::Bundle | Self::BundleMergeable => OrderingPayment::CoinbasePayment,
            Self::OevAuction | Self::ExpressLane => OrderingPayment::AuctionBid,
        }
    }

    /// Whether the payload is withheld from the public mempool.
    pub const fn is_private(self) -> bool {
        match self {
            Self::PublicRaw | Self::SequencerRaw | Self::ExpressLane => false,
            Self::PrivateRaw | Self::Bundle | Self::BundleMergeable | Self::OevAuction => true,
        }
    }

    /// Whether contribution-based builder refunds can apply.
    ///
    /// Refund rules require private submission; a public-mempool payload is
    /// never eligible. Eligibility is still registry data — this only encodes
    /// the structural precondition.
    pub const fn refund_possible(self) -> bool {
        matches!(self, Self::Bundle | Self::BundleMergeable)
    }

    /// Whether the builder may remove transactions from the payload.
    pub const fn permits_transaction_dropping(self) -> bool {
        matches!(self, Self::BundleMergeable)
    }

    /// Whether an explicit bid must be capped before transport selection.
    pub const fn requires_bid_cap(self) -> bool {
        matches!(self.ordering_payment(), OrderingPayment::AuctionBid)
    }
}

impl fmt::Display for Transport {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Refund accounting for one submission.
///
/// Refunds are **receivable, not revenue**. `expected_wei` is a model output
/// and must never enter realized P/L; only `reconciled_wei` may, and only after
/// a finalized payout has been attributed to this submission.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct RefundLedger {
    expected_wei: U256,
    observed_wei: Option<U256>,
    reconciled_wei: Option<U256>,
}

impl RefundLedger {
    pub const fn expecting(expected_wei: U256) -> Self {
        Self {
            expected_wei,
            observed_wei: None,
            reconciled_wei: None,
        }
    }

    /// No refund is modeled. This is the correct state whenever refund
    /// eligibility is unknown.
    pub const fn none() -> Self {
        Self {
            expected_wei: U256::ZERO,
            observed_wei: None,
            reconciled_wei: None,
        }
    }

    pub const fn expected_wei(&self) -> U256 {
        self.expected_wei
    }

    /// A payout was seen on-chain but is not yet final/attributed.
    pub fn observe(&mut self, observed_wei: U256) {
        self.observed_wei = Some(observed_wei);
    }

    /// A finalized payout attributed to this submission.
    pub fn reconcile(&mut self, reconciled_wei: U256) {
        self.reconciled_wei = Some(reconciled_wei);
    }

    /// The only refund figure permitted in realized profit and loss.
    pub fn realized_wei(&self) -> U256 {
        self.reconciled_wei.unwrap_or(U256::ZERO)
    }

    /// True when a modeled refund has not been fully reconciled. Operators are
    /// alerted on persistent shortfall because it usually means eligibility
    /// was misunderstood.
    pub fn is_short(&self) -> bool {
        self.realized_wei() < self.expected_wei
    }
}

/// Why a transport choice was refused. Every rejection is operator-visible.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransportReject {
    /// The transport is not enabled at boot for this chain/lane.
    NotEnabled,
    /// A bid-bearing transport was selected with no bid cap configured.
    BidCapMissing,
    /// The modeled bid exceeds the boot-time cap.
    BidAboveCap,
    /// Dropping was requested but not permitted by boot config.
    DroppingNotPermitted,
    /// Dropping is permitted but the drop-applied variants were not simulated.
    DropVariantsNotSimulated,
    /// Fan-out exceeds the configured endpoint bound.
    EndpointFanoutAboveMaximum,
}

/// Boot-time transport envelope. Runtime may narrow it, never widen it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TransportPolicy {
    pub transport: Transport,
    pub enabled: bool,
    /// Cap on an ordering/OEV bid, in basis points of simulated gross value.
    pub max_bid_bps: Option<u16>,
    pub dropping_permitted: bool,
    pub max_endpoints: u8,
}

/// A concrete transport selection request, evaluated against the policy.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TransportRequest {
    pub bid_bps: u16,
    pub uses_dropping: bool,
    /// Set only when every drop-applied variant the builder may produce has
    /// been simulated successfully.
    pub drop_variants_simulated: bool,
    pub endpoints: u8,
}

impl TransportPolicy {
    /// Deterministic, ordered evaluation. The first rejection is the reason
    /// persisted for the operator.
    pub fn evaluate(&self, request: TransportRequest) -> Result<(), TransportReject> {
        if !self.enabled {
            return Err(TransportReject::NotEnabled);
        }
        if self.transport.requires_bid_cap() {
            match self.max_bid_bps {
                None => return Err(TransportReject::BidCapMissing),
                Some(cap) if request.bid_bps > cap => {
                    return Err(TransportReject::BidAboveCap);
                }
                Some(_) => {}
            }
        }
        if request.uses_dropping {
            if !self.transport.permits_transaction_dropping() || !self.dropping_permitted {
                return Err(TransportReject::DroppingNotPermitted);
            }
            if !request.drop_variants_simulated {
                return Err(TransportReject::DropVariantsNotSimulated);
            }
        }
        if request.endpoints > self.max_endpoints {
            return Err(TransportReject::EndpointFanoutAboveMaximum);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy(transport: Transport) -> TransportPolicy {
        TransportPolicy {
            transport,
            enabled: true,
            max_bid_bps: Some(100),
            dropping_permitted: false,
            max_endpoints: 1,
        }
    }

    fn request() -> TransportRequest {
        TransportRequest {
            bid_bps: 0,
            uses_dropping: false,
            drop_variants_simulated: false,
            endpoints: 1,
        }
    }

    #[test]
    fn labels_are_unique_and_stable() {
        let mut labels: Vec<&str> = Transport::ALL.iter().map(|t| t.as_str()).collect();
        labels.sort_unstable();
        let count = labels.len();
        labels.dedup();
        assert_eq!(labels.len(), count, "transport labels must be unique");
        assert_eq!(Transport::Bundle.as_str(), "bundle");
    }

    #[test]
    fn public_submission_is_never_refund_eligible() {
        for transport in Transport::ALL {
            if !transport.is_private() {
                assert!(
                    !transport.refund_possible(),
                    "{transport} is public and must not be refund eligible"
                );
            }
        }
    }

    #[test]
    fn only_mergeable_bundles_may_drop_transactions() {
        for transport in Transport::ALL {
            assert_eq!(
                transport.permits_transaction_dropping(),
                transport == Transport::BundleMergeable
            );
            if transport.permits_transaction_dropping() {
                assert_eq!(transport.atomicity(), Atomicity::BundlePartial);
            }
        }
    }

    #[test]
    fn bid_bearing_transports_require_a_cap() {
        for transport in Transport::ALL {
            let expected = matches!(transport, Transport::OevAuction | Transport::ExpressLane);
            assert_eq!(transport.requires_bid_cap(), expected);
        }
        let mut uncapped = policy(Transport::OevAuction);
        uncapped.max_bid_bps = None;
        assert_eq!(
            uncapped.evaluate(request()),
            Err(TransportReject::BidCapMissing)
        );
    }

    #[test]
    fn bid_above_cap_is_rejected_and_never_widened() {
        let policy = policy(Transport::OevAuction);
        let mut request = request();
        request.bid_bps = 101;
        assert_eq!(policy.evaluate(request), Err(TransportReject::BidAboveCap));
        request.bid_bps = 100;
        assert_eq!(policy.evaluate(request), Ok(()));
    }

    #[test]
    fn disabled_transport_is_the_first_gate() {
        let mut policy = policy(Transport::OevAuction);
        policy.enabled = false;
        policy.max_bid_bps = None;
        assert_eq!(policy.evaluate(request()), Err(TransportReject::NotEnabled));
    }

    #[test]
    fn dropping_requires_permission_and_simulated_variants() {
        let mut policy = policy(Transport::BundleMergeable);
        let mut request = request();
        request.uses_dropping = true;

        assert_eq!(
            policy.evaluate(request),
            Err(TransportReject::DroppingNotPermitted)
        );

        policy.dropping_permitted = true;
        assert_eq!(
            policy.evaluate(request),
            Err(TransportReject::DropVariantsNotSimulated)
        );

        request.drop_variants_simulated = true;
        assert_eq!(policy.evaluate(request), Ok(()));
    }

    #[test]
    fn plain_bundle_cannot_drop_even_if_permitted() {
        let mut policy = policy(Transport::Bundle);
        policy.dropping_permitted = true;
        let mut request = request();
        request.uses_dropping = true;
        request.drop_variants_simulated = true;
        assert_eq!(
            policy.evaluate(request),
            Err(TransportReject::DroppingNotPermitted)
        );
    }

    #[test]
    fn endpoint_fanout_is_bounded() {
        let policy = policy(Transport::Bundle);
        let mut request = request();
        request.endpoints = 2;
        assert_eq!(
            policy.evaluate(request),
            Err(TransportReject::EndpointFanoutAboveMaximum)
        );
    }

    #[test]
    fn expected_refund_is_not_realized_profit() {
        let mut ledger = RefundLedger::expecting(U256::from(1_000_u64));
        assert_eq!(ledger.realized_wei(), U256::ZERO);
        assert!(ledger.is_short());

        // Observing a payout is still not enough.
        ledger.observe(U256::from(1_000_u64));
        assert_eq!(ledger.realized_wei(), U256::ZERO);
        assert!(ledger.is_short());

        ledger.reconcile(U256::from(1_000_u64));
        assert_eq!(ledger.realized_wei(), U256::from(1_000_u64));
        assert!(!ledger.is_short());
    }

    #[test]
    fn unknown_eligibility_models_zero_refund() {
        let ledger = RefundLedger::none();
        assert_eq!(ledger.expected_wei(), U256::ZERO);
        assert_eq!(ledger.realized_wei(), U256::ZERO);
        assert!(!ledger.is_short());
    }
}
