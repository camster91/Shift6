import qa
ns=qa.nodes()
assert any(n.get('text')=='Allow TalkBack to have full control of your device?' and n.get('package')=='com.android.settings' for n in ns)
xs=[n for n in ns if n.get('text')=='Allow' and n.get('package')=='com.android.settings' and n.get('class')=='android.widget.Button' and n.get('enabled')=='true' and qa.visible(n)]
assert len(xs)==1
b=qa.bounds(xs[0]); assert 0<=b[0]<b[2]<=1080 and 0<=b[1]<b[3]<=2337
qa.log('talkback-confirm','Allow synthetic emulator TalkBack',xs[0].attrib)
qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
print('Confirmed observed system TalkBack permission prompt; fresh activation verification required')
