#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
#  autoAnsible.sh — End-to-end EC2 deploy pipeline
#
#  Usage:
#    ./autoAnsible.sh                 Full run (terraform + ansible)
#    ./autoAnsible.sh --skip-terraform  Skip terraform, run ansible only
#    ./autoAnsible.sh --dry-run         Show steps without executing
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Resolve paths relative to this script ────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$SCRIPT_DIR/.key/ec2-iit-pair"
INVENTORY="$SCRIPT_DIR/ansible/inventory.ini"
PLAYBOOK="$SCRIPT_DIR/ansible/playbook.yml"
CONTAINERS="$SCRIPT_DIR/ansible/containers.yml"

# ─── Colours & symbols ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

TICK="${GREEN}✓${RESET}"
CROSS="${RED}✗${RESET}"

# ─── Flags ────────────────────────────────────────────────────
SKIP_TERRAFORM=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-terraform) SKIP_TERRAFORM=true ;;
    --dry-run)        DRY_RUN=true ;;
    -h|--help)
      echo "Usage: $0 [--skip-terraform] [--dry-run] [-h|--help]"
      exit 0 ;;
    *)
      echo -e "${RED}Unknown flag:${RESET} $arg"
      exit 1 ;;
  esac
done

# ─── Helper functions ────────────────────────────────────────

banner() {
  local msg="$1"
  local width=60
  echo ""
  echo -e "${CYAN}$(printf '═%.0s' $(seq 1 $width))${RESET}"
  echo -e "${BOLD}${CYAN}  $msg${RESET}"
  echo -e "${CYAN}$(printf '═%.0s' $(seq 1 $width))${RESET}"
}

step_start() {
  echo -e "\n${YELLOW}▶${RESET} ${BOLD}$1${RESET}"
  STEP_START_TIME=$(date +%s)
}

step_pass() {
  local elapsed=$(( $(date +%s) - STEP_START_TIME ))
  echo -e "  ${TICK}  $1 ${DIM}(${elapsed}s)${RESET}"
}

step_fail() {
  local elapsed=$(( $(date +%s) - STEP_START_TIME ))
  echo -e "  ${CROSS}  $1 ${DIM}(${elapsed}s)${RESET}"
  echo -e "\n${RED}${BOLD}Pipeline aborted.${RESET}"
  exit 1
}

# Track overall time
PIPELINE_START=$(date +%s)
INSTANCE_IP=""

# ──────────────────────────────────────────────────────────────
#  HEADER
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}"
echo "   ╔═══════════════════════════════════════════════════╗"
echo "   ║          🚀  autoAnsible  —  EC2 Deploy          ║"
echo "   ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${DIM}Script  :${RESET} $SCRIPT_DIR/autoAnsible.sh"
echo -e "  ${DIM}Key     :${RESET} $KEY_FILE"
echo -e "  ${DIM}Inventory:${RESET} $INVENTORY"
echo -e "  ${DIM}Flags   :${RESET} skip-terraform=$SKIP_TERRAFORM  dry-run=$DRY_RUN"
echo ""

if $DRY_RUN; then
  echo -e "${YELLOW}${BOLD}  ⚠  DRY RUN — nothing will be executed${RESET}\n"
fi

# ──────────────────────────────────────────────────────────────
#  STEP 1 — Terraform Validate
# ──────────────────────────────────────────────────────────────
if ! $SKIP_TERRAFORM; then
  banner "Step 1/7 · Terraform Validate"

  if $DRY_RUN; then
    echo -e "  ${DIM}[dry-run] Would run: terraform -chdir=$SCRIPT_DIR validate${RESET}"
  else
    step_start "Validating Terraform configuration…"
    if terraform -chdir="$SCRIPT_DIR" validate; then
      step_pass "Terraform config is valid"
    else
      step_fail "Terraform validation failed"
    fi
  fi

# ──────────────────────────────────────────────────────────────
#  STEP 2 — Terraform Apply
# ──────────────────────────────────────────────────────────────
  banner "Step 2/7 · Terraform Apply"

  if $DRY_RUN; then
    echo -e "  ${DIM}[dry-run] Would run: terraform -chdir=$SCRIPT_DIR apply -auto-approve${RESET}"
  else
    step_start "Applying Terraform changes (this may take a few minutes)…"
    if terraform -chdir="$SCRIPT_DIR" apply -auto-approve; then
      step_pass "Terraform apply succeeded"
    else
      step_fail "Terraform apply failed"
    fi
  fi

# ──────────────────────────────────────────────────────────────
#  STEP 3 — Extract Instance IP
# ──────────────────────────────────────────────────────────────
  banner "Step 3/7 · Extract Instance IP"

  if $DRY_RUN; then
    echo -e "  ${DIM}[dry-run] Would run: terraform -chdir=$SCRIPT_DIR output -raw instance_public_ip${RESET}"
    INSTANCE_IP="<DRY-RUN-IP>"
  else
    step_start "Reading public IP from Terraform output…"
    INSTANCE_IP=$(terraform -chdir="$SCRIPT_DIR" output -raw instance_public_ip 2>/dev/null) || true

    if [[ -z "$INSTANCE_IP" ]]; then
      step_fail "Could not extract instance IP from Terraform output"
    fi
    step_pass "Instance IP: ${BOLD}$INSTANCE_IP${RESET}"
  fi

else
  # ── Skip-terraform: read IP from existing state ─────────────
  banner "Steps 1-3 · Skipped (--skip-terraform)"
  echo -e "  ${DIM}Reading IP from existing Terraform state…${RESET}"

  if $DRY_RUN; then
    INSTANCE_IP="<DRY-RUN-IP>"
  else
    INSTANCE_IP=$(terraform -chdir="$SCRIPT_DIR" output -raw instance_public_ip 2>/dev/null) || true
    if [[ -z "$INSTANCE_IP" ]]; then
      step_start "Falling back to inventory.ini"
      INSTANCE_IP=$(grep -v '^\s*#' "$INVENTORY" | grep -v '^\s*\[' | head -1 | awk '{print $1}')
      if [[ -z "$INSTANCE_IP" ]]; then
        step_fail "No IP found in Terraform state or inventory.ini"
      fi
      step_pass "Using IP from inventory: ${BOLD}$INSTANCE_IP${RESET}"
    else
      echo -e "  ${TICK}  Terraform state IP: ${BOLD}$INSTANCE_IP${RESET}"
    fi
  fi
fi

# ──────────────────────────────────────────────────────────────
#  STEP 4 — Update inventory.ini
# ──────────────────────────────────────────────────────────────
banner "Step 4/7 · Update Ansible Inventory"

INVENTORY_LINE="$INSTANCE_IP ansible_user=ubuntu ansible_ssh_private_key_file=$KEY_FILE"

if $DRY_RUN; then
  echo -e "  ${DIM}[dry-run] Would write to $INVENTORY:${RESET}"
  echo -e "  ${DIM}  [webservers]${RESET}"
  echo -e "  ${DIM}  $INVENTORY_LINE${RESET}"
else
  step_start "Writing $INSTANCE_IP to inventory.ini…"
  cat > "$INVENTORY" <<EOF
[webservers]
$INVENTORY_LINE
EOF
  step_pass "Inventory updated"
  echo -e "  ${DIM}  → $INVENTORY${RESET}"
fi

# ──────────────────────────────────────────────────────────────
#  STEP 5 — SSH Readiness Check
# ──────────────────────────────────────────────────────────────
banner "Step 5/7 · SSH Readiness Check"

MAX_ATTEMPTS=60
SLEEP_SECONDS=5

if $DRY_RUN; then
  echo -e "  ${DIM}[dry-run] Would poll SSH on $INSTANCE_IP (up to ${MAX_ATTEMPTS} attempts, ${SLEEP_SECONDS}s apart)${RESET}"
else
  step_start "Waiting for SSH on $INSTANCE_IP (up to $(( MAX_ATTEMPTS * SLEEP_SECONDS / 60 )) min)…"

  attempt=0
  while (( attempt < MAX_ATTEMPTS )); do
    attempt=$(( attempt + 1 ))
    if ssh -o StrictHostKeyChecking=no \
         -o UserKnownHostsFile=/dev/null \
         -o ConnectTimeout=5 \
         -o BatchMode=yes \
         -i "$KEY_FILE" \
         "ubuntu@$INSTANCE_IP" "echo ok" &>/dev/null; then
      step_pass "SSH is ready  (attempt $attempt/$MAX_ATTEMPTS)"
      break
    fi
    printf "\r  ${DIM}  Attempt %d/%d — waiting…${RESET}" "$attempt" "$MAX_ATTEMPTS"
    sleep "$SLEEP_SECONDS"
  done

  if (( attempt >= MAX_ATTEMPTS )); then
    echo ""
    step_fail "SSH did not become available within $(( MAX_ATTEMPTS * SLEEP_SECONDS ))s"
  fi
fi

# ──────────────────────────────────────────────────────────────
#  STEP 6 — Ansible Playbook (playbook.yml)
# ──────────────────────────────────────────────────────────────
banner "Step 6/7 · Ansible Playbook — playbook.yml"

if $DRY_RUN; then
  echo -e "  ${DIM}[dry-run] Would run: ansible-playbook -i $INVENTORY $PLAYBOOK${RESET}"
else
  step_start "Running playbook.yml (system deps, Docker, Nginx)…"
  if ansible-playbook -i "$INVENTORY" "$PLAYBOOK"; then
    step_pass "playbook.yml completed"
  else
    step_fail "playbook.yml failed"
  fi
fi

# ──────────────────────────────────────────────────────────────
#  STEP 7 — Ansible Playbook (containers.yml)
# ──────────────────────────────────────────────────────────────
banner "Step 7/7 · Ansible Playbook — containers.yml"

if $DRY_RUN; then
  echo -e "  ${DIM}[dry-run] Would run: ansible-playbook -i $INVENTORY $CONTAINERS${RESET}"
else
  step_start "Running containers.yml (deploy containers)…"
  if ansible-playbook -i "$INVENTORY" "$CONTAINERS"; then
    step_pass "containers.yml completed"
  else
    step_fail "containers.yml failed"
  fi
fi

# ──────────────────────────────────────────────────────────────
#  SUMMARY
# ──────────────────────────────────────────────────────────────
PIPELINE_END=$(date +%s)
TOTAL_ELAPSED=$(( PIPELINE_END - PIPELINE_START ))

echo ""
echo -e "${GREEN}${BOLD}"
echo "   ╔═══════════════════════════════════════════════════╗"
echo "   ║           ✅  Deployment Complete!                ║"
echo "   ╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${DIM}Instance IP :${RESET} ${BOLD}$INSTANCE_IP${RESET}"
echo -e "  ${DIM}Total time  :${RESET} ${TOTAL_ELAPSED}s"
echo -e "  ${DIM}SSH         :${RESET} ssh -i $KEY_FILE ubuntu@$INSTANCE_IP"
echo ""
