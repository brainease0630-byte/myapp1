"""아이콘 + QR 코드 생성. 사용: python3 tools/make_assets.py https://배포주소/"""
import sys, qrcode
from PIL import Image, ImageDraw, ImageFont

url = sys.argv[1] if len(sys.argv) > 1 else "https://brainease0630-byte.github.io/myapp1/"
G = (47, 107, 79)

def icon(size, pad):
    im = Image.new("RGB", (size, size), G); d = ImageDraw.Draw(im)
    c = size / 2; r = size * (0.5 - pad)
    d.ellipse([c - r, c - r, c + r, c + r], fill=(244, 241, 234))
    # 잎 모양
    lw = r * 0.55
    d.polygon([(c, c - lw * 1.5), (c + lw, c), (c, c + lw * 1.5), (c - lw, c)], fill=G)
    d.line([(c, c + lw * 1.5), (c, c + lw * 2.0)], fill=G, width=max(2, size // 40))
    return im
icon(192, .08).save("icons/icon-192.png"); icon(512, .08).save("icons/icon-512.png")
icon(512, .2).save("icons/icon-maskable-512.png")

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
qr.add_data(url); qr.make(fit=True)
q = qr.make_image(fill_color=G, back_color="white").convert("RGB")
q.save("qr-code.png")
print("QR →", url)
