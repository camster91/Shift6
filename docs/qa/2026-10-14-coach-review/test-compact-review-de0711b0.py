import qa, shlex, json, contextlib, io

def capture(name):
    with contextlib.redirect_stdout(io.StringIO()):
        qa.capture(name)
    print(name, flush=True)

def tap(label):
    with contextlib.redirect_stdout(io.StringIO()):
        qa.tap(label)

def find_bounded(label):
    for _ in range(6):
        try:
            return qa.find(label)
        except RuntimeError as failure:
            if 'found 0' not in str(failure):
                raise
            qa.adb('shell', 'input', 'swipe', '33', '1800', '33', '600', '400')
    raise RuntimeError('Control remained unavailable: '+label)

def route():
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
    ns=qa.nodes()
    assert any(n.get('text')=='Local Coach review' for n in ns)
    assert not any(n.get('class')=='android.widget.EditText' for n in ns)

qa.adb('shell','am','force-stop','com.shift6.app')
route()
capture('coach-review-compact-normal-de0711b0')
tap('Change review dates')
capture('coach-review-compact-editor-de0711b0')
find_bounded('Review time zone')
with contextlib.redirect_stdout(io.StringIO()):
    qa.fill('Review time zone','Invalid/Zone',hide=False)
capture('coach-review-compact-keyboard-de0711b0')
qa.adb('shell','input','keyevent','111')
find_bounded('Review these dates')
tap('Review these dates')
capture('coach-review-compact-invalid-de0711b0')
ns=qa.nodes()
assert any(n.get('text')=='Enter a valid time zone, such as America/Toronto, then review these dates again.' for n in ns)
assert not any('Error:' in n.get('text','') or ' at ' in n.get('text','') and 'coach-review' in n.get('text','') for n in ns)
find_bounded('Review time zone')
with contextlib.redirect_stdout(io.StringIO()):
    qa.fill('Review time zone','America/New_York')
find_bounded('Review these dates')
tap('Review these dates')
assert not any(n.get('class')=='android.widget.EditText' for n in qa.nodes())
qa.adb('shell','input','swipe','33','600','33','1800','400')
capture('coach-review-compact-reread-de0711b0')
qa.adb('shell','input','keyevent','3')
qa.adb('shell','settings','put','system','font_scale','2.0')
qa.nodes()
route()
capture('coach-review-compact-large-de0711b0')
qa.adb('shell','input','keyevent','3')
qa.adb('shell','settings','put','system','font_scale','1.0')
qa.nodes()
route()
print(json.dumps({'source':'de0711b0','normalAndLargeCompact':True,'explicitEditor':True,'invalidZoneGuidance':True,'successfulRereadCollapsesFields':True,'keyboardCaptured':True,'fontScaleRestored':'1.0'}),flush=True)
