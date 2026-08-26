use aqua_engine_core::{
    BootConfig, Capability, ExecutionMode, OracleRow, SvrCoverage, Transport, permitted_oracle_row,
};

fn main() {
    let command = std::env::args().nth(1).unwrap_or_else(|| "help".into());
    match command.as_str() {
        "doctor" => doctor(),
        "capabilities" => capabilities(),
        "help" | "--help" | "-h" => help(),
        other => {
            eprintln!("unknown command: {other}");
            help();
            std::process::exit(2);
        }
    }
}

fn doctor() {
    match BootConfig::from_env() {
        Ok(config) => {
            let mode = match config.mode {
                ExecutionMode::Simulation => "simulation",
                ExecutionMode::Live => "live",
            };
            println!(
                "OK config parsed: chain_id={}, mode={mode}",
                config.chain_id
            );

            // Fail-closed defaults, stated explicitly so an operator can see
            // them without reading the source.
            let default_row = permitted_oracle_row(&[SvrCoverage::default()], false);
            println!(
                "OK oracle default: coverage={} -> {}",
                SvrCoverage::default(),
                match default_row {
                    Ok(row) => row.as_str(),
                    Err(_) => "rejected (fail-closed)",
                }
            );
            debug_assert!(default_row.is_err());

            println!(
                "OK transports known: {}",
                Transport::ALL
                    .iter()
                    .map(|t| t.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            );
            println!("OK no transport is enabled; there is no submission code to enable.");

            println!(
                "NOT IMPLEMENTED: RPC, registry signature/code checks, Anvil, storage, and transports."
            );
            println!("No network request and no signing was performed.");
        }
        Err(error) => {
            eprintln!("FAIL config: {error}");
            std::process::exit(1);
        }
    }
}

/// Print the closed capability and transport surface. Read-only; no registry
/// is loaded and no address is known to this binary.
fn capabilities() {
    println!("capabilities (version-specific; v3 never satisfies v4):");
    for capability in Capability::ALL {
        let note = if capability.parameters_may_change_without_vote() {
            "  [parameters may change without a governance vote; never cache]"
        } else {
            ""
        };
        println!("  {capability}{note}");
    }

    println!("\ntransports (closed enum; no generic send exists):");
    for transport in Transport::ALL {
        println!(
            "  {:<18} atomicity={:?} private={} refundable={} droppable={} bid_capped={}",
            transport.as_str(),
            transport.atomicity(),
            transport.is_private(),
            transport.refund_possible(),
            transport.permits_transaction_dropping(),
            transport.requires_bid_cap(),
        );
    }

    println!("\noracle row resolution:");
    for (label, feeds, venue) in [
        ("unknown coverage", vec![SvrCoverage::Unknown], true),
        ("covered, venue reviewed", vec![SvrCoverage::Covered], true),
        ("covered, no venue", vec![SvrCoverage::Covered], false),
        ("uncovered", vec![SvrCoverage::Uncovered], false),
    ] {
        let outcome = match permitted_oracle_row(&feeds, venue) {
            Ok(OracleRow::OevAuction) => "bid into recapture auction".to_string(),
            Ok(OracleRow::BackrunUncovered) => "conventional backrun permitted".to_string(),
            Err(reject) => format!("REJECTED: {reject:?}"),
        };
        println!("  {label:<24} -> {outcome}");
    }
}

fn help() {
    println!("aqua — foundation only; no execution path exists");
    println!("\nUSAGE:\n    aqua doctor\n    aqua capabilities\n");
    println!("doctor        validates fail-closed boot configuration without contacting a chain.");
    println!("capabilities  prints the closed capability/transport surface and oracle gating.");
}
