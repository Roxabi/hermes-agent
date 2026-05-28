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

First-time setup — clone the fork on M₁ and run the Makefile target:

```bash
ssh roxabituwer 'git clone git@github.com:Roxabi/hermes-agent.git ~/projects/roxabi-hermes'
ssh roxabituwer 'cd ~/projects/roxabi-hermes && make install-quadlet'

# Per bot, fill ~/.hermes/bots/<name>/.env (chmod 600) before first start:
#   CUSTOM_BASE_URL=http://llmcli:18091/v1
#   OPENAI_API_KEY=<your-llmcli-master-key>
#   TELEGRAM_BOT_TOKEN=<real token>
#   TELEGRAM_ALLOWED_USERS=<user id>
#
# Also create ~/.hermes/bots/<name>/config.yaml — see docs/INSTALL.md for the full template.

ssh roxabituwer 'cd ~/projects/roxabi-hermes && make start'
```

Subsequent updates (after pushing changes to `origin/main`):

```bash
ssh roxabituwer 'cd ~/projects/roxabi-hermes && make sync'   # git pull + install-quadlet + restart
```

`enable` is a no-op for Quadlet-generated units — persistence is wired by the
Quadlet generator from the `[Install]` block. `linger` on the user manager
handles boot-time autostart.

Makefile targets: `install-quadlet`, `uninstall-quadlet`, `start`, `stop`,
`restart`, `status`, `logs`, `sync`. Run `make help` for the list.

## Upstream sync

The fork tracks `nousresearch/hermes-agent` via the `upstream` remote. To pull
new changes from Nous and keep our `deploy/` on top:

```bash
cd ~/projects/roxabi-hermes
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

## Operational quick-ref

All commands assume `~/projects/roxabi-hermes` is cloned on M₁.

| Goal | Command |
|---|---|
| Status of both bots | `ssh roxabituwer 'cd ~/projects/roxabi-hermes && make status'` |
| Live logs (both bots) | `ssh roxabituwer 'cd ~/projects/roxabi-hermes && make logs'` |
| Stop both | `ssh roxabituwer 'cd ~/projects/roxabi-hermes && make stop'` |
| Restart both | `ssh roxabituwer 'cd ~/projects/roxabi-hermes && make restart'` |
| Pull + reinstall + restart | `ssh roxabituwer 'cd ~/projects/roxabi-hermes && make sync'` |
| One-off chat (no Telegram, no running container) | `ssh roxabituwer 'podman run --rm -it --network systemd-roxabi --userns=keep-id:uid=10000,gid=10000 -v ~/.hermes/bots/default:/opt/data:z -e CUSTOM_BASE_URL=http://llmcli:18091/v1 -e OPENAI_API_KEY=<your-llmcli-master-key> docker.io/nousresearch/hermes-agent:latest chat'` |
| Attach to running container (Telegram up) | `ssh roxabituwer 'podman exec -it hermes-default hermes chat'` |

One-off and exec sessions share `~/.hermes/bots/default/` state → memories /
sessions persist across both.
