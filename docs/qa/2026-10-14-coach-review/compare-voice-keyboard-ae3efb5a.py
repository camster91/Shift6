from pathlib import Path
import json
p=Path(__file__).parent
a=json.loads((p/'coach-review-voice-hidden-export-3de55425.json').read_bytes())
b=json.loads((p/'coach-review-voice-keyboard-export-ae3efb5a.json').read_bytes())
keys=[k for k,v in a.items() if isinstance(v,list)]
changed=[k for k in keys if a[k]!=b[k]]
assert set(changed)<= {'workoutDrafts','workoutDraftLoadUnits'},changed
for k in changed:
    def stable(rows):
        return [{field:value for field,value in row.items() if field not in {'updatedAt','updated_at'}} for row in rows]
    assert stable(a[k])==stable(b[k]),k
receipt={'sourceCommit':'ae3efb5a3542e585cee459640831e22d786060f5','records':sum(len(b[k]) for k in keys),'arrays':len(keys),'changedArrays':changed,'actualPayloadsUnchanged':True,'draftPayloadsUnchanged':True,'exportedAt':b['exportedAt'],'nativeCases':'See separately retained helper logs and screenshots; comparison does not infer UI passes'}
(p/'coach-review-voice-keyboard-comparison-ae3efb5a.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
