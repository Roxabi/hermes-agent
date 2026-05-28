# hermes-agent (Roxabi fork)

Fork of `nousresearch/hermes-agent` with a Roxabi-specific `deploy/` overlay.
Upstream owns the bot code, **we own `deploy/`**. See [deploy/README.md](deploy/README.md)
for install, ops, and why a fork.

## Topology

| Host | Role | What runs here |
|---|---|---|
| `roxabituwer` (M₁, 192.168.1.16) | prod | both Hermes bots (default + personal) as Quadlets |
| `roxabitower` (M₂) | dev | nothing — local llmcli only |
| llmcli portal | inference | `http://llmcli:18091/v1` from containers (bridge DNS) |

## Remotes

```
origin    → git@github.com:Roxabi/hermes-agent.git          (push-target, fork)
upstream  → https://github.com/nousresearch/hermes-agent     (read-only, Nous)
```

## Upstream sync

```bash
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin main
```

## Layout (Roxabi-owned)

```
deploy/
├── README.md
└── quadlet/
    ├── hermes-default.{container,volume}
    └── hermes-personal.{container,volume}
```

Everything else is upstream Nous code — **¬touch** unless syncing or making a true
upstream contribution (branch off `upstream/main`, PR to Nous).

## Bot isolation

Two bots = two host bind paths. Each container is single-instance Hermes.

| Bot | Host data dir | Container path |
|---|---|---|
| default | `~/.hermes/bots/default/` | `/opt/data` |
| personal | `~/.hermes/bots/personal/` | `/opt/data` |

## Provider wiring

```
Hermes container → llmcli:18091 → llmcli proxy → llama-server / Fireworks
```

Env vars: `CUSTOM_BASE_URL=http://llmcli:18091/v1`, `OPENAI_API_KEY=<llmcli-master-key>`.

See [docs/NETWORKING.md](docs/NETWORKING.md) for the `host.containers.internal` history.

## Gotchas

- Tool data dirs are grandfathered to `~/.hermes/` — see global memory `tool-data-dirs-grandfathered`.
- Quadlet `enable` is a no-op — see global memory `quadlet-enable-is-noop`.
- Volume copy-paste trap: `hermes-personal.volume` MUST point at `bots/personal`, not `bots/default`.
- `localhost` is not the host inside a container. Use `llmcli:18091` (bridge DNS).
- **¬`--no-verify` / `--force` / `--hard` / `--amend`** — global Roxabi rule.
