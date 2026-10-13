from pathlib import Path
import subprocess,xml.etree.ElementTree as ET,re,json,sys,time,os,shlex
sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).parent
ADB=Path(os.environ["ANDROID_HOME"])/"platform-tools/adb.exe"
SERIAL="emulator-5554"
def adb(*args):
 p=subprocess.run([str(ADB),"-s",SERIAL,*args],capture_output=True,timeout=60)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors="replace"))
 return p.stdout
def nodes():
 adb("shell","rm","-f","/sdcard/shift6-qa.xml")
 dumped=adb("shell","uiautomator","dump","/sdcard/shift6-qa.xml").decode(errors="replace")
 if "UI hierchary dumped to" not in dumped and "UI hierarchy dumped to" not in dumped:
  raise RuntimeError("Fresh UI dump unavailable: "+dumped.strip())
 xml=adb("exec-out","cat","/sdcard/shift6-qa.xml")
 (ROOT/"latest.xml").write_bytes(xml)
 return list(ET.fromstring(xml).iter("node"))
def bounds(n):return list(map(int,re.findall(r"\d+",n.get("bounds",""))))
def visible(n):
 b=bounds(n)
 return len(b)==4 and b[2]>b[0] and b[3]>b[1]
def show(ns):
 for n in ns:
  if n.get("text") or n.get("content-desc"):
   print((n.get("content-desc") or n.get("text"))+" | "+n.get("class","").split(".")[-1]+" enabled="+n.get("enabled","")+" checked="+n.get("checked","")+" "+n.get("bounds",""))
def find(label,editable=False):
 ns=nodes()
 matches=[n for n in ns if n.get("content-desc")==label]
 if not matches:matches=[n for n in ns if n.get("text")==label]
 found=[n for n in matches if n.get("enabled")=="true" and visible(n) and (not editable or n.get("class")=="android.widget.EditText")]
 if len(found)!=1:raise RuntimeError("Expected one visible enabled match for "+repr(label)+", found "+str(len(found)))
 return found[0]
def tap(label):
 n=find(label);b=bounds(n)
 adb("shell","input","tap",str((b[0]+b[2])//2),str((b[1]+b[3])//2))
 log("tap",label,n.attrib);show(nodes())
def fill(label,value,hide=True):
 n=find(label,True);b=bounds(n)
 adb("shell","input","tap",str((b[0]+b[2])//2),str((b[1]+b[3])//2))
 focused=[x for x in nodes() if x.get("focused")=="true" and x.get("class")=="android.widget.EditText"]
 if len(focused)!=1 or focused[0].get("content-desc")!=n.get("content-desc"):raise RuntimeError("Input focus did not match requested field")
 adb("shell","input","keycombination","113","29")
 adb("shell","input","keyevent","67")
 adb("shell","input","text",shlex.quote(value.replace(" ","%s")))
 after=nodes()
 values=[x for x in after if x.get("content-desc")==n.get("content-desc") and x.get("class")=="android.widget.EditText"]
 if len(values)!=1 or values[0].get("text")!=value:raise RuntimeError("Text readback differs from requested value")
 if hide:adb("shell","input","keyevent","111")
 log("fill",label,{"value":value});show(nodes())
def log(action,label,data):
 with (ROOT/"actions.jsonl").open("a",encoding="utf-8") as f:f.write(json.dumps({"time":time.time(),"action":action,"label":label,"data":data})+"\n")
def capture(name):
 ns=nodes();(ROOT/(name+".xml")).write_bytes((ROOT/"latest.xml").read_bytes());(ROOT/(name+".png")).write_bytes(adb("exec-out","screencap","-p"));show(ns)
if __name__=="__main__":
 a=sys.argv[1:]
 if a[0]=="tap":tap(a[1])
 elif a[0]=="fill":fill(a[1],a[2],len(a)<4)
 elif a[0]=="capture":capture(a[1])
 elif a[0]=="scroll":
  dimensions=adb("shell","wm","size").decode();w,h=map(int,re.findall(r"(\d+)x(\d+)",dimensions)[-1]);x=str(w//8)
  start,end=(str(h*3//4),str(h//4)) if a[1]=="down" else (str(h//4),str(h*3//4))
  nodes();adb("shell","input","swipe",x,start,x,end,"400");show(nodes())
 else:show(nodes())
