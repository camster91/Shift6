import qa,sys,shlex,contextlib,io,json
font=sys.argv[1]; source='86a26c44'
def quiet(fn,*args):
    with contextlib.redirect_stdout(io.StringIO()): return fn(*args)
def safe_field(label):
    for _ in range(8):
        try:n=qa.find(label,True)
        except RuntimeError as e:
            if 'found 0' not in str(e):raise
            qa.adb('shell','input','swipe','33','1700','33','800','400');continue
        b=qa.bounds(n)
        if 120<=b[1]<b[3]<=1900:return n
        qa.adb('shell','input','swipe','33','1700','33','800','400')
    raise RuntimeError('Input is not safely above sticky footer: '+label)
def safe_tap(label):
    assert label in {'Resume workout','Review all sets and adjustments','Focus on current set','Use optional voice set entry','Speak a set entry'}
    for _ in range(10):
        try:n=qa.find(label)
        except RuntimeError as e:
            if 'found 0' not in str(e):raise
            qa.adb('shell','input','swipe','33','1700','33','800','400');continue
        b=qa.bounds(n)
        if 120<=b[1]<b[3]<=1900:
            qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));return
        qa.adb('shell','input','swipe','33','1700','33','800','400')
    raise RuntimeError('Control not safely above sticky footer: '+label)
def reach(label,input=False):
    for _ in range(10):
        try:return qa.find(label,input)
        except RuntimeError as e:
            if 'found 0' not in str(e):raise
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    raise RuntimeError('Not reached '+label)
assert qa.adb('shell','settings','get','system','font_scale').decode().strip()==font
assert not qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()
qa.adb('shell','am','force-stop','com.shift6.app')
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6:///'),'com.shift6.app')
qa.nodes(); safe_tap('Resume workout')
ns=qa.nodes(); assert any(n.get('text')=='3 of 5 sets' for n in ns)
assert any(n.get('text')=='Duration (seconds)' for n in ns)
assert any(n.get('text')=='RPE (1–10)' for n in ns)
duration='QA Hold set 1 duration in seconds'; effort='QA Hold set 1 RPE from 1 to 10'
assert qa.find(duration,True).get('text')=='26';assert qa.find(effort,True).get('text')=='7'
quiet(qa.capture,'coach-review-actual-labels-restored-font'+font+'-'+source)
# Focus only, preserving exact values. IME geometry verified again in screenshot.
n=safe_field(duration); b=qa.bounds(n);qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
n=qa.find(duration,True);assert n.get('focused')=='true' and n.get('text')=='26'
assert qa.bounds(n)[3]<=1517,n.attrib
quiet(qa.capture,'coach-review-actual-labels-duration-keyboard-font'+font+'-'+source)
qa.adb('shell','input','keyevent','111')
n=safe_field(effort);b=qa.bounds(n);qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
n=qa.find(effort,True);assert n.get('focused')=='true' and n.get('text')=='7' and qa.bounds(n)[3]<=1517,n.attrib
quiet(qa.capture,'coach-review-actual-labels-rpe-keyboard-font'+font+'-'+source)
qa.adb('shell','input','keyevent','111')
reach('Review all sets and adjustments'); safe_tap('Review all sets and adjustments')
# Scroll to the current unsaved field before inspecting its caption.
reach(duration,True);safe_field(duration)
assert any(n.get('text')=='Duration (seconds)' for n in qa.nodes())
quiet(qa.capture,'coach-review-actual-labels-allsets-font'+font+'-'+source)
reach('Focus on current set'); safe_tap('Focus on current set')
reach('Use optional voice set entry'); safe_tap('Use optional voice set entry')
reach('Speak a set entry'); safe_tap('Speak a set entry')
label='Review or correct the spoken set entry';reach(label)
safe_field(label); quiet(qa.fill,label,'26 seconds, RPE seven')
n=qa.find(label,True);b=qa.bounds(n);qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
n=qa.find(label,True); assert n.get('focused')=='true' and n.get('text')=='26 seconds, RPE seven'
assert qa.bounds(n)[3]<=1517,n.attrib
quiet(qa.capture,'coach-review-actual-labels-voice-keyboard-font'+font+'-'+source)
qa.adb('shell','input','keyevent','3'); qa.adb('shell','am','start','-W','-n','com.shift6.app/.MainActivity')
ns=qa.nodes();assert not any(n.get('content-desc')==label for n in ns)
r={'sourceCommit':source,'fontScale':font,'restoredDuration':'26','restoredRpe':'7','setCount':'3 of 5','persistentCaptionsObserved':True,'focusedDurationAboveIme':True,'focusedRpeAboveIme':True,'voiceFieldAboveIme':True,'allSetsCaptionObserved':True,'noApplyOrComplete':True}
(qa.ROOT/('coach-review-actual-labels-font'+font+'-'+source+'-receipt.json')).write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(json.dumps(r))
