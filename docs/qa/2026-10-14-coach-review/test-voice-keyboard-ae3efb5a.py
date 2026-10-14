import qa, sys, shlex, contextlib, io
font = sys.argv[1]
label = 'Review or correct the spoken set entry'
def quiet(fn, *args):
    with contextlib.redirect_stdout(io.StringIO()): return fn(*args)
def reach(text):
    for _ in range(9):
        try: return qa.find(text)
        except RuntimeError as e:
            if 'found 0' not in str(e): raise
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    raise RuntimeError('Not reached: '+text)
def field_visible(tag):
    n=qa.find(label,True)
    assert n.get('focused')=='true'
    # This emulator's IME top is observed in each retained screenshot at y1517.
    assert qa.bounds(n)[3] <= 1517, n.attrib
    quiet(qa.capture, 'coach-review-voice-'+tag+'-font'+font+'-ae3efb5a')
    print(tag,qa.bounds(n),flush=True)
def type_paced(value):
    n=qa.find(label,True); b=qa.bounds(n)
    assert b[3]<=1517
    qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
    assert qa.find(label,True).get('focused')=='true'
    qa.adb('shell','input','keycombination','113','29')
    qa.adb('shell','input','keyevent','67')
    for i,c in enumerate(value):
        qa.adb('shell','input','text',shlex.quote('%s' if c==' ' else c))
        assert qa.find(label,True).get('text')==value[:i+1]
assert qa.adb('shell','settings','get','system','font_scale').decode().strip()==font
qa.adb('shell','am','start','-W','-n','com.shift6.app/.MainActivity')
qa.nodes()
quiet(qa.tap,'Resume workout')
assert any(n.get('text')=='3 of 5 sets' for n in qa.nodes())
quiet(qa.tap,'Use optional voice set entry')
reach('Speak a set entry'); quiet(qa.tap,'Speak a set entry')
reach(label)
quiet(qa.fill,label,'26 seconds')
n=qa.find(label,True);b=qa.bounds(n)
qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
qa.find(label,True)
qa.adb('shell','input','keycombination','113','29'); qa.adb('shell','input','keyevent','67')
field_visible('empty')
assert any(n.get('content-desc')=='Review corrected values' and n.get('enabled')=='false' for n in qa.nodes())
type_paced('26 seconds, RPE seven'); field_visible('retyped')
qa.adb('shell','input','keyevent','111')
reach('Speak a set entry'); quiet(qa.tap,'Speak a set entry')
reach(label)
type_paced('26 seconds, RPE seven'); field_visible('retry')
qa.adb('shell','input','keyevent','111')
reach('Review corrected values'); quiet(qa.tap,'Review corrected values')
assert any(n.get('text')=='duration: 26 seconds' for n in qa.nodes())
assert any(n.get('text')=='rpe: 7' for n in qa.nodes())
quiet(qa.capture,'coach-review-voice-preview-font'+font+'-ae3efb5a')
qa.adb('shell','input','keyevent','3'); qa.nodes()
qa.adb('shell','am','start','-W','-n','com.shift6.app/.MainActivity')
ns=qa.nodes()
assert not any(n.get('content-desc') in {label,'Use reviewed values in unsaved set'} for n in ns)
quiet(qa.capture,'coach-review-voice-background-font'+font+'-ae3efb5a')
qa.adb('shell','input','keyevent','3')
print('PASS scoped clear/retype/retry/background; no Apply/Complete',flush=True)
