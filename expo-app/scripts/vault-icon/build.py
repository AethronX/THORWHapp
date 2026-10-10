import math, json, sys
import pathops
from fontTools.pens.svgPathPen import SVGPathPen
K=0.5523
def circle(cx,cy,r,rev=False):
    p=pathops.Path(); pen=p.getPen()
    pts=[(cx+r,cy),(cx,cy+r),(cx-r,cy),(cx,cy-r)]
    if rev: pts=pts[::-1]
    pen.moveTo(pts[0])
    for i in range(4):
        a=pts[i]; b=pts[(i+1)%4]
        # control points along tangents
        ax,ay=a[0]-cx,a[1]-cy; bx,by=b[0]-cx,b[1]-cy
        s=1 if not rev else -1
        c1=(a[0]-s*ay*K, a[1]+s*ax*K); c2=(b[0]+s*by*K, b[1]-s*bx*K)
        pen.curveTo(c1,c2,b)
    pen.closePath(); return p
def poly(pts):
    p=pathops.Path(); pen=p.getPen(); pen.moveTo(pts[0])
    for q in pts[1:]: pen.lineTo(q)
    pen.closePath(); return p
def rrect(cx,cy,w,h,ang):
    c,s=math.cos(ang),math.sin(ang)
    return poly([(cx+x*c-y*s, cy+x*s+y*c) for x,y in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]])
def U(a,b): return pathops.op(a,b,pathops.PathOp.UNION)
def D(a,b): return pathops.op(a,b,pathops.PathOp.DIFFERENCE)
C=(132,128)
door=D(circle(*C,100),circle(*C,88))            # outer rim
door=U(door,D(circle(*C,70),circle(*C,62)))      # inner ring
door=U(door,circle(*C,13))                       # hub
for i in range(6):                               # wheel spokes + knobs
    a=math.pi/6+i*math.pi/3
    door=U(door,rrect(C[0]+math.cos(a)*30,C[1]+math.sin(a)*30,36,8,a))
    door=U(door,circle(C[0]+math.cos(a)*50,C[1]+math.sin(a)*50,8))
for y in (78,178):                               # hinges on the left
    door=U(door,poly([(22,y-11),(60,y-11),(60,y+11),(22,y+11)]))
for i in range(8):                               # locking bolts around the rim
    a=i*math.pi/4
    door=U(door,circle(C[0]+math.cos(a)*94,C[1]+math.sin(a)*94,4.5))
fill=circle(*C,88)
def d(p):
    pen=SVGPathPen(None); p.draw(pen); return pen.getCommands()
print(json.dumps({"r":[d(door)],"f":[d(fill)],"l":[d(door)]},separators=(",",":")))
