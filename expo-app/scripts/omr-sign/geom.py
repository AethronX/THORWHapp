# Omani rial sign — redrawn as clean geometry from the published image (display space 2000x1048, y down).
def cubic(p0,p1,p2,p3,n=24):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],
             (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [i/n for i in range(1,n+1)]]
# Each contour: list of segments: ('M',p) ('L',p) ('C',c1,c2,p)
UPPER=[('M',(415,505)),('L',(1925,505)),('L',(1830,690)),('L',(310,690))]
LOWER=[('M',(225,795)),('L',(1730,795)),('L',(1635,985)),('L',(115,985))]
HOOK=[('M',(755,520)),('L',(755,430)),('C',(762,300),(850,120),(960,60)),('C',(1035,22),(1120,40),(1185,92)),
      ('C',(1245,138),(1290,165),(1305,195)),('C',(1290,275),(1262,385),(1240,462)),
      ('C',(1175,392),(1060,298),(950,292)),('C',(880,290),(842,318),(830,352)),('C',(826,405),(855,455),(905,520))]
TAIL=[('M',(820,680)),('L',(1160,680)),('C',(1235,715),(1305,760),(1380,805)),('L',(900,805))]
CONTOURS=[UPPER,LOWER,HOOK,TAIL]
def flatten(c):
    pts=[]; cur=None
    for seg in c:
        if seg[0]=='M': cur=seg[1]; pts.append(cur)
        elif seg[0]=='L': cur=seg[1]; pts.append(cur)
        else: pts+=cubic(cur,seg[1],seg[2],seg[3]); cur=seg[3]
    return pts
