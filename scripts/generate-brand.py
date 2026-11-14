"""Render Baran's code-defined cloud/download mark into desktop icon formats."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
size = 1024
image = Image.new('RGBA', (size, size))
pixels = image.load()
for y in range(size):
    for x in range(size):
        t = (x + y) / (2 * size)
        pixels[x, y] = (int(37 * (1-t) + 2*t), int(99*(1-t)+132*t), int(235*(1-t)+199*t), 255)
mask = Image.new('L', image.size)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, size-1, size-1), radius=240, fill=255)
image.putalpha(mask)
draw = ImageDraw.Draw(image)
scale = size / 128

def line(points, width=10):
    points = [(round(x*scale), round(y*scale)) for x,y in points]
    draw.line(points, fill='white', width=round(width*scale), joint='curve')
    radius=width*scale/2
    for x,y in (points[0], points[-1]): draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill='white')

def cubic(p0,p1,p2,p3):
    return [tuple((1-t)**3*p0[i]+3*(1-t)**2*t*p1[i]+3*(1-t)*t*t*p2[i]+t**3*p3[i] for i in (0,1)) for t in [n/60 for n in range(61)]]
cloud = cubic((32,72),(8,70),(12,35),(31,31)) + cubic((31,31),(39,7),(80,9),(88,34)) + cubic((88,34),(115,31),(120,68),(98,72))
line(cloud)
line([(64,53),(64,108)])
line([(44,88),(64,108),(84,88)])
image.save(root/'resources/icon.png')
image.save(root/'resources/icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
image.save(root/'icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
image.resize((128,128), Image.Resampling.LANCZOS).save(root/'browser-extension/icon128.png')
