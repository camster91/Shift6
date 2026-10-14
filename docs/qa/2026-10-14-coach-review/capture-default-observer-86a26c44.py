import qa,json,hashlib,sys
from qa_surface_guard import require_surface,require_snapshot_scope
name=sys.argv[1];assert name.startswith('coach-review-') and name.replace('-','').replace('.','').isalnum()
p=qa.ROOT;assert hashlib.sha256((p/'a11y-probe-default/a11y-probe.apk').read_bytes()).hexdigest()=='f74b388f4030b87b122df056661cccef350396ea83bd03d2fc8f21d1b7812017'
assert not qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()
start=int(qa.adb('shell','date','+%s').decode().strip())*1000
require_surface(qa.adb)
out=qa.adb('shell','am','instrument','-w','-r','-e','holdConnectedMs','500','com.shift6.qa.a11yprobedefault/com.shift6.qa.a11yprobedefault.Probe');(p/(name+'.log')).write_bytes(out)
raw=qa.adb('exec-out','run-as','com.shift6.qa.a11yprobedefault','cat','cache/a11y-snapshot.json');d=json.loads(raw)
require_surface(qa.adb);require_snapshot_scope(d)
(p/(name+'.json')).write_bytes(raw);(p/(name+'.png')).write_bytes(qa.adb('exec-out','screencap','-p'))
assert b'success=true' in out and b'INSTRUMENTATION_CODE: -1' in out and d['success'] and d['capturedAtEpochMillis']>=start
assert not qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()
print('complete',d['complete'],'nodes',d['nodeCount']);print('focused',[(n.get('text'),n.get('contentDescription'),n.get('bounds')) for n in d['activeWindowNodes'] if n['inputFocused']])
for w in d['windows']:
 if w['type']==2:print('IME',w['title'],w['bounds'],[(n.get('text'),n.get('contentDescription'),n.get('bounds')) for n in w['nodes'] if n.get('package')=='com.google.android.inputmethod.latin' and (n.get('text') or n.get('contentDescription'))][:30])
