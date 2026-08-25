use alloy_primitives::U256;

/// Immutable-at-boot upper bounds. Runtime controls may narrow but never widen
/// this envelope. Values are wei, never human denominations.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RiskEnvelope {
    pub min_net_profit_wei: U256,
    pub max_position_wei: U256,
    pub max_base_fee_wei: U256,
    pub max_inflight: u32,
}

/// Inputs must come from the same pinned state/simulation record that produced
/// the payload. This type deliberately does not accept estimates from a UI.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CandidateRisk {
    pub net_profit_wei: U256,
    pub notional_wei: U256,
    pub base_fee_wei: U256,
    pub inflight: u32,
    pub exact_payload_simulated: bool,
    pub registry_attested: bool,
    pub qualified: bool,
    pub execution_armed: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskReason {
    NotArmed,
    NotQualified,
    RegistryNotAttested,
    ExactPayloadNotSimulated,
    ProfitBelowMinimum,
    PositionAboveMaximum,
    BaseFeeAboveMaximum,
    InflightLimitReached,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RiskDecision {
    Allow,
    Reject(RiskReason),
}

impl RiskEnvelope {
    /// Evaluate in stable safety order. The first rejection is persisted as the
    /// operator-facing reason; callers may collect all reasons separately.
    pub fn evaluate(&self, candidate: CandidateRisk) -> RiskDecision {
        if !candidate.execution_armed {
            return RiskDecision::Reject(RiskReason::NotArmed);
        }
        if !candidate.qualified {
            return RiskDecision::Reject(RiskReason::NotQualified);
        }
        if !candidate.registry_attested {
            return RiskDecision::Reject(RiskReason::RegistryNotAttested);
        }
        if !candidate.exact_payload_simulated {
            return RiskDecision::Reject(RiskReason::ExactPayloadNotSimulated);
        }
        if candidate.net_profit_wei < self.min_net_profit_wei {
            return RiskDecision::Reject(RiskReason::ProfitBelowMinimum);
        }
        if candidate.notional_wei > self.max_position_wei {
            return RiskDecision::Reject(RiskReason::PositionAboveMaximum);
        }
        if candidate.base_fee_wei > self.max_base_fee_wei {
            return RiskDecision::Reject(RiskReason::BaseFeeAboveMaximum);
        }
        if candidate.inflight >= self.max_inflight {
            return RiskDecision::Reject(RiskReason::InflightLimitReached);
        }
        RiskDecision::Allow
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn envelope() -> RiskEnvelope {
        RiskEnvelope {
            min_net_profit_wei: U256::from(10_u64),
            max_position_wei: U256::from(100_u64),
            max_base_fee_wei: U256::from(20_u64),
            max_inflight: 2,
        }
    }

    fn candidate() -> CandidateRisk {
        CandidateRisk {
            net_profit_wei: U256::from(10_u64),
            notional_wei: U256::from(100_u64),
            base_fee_wei: U256::from(20_u64),
            inflight: 1,
            exact_payload_simulated: true,
            registry_attested: true,
            qualified: true,
            execution_armed: true,
        }
    }

    #[test]
    fn accepts_only_a_fully_gated_candidate() {
        assert_eq!(envelope().evaluate(candidate()), RiskDecision::Allow);
    }

    #[test]
    fn execution_arm_is_the_first_gate() {
        let mut c = candidate();
        c.execution_armed = false;
        c.net_profit_wei = U256::ZERO;
        assert_eq!(
            envelope().evaluate(c),
            RiskDecision::Reject(RiskReason::NotArmed)
        );
    }

    #[test]
    fn inflight_cap_is_exclusive() {
        let mut c = candidate();
        c.inflight = 2;
        assert_eq!(
            envelope().evaluate(c),
            RiskDecision::Reject(RiskReason::InflightLimitReached)
        );
    }
}
