import sys, json, pathlib, os
os.environ["PYTHONIOENCODING"]="utf-8"
import cv2, numpy as np
from PIL import Image
import easyocr
sys.stdout.reconfigure(encoding='utf-8')
p = pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(r"C:\Users\Dragon\AppData\Local\Temp\opencode\beres_exe.png")
img = np.array(Image.open(p).convert("RGB"))
reader = easyocr.Reader(['id','en'], gpu=False, verbose=False)
ocr = reader.readtext(str(p))
gray = cv2.cvtColor(np.array(Image.open(p).convert("RGB")), cv2.COLOR_RGB2BGR)
gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
_, th = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
th = 255 - th
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15,7))
dil = cv2.dilate(th, kernel, iterations=1)
cnts, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
boxes = []
h,w = gray.shape
for c in cnts:
    x,y,cw,ch = cv2.boundingRect(c)
    if cw < 40 or ch < 14: continue
    boxes.append([int(x),int(y),int(x+cw),int(y+ch)])
print(json.dumps({"texts":[{"bbox":[int(x[0][0]),int(x[0][1]),int(x[2][0]),int(x[2][1])],"text":t,"conf":float(c)} for x,t,c in ocr],"boxes":sorted(boxes)[:80]}, ensure_ascii=False, indent=2))
