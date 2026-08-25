use alloy_primitives::U256;
use core::fmt;
use std::{collections::BTreeMap, env};

const FORBIDDEN_NAMES: &[&str] = &[
    "MIN_NET_PROFIT_ETH",
    "MAX_BASE_FEE_GWEI",
    "MAX_DRAWDOWN_ETH",
    "BUILDER_SHARE_BPS",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ExecutionMode {
    Simulation,
    Live,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BootConfig {
    pub chain_id: u64,
    pub rpc_http_url: String,
    pub mode: ExecutionMode,
    pub broadcast_enabled: bool,
    pub min_net_profit_wei: U256,
    pub protocol_registry_path: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ConfigError {
    ForbiddenNamePresent(&'static str),
    Missing(&'static str),
    Invalid { key: &'static str, value: String },
    LiveAcknowledgementMissing,
    LiveBroadcastDisabled,
    LiveRegistryMissing,
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ForbiddenNamePresent(key) => {
                write!(f, "forbidden environment name present: {key}")
            }
            Self::Missing(key) => write!(f, "required environment name missing: {key}"),
            Self::Invalid { key, value } => write!(f, "invalid {key}: {value}"),
            Self::LiveAcknowledgementMissing => {
                f.write_str("live mode requires I_UNDERSTAND_LIVE_RISK=yes")
            }
            Self::LiveBroadcastDisabled => f.write_str("live mode requires BROADCAST_ENABLED=true"),
            Self::LiveRegistryMissing => f.write_str("live mode requires PROTOCOL_REGISTRY_PATH"),
        }
    }
}

impl std::error::Error for ConfigError {}

impl BootConfig {
    /// Construct from an injected map so tests never mutate process environment.
    pub fn from_map(values: &BTreeMap<String, String>) -> Result<Self, ConfigError> {
        for name in FORBIDDEN_NAMES {
            if values.contains_key(*name) {
                return Err(ConfigError::ForbiddenNamePresent(name));
            }
        }
        let chain_id_raw = required(values, "CHAIN_ID")?;
        let chain_id = chain_id_raw.parse().map_err(|_| ConfigError::Invalid {
            key: "CHAIN_ID",
            value: chain_id_raw.to_owned(),
        })?;
        let rpc_http_url = required(values, "ETH_HTTP_URL")?.to_owned();
        if !(rpc_http_url.starts_with("https://") || rpc_http_url.starts_with("http://")) {
            return Err(ConfigError::Invalid {
                key: "ETH_HTTP_URL",
                value: rpc_http_url,
            });
        }
        let live = optional(values, "LIVE_EXECUTION") == Some("true");
        let broadcast_enabled = optional(values, "BROADCAST_ENABLED") == Some("true");
        let mode = if live {
            ExecutionMode::Live
        } else {
            ExecutionMode::Simulation
        };
        let min_net_profit_wei = parse_u256(
            required(values, "MIN_NET_PROFIT_WEI")?,
            "MIN_NET_PROFIT_WEI",
        )?;
        let protocol_registry_path =
            optional(values, "PROTOCOL_REGISTRY_PATH").map(ToOwned::to_owned);

        if live && optional(values, "I_UNDERSTAND_LIVE_RISK") != Some("yes") {
            return Err(ConfigError::LiveAcknowledgementMissing);
        }
        if live && !broadcast_enabled {
            return Err(ConfigError::LiveBroadcastDisabled);
        }
        if live && protocol_registry_path.is_none() {
            return Err(ConfigError::LiveRegistryMissing);
        }
        Ok(Self {
            chain_id,
            rpc_http_url,
            mode,
            broadcast_enabled,
            min_net_profit_wei,
            protocol_registry_path,
        })
    }

    pub fn from_env() -> Result<Self, ConfigError> {
        Self::from_map(&env::vars().collect())
    }
}

fn required<'a>(
    values: &'a BTreeMap<String, String>,
    key: &'static str,
) -> Result<&'a str, ConfigError> {
    values
        .get(key)
        .map(String::as_str)
        .filter(|value| !value.is_empty())
        .ok_or(ConfigError::Missing(key))
}

fn optional<'a>(values: &'a BTreeMap<String, String>, key: &str) -> Option<&'a str> {
    values
        .get(key)
        .map(String::as_str)
        .filter(|value| !value.is_empty())
}

fn parse_u256(value: &str, key: &'static str) -> Result<U256, ConfigError> {
    value.parse::<U256>().map_err(|_| ConfigError::Invalid {
        key,
        value: value.to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> BTreeMap<String, String> {
        BTreeMap::from([
            ("CHAIN_ID".into(), "1".into()),
            ("ETH_HTTP_URL".into(), "https://rpc.example".into()),
            ("MIN_NET_PROFIT_WEI".into(), "1".into()),
            ("LIVE_EXECUTION".into(), "false".into()),
            ("BROADCAST_ENABLED".into(), "false".into()),
        ])
    }

    #[test]
    fn simulation_boot_needs_no_live_acknowledgement() {
        let config = BootConfig::from_map(&base()).unwrap();
        assert_eq!(config.mode, ExecutionMode::Simulation);
        assert!(!config.broadcast_enabled);
    }

    #[test]
    fn forbidden_human_units_fail_boot() {
        let mut values = base();
        values.insert("MAX_BASE_FEE_GWEI".into(), "10".into());
        assert_eq!(
            BootConfig::from_map(&values),
            Err(ConfigError::ForbiddenNamePresent("MAX_BASE_FEE_GWEI"))
        );
    }

    #[test]
    fn live_needs_all_independent_gates() {
        let mut values = base();
        values.insert("LIVE_EXECUTION".into(), "true".into());
        assert_eq!(
            BootConfig::from_map(&values),
            Err(ConfigError::LiveAcknowledgementMissing)
        );
        values.insert("I_UNDERSTAND_LIVE_RISK".into(), "yes".into());
        assert_eq!(
            BootConfig::from_map(&values),
            Err(ConfigError::LiveBroadcastDisabled)
        );
        values.insert("BROADCAST_ENABLED".into(), "true".into());
        assert_eq!(
            BootConfig::from_map(&values),
            Err(ConfigError::LiveRegistryMissing)
        );
        values.insert("PROTOCOL_REGISTRY_PATH".into(), "registry.json".into());
        assert_eq!(
            BootConfig::from_map(&values).unwrap().mode,
            ExecutionMode::Live
        );
    }
}
