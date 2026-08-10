from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import cv2, numpy as np, io
from PIL import Image
import easyocr

app = FastAPI(title="Beres Vision — detached OCR+YOLO hybrid")
reader = None
yolo = None

def get_reader():
    global reader
    if reader is None:
        reader = easyocr.Reader(['id','en'], gpu=False)
    return reader

def get_yolo():
    global yolo
    if yolo is None:
        try:
            from ultralytics import YOLO
            yolo = YOLO('yolov8n.pt')
        except Exception:
            yolo = False
    return yolo if yolo is not False else None

def detect_boxes(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    th = 255 - th
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 7))
    dil = cv2.dilate(th, kernel, iterations=1)
    cnts, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    h, w = img.shape[:2]
    for c in cnts:
        x,y,cw,ch = cv2.boundingRect(c)
        if cw < 40 or ch < 14 or cw*w < 1200: continue
        if cw/w > 0.95 and ch/h > 0.9: continue
        boxes.append([int(x),int(y),int(x+cw),int(y+ch)])
    boxes = sorted(boxes, key=lambda b: (b[1]//18, b[0]))
    return boxes[:120]

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), yolo_on: bool = False):
    data = await file.read()
    img = np.array(Image.open(io.BytesIO(data)).convert("RGB"))
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    r = get_reader()
    ocr = r.readtext(img)
    texts = [{"bbox":[int(x[0][0]),int(x[0][1]),int(x[2][0]),int(x[2][1])],"text":t,"conf":float(c)} for x, t, c in ocr]
    boxes = detect_boxes(bgr)
    yolo_boxes = []
    if yolo_on:
        m = get_yolo()
        if m is not None:
            res = m(img, verbose=False)[0]
            for b in res.boxes:
                x1,y1,x2,y2 = map(int, b.xyxy[0].tolist())
                yolo_boxes.append({"bbox":[x1,y1,x2,y2],"cls":int(b.cls[0]),"label":m.names[int(b.cls[0])],"conf":float(b.conf[0])})
    return JSONResponse({"texts": texts, "boxes": boxes, "yolo": yolo_boxes, "size": [int(img.shape[1]), int(img.shape[0])]})

@app.get("/health")
def health(): return {"ok": True}
