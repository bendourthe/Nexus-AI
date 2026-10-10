# Installer Repair and Runtime State

The installer owns dependency provisioning and repair. `diffusion_venv_provisioner.py` owns the versioned repair lease; `runtime_provisioner.py` atomically publishes the installer's runtime-readiness snapshot. `runtimes/diffusion/repair.py` records desktop repair attempts in the same runtime contract.

The lease identifies its process by PID plus process-start identity and attempt nonce. A stale record is reclaimed only after ownership is disproved. Desktop repair records a `repairing` attempt, publishes `ready` after its backend smoke succeeds, or records `failed` with a failure code. An interrupted attempt remains visible for recovery.

Hugging Face repository, revision, exact file path, and gated status are catalog data. Run the catalog reachability checker as a packaging qualification step; the Windows build script does not invoke it automatically. Public models never open an authorization dialog. Genuine gated models use explicit account, license, sign-in, device-code, copy, manual-token, and skip controls.
