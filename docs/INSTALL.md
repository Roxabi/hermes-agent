# Install

## Token file template

Per-bot `~/.hermes/bots/<name>/.env` (chmod 600):

```env
CUSTOM_BASE_URL=http://llmcli:18091/v1
OPENAI_API_KEY=<your-llmcli-master-key>
TELEGRAM_BOT_TOKEN=<fill before start>
TELEGRAM_ALLOWED_USERS=<your user id>
```

Per-bot `~/.hermes/bots/<name>/config.yaml`:

```yaml
model:
  default: "kimi-k2.6"
  provider: "custom"
  base_url: "http://llmcli:18091/v1"
```

## Install (M₁)

```bash
# 1. First-time setup
ssh roxabituwer 'git clone git@github.com:Roxabi/hermes-agent.git ~/projects/roxabi-hermes'
ssh roxabituwer 'cd ~/projects/roxabi-hermes && make install-quadlet'

# 2. Fill ~/.hermes/bots/{default,personal}/.env with real tokens

# 3. Start
ssh roxabituwer 'cd ~/projects/roxabi-hermes && make start'

# Subsequent updates
ssh roxabituwer 'cd ~/projects/roxabi-hermes && make sync'
```

`linger` is already set on the user-manager on M₁ → autostart at boot via the
`[Install]` block honored by the Quadlet generator.
