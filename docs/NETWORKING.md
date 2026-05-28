# Networking

## Why NOT `host.containers.internal` anymore

Originally llmcli ran on **pasta** rootless networking only (host port
`0.0.0.0:18091` in its userns) while Hermes ran on the bridge `systemd-roxabi`.
Cross-network-mode routing in rootless Podman only worked via
`host.containers.internal:18091` — tracked as llmCLI issue #60. That issue
was resolved by joining llmcli to `roxabi.network`, so container-name DNS
(`llmcli:18091`) is now the canonical path. From a bridge container,
`host.containers.internal:18091` is no longer reachable (verified
2026-05-22 — `curl` returns `000`).
