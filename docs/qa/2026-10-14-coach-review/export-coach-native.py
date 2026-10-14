from pathlib import Path
import qa,sys,shlex,contextlib,io

name=sys.argv[1]
if not name.startswith('coach-review-') or not name.replace('-','').replace('_','').isalnum():
    raise ValueError('Expected scoped QA filename')
with contextlib.redirect_stdout(io.StringIO()):
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6:///profile'),'com.shift6.app')
    for attempt in range(7):
        try:
            qa.find('Export local data')
            break
        except RuntimeError:
            if attempt==6: raise
            qa.nodes()
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    qa.tap('Export local data')
    qa.tap('QA JSON Receiver')
    qa.capture(name+'-receiver')
    current=qa.nodes()
    assert any(n.get('package')=='com.shift6.qa.receiver' and 'Received and opened JSON' in n.get('text','') for n in current)
    data=qa.adb('exec-out','run-as','com.shift6.qa.receiver','cat','files/received.json')
    (Path(__file__).parent/(name+'.json')).write_bytes(data)
print(name+'.json',len(data),'bytes, receiver verified')
