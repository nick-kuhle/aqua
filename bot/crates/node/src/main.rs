use aqua_engine_core::{BootConfig, ExecutionMode};

fn main() {
    let command = std::env::args().nth(1).unwrap_or_else(|| "help".into());
    match command.as_str() {
        "doctor" => doctor(),
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

fn help() {
    println!("aqua — foundation only; no execution path exists");
    println!("\nUSAGE:\n    aqua doctor\n");
    println!("doctor validates fail-closed boot configuration without contacting a chain.");
}
