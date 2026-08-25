use alloy_primitives::{Address, B256, U256};
use core::fmt;

/// A unique candidate key. It is intentionally not a transaction hash.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct CandidateId(pub B256);

/// A named signing/nonce/risk domain. Lanes never share a nonce allocator.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Lane {
    Intent,
    Sidecar,
}

impl Lane {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Intent => "intent",
            Self::Sidecar => "sidecar",
        }
    }
}

/// Canonical block identity. A number without a hash is insufficient for a
/// profitable decision because a reorg can retain the number and replace state.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct BlockIdentity {
    pub number: u64,
    pub hash: B256,
}

/// The complete identity of the state used for an economic decision.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct StateIdentity {
    pub chain_id: u64,
    pub block: BlockIdentity,
}

/// Inputs that bind an exact candidate to its pre-send state and lane.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CandidateBinding {
    pub id: CandidateId,
    pub lane: Lane,
    pub state: StateIdentity,
    pub signer: Address,
    pub expected_net_profit_wei: U256,
    pub notional_wei: U256,
}

impl fmt::Display for Lane {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lanes_are_stable_operator_labels() {
        assert_eq!(Lane::Intent.as_str(), "intent");
        assert_eq!(Lane::Sidecar.as_str(), "sidecar");
    }
}
