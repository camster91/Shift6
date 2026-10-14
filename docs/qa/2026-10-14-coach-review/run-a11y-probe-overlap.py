from pathlib import Path
import qa,hashlib,json,subprocess,sys,threading,re,datetime
name=sys.argv[1]; assert name.startswith('coach-review-a11y-') and name.replace('-','').isalnum()
p=qa.ROOT; apk=p/'a11y-probe/a11y-probe.apk'
expected='208ec08942c629233e7c924ff8a771bfb8ed2e118e8a42faafecd2cf75d667d7'
assert hashlib.sha256(apk.read_bytes()).hexdigest()==expected
assert hashlib.sha256((p/'a11y-probe/src/com/shift6/qa/a11yprobe/Probe.java').read_bytes()).hexdigest()=='7fedc4588ed902512a9b243e242fe16d4655f665b763bf13a0e931b1939dce48'
service='com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService'
assert qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()==service
before=qa.adb('shell','dumpsys','accessibility'); (p/(name+'-services-before.txt')).write_bytes(before)
device_before=int(qa.adb('shell','date','+%s').decode().strip())*1000
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
proc=subprocess.Popen([str(qa.ADB),'-s',qa.SERIAL,'shell','am','instrument','-w','-r','-e','holdConnectedMs','5000','com.shift6.qa.a11yprobe/com.shift6.qa.a11yprobe.Probe'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
lines=[]; connected=threading.Event()
def watch():
    saw=False
    for line in proc.stdout:
        lines.append(line)
        if b'observerConnected=true' in line:saw=True
        if saw and b'INSTRUMENTATION_STATUS_CODE: 1' in line:connected.set()
reader=threading.Thread(target=watch,daemon=True);reader.start()
during=None
try:
    assert connected.wait(timeout=30),'No confirmed observer-connected status'
    during=qa.adb('shell','dumpsys','accessibility'); (p/(name+'-services-during.txt')).write_bytes(during)
    proc.wait(timeout=25);reader.join(timeout=5)
finally:
    if proc.poll() is None:proc.terminate();proc.wait(timeout=5)
    (p/(name+'-instrument.log')).write_bytes(b''.join(lines))
output=b''.join(lines)
assert proc.returncode==0 and b'INSTRUMENTATION_CODE: -1' in output and b'success=true' in output,output
raw=qa.adb('exec-out','run-as','com.shift6.qa.a11yprobe','cat','cache/a11y-snapshot.json');snapshot=json.loads(raw)
assert snapshot['success'] and snapshot['capturedAtEpochMillis']>=device_before
(p/(name+'.json')).write_bytes(raw)
after=qa.adb('shell','dumpsys','accessibility'); (p/(name+'-services-after.txt')).write_bytes(after)
assert qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()==service
assert b'Service[label=TalkBack' in before and b'Service[label=TalkBack' in after
(p/(name+'.png')).write_bytes(qa.adb('exec-out','screencap','-p'))
receipt={'probeApkSha256':expected,'startedAt':started,'capturedAtEpochMillis':snapshot['capturedAtEpochMillis'],'success':snapshot['success'],'complete':snapshot['complete'],'limitations':snapshot['limitations'],'nodeCount':snapshot['nodeCount'],'connectedStatusObserved':True,'talkBackEnabledBeforeAfter':True,'talkBackBoundDuring':b'Service[label=TalkBack' in during,'uiAutomationMentionDuring':bool(re.search(rb'ui[ _]?automation',during,re.I)),'snapshotIsSequentialNotAtomic':True}
(p/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt),flush=True)
print('Focused:',[(n.get('text'),n.get('contentDescription'),n.get('class')) for n in snapshot['activeWindowNodes'] if n.get('accessibilityFocused')],flush=True)
