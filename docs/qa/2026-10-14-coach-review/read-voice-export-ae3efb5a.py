import qa,json
from pathlib import Path
ns=qa.nodes()
assert any(n.get('package')=='com.shift6.qa.receiver' and 'Received and opened JSON' in n.get('text','') for n in ns)
data=qa.adb('exec-out','run-as','com.shift6.qa.receiver','cat','files/received.json')
b=json.loads(data)
assert b['schemaVersion']==17 and b['exportedAt']>'2026-10-14T11:19:07'
assert sum(len(v) for v in b.values() if isinstance(v,list))==1082
(Path(__file__).parent/'coach-review-voice-keyboard-export-ae3efb5a.json').write_bytes(data)
print('Fresh external receiver verified',b['exportedAt'],1082,len(data),'bytes')
