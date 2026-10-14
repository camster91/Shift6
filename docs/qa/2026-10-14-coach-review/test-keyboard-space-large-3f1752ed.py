import qa, shlex, contextlib, io

assert qa.adb('shell','settings','get','system','font_scale').decode().strip()=='2.0'
qa.nodes()
qa.adb('shell','am','force-stop','com.shift6.app')
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
with contextlib.redirect_stdout(io.StringIO()):
    qa.tap('Change review dates')
for _ in range(7):
    try:
        qa.find('Review time zone',True)
        break
    except RuntimeError as error:
        if 'found 0' not in str(error): raise
        qa.adb('shell','input','swipe','33','1800','33','600','400')
else:
    raise RuntimeError('Time zone not reached')
with contextlib.redirect_stdout(io.StringIO()):
    qa.fill('Review time zone','Invalid/Zone',hide=False)
    qa.capture('coach-review-keyboard-space-large-3f1752ed')
ns=qa.nodes()
print([(n.get('class'),n.get('content-desc'),n.get('bounds')) for n in ns
       if n.get('class')=='android.widget.ScrollView' or n.get('content-desc')=='Review time zone'])
qa.adb('shell','input','keyevent','111')
qa.adb('shell','input','keyevent','3')
qa.adb('shell','settings','put','system','font_scale','1.0')
print('Large capture retained for visual result; font1 reset. Fresh stable UI required before next route.')
