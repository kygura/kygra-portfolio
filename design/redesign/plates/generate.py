"""Generate engraving-style mechanical plates as inline SVG.
Strokes use currentColor so the page palette tints them; class="acc" marks accent lines.
A small deterministic wobble makes lines read as hand-drawn."""
import math, random, json

R = random.Random(7)

def wob(x, y, a=0.9):
    return x + R.uniform(-a, a), y + R.uniform(-a, a)

def path(pts, close=False, cls="", w=1.1, dash=""):
    d = " ".join(("M" if i == 0 else "L") + "%.1f %.1f" % wob(*p) for i, p in enumerate(pts))
    if close: d += " Z"
    extra = ' stroke-dasharray="%s"' % dash if dash else ""
    c = ' class="%s"' % cls if cls else ""
    return '<path d="%s" fill="none" stroke-width="%.1f"%s%s/>' % (d, w, extra, c)

def circle(cx, cy, r, w=1.0, cls="", dash="", n=48):
    pts = [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
    return path(pts, True, cls, w, dash)

def gear(cx, cy, r, teeth, w=1.1, cls=""):
    pts = []
    ro, ri = r, r * 0.86
    for i in range(teeth * 4):
        k = i % 4
        a = 2 * math.pi * i / (teeth * 4)
        rr = ro if k in (1, 2) else ri
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    out = [path(pts, True, cls, w)]
    out.append(circle(cx, cy, r * 0.93, 0.5, dash="3 3"))        # pitch circle
    out.append(circle(cx, cy, r * 0.18, 1.0))                     # bore
    out.append(circle(cx, cy, r * 0.5, 0.7))
    # spokes
    for i in range(5):
        a = 2 * math.pi * i / 5 + 0.3
        out.append(path([(cx + r * 0.18 * math.cos(a), cy + r * 0.18 * math.sin(a)),
                         (cx + r * 0.5 * math.cos(a), cy + r * 0.5 * math.sin(a))], w=0.8))
    # centre lines
    out.append(path([(cx - r * 1.2, cy), (cx + r * 1.2, cy)], w=0.4, dash="8 3 1 3"))
    out.append(path([(cx, cy - r * 1.2), (cx, cy + r * 1.2)], w=0.4, dash="8 3 1 3"))
    return "\n".join(out)

def hatch(poly, spacing=5, angle=45, w=0.45):
    """Hatch a convex polygon with parallel lines."""
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    a = math.radians(angle); ux, uy = math.cos(a), math.sin(a); vx, vy = -uy, ux
    ext = max(max(xs) - min(xs), max(ys) - min(ys))
    out = []
    def inside(x, y):
        s = None
        for i in range(len(poly)):
            x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
            cr = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
            if abs(cr) < 1e-9: continue
            if s is None: s = cr > 0
            elif (cr > 0) != s: return False
        return True
    k = -ext
    while k < ext:
        seg = []
        t = -ext
        while t < ext:
            x, y = cx + ux * t + vx * k, cy + uy * t + vy * k
            if inside(x, y): seg.append((x, y))
            t += 1.5
        if len(seg) > 2: out.append(path([seg[0], seg[-1]], w=w))
        k += spacing
    return "\n".join(out)

def dim(x1, y1, x2, y2, text, off=14):
    """Dimension line with arrowheads and a label, offset perpendicular."""
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy); nx, ny = -dy / L * off, dx / L * off
    ax, ay, bx, by = x1 + nx, y1 + ny, x2 + nx, y2 + ny
    out = [path([(x1, y1), (ax + nx * 0.3, ay + ny * 0.3)], w=0.4), path([(x2, y2), (bx + nx * 0.3, by + ny * 0.3)], w=0.4),
           path([(ax, ay), (bx, by)], w=0.5, cls="acc")]
    for (px, py, s) in ((ax, ay, 1), (bx, by, -1)):
        ux, uy = dx / L * s, dy / L * s
        out.append(path([(px + ux * 6 - nx * 0.15, py + uy * 6 - ny * 0.15), (px, py), (px + ux * 6 + nx * 0.15, py + uy * 6 + ny * 0.15)], w=0.6, cls="acc"))
    mx, my = (ax + bx) / 2 + nx * 0.6, (ay + by) / 2 + ny * 0.6
    out.append('<text x="%.1f" y="%.1f" class="lbl" text-anchor="middle">%s</text>' % (mx, my, text))
    return "\n".join(out)

def label(x, y, t, anchor="start"):
    return '<text x="%.1f" y="%.1f" class="lbl" text-anchor="%s">%s</text>' % (x, y, anchor, t)

def leader(x1, y1, x2, y2, t):
    return path([(x1, y1), (x2, y2)], w=0.5) + circle(x1, y1, 1.6, 0.8, n=12) + label(x2 + (4 if x2 >= x1 else -4), y2 + 4, t, "start" if x2 >= x1 else "end")

def svg(w, h, body, title):
    return ('<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="%s" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">\n%s\n</svg>' % (w, h, title, body))

# ---- Plate: gear train ----------------------------------------------------
def plate_gears():
    b = []
    b.append(gear(150, 160, 95, 24, 1.2))
    b.append(gear(290, 108, 52, 13, 1.1))
    b.append(gear(392, 176, 72, 18, 1.1))
    # shaft section through big gear, hatched
    shaft = [(60, 265), (240, 265), (240, 289), (60, 289)]
    b.append(path(shaft, True, w=1.0)); b.append(hatch(shaft, 5, 45))
    b.append(path([(150, 160), (150, 265)], w=0.4, dash="8 3 1 3"))
    b.append(dim(150, 65, 150, 255, "190", -26))
    b.append(dim(290, 56, 392, 104, "104 ctr", -18))
    b.append(leader(190, 128, 232, 40, "A · 24 T"))
    b.append(leader(316, 72, 350, 30, "B · 13 T"))
    b.append(leader(430, 136, 420, 70, "C · 18 T"))
    b.append(label(60, 304, "SECTION D–D · SHAFT, KEYED"))
    return svg(480, 320, "\n".join(b), "Gear train, three meshing spur gears with a hatched shaft section")

# ---- Plate: crank and slider --------------------------------------------
def plate_crank():
    b = []
    cx, cy, r = 110, 170, 60
    b.append(circle(cx, cy, r, 1.1)); b.append(circle(cx, cy, 8, 1.0)); b.append(circle(cx, cy, r + 10, 0.4, dash="3 3"))
    # three phases: solid + two phantom
    for i, a in enumerate((0.6, 1.9, 3.4)):
        px, py = cx + r * math.cos(a), cy + r * math.sin(a)
        L = 190
        sx = px + math.sqrt(max(L * L - (py - cy) ** 2, 1))
        cls = "" if i == 0 else ""
        w = 1.2 if i == 0 else 0.5
        dash = "" if i == 0 else "4 4"
        b.append(path([(cx, cy), (px, py)], w=w, dash=dash))
        b.append(path([(px, py), (sx, cy)], w=w, dash=dash))
        b.append(circle(px, py, 5, 0.9 if i == 0 else 0.5))
        box = [(sx - 18, cy - 14), (sx + 18, cy - 14), (sx + 18, cy + 14), (sx - 18, cy + 14)]
        b.append(path(box, True, w=w, dash=dash))
        if i == 0: b.append(hatch(box, 4, 45))
    # guide rails
    b.append(path([(250, cy - 18), (470, cy - 18)], w=1.0)); b.append(path([(250, cy + 18), (470, cy + 18)], w=1.0))
    rail = [(250, cy - 26), (470, cy - 26), (470, cy - 18), (250, cy - 18)]
    b.append(hatch(rail, 4, 45)); b.append(path(rail, True, w=0.6))
    rail2 = [(250, cy + 18), (470, cy + 18), (470, cy + 26), (250, cy + 26)]
    b.append(hatch(rail2, 4, 45)); b.append(path(rail2, True, w=0.6))
    b.append(path([(cx - 90, cy), (480, cy)], w=0.4, dash="8 3 1 3"))
    b.append(dim(cx + r * math.cos(0.6), 60, cx + r * math.cos(0.6) + 190 - 60, 60, "STROKE 120", 0))
    b.append(leader(cx + r * math.cos(0.6) + 2, cy + r * math.sin(0.6) - 2, 60, 60, "CRANK PIN"))
    b.append(leader(290, cy - 40, 300, 290, "CONNECTING ROD"))
    b.append(label(30, 304, "FIG. 3 · CRANK AND SLIDER, THREE PHASES"))
    return svg(480, 320, "\n".join(b), "Crank and slider mechanism shown in three phases")

# ---- Plate: exploded keyboard switch (isometric) --------------------------
def iso(x, y, z, ox=210, oy=300):
    """Isometric projection, 30 degrees."""
    c, s = math.cos(math.radians(30)), math.sin(math.radians(30))
    return ox + (x - y) * c, oy + (x + y) * s - z

def box(x, y, z, w, d, h, lw=1.0, cls="", hatch_top=False):
    P = lambda a, b, c: iso(x + a, y + b, z + c)
    out = []
    top = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)]
    out.append(path(top, True, cls, lw))
    out.append(path([P(0, d, 0), P(w, d, 0), P(w, 0, 0)], False, cls, lw))
    out.append(path([P(0, d, h), P(0, d, 0)], False, cls, lw)); out.append(path([P(w, d, h), P(w, d, 0)], False, cls, lw)); out.append(path([P(w, 0, h), P(w, 0, 0)], False, cls, lw))
    if hatch_top: out.append(hatch(top, 4, 30))
    return "\n".join(out)

def plate_switch():
    b = []
    zs = [0, 60, 110, 165, 235]
    # mounting plate with hole
    b.append(box(0, 0, zs[0], 110, 110, 6, 1.0))
    hole = [iso(25, 25, 6), iso(85, 25, 6), iso(85, 85, 6), iso(25, 85, 6)]
    b.append(path(hole, True, w=0.8))
    # housing
    b.append(box(18, 18, zs[1], 74, 74, 36, 1.1))
    # spring: helix
    sp = []
    for i in range(0, 361 * 5, 12):
        a = math.radians(i); r = 10
        sp.append(iso(55 + r * math.cos(a), 55 + r * math.sin(a), zs[2] + i / (361 * 5) * 38))
    b.append(path(sp, False, "", 0.8))
    # stem (cross)
    sx, sy, sz = 55, 55, zs[3]
    b.append(box(sx - 4, sy - 12, sz, 8, 24, 22, 1.0)); b.append(box(sx - 12, sy - 4, sz, 24, 8, 22, 1.0))
    # keycap, hollow, slight taper suggested by inner rect
    b.append(box(12, 12, zs[4], 86, 86, 30, 1.2, hatch_top=False))
    inner = [iso(22, 22, zs[4] + 30), iso(88, 22, zs[4] + 30), iso(88, 88, zs[4] + 30), iso(22, 88, zs[4] + 30)]
    b.append(path(inner, True, w=0.5, dash="3 3"))
    # axis
    b.append(path([iso(55, 55, -20), iso(55, 55, 300)], w=0.4, dash="8 3 1 3", cls="acc"))
    # leaders
    for z, t in ((zs[4] + 30, "KEYCAP, PBT, 1u"), (zs[3] + 11, "STEM"), (zs[2] + 20, "SPRING, 55 gf"), (zs[1] + 18, "HOUSING"), (zs[0] + 3, "PLATE, 1.5 mm")):
        x, y = iso(110, 55, z)
        b.append(leader(x, y, 380, y - 6, t))
    b.append(dim(*iso(0, 110, 0), *iso(110, 110, 0), "19.05", 22))
    b.append(label(24, 464, "FIG. 1b · EXPLODED VIEW, SWITCH STACK, 1 : 2"))
    return svg(480, 480, "\n".join(b), "Exploded isometric view of a keyboard switch: plate, housing, spring, stem, keycap")

# ---- Plate: worm gear section -------------------------------------------
def plate_worm():
    b = []
    # worm (horizontal cylinder with thread)
    x0, x1, cy, r = 70, 330, 200, 34
    body = [(x0, cy - r), (x1, cy - r), (x1, cy + r), (x0, cy + r)]
    b.append(path(body, True, w=1.1))
    for i in range(14):
        x = x0 + 12 + i * 22
        b.append(path([(x, cy - r), (x + 11, cy + r)], w=0.9))
        b.append(path([(x + 11, cy + r), (x + 18, cy - r)], w=0.5, dash="2 2"))
    b.append(path([(x0 - 30, cy), (x1 + 30, cy)], w=0.4, dash="8 3 1 3"))
    # wheel in section above, hatched teeth ring
    wx, wy, R0, R1 = 200, 110, 70, 58
    b.append(circle(wx, wy, R0, 1.1)); b.append(circle(wx, wy, R1, 0.8)); b.append(circle(wx, wy, 14, 1.0))
    for i in range(40):
        a = 2 * math.pi * i / 40
        b.append(path([(wx + R1 * math.cos(a), wy + R1 * math.sin(a)), (wx + R0 * math.cos(a + 0.05), wy + R0 * math.sin(a + 0.05))], w=0.6))
    hub = [(wx - 14, wy - 40), (wx + 14, wy - 40), (wx + 14, wy + 40), (wx - 14, wy + 40)]
    b.append(path(hub, True, w=0.9)); b.append(hatch(hub, 4, 45))
    b.append(dim(x0, cy + r + 10, x1, cy + r + 10, "260", 18))
    b.append(dim(wx + R0 + 10, wy - R0, wx + R0 + 10, wy + R0, "ø 140", 16))
    b.append(leader(x0 + 60, cy - r, 110, 268, "WORM, 1 START"))
    b.append(leader(wx - R0 + 6, wy - 20, 120, 30, "WHEEL, 40 T"))
    b.append(label(30, 304, "FIG. 4 · WORM AND WHEEL, SECTION"))
    return svg(480, 320, "\n".join(b), "Worm and wheel in section")

plates = {"gears": plate_gears(), "crank": plate_crank(), "switch": plate_switch(), "worm": plate_worm()}
import sys
out = sys.argv[1]
for k, v in plates.items():
    open("%s/plate-%s.svg" % (out, k), "w").write(v)
print({k: len(v) for k, v in plates.items()})
