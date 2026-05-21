# hermes-agent (Roxabi fork)

Fork of `nousresearch/hermes-agent` with a Roxabi-specific `deploy/` overlay.
Upstream owns the bot code, **we own `deploy/`**. Mirrors the same pattern as
`lyra/deploy/quadlet/`, `llmCLI/deploy/quadlet/`, `voiceCLI/deploy/quadlet/`,
`imageCLI/deploy/quadlet/`: deploy lives with the project.

## Topology

| Host | Role | What runs here |
|---|---|---|
| `roxabituwer` (M₁, 192.168.1.16) | prod | both Hermes bots (default + personal) as Quadlets |
| `roxabitower` (M₂) | dev | nothing — local llmcli only |
| llmcli portal | inference | `http://192.168.1.16:18091/v1` (OpenAI-compatible) |

Hermes does **not** run on M₂. Provider is the local llmcli portal, not
openrouter — Hermes treats this as a "custom" base URL.

## Remotes

```
origin    → git@github.com:Roxabi/hermes-agent.git          (push-target, fork)
upstream  → https://github.com/nousresearch/hermes-agent     (read-only, Nous)
```

`gh repo view` confirms `fork: true`, parent = `NousResearch/hermes-agent`.

## Upstream sync

```bash
git fetch upstream
git rebase upstream/main          # replay deploy/ commits on top of upstream
git push --force-with-lease origin main
```

Rebase, **not** merge — keeps `deploy/` as a clean linear set of Roxabi commits
at the tip. If upstream conflicts get expensive, the rebase can be dropped and
re-applied selectively.

## Layout (Roxabi-owned only)

```
deploy/
├── README.md                       — install + sync recipe (operator-facing)
└── quadlet/
    ├── hermes-default.container    — primary Telegram identity
    ├── hermes-default.volume       — bind ~/.hermes/bots/default → /opt/data
    ├── hermes-personal.container   — secondary identity
    └── hermes-personal.volume      — bind ~/.hermes/bots/personal → /opt/data
CLAUDE.md                           — this file
```

Everything else in the repo is upstream Nous code — **¬touch** unless syncing
or making a true upstream contribution (in which case branch off `upstream/main`
and PR to Nous directly, not Roxabi).

## Bot isolation pattern

Container is single-instance Hermes (no `-p` flag, no `profiles/` subdir
inside its `HERMES_HOME`). Two bots = two **host bind paths**:

| Bot | Host data dir | Container path |
|---|---|---|
| default | `~/.hermes/bots/default/` | `/opt/data` |
| personal | `~/.hermes/bots/personal/` | `/opt/data` |

The container thinks it's the only Hermes. Isolation lives entirely on the
host side. Named volumes (ADR-053-style in lyra) were tried and broke
credential lookup because host files became inaccessible → switched to
`Type=none + Options=bind`.

## Provider wiring (llmcli portal)

```
Hermes container  →  192.168.1.16:18091  →  llmcli proxy  →  llama-server / Fireworks
                     (M₁ LAN IP)            (Quadlet)
```

Why LAN IP and not `localhost` / `host.containers.internal`:

| Path | Bridge container | Pasta container | Notes |
|---|---|---|---|
| `127.0.0.1:18091` | container loopback ✗ | container loopback ✗ | always wrong inside container |
| `host.containers.internal:18091` | ✗ | ✓ | not visible from bridge networks |
| `192.168.1.16:18091` | ✓ | ✓ | works universally |

Quadlet uses bridge (`systemd-roxabi.network`), so **LAN IP is the only path
that works**. The cleaner long-term fix is to put llmcli on `roxabi.network`
too — filed as llmCLI issue #60.

Env-var Hermes reads (from `hermes_cli/runtime_provider.py:643`):

```
CUSTOM_BASE_URL=http://192.168.1.16:18091/v1
OPENAI_API_KEY=<your-llmcli-master-key>        # when base_url ≠ openrouter, Hermes uses OPENAI_API_KEY
```

## Token file template

Per-bot `~/.hermes/bots/<name>/.env` (chmod 600 — contains a real Telegram token):

```env
CUSTOM_BASE_URL=http://192.168.1.16:18091/v1
OPENAI_API_KEY=<your-llmcli-master-key>
TELEGRAM_BOT_TOKEN=<fill before start>
TELEGRAM_ALLOWED_USERS=<your user id>
```

Per-bot `~/.hermes/bots/<name>/config.yaml`:

```yaml
model:
  default: "kimi-k2.6"
  provider: "custom"
  base_url: "http://192.168.1.16:18091/v1"
```

## Install (M₁)

```bash
# 1. Sync Quadlets to M₁'s user-manager
scp deploy/quadlet/hermes-*.{container,volume} roxabituwer:~/.config/containers/systemd/
ssh roxabituwer 'systemctl --user daemon-reload'

# 2. Fill ~/.hermes/bots/{default,personal}/.env with real tokens (one-off)

# 3. Start — `enable` is a no-op for Quadlets (handled by [Install] block)
ssh roxabituwer 'systemctl --user start hermes-default.service hermes-personal.service'
```

`linger` is already set on the user-manager on M₁ → autostart at boot via the
`[Install]` block honored by the Quadlet generator.

## Operational quick-ref

| Goal | Command |
|---|---|
| Status of both bots | `ssh roxabituwer 'systemctl --user status hermes-default.service hermes-personal.service'` |
| Live logs (default) | `ssh roxabituwer 'journalctl --user -u hermes-default.service -f'` |
| One-off chat (no Telegram, no running container) | `ssh roxabituwer 'podman run --rm -it --network systemd-roxabi --userns=keep-id:uid=10000,gid=10000 -v ~/.hermes/bots/default:/opt/data:z -e CUSTOM_BASE_URL=http://192.168.1.16:18091/v1 -e OPENAI_API_KEY=<your-llmcli-master-key> docker.io/nousresearch/hermes-agent:latest chat'` |
| Attach to running container (Telegram up) | `ssh roxabituwer 'podman exec -it hermes-default hermes chat'` |
| Stop both | `ssh roxabituwer 'systemctl --user stop hermes-default.service hermes-personal.service'` |
| Restart after Quadlet edit | `scp` new file → `daemon-reload` → `systemctl --user restart <svc>` |

One-off and exec sessions share `~/.hermes/bots/default/` state → memories /
sessions persist across both.

## Gotchas

- **Tool data dirs are grandfathered** to `~/.hermes/` (¬`~/.roxabi/hermes/`)
  — Hermes CLI/docs hardcode `~/.hermes/`, so we keep that path. See global
  memory `tool-data-dirs-grandfathered`.
- **Quadlet `enable` is a no-op** for generator-emitted units. Use
  `systemctl --user start` only; persistence is auto-wired. See global memory
  `quadlet-enable-is-noop`.
- **Volume copy-paste trap.** `hermes-personal.volume` MUST point at
  `bots/personal`, not `bots/default`. Both .volume files look identical
  except for that one path — easy to break. Verified fixed in this commit.
- **`localhost` does not mean the host** inside a container. Always use the
  M₁ LAN IP (`192.168.1.16`) when pointing at the llmcli portal.
- **¬`--no-verify` / `--force` / `--hard` / `--amend`** — global Roxabi rule.

## Why a fork (not a separate repo)

Matches the universal Roxabi pattern: every project ships `deploy/quadlet/`
inside its own repo. A separate `roxabi-hermes-deploy` repo would break that
symmetry and split context for the reader. The fork stays cheap to sync (one
rebase) and keeps deploy assets next to the code they deploy.
