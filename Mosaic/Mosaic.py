import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import numpy as np
from scipy import misc
import cv2
import cv2.cv as cv
import os.path
import sys
from numpy.linalg import inv
from PIL import Image

directory="computerVisionPortfolio/Mosaic/" 
output="output/"
final="final/"

#first = 'a1.jpg'
#second = 'b1.jpg'

#first = 'a2.jpg'
#second = 'b2.jpg'

#first = 'smoha2.png'
#second = 'smoha1.png'

#first = 'imageA.jpg'
#second = 'imageB.jpg'

first = 'uttower2.jpg'
second = 'uttower1.jpg'

imageA=cv2.imread(directory+first)
imageB=cv2.imread(directory+second)



fig = plt.figure()
A=np.zeros((8,8))

figA = fig.add_subplot(1,2,1)
figB = fig.add_subplot(1,2,2)
figA.imshow(imageA)
figB.imshow(imageB)
plt.axis('image')
pts = plt.ginput(n=8, timeout=0)
pts = np.reshape(pts, (2, 4, 2))

A[0,0]= pts[0,0,0]
A[0,1]= pts[0,0,1]
A[0,2]=1
A[0,6]= -pts[0,0,0]* pts[1,0,0]
A[0,7]= -pts[0,0,1]* pts[1,0,0]

A[1,3]= pts[0,0,0]
A[1,4]= pts[0,0,1]
A[1,5]=1
A[1,6]= -pts[0,0,0]* pts[1,0,1]
A[1,7]= -pts[0,0,1]* pts[1,0,1]

A[2,0]= pts[0,1,0]
A[2,1]= pts[0,1,1]
A[2,2]=1
A[2,6]= -pts[0,1,0]* pts[1,1,0]
A[2,7]= -pts[0,1,1]* pts[1,1,0]

A[3,3]= pts[0,1,0]
A[3,4]= pts[0,1,1]
A[3,5]=1
A[3,6]= -pts[0,1,0]* pts[1,1,1]
A[3,7]= -pts[0,1,1]* pts[1,1,1]

A[4,0]= pts[0,2,0]
A[4,1]= pts[0,2,1]
A[4,2]=1
A[4,6]= -pts[0,2,0]* pts[1,2,0]
A[4,7]= -pts[0,2,1]* pts[1,2,0]

A[5,3]= pts[0,2,0]
A[5,4]= pts[0,2,1]
A[5,5]=1
A[5,6]= -pts[0,2,0]* pts[1,2,1]
A[5,7]= -pts[0,2,1]* pts[1,2,1]

A[6,0]= pts[0,3,0]
A[6,1]= pts[0,3,1]
A[6,2]=1
A[6,6]= -pts[0,3,0]* pts[1,3,0]
A[6,7]= -pts[0,3,1]* pts[1,3,0]

A[7,3]= pts[0,3,0]
A[7,4]= pts[0,3,1]
A[7,5]=1
A[7,6]= -pts[0,3,0]* pts[1,3,1]
A[7,7]= -pts[0,3,1]* pts[1,3,1]

ptsRe=pts[1].copy()
ptsRe=ptsRe.ravel()
ptsRe=np.reshape(ptsRe, (8, 1))
Hm = np.linalg.lstsq(A, ptsRe)
ko = Hm[0]
H = np.zeros((3,3))
H[0,0] = ko[0,0]
H[0,1] = ko[1,0]
H[0,2] = ko[2,0]
H[1,0] = ko[3,0]
H[1,1] = ko[4,0]
H[1,2] = ko[5,0]
H[2,0] = ko[6,0]
H[2,1] = ko[7,0]
H[2,2] = 1

p1=[[0],[0],[1]]
p1Trans= np.dot(H,p1)
p1Trans=p1Trans/p1Trans[2,0]

p2=[[0],[imageA.shape[0]],[1]]
p2Trans= np.dot(H,p2)
p2Trans=p2Trans/p2Trans[2,0]

p3=[[imageA.shape[1]],[0],[1]]
p3Trans= np.dot(H,p3)
p3Trans=p3Trans/p3Trans[2,0]

p4=[[imageA.shape[1]],[imageA.shape[0]],[1]]
p4Trans= np.dot(H,p4)
p4Trans=p4Trans/p4Trans[2,0]

OffsetX=-min([p1Trans[0,0],p2Trans[0,0],p3Trans[0,0],p4Trans[0,0],0])
OffsetY=-min([p1Trans[1,0],p2Trans[1,0],p3Trans[1,0],p4Trans[1,0],0])
BigX=max([p1Trans[0,0],p2Trans[0,0],p3Trans[0,0],p4Trans[0,0],imageB.shape[1]])
BigY=max([p1Trans[1,0],p2Trans[1,0],p3Trans[1,0],p4Trans[1,0],imageB.shape[0]])

NewLen = BigX+OffsetX
NewWid = BigY+OffsetY

Mos = np.zeros((NewWid,NewLen,3)).astype(int)

for i in range(0, imageB.shape[0]):
	for j in range(0,imageB.shape[1]):
		Mos[i+OffsetY, j+OffsetX] = imageB[i,j]

for d in range(0, imageA.shape[0]):
	for v in range(0,imageA.shape[1]):
		trans = np.dot(H,[[v],[d],[1]])
		trans=trans/trans[2,0]
		Mos[trans[1,0]+OffsetY,trans[0,0]+OffsetX]=imageA[d,v]


cv2.imwrite(directory+final+'stitched'+first,Mos)

invH=np.linalg.inv(H)

for d in range(0, Mos.shape[0]):
	for v in range(0, Mos.shape[1]):
		trans = np.dot(invH,[[v-OffsetX],[d-OffsetY],[1]])
		trans=trans/trans[2,0]
		xx = trans[0,0]
		yy=trans[1,0]
		if Mos[d,v,0]==0 and Mos[d,v,1]==0 and Mos[d,v,2]==0 and xx>0 and xx < imageA.shape[1] and yy>0 and yy<imageA.shape[0] :	
				Mos[d,v]=imageA[int(trans[1,0]),int(trans[0,0])]


cv2.imwrite(directory+final+'filled'+first,Mos)
