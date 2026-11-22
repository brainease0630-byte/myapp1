"""아이콘 + QR 생성. 사용: python3 tools/make_assets.py https://배포주소/
icons/logo.png = 홈페이지(brainease0630-byte/homepage)의 img/logo.png"""
import sys, qrcode
from PIL import Image

url = sys.argv[1] if len(sys.argv) > 1 else "https://brainease0630-byte.github.io/myapp1/"
BLUE = (15, 88, 160)
logo = Image.open("icons/logo.png").convert("RGBA")
mark = logo.crop((0, 0, 178, logo.height))            # 뇌+새싹 심볼만
bb = mark.getbbox(); mark = mark.crop(bb)

def icon(size, scale):
    im = Image.new("RGB", (size, size), "white")
    w = int(size * scale); h = int(mark.height * w / mark.width)
    m = mark.resize((w, h), Image.LANCZOS)
    im.paste(m, ((size - w) // 2, (size - h) // 2), m)
    return im
icon(192, .78).save("icons/icon-192.png"); icon(512, .78).save("icons/icon-512.png")
icon(512, .56).save("icons/icon-maskable-512.png")

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
qr.add_data(url); qr.make(fit=True)
q = qr.make_image(fill_color=BLUE, back_color="white").convert("RGB")
s = q.width // 5; m = icon(s, .8)                      # QR 중앙에 심볼
q.paste(m, ((q.width - s) // 2, (q.height - s) // 2))
q.save("qr-code.png"); print("QR →", url)
