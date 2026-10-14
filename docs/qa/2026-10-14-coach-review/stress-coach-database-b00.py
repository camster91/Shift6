from pathlib import Path
import qa,shlex,json,contextlib,io
from datetime import datetime,timezone
root=Path(__file__).parent
d=json.loads((root/'coach-review-answer-export-db4.json').read_bytes())
session=next(x for x in d['workoutSessions'] if x['completion_reason']=='time-limited')
receipts=[]
def route(url):
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote(url),'com.shift6.app')
def capture(name,expected):
    qa.capture(name)
    ns=qa.nodes()
    text=[n.get('text','') for n in ns if n.get('text')]
    unavailable=any('local record needs attention' in t or 'summary unavailable' in t for t in text)
    assert not unavailable,(name,text)
    assert any(expected in t for t in text),(name,text)
    receipts.append({'capture':name,'expectedText':expected,'observed':True,'fontScale':qa.adb('shell','settings','get','system','font_scale').decode().strip()})
try:
    with contextlib.redirect_stdout(io.StringIO()):
        for i in range(1,4):
            qa.adb('shell','settings','put','system','font_scale','2.0')
            # Observe the recreated activity before sending the next route.
            # An intent sent during destruction may target the old activity.
            qa.nodes()
            route('shift6:///profile')
            capture(f'coach-review-stress-profile-large-b00-{i}','60-minute sessions')
            route('shift6:///summary?sessionId='+session['id'])
            capture(f'coach-review-stress-summary-large-b00-{i}','43 min elapsed since start')
            qa.adb('shell','settings','put','system','font_scale','1.0')
            qa.nodes()
            route('shift6:///profile')
            capture(f'coach-review-stress-profile-normal-b00-{i}','60-minute sessions')
finally:
    qa.adb('shell','settings','put','system','font_scale','1.0')
(root/'coach-review-database-stress-b00.json').write_text(json.dumps({'sourceCommit':'b00e62accb7258adb8df46f18b83fc21e35ff72e','apkSha256':'f0c4dcdc42fed84fe369a324242c2a3a04903586e30d40e6b47ed00c0de65428','observedAt':datetime.now(timezone.utc).isoformat(),'foregroundFontSequenceRounds':3,'screenChecks':receipts,'limits':'Source-proven lifecycle fixes plus scoped native stress; original failure cause unproven. No forced new native failure, so real-device warm retry remains untested.'},indent=2)+'\n',encoding='utf-8')
print('3 foreground font rounds; 9 fresh native screens passed; font1 restored')
