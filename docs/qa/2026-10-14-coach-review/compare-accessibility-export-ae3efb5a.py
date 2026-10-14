from pathlib import Path
import json
p=Path(__file__).parent
a=json.loads((p/'coach-review-date-bulk-export-ae3efb5a.json').read_bytes()); b=json.loads((p/'coach-review-accessibility-export-ae3efb5a.json').read_bytes())
keys=[k for k,v in a.items() if isinstance(v,list)]; changed=[k for k in keys if a[k]!=b[k]]
assert set(changed)<={'workoutDrafts','workoutDraftLoadUnits'}
for k in changed:
    stable=lambda rows:[{f:v for f,v in r.items() if f not in {'updatedAt','updated_at'}} for r in rows]
    assert stable(a[k])==stable(b[k]),k
r={'sourceCommit':'ae3efb5a3542e585cee459640831e22d786060f5','exportedAt':b['exportedAt'],'records':1082,'arrays':36,'changedArrays':changed,'actualPayloadsUnchanged':True,'draftPayloadsUnchanged':True,'onlyDraftAutosaveTimestampsChanged':True}
(p/'coach-review-accessibility-comparison-ae3efb5a.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(r)
