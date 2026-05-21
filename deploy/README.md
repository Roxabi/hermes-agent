# Roxabi deploy/ overlay

This directory holds **Roxabi-specific deployment artifacts** layered on top of
`nousresearch/hermes-agent`. The upstream Nous repo does not own these files —
they are pushed to the Roxabi fork (`github.com/Roxabi/hermes-agent`) so they
get versioned alongside the bot stack we run on the home tailnet.

Mirrors the same pattern as `lyra/deploy/quadlet/`, `llmCLI/deploy/quadlet/`,
`voiceCLI/deploy/quadlet/`, `imageCLI/deploy/quadlet/`: **deploy/ lives with
the project**.

## Layout

```
deploy/
└── quadlet/
    ├── hermes-default.container   # default bot — Telegram gateway, points at llmcli portal
    ├── hermes-default.volume      # bind-mount ~/.hermes/bots/default → /opt/data
    ├── hermes-personal.container  # personal bot — second identity, separate token
    └── hermes-personal.volume     # bind-mount ~/.hermes/bots/personal → /opt/data
```

Isolation between the two bots comes from distinct host bind paths — the
container itself is single-instance Hermes (no `-p` flag, no `profiles/`
subdir). See `hermes-personal.container` inline comments for the wiring.

## Install (on M₁, the only host currently running Hermes)

```bash
scp deploy/quadlet/hermes-*.{container,volume} roxabituwer:~/.config/containers/systemd/
ssh roxabituwer 'systemctl --user daemon-reload'

# Per bot, fill ~/.hermes/bots/<name>/.env (chmod 600) before first start:
#   CUSTOM_BASE_URL=http://192.168.1.16:18091/v1
#   OPENAI_API_KEY=<your-llmcli-master-key>
#   TELEGRAM_BOT_TOKEN=<real token>
#   TELEGRAM_ALLOWED_USERS=<user id>

ssh roxabituwer 'systemctl --user start hermes-default.service hermes-personal.service'
```

`enable` is a no-op for Quadlet-generated units — persistence is wired by the
Quadlet generator from the `[Install]` block. `linger` on the user manager
handles boot-time autostart.

## Upstream sync

The fork tracks `nousresearch/hermes-agent` via the `upstream` remote. To pull
new changes from Nous and keep our `deploy/` on top:

```bash
cd ~/projects/hermes-agent
git fetch upstream
git rebase upstream/main          # replay our deploy/ commits on top of upstream
git push --force-with-lease origin main
```

Rebase (not merge) keeps `deploy/` as a single linear set of Roxabi commits at
the tip — easy to inspect, easy to drop if upstream conflicts get expensive.

## Why a fork, not a separate repo

- Matches the pattern every other Roxabi project follows (`deploy/quadlet/`
  lives inside the project repo).
- `gh browse` and CI tooling see the deploy assets next to the code they
  deploy — no second-repo lookup.
- Upstream sync stays a single `git rebase` away.
