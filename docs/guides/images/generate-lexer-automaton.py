# Draws docs/guides/images/03-lexer-automaton.svg, the state graph of the .grammar lexer.
# Usage: python3 docs/guides/images/generate-lexer-automaton.py docs/guides/images/03-lexer-automaton.svg
import math, sys
from xml.sax.saxutils import escape

R = 30
Q0 = (110, 700)
COL1, COL2 = 560, 880
ROW = 150
def row(i): return Q0[1] + i * ROW

STYLE = {
    'intermediate': ('#ecebfb', '#5b55c9', '#2f2a7a'),
    'token':        ('#e6f4ef', '#2f6f58', '#1d4a3a'),
    'discarded':    ('#eeeeee', '#7a7a7a', '#444444'),
}
# name: (x, y, kind, accepting, text, textSide, loopSide, loopLabel)
S = {
 'q0':  (Q0[0], Q0[1], 'intermediate', False, None, None, None, None),
 'q1':  (COL1, row(-4), 'token', True, 'IDENTIFIER', 'right', 'top', 'letra, dígito'),
 'q4':  (COL1, row(-3), 'token', True, 'BAR', 'right', None, None),
 'q5':  (COL1, row(-2), 'token', True, 'EPSILON', 'right', None, None),
 'q6':  (COL1, row(-1), 'intermediate', False, None, None, 'top', "todo salvo ' y salto"),
 'q7':  (COL2, row(-1), 'token', True, 'LITERAL', 'right', None, None),
 'q2':  (COL1, row(0), 'intermediate', False, None, None, None, None),
 'q3':  (COL2, row(0), 'token', True, 'ARROW', 'right', None, None),
 'q8':  (COL1, row(1), 'intermediate', False, None, None, None, None),
 'q9':  (COL2, row(1), 'token', True, 'DIRECTIVE', 'right', 'top', 'letra'),
 'q10': (COL1, row(2), 'discarded', True, 'descartado', 'below', 'right', 'todo salvo salto'),
 'q11': (COL1, row(3), 'discarded', True, 'descartado', 'below', 'right', 'espacio'),
 'q12': (COL1, row(4), 'token', True, 'NEWLINE', 'right', None, None),
}
EDGES = [  # from, to, label
 ('q0','q1','letra'), ('q0','q4','|'), ('q0','q5','ε'), ('q0','q6',"'"),
 ('q0','q2','-'), ('q0','q8','%'), ('q0','q10','#'), ('q0','q11','espacio'),
 ('q0','q12','salto de línea'),
 ('q6','q7',"'"), ('q2','q3','>'), ('q8','q9','letra'),
]
out = []
def add(s): out.append(s)
def text(x, y, s, anchor='middle', size=None, color='#333', weight='normal', italic=False):
    st = ' font-style="italic"' if italic else ''
    if size is None:
        size = 24 if len(s) == 1 else 17
        if len(s) == 1: weight = 'bold'
    add(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="{size}" fill="{color}" font-weight="{weight}"{st}>{escape(s)}</text>')

def edge(a, b, label):
    (x1, y1), (x2, y2) = S[a][:2], S[b][:2]
    dx, dy = x2 - x1, y2 - y1
    d = math.hypot(dx, dy); ux, uy = dx / d, dy / d
    sx, sy = x1 + ux * R, y1 + uy * R
    ex, ey = x2 - ux * (R + 3), y2 - uy * (R + 3)
    add(f'<path d="M{sx:.1f},{sy:.1f} L{ex:.1f},{ey:.1f}" class="edge"/>')
    if abs(uy) < 1e-6:
        text((sx + ex) / 2, sy - 10, label)
    else:
        t = 0.72
        px, py = sx + (ex - sx) * t, sy + (ey - sy) * t
        # Labels go on the side away from the neighbouring edges: upper-left for edges
        # that go up, lower-left for edges that go down.
        nx, ny = (uy, -ux) if uy < 0 else (-uy, ux)
        anchor = 'end'
        text(px + nx * 12, py + ny * 12 + (0 if uy < 0 else 12), label, anchor)

def loop(x, y, side, label):
    if side == 'top':
        add(f'<path d="M{x-13},{y-R+4} C{x-38},{y-R-58} {x+38},{y-R-58} {x+13},{y-R+2}" class="edge"/>')
        text(x, y - R - 52, label)
    else:
        add(f'<path d="M{x+R-4},{y-13} C{x+R+58},{y-38} {x+R+58},{y+38} {x+R-2},{y+13}" class="edge"/>')
        text(x + R + 58, y + 6, label, 'start')

W, H = int(sys.argv[2]) if len(sys.argv) > 2 else 1110, 1440
add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Helvetica, Arial, sans-serif">')
add('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9" fill="none" stroke="#777" stroke-width="1.4"/></marker></defs>')
add('<style>.edge{fill:none;stroke:#888;stroke-width:1.8;marker-end:url(#arrow)}</style>')
add(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
add(f'<text x="30" y="40" font-size="22" fill="#222" font-weight="bold">AFD del lexer de .grammar</text>')
add('<g transform="translate(0,40)">')

# start arrow
add(f'<path d="M{Q0[0]-85},{Q0[1]} L{Q0[0]-R-3},{Q0[1]}" class="edge"/>')
text(Q0[0] - 70, Q0[1] - 12, 'inicio', 'start')
# arc q0 -> q3 (arrowSign)
x0, y0 = Q0; x3, y3 = S['q3'][:2]
a = math.radians(-20)
sx, sy = x0 + R * math.cos(a), y0 + R * math.sin(a)
ex, ey = x3 - R * math.cos(a) - 2, y3 + R * math.sin(a) - 1
cx, cy = (sx + ex) / 2, y0 - 82
add(f'<path d="M{sx:.1f},{sy:.1f} Q{cx:.1f},{cy:.1f} {ex:.1f},{ey:.1f}" class="edge"/>')
text(cx + 120, y0 - 52, '→')

for e in EDGES: edge(*e)
for n, (x, y, kind, acc, label, side, lside, llabel) in S.items():
    if lside: loop(x, y, lside, llabel)
for n, (x, y, kind, acc, label, side, lside, llabel) in S.items():
    fill, stroke, tcolor = STYLE[kind]
    add(f'<circle cx="{x}" cy="{y}" r="{R}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')
    if acc:
        add(f'<circle cx="{x}" cy="{y}" r="{R-5}" fill="none" stroke="{stroke}" stroke-width="1.3"/>')
    num = n[1:]
    add(f'<text x="{x}" y="{y+7}" text-anchor="middle" font-size="20" fill="{tcolor}" font-weight="bold">q<tspan font-size="14" dy="4">{num}</tspan></text>')
    if label:
        if side == 'below':
            text(x, y + R + 24, label, 'middle', 15, tcolor, italic=True)
        else:
            text(x + R + 10, y + 6, label, 'start', 15, tcolor, italic=(kind == 'discarded'))

# legend
lx, ly = 780, 1060
def leg(i, kind, acc, s):
    fill, stroke, _ = STYLE[kind]
    y = ly + i * 42
    add(f'<circle cx="{lx}" cy="{y}" r="13" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>')
    if acc: add(f'<circle cx="{lx}" cy="{y}" r="9" fill="none" stroke="{stroke}" stroke-width="1.1"/>')
    text(lx + 24, y + 6, s, 'start', 16, '#333')
leg(0, 'intermediate', False, 'Estado intermedio (no acepta)')
leg(1, 'token', True, 'Acepta: emite el token indicado')
leg(2, 'discarded', True, 'Acepta: se descarta (sin token)')
text(lx - 13, ly + 3 * 42 + 6, 'Sin transición: termina el token', 'start', 16, '#333')
text(lx - 13, ly + 3 * 42 + 30, 'o, si el estado no acepta, error léxico', 'start', 16, '#333')
add('</g>')
add('</svg>')
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
