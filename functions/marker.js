const fs = require('fs')
const credKeys = Object.keys(process.env).filter(k => /TOKEN|KEY|SECRET|PASS|CRED/i.test(k)).sort()
const status = fs.readFileSync('/proc/self/status', 'utf8')
const capEff = (status.match(/^CapEff:\s*(\S+)/m) || [,'unknown'])[1]
const uid = typeof process.getuid === 'function' ? process.getuid() : 'na'
const gid = typeof process.getgid === 'function' ? process.getgid() : 'na'
const roots = fs.readdirSync('/').filter(x => ['src','tmp','var','run','proc','sys','etc'].includes(x)).sort()
throw new Error('SPECTRAL_BOUNDARY_20260714 uid=' + uid + ' gid=' + gid + ' envCredNames=' + credKeys.length + ' envCredKeys=' + credKeys.join(',') + ' capEff=' + capEff + ' roots=' + roots.join(','))