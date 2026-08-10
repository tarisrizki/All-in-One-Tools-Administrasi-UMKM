import sys, pathlib, ctypes
from ctypes import wintypes
import subprocess, time
from PIL import ImageGrab

def window_rect(pid_or_title="Beres Kasir"):
    user32 = ctypes.windll.user32
    rect = wintypes.RECT()
    hwnd = user32.FindWindowW(None, pid_or_title)
    if not hwnd:
        def cb(h, _):
            buf = ctypes.create_unicode_buffer(512)
            user32.GetWindowTextW(h, buf, 512)
            if pid_or_title in buf.value:
                rects[0]=h
                return False
            return True
        rects=[0]
        CMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(CMPROC(cb), 0)
        hwnd = rects[0]
    if not hwnd: raise SystemExit(f"window '{pid_or_title}' not found")
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return (rect.left, rect.top, rect.right, rect.bottom)

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(r"C:\Users\Dragon\AppData\Local\Temp\opencode\beres_crop.png")
    title = sys.argv[2] if len(sys.argv)>2 else "Beres Kasir"
    time.sleep(0.5)
    x0,y0,x1,y1 = window_rect(title)
    w,h = x1-x0, y1-y0
    print(f"rect {x0},{y0} {w}x{h}")
    img = ImageGrab.grab(bbox=(x0,y0,x1,y1))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"saved {out} {out.stat().st_size}")
