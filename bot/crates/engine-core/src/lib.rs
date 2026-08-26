//! Aqua's small, dependency-light safety kernel.
//!
//! This crate intentionally contains no provider, signer, transport, runtime,
//! wall-clock, or secret. EVM-facing crates use Alloy at their boundary; pure
//! decision logic accepts explicit values and can be replayed deterministically.

pub mod capability;
pub mod config;
pub mod risk;
pub mod transport;
pub mod types;

pub use capability::{
    Capability, OracleReject, OracleRow, SvrCoverage, capability_satisfies, permitted_oracle_row,
};
pub use config::{BootConfig, ConfigError, ExecutionMode};
pub use risk::{CandidateRisk, RiskDecision, RiskEnvelope, RiskReason};
pub use transport::{
    Atomicity, OrderingPayment, RefundLedger, Transport, TransportPolicy, TransportReject,
    TransportRequest,
};
pub use types::{BlockIdentity, CandidateId, Lane, StateIdentity};
