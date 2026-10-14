import qa, shlex, contextlib, io, json

def quiet(action, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return action(*args, **kwargs)

def capture(name):
    quiet(qa.capture, name)
    print(name, flush=True)

def reach(label):
    for _ in range(7):
        try:
            return qa.find(label)
        except RuntimeError as error:
            if 'found 0' not in str(error):
                raise
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    raise RuntimeError('Field not reached: '+label)

def route():
    qa.adb('shell','am','force-stop','com.shift6.app')
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
    assert any(n.get('text')=='Local Coach review' for n in qa.nodes())

route()
quiet(qa.tap, 'Change review dates')
reach('Review time zone')
quiet(qa.fill,'Review time zone','Invalid/Zone',hide=False)
capture('coach-review-keyboard-space-normal-3f1752ed')
ns=qa.nodes()
focused=[n for n in ns if n.get('class')=='android.widget.EditText' and n.get('focused')=='true']
assert len(focused)==1 and focused[0].get('content-desc')=='Review time zone'
assert focused[0].get('text')=='Invalid/Zone'
qa.adb('shell','input','keyevent','111')
reach('Review these dates')
quiet(qa.tap,'Review these dates')
capture('coach-review-keyboard-space-invalid-3f1752ed')
reach('Review time zone')
quiet(qa.fill,'Review time zone','America/New_York')
reach('Review these dates')
quiet(qa.tap,'Review these dates')
assert not any(n.get('class')=='android.widget.EditText' for n in qa.nodes())
capture('coach-review-keyboard-space-reread-3f1752ed')
qa.adb('shell','input','keyevent','3')
qa.adb('shell','settings','put','system','font_scale','2.0')
print('normal complete; font2 set; verify fresh stable UI before large continuation',flush=True)
