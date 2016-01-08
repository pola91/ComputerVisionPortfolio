import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import numpy as np
from scipy import misc
import cv2
import cv2.cv as cv
np.set_printoptions(threshold=np.nan)
directory="computerVisionPortfolio/CoinRecognizer/" 
output="output/"
finalResult="final/" 
inputfile = open(directory+'input.txt')
runs=inputfile.readlines()
NoOfRuns=int(runs[0].strip("\n"))
for i in range(0,NoOfRuns+1):
	runs[i]=runs[i].strip("\n")	
	runs[i]=runs[i].strip(".jpg")

runs =runs[1:]
runs
colors01=[[255,0,0],[0,255,0],[0,0,255]]
for i in range(0,NoOfRuns):
	img1=cv2.imread(directory+runs[i]+'.jpg')
	final = img1.copy()
	img_grey=cv2.cvtColor(img1,cv2.COLOR_BGR2GRAY)
	cv2.imwrite(directory+output+runs[i]+'Gray.jpg', img_grey)
	smoothed=cv2.medianBlur(img_grey,7)
	cv2.imwrite(directory+output+runs[i]+'Median.jpg',smoothed )
	edged=cv2.Canny(smoothed,250,280)
	cv2.imwrite(directory+output+runs[i]+'Edged.jpg',edged)
	height, width = edged.shape
	print height, width
	R=[107,120,135]
	for l in range(0,3):
		Hough = np.zeros((height, width), dtype=np.uint8)
		for k in range(0,height):
			for j in range(0,width):
				if (edged[k][j]==255):
					circles = np.zeros((height, width), dtype=np.uint8)
					cv2.circle(circles, (j,k), R[l], 1, 1)
					Hough=Hough+circles
		
		cv2.imwrite(directory+output+runs[i]+'R'+str(R[l])+'Hough.jpg',Hough)
		lk=Hough.ravel()
		maxOne=max(lk)
		for k in range(0,height):
			for j in range(0,width):
				if(Hough[k][j]>maxOne-30):
					cv2.circle(final, (j,k), R[l], colors01[l], 20)
		
	
	cv2.imwrite(directory+finalResult+runs[i]+'final.jpg',final)


