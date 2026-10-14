import qa, shlex, contextlib, io

def quiet(action,*args,**kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return action(*args,**kwargs)

def capture(name):
    quiet(qa.capture,name)
    print(name,flush=True)

assert qa.adb('shell','settings','get','system','font_scale').decode().strip()=='1.0'
qa.nodes()
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6:///'),'com.shift6.app')
quiet(qa.tap,'Resume workout')
ns=qa.nodes()
assert any(n.get('text')=='3 of 5 sets' for n in ns)
quiet(qa.tap,'Use optional voice set entry')
qa.adb('shell','input','swipe','33','1800','33','600','400')
quiet(qa.tap,'Speak a set entry')
quiet(qa.fill,'Review or correct the spoken set entry','26 seconds')
n=qa.find('Review or correct the spoken set entry',True)
b=qa.bounds(n)
qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
fs=[x for x in qa.nodes() if x.get('class')=='android.widget.EditText' and x.get('focused')=='true']
assert len(fs)==1 and fs[0].get('content-desc')=='Review or correct the spoken set entry'
qa.adb('shell','input','keycombination','113','29')
qa.adb('shell','input','keyevent','67')
ns=qa.nodes()
field=[x for x in ns if x.get('content-desc')=='Review or correct the spoken set entry']
assert len(field)==1 and field[0].get('text')=='' and field[0].get('focused')=='true'
assert any(x.get('content-desc')=='Review corrected values' and x.get('enabled')=='false' for x in ns)
capture('coach-review-voice-empty-editor-fixed-057d5936')
quiet(qa.fill,'Review or correct the spoken set entry','26 seconds, RPE seven')
quiet(qa.tap,'Review corrected values')
ns=qa.nodes()
assert any(x.get('text')=='duration: 26 seconds' for x in ns)
assert any(x.get('text')=='rpe: 7' for x in ns)
capture('coach-review-voice-retyped-fixed-057d5936')
qa.adb('shell','input','keyevent','3')
qa.nodes()
qa.adb('shell','am','start','-W','-n','com.shift6.app/.MainActivity')
ns=qa.nodes()
assert not any(x.get('content-desc')=='Review or correct the spoken set entry' for x in ns)
assert not any(x.get('content-desc')=='Use reviewed values in unsaved set' for x in ns)
capture('coach-review-voice-background-cleared-057d5936')
print('Empty editor + exact retype + background reset observed. No Apply/Complete invoked.',flush=True)
