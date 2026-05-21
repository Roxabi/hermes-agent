# Roxabi deploy Makefile for the hermes-agent fork.
#
# Upstream nousresearch/hermes-agent has no Makefile — this file is Roxabi-only
# and only operates on deploy/. Never touches upstream Hermes code.
#
# Usage on M₁ (after clone):
#   make install-quadlet
#   # fill ~/.hermes/bots/{default,personal}/.env with real tokens
#   make start
#
# Usage to push changes from devbox:
#   git push origin main
#   ssh roxabituwer 'cd ~/projects/roxabi-hermes && git pull && make install-quadlet'

QUADLET_DIR  := $(HOME)/.config/containers/systemd
BOTS_DIR     := $(HOME)/.hermes/bots
BOTS         := default personal

QUADLET_SRC  := deploy/quadlet
UNITS        := $(addprefix hermes-,$(addsuffix .container,$(BOTS))) \
                $(addprefix hermes-,$(addsuffix .volume,$(BOTS)))
SERVICES     := $(addprefix hermes-,$(addsuffix .service,$(BOTS)))

.PHONY: install-quadlet uninstall-quadlet start stop restart status logs sync help

help:
	@echo "Roxabi hermes-agent deploy targets:"
	@echo "  install-quadlet    install/refresh Quadlets + ensure bot dirs + daemon-reload"
	@echo "  uninstall-quadlet  remove Quadlets (¬touch ~/.hermes data)"
	@echo "  start              start both bots"
	@echo "  stop               stop both bots"
	@echo "  restart            restart both bots"
	@echo "  status             systemctl status for both bots"
	@echo "  logs               journalctl -f for both bots"
	@echo "  sync               git pull + install-quadlet + restart (operator one-shot)"

install-quadlet:
	@mkdir -p $(QUADLET_DIR)
	@for bot in $(BOTS); do mkdir -p $(BOTS_DIR)/$$bot && chmod 700 $(BOTS_DIR)/$$bot ; done
	@for unit in $(UNITS); do install -m 644 $(QUADLET_SRC)/$$unit $(QUADLET_DIR)/$$unit ; done
	@systemctl --user daemon-reload
	@echo "Installed. Next steps:"
	@echo "  1. Ensure ~/.hermes/bots/<bot>/.env exists (chmod 600) with TELEGRAM_BOT_TOKEN + OPENAI_API_KEY"
	@echo "  2. make start"

uninstall-quadlet:
	@for unit in $(UNITS); do rm -f $(QUADLET_DIR)/$$unit ; done
	@systemctl --user daemon-reload
	@echo "Uninstalled. ~/.hermes/bots/ data preserved."

start:
	@systemctl --user start $(SERVICES)

stop:
	@systemctl --user stop $(SERVICES)

restart:
	@systemctl --user restart $(SERVICES)

status:
	@systemctl --user status --no-pager $(SERVICES) || true

logs:
	@journalctl --user -u hermes-default.service -u hermes-personal.service -f

sync:
	@git pull origin main
	@$(MAKE) install-quadlet
	@$(MAKE) restart
