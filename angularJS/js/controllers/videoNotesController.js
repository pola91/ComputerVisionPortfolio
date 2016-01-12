var canvas;
var tempCanvas;
var videoElement;
var mainImage;

// $rootScope added to set the direction of the route transition animation
app.controller('VideoNotesController', function ($scope, $rootScope, $http, $sce, $location, $log, $timeout, $routeParams, $route, $window, videoNoteModelService, projectModelService) {
	$scope.trustSrc = function (src) {
		return $sce.trustAsResourceUrl(src);
	};

	/*helper functions */
	//compare function used to sort the current screenshots array ordered by its time
	function snapshotTimeCompare(a, b) {
		if (a.snapshot_time_ms < b.snapshot_time_ms)
			return -1;
		if (a.snapshot_time_ms > b.snapshot_time_ms)
			return 1;
		return 0;
	};
	//compare function used to sort the current screenshots array dividing yhe screenshots based on their DIRECTOR
	function snapshotCreatorFlagCompare(a, b) {
		if (a.in_director_gallery < b.in_director_gallery)
			return -1;
		if (a.in_director_gallery > b.in_director_gallery)
			return 1;
		return 0;
	};
	// initialize the canvas size based on window size.
	// the canvas width is calculated based on window width, 
	// and canvas height is calculated based on the screenshots' aspect ratio 
	// all screenshots of a particular file have the same size
	function initCanvasSize(fileUrl, fileType) {
		$scope.isUpdatingGallery = true;
		$scope.canvasSize.width = 982;

		if ($window.innerWidth < 1024)
			$scope.canvasSize.width = $window.innerWidth - 72; // 72 is a const difference between the window and the image widths.

		var aspectRatio;
		var media;
		if (fileType == Enums.FileType.VIDEO) {
			// The interval approach was used due to trouble loading videos from the server.
			// This will ensure that the canvas dimensions will always be calculated correctly as long as the video is loaded correctly.
			var getVideoElementInt = setInterval(function () {
				media = document.getElementById('videoElement');
				if (media) {
					media.onloadedmetadata = function () {
						aspectRatio = this.videoWidth / this.videoHeight;
						$scope.canvasSize.height = $scope.canvasSize.width / aspectRatio;

						$scope.$apply(function () {
							$scope.isUpdatingGallery = false;
						});
					};
					clearInterval(getVideoElementInt);
				}
			}, 100);
		}
		else {
			media = new Image();
			media.src = fileUrl;
			media.onload = function () {
				aspectRatio = this.width / this.height;
				$scope.canvasSize.height = $scope.canvasSize.width / aspectRatio;

				$scope.$apply(function () {
					$scope.isUpdatingGallery = false;
				});
			};
		}
	};
	//assign proper values to the hide and disable flags depending on the user role, active gallery and if changes are allowed 
	$scope.changePreview = function () {
		$scope.hideAndDisableButton.disableSendingSingleShot = false;
		$scope.hideAndDisableButton.disableDownloadSingleShot = false;
		$scope.hideAndDisableButton.disableDeleteSingleShot = false;
		$scope.hideAndDisableButton.disableCollectionDownload = false;
		$scope.hideAndDisableButton.disableCollectionDelete = false;
		$scope.hideAndDisableButton.hideSendCollectionsButton = false;
		$scope.hideAndDisableButton.hideSendingSingleShot = false;
		$scope.hideAndDisableButton.disableSecondaryGalDelete = false;
		$scope.hideAndDisableButton.disableSecondaryGalDownload = false;
		$scope.hideAndDisableButton.hidePrimaryGalDownload = false;
		$scope.hideAndDisableButton.hidePrimaryGalDelete = false;

		if ($scope.data.thisUserIsEditor == Enums.currentUser.EDITOR) {
			$scope.hideAndDisableButton.hideSendCollectionsButton = true;
			$scope.hideAndDisableButton.hideSendingSingleShot = true;

			if ($scope.activeGalleryIndex == Enums.activeGallery.EDITOR) {
				$scope.hideAndDisableButton.disableSecondaryGalDelete = true;
				if ($scope.allowChanges === 0) {
					$scope.hideAndDisableButton.disableCollectionDownload = true;
					$scope.hideAndDisableButton.disableSecondaryGalDownload = true;
					$scope.hideAndDisableButton.disableDownloadSingleShot = true;
				}
			}

			else {
				if ($scope.allowChanges === 1) {
					$scope.hideAndDisableButton.disableDeleteSingleShot = true;
					$scope.hideAndDisableButton.disableCollectionDelete = true;
				}
				else {
					$scope.hideAndDisableButton.disableDownloadSingleShot = true;
					$scope.hideAndDisableButton.disableDeleteSingleShot = true;
					$scope.hideAndDisableButton.disableSecondaryGalDownload = true;
					$scope.hideAndDisableButton.hidePrimaryGalDownload = true;
					$scope.hideAndDisableButton.hidePrimaryGalDelete = true;
				}
			}
		}
	};
	$scope.initUserBasedFunctionality = function (thisUserIsEditor) {
		if (typeof thisUserIsEditor === 'undefined')
			return false;
		else {
			if (thisUserIsEditor) {
				$scope.data.thisUserIsEditor = Enums.currentUser.EDITOR;
			} else {
				$scope.data.thisUserIsEditor = Enums.currentUser.DIRECTOR;
			}
			$scope.allowChanges = $scope.data.project.allow_changes;
			$scope.setActiveGallery($scope.data.thisUserIsEditor);
			$scope.changePreview();
		}
	};

	// this is only for testing purposes
	$scope.setUserType = function() {
		if ($scope.thisUserRoleHTMLmodel == '1')
			$scope.data.thisUserIsEditor = Enums.currentUser.EDITOR;
		else
			$scope.data.thisUserIsEditor = Enums.currentUser.DIRECTOR;

		$scope.allowChanges = $scope.data.project.allow_changes;
		$scope.setActiveGallery($scope.data.thisUserIsEditor);
		$scope.changePreview();
	};
	$scope.activateClass = function (activeGal, flag) {
		var show = true;
		if (activeGal === 0 && !flag) {
			return Enums.classStyle.BLUE;
		}
		else if (activeGal === 1 && !flag) {
			return Enums.classStyle.GREEN;
		}
		else {
			return Enums.classStyle.DISABLED;
		}
	};

	var initializeCarousels = function (screenshot) {
		var currentScreenshotIndex = $scope.allGalleries[$scope.activeGalleryIndex].getIndexByValue('id', screenshot.id);
		$('#carousel-view-popup').carousel(currentScreenshotIndex); // ouch!! set the carousel to the currently-selected screenshot
		$('#carousel-edit-popup').carousel(currentScreenshotIndex); // still ouch!!
	};

	//request file project data
	$scope.getProjectAndFile = function (fileId) {
		videoNoteModelService.getProjectAndFile(fileId)
				.then(function (projectAndFileInfo) {
					$scope.data = projectAndFileInfo;

					initCanvasSize($scope.data.file.url, $scope.data.file.file_type);

					var date = new Date();
					var clientTimezoneOffset = date.getTimezoneOffset() * 60;
					var utcTime = date.getTime();

					$http.get('http://maps.googleapis.com/maps/api/geocode/json?address=' + $scope.data.directorUser.country_code).then(function (response) {
						$scope.newMessage = response.data.results[0].geometry.location.lat + ',' + response.data.results[0].geometry.location.lng;

						$http.get('https://maps.googleapis.com/maps/api/timezone/json?location=' + $scope.newMessage + "&timestamp=0&sensor=false").then(function (response) {
							var totalTimeOffset = (response.data.rawOffset + response.data.dstOffset + clientTimezoneOffset) * 1000;
							var directorTime = new Date(totalTimeOffset + utcTime);
							$scope.directorCurrentTime = weekday[directorTime.getDay()] + " " + directorTime.toLocaleTimeString();
							//$scope.messages.push($scope.newMessage);
							$scope.allUsersData[Enums.currentUser.DIRECTOR] = [$scope.data.directorUser, $scope.data.directorCountry, $scope.directorCurrentTime, 'Director'];
						});
					});

					if ($scope.data.editorCountry) {
						$http.get('http://maps.googleapis.com/maps/api/geocode/json?address=' + $scope.data.editorUser.country_code).then(function (response) {
							$scope.newMessage = response.data.results[0].geometry.location.lat + ',' + response.data.results[0].geometry.location.lng;
							$http.get('https://maps.googleapis.com/maps/api/timezone/json?location=' + $scope.newMessage + "&timestamp=1331161200&sensor=false").then(function (response) {
								var totalTimeOffset = (response.data.rawOffset + response.data.dstOffset + clientTimezoneOffset) * 1000;
								var editorTime = new Date(totalTimeOffset + utcTime);
								$scope.editorCurrentTime = weekday[editorTime.getDay()] + " " + editorTime.toLocaleTimeString();
								//$scope.messages.push($scope.newMessage);
								$scope.allUsersData[Enums.currentUser.EDITOR] = [$scope.data.editorUser, $scope.data.editorCountry, $scope.editorCurrentTime, 'Editor'];
							});
						});
					}
					else {
						//if not assigned to an editor
						$scope.allUsersData[Enums.currentUser.EDITOR] = [' ', ' ', ' ', 'Editor'];
					}
					//var editorTime = ;//$scope.data.editorCountry ? new Date($scope.data.editorCountry.time_offset * 1000 * 360 + utcTime) : new Date();
					//$scope.editorCurrentTime = ;//weekday[editorTime.getDay()] + " " + editorTime.toLocaleTimeString();
					//var directorTime = ;//new Date($scope.data.directorCountry.time_offset * 1000 * 360 + utcTime);
					//$scope.directorCurrentTime = ;//weekday[directorTime.getDay()] + " " + directorTime.toLocaleTimeString();
					projectModelService.getProject($scope.data.file.project_id)
							.then(function (response) {
								$scope.projectFiles = response.files;
								$scope.initPrevAndNextButtons();
							},
							function (response) { // optional
								alert('Error: ' + response.error.message);
							});

					if ($scope.data.file.file_type == Enums.FileType.IMAGE) {
						mainImage = new Image();
						mainImage.crossOrigin = 'anonymus';
						mainImage.onload = function () {
							$scope.selectScreenshotToCanvasBackground(mainImage);
							// Create a new Screenshot with Data from the image
							$scope.currentScreenshot = {
								name: 'Screenshot ' + Date.now(),
								note: '',
								snapshot_time_ms: 0,
								url: 'vortex.jpg', // Need to be changed
								file_id: $scope.data.file.id,
								has_video_note: false,
								has_audio_note: false,
								audio_note: '',
								hasChanges: false,
								isEditing: true
							}
							$scope.$apply();
						}
						$scope.timelineSegments.reloadTimeline();
						mainImage.src = $scope.data.file.url;
						$scope.resumeButtonValue = Enums.resumeButtonValues.SaveAndResume;
					} else {
						$scope.resumeButtonValue = Enums.resumeButtonValues.SaveAndResumeVideo;
					}

					$scope.lastUpdateDisplayer($scope.data.file);
				},
				function (response) { // optional
					alert('Error: ' + response.error.message);
				}
			);
	};
	$scope.getFile = function (fileId) {
		videoNoteModelService.getFile(fileId)
				.then(function (fileInfo) {
					//$scope.fileInfo = fileInfo;
					$scope.lastUpdateDisplayer(fileInfo);
					$scope.gallerySlick.isUpdating = false;
				},
					function (response) { // optional
						alert('Error: ' + response.error.message);
					}
				);
	};
	// get previous project file 
	$scope.getPreviousFile = function () {
		if ($scope.data.file && typeof $scope.projectFiles.getByValue === "function")
			if (parseInt($scope.data.file.order) - 1 != 0) {
				var previousFileID = $scope.projectFiles.getByValue('order', parseInt($scope.data.file.order) - 1).id;
				$scope.CHANGE = true;

				$rootScope.animation = 'first'; // sets the animation direction for the route transition animation
				$location.path('/videoNotes/' + previousFileID);
				//$route.updateParams(previousFileID);
				// $route.reload('/videoNotes/' + previousFileID);
			}
	};
	// get next project file
	$scope.getNextFile = function () {
		if ($scope.data.file && typeof $scope.projectFiles.getByValue === "function")
			if (parseInt($scope.data.file.order) + 1 != $scope.projectFiles.length + 1) {
				var nextFileID = $scope.projectFiles.getByValue('order', parseInt($scope.data.file.order) + 1).id
				console.log($scope.projectFiles.getByValue('order', parseInt($scope.data.file.order) + 1));
				$scope.CHANGE = true;

				$rootScope.animation = 'second'; // sets the animation direction for the route transition animation
				$location.path('/videoNotes/' + nextFileID);
				//$routeParams ==> {videoNotes:nextFileID}
				//$route.reload();
				//$route.reload('/videoNotes/' + nextFileID);
			}
	};
	$scope.initPrevAndNextButtons = function () {
		var currentFileIndex = $scope.data.file.order;

		if (currentFileIndex == 1)
			$scope.hidePrevFileButton = true;
		if (currentFileIndex == $scope.projectFiles.length)
			$scope.hideNextFileButton = true;
	};

	//the timeline class
	$scope.timelineSegments = {
		zoomValue: 1, // Zoom Value of the Timeline
		NoOfSegments: parseFloat(this.zoomValue) * 8,
		step: 0,
		//called only when page first loaded , zoom value changed or when galleries are swapped
		fillSegments: function (screenshots) {
			var imgLooper = 0;
			this.step = ((videoElement.duration) / this.NoOfSegments);
			//$scope.data.screenshots.sort(snapshotTimeCompare);
			var selected = [];
			for (var i = 0; i < this.NoOfSegments; i++) {

				var range = i * this.step;
				var imgCount = 0;
				var imgURL = null;
				var imgtime = 0;
				var thmbImgId = -1;
				//divide by 1000 to properly load the time segment since the time is stored in millisecond
				while (imgLooper < screenshots.length
						&& (screenshots[imgLooper].snapshot_time_ms / 1000) >= (range)
						&& (screenshots[imgLooper].snapshot_time_ms / 1000 <= (range + this.step))) {
					imgCount++;
					if (!imgURL) {
						imgURL = screenshots[imgLooper].url + "?" + Date.now();
						imgtime = screenshots[imgLooper].snapshot_time_ms;
						thmbImgId = screenshots[imgLooper].id;
					}
					imgLooper++;
				}
				range += this.step;
				//timeline unit segment
				var segmentPortion = {
					segmentRange: range,
					imgCnt: imgCount,
					url: imgURL,
					thumbTime: imgtime,
					imgId: thmbImgId
				};
				selected.push(segmentPortion);
			}
			return selected;
		},
		//return true if this section is when the video is playing
		shouldSectionBeHighlighted: function (index) {
			var indexInTimeSegments = currentTimeSegment($scope.currentTime);
			return (indexInTimeSegments == index);
		},
		//this function is called when a snapshot is added, deleted or updated
		//its functionality is to rearrange the values of the scope.TimeSegmentsList list to adapt to the new changes
		updateSegment: function (screenshot, action) {
			var index = $scope.allGalleries[$scope.activeGalleryIndex].getIndexByValue('id', screenshot.id);
			var indexInTimeSegments = Math.floor(currentTimeSegment(screenshot.snapshot_time_ms / 1000));
			switch (action) {
				case Enums.states.EDIT:
					if ($scope.timeSegmentsList[indexInTimeSegments].imgId == screenshot.id) {
						$scope.timeSegmentsList[indexInTimeSegments].url = screenshot.url + "?" + Date.now();
					}
					break;
				case Enums.states.DELETE:
					$scope.timeSegmentsList[indexInTimeSegments].imgCnt--;
					if ($scope.timeSegmentsList[indexInTimeSegments].imgId == screenshot.id) {
						if ($scope.timeSegmentsList[indexInTimeSegments].imgCnt == 0) {
							$scope.timeSegmentsList[indexInTimeSegments].url = null;
						} else {
							$scope.timeSegmentsList[indexInTimeSegments].url = $scope.allGalleries[$scope.activeGalleryIndex][index + 1].url;
							$scope.timeSegmentsList[indexInTimeSegments].imgId = $scope.allGalleries[$scope.activeGalleryIndex][index + 1].id;
						}
					}
					break;

				case Enums.states.ADD:
					$scope.timeSegmentsList[indexInTimeSegments].imgCnt++;
					if ($scope.timeSegmentsList[indexInTimeSegments].imgCnt == 1) {
						$scope.timeSegmentsList[indexInTimeSegments].url = screenshot.url;
						$scope.timeSegmentsList[indexInTimeSegments].thumbTime = screenshot.snapshot_time_ms;
						$scope.timeSegmentsList[indexInTimeSegments].imgId = screenshot.id;
					} else {
						if (screenshot.snapshot_time_ms <= $scope.timeSegmentsList[indexInTimeSegments].thumbTime) {
							$scope.timeSegmentsList[indexInTimeSegments].url = screenshot.url;
							$scope.timeSegmentsList[indexInTimeSegments].thumbTime = screenshot.snapshot_time_ms;
							$scope.timeSegmentsList[indexInTimeSegments].imgId = screenshot.id;
						}
					}
					break;

			}
		},
		zoomIn: function () {
			var zoomval = parseFloat($scope.timelineSegments.zoomValue);
			if (zoomval < 10) {
				zoomval += 0.1;
				$scope.timelineSegments.zoomValue = zoomval.toFixed(1);
			}
		},
		zoomOut: function () {
			var zoomval = parseFloat($scope.timelineSegments.zoomValue);
			if (zoomval > 1) {
				zoomval -= 0.1;
				$scope.timelineSegments.zoomValue = zoomval.toFixed(1);
			}
		},
		//this function is called from the view to indicate which frame in the timeline got selected
		selectTimelineSegment: function (index) {
			if ($scope.timeSegmentsList[index].imgCnt != 0) {
				var TmeSegment = $scope.timeSegmentsList[index].segmentRange;
				var step = $scope.timeSegmentsList[0].segmentRange;

				$scope.isReload = true; // a hack to resolve the selecting an already-selected screenshot from the timeline issue.
				$scope.selectScreenshot($scope.allGalleries[$scope.activeGalleryIndex].getByValue('id', $scope.timeSegmentsList[index].imgId), $scope.isReload);
			}
		},
		//currently only called when the page is loading to compose the two different galleries
		reloadTimeline: function () {
			$scope.data.screenshots.sort(snapshotCreatorFlagCompare);
			var splitIndex = $scope.data.screenshots.getIndexByValue('in_director_gallery', 1);
			if (splitIndex === null) {
				splitIndex = $scope.data.screenshots.length;
			}
			$scope.allGalleries.length = 0;
			$scope.allGalleries.push($scope.data.screenshots.slice(0, splitIndex).sort(snapshotTimeCompare));

			$scope.allGalleries.push($scope.data.screenshots.slice(splitIndex, $scope.data.screenshots.length).sort(snapshotTimeCompare));

			if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
				$scope.timeSegmentsList = $scope.timelineSegments.fillSegments($scope.allGalleries[$scope.activeGalleryIndex]);
			}
		}
	};

	// function called to scroll the timeline to where the video is running or to where a screenshot is selected from the gallery
	function autoScroll(segmentIndex, className, scrollBox) {
		var elem = document.getElementsByClassName(className)[1];
		var shiftValue = elem.scrollWidth * (segmentIndex);
		$('#' + scrollBox).scrollLeft(shiftValue);

		/*Auto scroll on the client's custom scrollbar*/
		var scrollBox = $('#' + scrollBox);
		var api = scrollBox.data('jsp');
		if (api)
			api.scrollToX(shiftValue);
		else
			scrollBox.scrollLeft(shiftValue);
	}; 
	//return the index of the timelineSegment where the currenttime is pointing
	function currentTimeSegment(timeFrame) {
		var step = $scope.timeSegmentsList[0].segmentRange;
		var indexInTimeSegments = Math.floor(timeFrame / step);
		if (indexInTimeSegments == $scope.timeSegmentsList.length) indexInTimeSegments--;
		return indexInTimeSegments;
	};

	$scope.selectScreenshotToCanvasBackground = function (element) {
		$scope.hideAndDisableButton.disableSaveScreenshot = true;
		// Clear canvas
		canvasHelper.clear();
		canvasHelper.changes.reset();
		//if(element.tagName=='VIDEO'){
		//work around to save video image data not url video
		//we need that because of saing json in undo and redo
		tempCanvas = new fabric.Canvas('cTemp', { selection: false });
		var tempImgInstance = new fabric.Image(element, { width: $scope.canvasSize.width, height: $scope.canvasSize.height });
		tempCanvas.setBackgroundImage(tempImgInstance, tempCanvas.renderAll.bind(tempCanvas));
		var img = new Image();
		img.onload = function () {
			var imgInstance = new fabric.Image(img, { width: $scope.canvasSize.width, height: $scope.canvasSize.height });
			canvasHelper.background.setBackground(imgInstance);
			$scope.isSelectingScreenshotToCanvas = false;

			$scope.hideAndDisableButton.disableSaveScreenshot = false;

			$scope.$apply();
		}
		img.src = tempCanvas.toDataURL("image/png");
	};

	$scope.editScreenshotMode = function (element) {
		// for some reason, this will initialize the canvas correctly!!
		$timeout (function () {
			$scope.selectScreenshotToCanvasBackground(element);
			// Create a new Screenshot with Data from the Video
			$scope.currentScreenshot = {
				name: 'Screenshot ' + Date.now(),
				note: '',
				snapshot_time_ms: videoElement ? videoElement.currentTime * 1000 : 0, // store time of snapshot in milli second for better time comparison and accurate sorting
				url: 'vortex.jpg', // Need to be changed
				file_id: $scope.data.file.id,
				has_video_note: false,
				has_audio_note: false,
				audio_note: '',
				hasChanges: false,
				isEditing: true,
				in_director_gallery: $scope.activeGalleryIndex,
				is_new_screenshot: 1
			}
			$scope.isViewingScreenshot = true;
		}, 100);
	};

	// video snap button (video file)
	$scope.addNotes = function () {
		$log.info('Adding Notes');
		//$('body').append("");
		$scope.resumeButtonValue = Enums.resumeButtonValues.SaveAndResumeVideo;
		videoElement.pause();
		$timeout($scope.videoPaused(), 500); // should be called whatHappensAfterVideoPause()!!!
	};
	// add notes button!! (image file)
	$scope.editScreenshotModeButtonClick = function () {
		// popup.target is used to show the delete modal template -- changed here to hide said modal and keep it from messing everything up!
		$scope.popup.target = Enums.PopupTarget.AddNote;
		$scope.resumeButtonValue = Enums.resumeButtonValues.SaveAndResume;

		$scope.popup.openEditScreeshot();
		$scope.editScreenshotMode(mainImage);
	};

	// When Video snapshot is clicked create a new snapshot
	$scope.videoPaused = function () {
		$scope.popup.openEditScreeshot();
		$scope.editScreenshotMode(videoElement); // gets the currently-displayed image from the video element and sets it as the current screenshot.		
	};
	// When Video is resumed, save the current snapshot
	$scope.videoResumed = function () {
	};

	// removes the new designation from a screenshot
	var removeScreenshotNewStatus = function (screenshot) {
		$scope.isUpdatingGallery = true;
		
		screenshot.is_new_screenshot = 0;
		var promise = videoNoteModelService.updateScreenshot(screenshot);
		promise.then(function (updatedScreenshot) {
			$scope.isUpdatingGallery = false;

		}, function (response) { // optional
			alert('Error: ' + response.error.message);
		});
	};
	var checkToRemoveScreenshotNewStatus = function (screenshot) {
		// if the current screenshot is an existing screenshot (not a new screnshot)
		if ($scope.resumeButtonValue !== Enums.resumeButtonValues.SaveAndResumeVideo && $scope.resumeButtonValue !== Enums.resumeButtonValues.SaveAndResume)
			// if the selected screenshot is new, and is updated by a different user, and it's being viewed in the big viewer
			if (($scope.popup.showViewPopup || $scope.popup.showEditPopup) && screenshot.is_new_screenshot && screenshot.is_last_updated_by_editor != $scope.data.thisUserIsEditor)
				return 1;

		return 0;
	}

	$scope.selectScreenshot = function (screenshot, isReload) {
		$scope.isSelectingScreenshotToCanvas = true;
		//canvas.clear();
		//do nothing incase of select current screenshot unless it is a reloaded shot after an edit
		if (screenshot.id == $scope.currentScreenshot.id && !isReload) {
			$scope.isReload = false;
			return;
		}

		screenshot.url = screenshot.url + '?' + Date.now();
		//return to nothing mode
		canvasHelper.SelectEditNothingMode();
		$scope.isViewingScreenshot = true;
		$scope.currentScreenshot.isEditing = false;
		//$scope.saveCurrentScreenshot();
		$scope.currentScreenshot = screenshot;
		var image = new Image();
		image.onload = function () {
			$scope.selectScreenshotToCanvasBackground(image);
		}
		image.src = config.screenshotURL + screenshot.url;
		if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
			$scope.currentTime = $scope.currentScreenshot.snapshot_time_ms / 1000;
			var segmentIndex = currentTimeSegment($scope.currentTime);
			autoScroll(segmentIndex, 'timeline-section', 'timeline-container');
		}

		if (checkToRemoveScreenshotNewStatus(screenshot))
			removeScreenshotNewStatus(screenshot);

		$scope.popup.oldAudioNote = $scope.currentScreenshot.audio_note;

		initializeCarousels(screenshot);
	};

	//return to display file mode
	$scope.backToDisplay = function (popupName) {
		$log.info("backToDisplay");
		if (canvasHelper.changes.has() || !$scope.currentScreenshot.id || $scope.currentScreenshot.audio_note !== $scope.popup.oldAudioNote) {
			$scope.isViewingScreenshot = false;
			$scope.currentScreenshot.isEditing = false;
			$scope.popup.isPlaying = false;
			$scope.userSave = true
			$scope.saveCurrentScreenshot();
			$log.info("haschanges");
			//$scope.saveCurrentScreenshot();
			//if it is a video file and
			if ($scope.resumeButtonValue != Enums.resumeButtonValues.Save) {
				$log.info("resumeButtonValue: Save closed");
			}
			$scope.userSave = false;
			//$scope.selectScreenshot($scope.currentScreenshot,false);
		}
		$scope.popup.closePopups();
	};

	$scope.saveCurrentScreenshot = function () {
		//delete imagedata
		delete $scope.currentScreenshot.imageData;

		// adjust has_audio_note
		$scope.currentScreenshot.has_audio_note = false;
		$scope.currentScreenshot.hasChanges = false;

		if ($scope.currentScreenshot.audio_note != '')
			$scope.currentScreenshot.has_audio_note = true;

		// adjust has_video_note
		if (canvasHelper.changes.has()) {
			$scope.currentScreenshot.has_video_note = true;
			$scope.currentScreenshot.hasChanges = true;
			$scope.currentScreenshot.imageData = canvasHelper.canvasToImage();
		}
		//save image if new screenshot
		if (!$scope.currentScreenshot.id)
			$scope.currentScreenshot.imageData = canvasHelper.canvasToImage();
		// Does the current screenshot have any changes?
		var bSaveImage = false;
		// New Screenshot, saved if has an audio note, or if has changes caused by video editing
		bSaveImage = $scope.currentScreenshot.hasChanges || $scope.currentScreenshot.audio_note !== $scope.popup.oldAudioNote;

		//Is this a new screenshot?
		if (!$scope.currentScreenshot.id) {
			//$scope._saveImage();
			//$scope.currentScreenshot.imageData = canvasHelper.canvasToImage(); // Always save the Image Data even if the image is not edited
			$scope.isUpdatingGallery = true;
			$scope.addScreenshot($scope.currentScreenshot)
					.then(function (addedScreenshot) {
						//$scope.currentScreenshot = addedScreenshot;
						$scope.isUpdatingGallery = false;
						$scope.allGalleries[$scope.activeGalleryIndex].push(addedScreenshot);
						$scope.allGalleries[$scope.activeGalleryIndex].sort(snapshotTimeCompare);
					});
		} else if (bSaveImage) {
			//add current date to the url to force the browser not to load a cached version
			$scope.updateScreenshot($scope.currentScreenshot);
		}
		//$scope.currentScreenshot = getNewScreenshot();
	};
	$scope.addScreenshot = function (screenshot) {
		screenshot.hasChanges = false;
		$scope.isUpdatingGallery = true;

		screenshot.is_new_screenshot = 1;
		screenshot.is_last_updated_by_editor = $scope.data.thisUserIsEditor;
		canvasHelper.changes.reset();
		canvasHelper.clear();

		var promise = videoNoteModelService.addScreenshot(screenshot);
		promise.then(function (addedScreenshot) {
			$scope.isUpdatingGallery = false;
			$log.info('Added Screenshot. Received ', addedScreenshot);
			//change timeline when new is added 
			if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
				$scope.timelineSegments.updateSegment(addedScreenshot, Enums.states.ADD);
				videoElement.play(); // resume playing only AFTER the server responds.
			}
		}, function (response) { // optional
			alert('Error: ' + response.error.message);
		});

		return promise;
	};
	// almost redundant!! 
	$scope.updateScreenshot = function (screenshot) {
		screenshot.hasChanges = false;
		$scope.isUpdatingGallery = true;

		screenshot.is_new_screenshot = 1;
		screenshot.is_last_updated_by_editor = $scope.data.thisUserIsEditor;

		var promise = videoNoteModelService.updateScreenshot(screenshot);
		promise.then(function (updatedScreenshot) {
			$scope.isUpdatingGallery = false;
			$scope.updateScreenshotrightPanelUrl(updatedScreenshot.id);
			$log.info('Updated Screenshot. Received ', updatedScreenshot);
			//reload image to canvas after update
			$scope.isReload = true;
			$scope.selectScreenshot($scope.currentScreenshot, $scope.isReload);
			//change timeline when frame is edited 
			if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
				$scope.timelineSegments.updateSegment(updatedScreenshot, Enums.states.EDIT);
				videoElement.play(); // resume playing only AFTER the server responds.
			}
		}, function (response) { // optional
			alert('Error: ' + response.error.message);
		});

		return promise;
	};

	//reload right panel images after update
	//adding time parameter to url
	$scope.updateScreenshotrightPanelUrl = function (id) {
		var screenshot = $scope.allGalleries[$scope.activeGalleryIndex].getByValue('id', id);
		screenshot.reloadTime = '?reload=' + new Date().getTime();
	};

	$scope.deleteScreenshot = function () {
		// If this is not an existing screenshot, return
		if (!$scope.currentScreenshot.id || $scope.allGalleries[$scope.activeGalleryIndex].length == 0) {
			$scope.popup.closePopups();
			return;
		}
		if ($scope.deleteionInProcess == 1) return;
		$scope.deleteionInProcess = 1;
		$scope.isUpdatingGallery = true;
		var screenshotID = $scope.currentScreenshot.id;
		var screenShot = $scope.allGalleries[$scope.activeGalleryIndex].getByValue('id', screenshotID);
		videoNoteModelService.deleteScreenshot(screenshotID)
					.then(function (response) {
						$scope.deleteionInProcess = 0;
						//change timeline when a snapshot deleted
						if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
							$scope.timelineSegments.updateSegment(screenShot, Enums.states.DELETE);
						}
						$scope.isUpdatingGallery = false;
						//so we need to store its id in a variable before calling the function
						var deletedID = $scope.currentScreenshot.id;
						$scope.popup.nextView();
						$scope.selectScreenshot($scope.currentScreenshot);
						$scope.allGalleries[$scope.activeGalleryIndex].deleteByValue('id', deletedID);
						$scope.popup.closePopups();

					}, function (response) { // optional
						$scope.deleteionInProcess = 0;
						alert('Error: ' + response.error.message);
					});
	};

	//after init video function
	$scope.initVideoElement = function () {

		videoElement = document.getElementById('videoElement');
		//because of bug in video element with angular
		videoElement.setAttribute("src", $scope.data.file.url);
		// listener for when the video's data is loaded to initiate the timeline 
		videoElement.addEventListener('loadedmetadata', function () {
			$scope.$apply(function () {
				$scope.timelineSegments.reloadTimeline(); // = $scope.timelineSegments.fillSegments($scope.allGalleries[$scope.activeGalleryIndex]);
			});
		}, false);
		//load the video to load its metadata
		videoElement.load();

		// Handle Video Pause and Resume
		/*videoElement.addEventListener('pause', function(e,s){
		// add time out because screenshot wasn't matching the paused video
		$timeout($scope.videoPaused, 500);
		}, false);*/
		videoElement.addEventListener('timeupdate', function (e, s) {
			$scope.$apply(function () {
				$scope.currentTime = videoElement.currentTime;
				var segmentIndex = Math.floor(currentTimeSegment($scope.currentTime) / 8) * 8;
				autoScroll(segmentIndex, 'timeline-section', 'timeline-container');
			});
		}, false);
	};
	$scope.startEditing = function () {
		$scope.currentScreenshot.isEditing = true;
		$scope.currentScreenshot.hasChanges = true;
	};

	//displays the last user and time the secondary gallery was updated in  
	$scope.lastUpdateDisplayer = function (fileInfo) {
		var dateObject = new Date()
		var timeOffset = dateObject.getTimezoneOffset() * 60 * 1000;
		if ($scope.activeGalleryIndex == Enums.activeGallery.DIRECTOR && fileInfo.director_gallery_updated_at != '0000-00-00 00:00:00') {
			if (fileInfo.director_gallery_updated_by_editor) {
				$scope.updaterTitle = 'EDITOR';
			}
			else {
				$scope.updaterTitle = 'DIRECTOR';
			}
			var updateDate = new Date(fileInfo.director_gallery_updated_at).getTime();
			$scope.updateDate = new Date(updateDate - timeOffset).toLocaleString();
		} else if ($scope.activeGalleryIndex == Enums.activeGallery.EDITOR && fileInfo.editor_gallery_updated_at != '0000-00-00 00:00:00') {
			if (fileInfo.editor_gallery_updated_by_editor) {
				$scope.updaterTitle = 'EDITOR';
			}
			else {
				$scope.updaterTitle = 'DIRECTOR';
			}
			var updateDate = new Date(fileInfo.editor_gallery_updated_at).getTime();
			$scope.updateDate = new Date(updateDate - timeOffset).toLocaleString();
		}
	};

	//swaps galleries
	$scope.swapGalleries = function () {
		$scope.gallerySlick.isUpdating = true;
		if ($scope.activeGalleryIndex == Enums.activeGallery.DIRECTOR)
			$scope.activeGalleryIndex = Enums.activeGallery.EDITOR;
		else
			$scope.activeGalleryIndex = Enums.activeGallery.DIRECTOR;
		//$scope.timelineSegments.reloadTimeline();
		if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
			$scope.timeSegmentsList = $scope.timelineSegments.fillSegments($scope.allGalleries[$scope.activeGalleryIndex]);
		}
		$scope.changePreview();
		//reset page preview based on cthe critirea of swapped galleries
		$scope.currentScreenshot = getNewScreenshot();
		$scope.getFile($routeParams.fileId);
	};

	$scope.setActiveGallery = function (userRole) {
		$scope.gallerySlick.isUpdating = true;
		if (userRole == Enums.currentUser.DIRECTOR)
			$scope.activeGalleryIndex = Enums.activeGallery.DIRECTOR;
		else
			$scope.activeGalleryIndex = Enums.activeGallery.EDITOR;

		//$scope.timelineSegments.reloadTimeline();
		if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
			$scope.timeSegmentsList = $scope.timelineSegments.fillSegments($scope.allGalleries[$scope.activeGalleryIndex]);
		}
		//reset page preview based on cthe critirea of swapped galleries
		$scope.currentScreenshot = getNewScreenshot();
		$scope.getFile($routeParams.fileId);
	}

	$scope.downloadScreenshot = function () {
		$scope.isUpdatingGallery = true;
		videoNoteModelService.downloadScreenshot($scope.currentScreenshot.id)
			.then(function (response) {
				$scope.isUpdatingGallery = false;
				SaveFileToDisk(response.url, 'myScreenshot.png');
			}, function (response) { // optional
				alert('Error: ' + response.error.message);
			});
	};

	function getNewScreenshot() {
		return {
			// Database Fields
			name: '',
			note: '',
			snapshot_time_ms: 0,
			url: 'vortex.jpg',
			file_id: undefined,
			has_video_note: false,
			has_audio_note: false,
			audio_note: '',
			// Client only fields
			hasChanges: false,
			isEditing: false,
			in_director_gallery: $scope.activeGalleryIndex
		}
	};

	$scope.popup = {
		//flags for showing and hiding the popups
		showParentPopup: false,
		showDivPopup: false,
		showEditPopup: false,
		showViewPopup: false,
		target: '',
		//reset all screenshots unselected
		selectedScreenshots: [],

		//view popup screenshot
		selectedViewScreenshotNumber: 0,
		selectedViewScreenshotUrl: '',
		selectedViewScreenshotName: '',
		selectedViewScreenshotId: '',
		isPlaying: false,

		oldAudioNote: '',

		// this is used to apply and remove the screen-multi class from the modal. Note that it's not reset when the modal is closed like other flags.
		screenMultiClassRetainer: 0,

		initPopup: function (target) {
			$log.info('initializing popup');
			$scope.popup.isPlaying = false;
			//disable the html's scrollbar on opening a popup 
			$("html").css("overflow", "hidden");

			// keep track of audio_note changes.
			$scope.popup.oldAudioNote = $scope.currentScreenshot.audio_note;

			// if it is an edit popup needed
			if (target == Enums.PopupTarget.Edit) {

				//initialize the carousel sliding flag in order to show the canvas and the edit bar after the modal animation completes.
				$scope.isEditCarouselSliding = true;

				if ($scope.popup.showViewPopup)
					$scope.popup.closePopups();

				$scope.popup.target = target; // set the target again, it was reset after the call to closePopups()
				$scope.resumeButtonValue = Enums.resumeButtonValues.Save;

				// animation-necessitated delay
				$timeout(function () {
					$scope.popup.openEditScreeshot();
				}, 250);

				$scope.isEditCarouselSliding = false;
			}
			else {
				$scope.popup.target = target;

				if (target == Enums.PopupTarget.View)
					$scope.resumeButtonValue = Enums.resumeButtonValues.AddNotes;
				else if (target == Enums.PopupTarget.Send)
					$scope.resumeButtonValue = Enums.resumeButtonValues.SendToEditor;
				else if (target == Enums.PopupTarget.Download)
					$scope.resumeButtonValue = Enums.resumeButtonValues.Download;

				$scope.popup.openViewScreeshot();
			}
		},
		//open popup
		open: function (target, isLeftGallery) {
			$scope.LeftGallery = isLeftGallery;
			$scope.popup.selectedScreenshots = [];
			$scope.popup.resetPopupSelection(isLeftGallery);

			$scope.popup.target = target;

			// this function is only ever used to open the "collection" modals
			$scope.popup.screenMultiClassRetainer = 0;

			//disable the html's scrollbar on opening a popup 
			$("html").css("overflow", "hidden");
			$scope.popup.showParentPopup = true;
			$scope.popup.showDivPopup = true;
		},
		openPopup: function (target, isLeftGallery) {
			if (target == Enums.PopupTarget.DownloadCollection || target == Enums.PopupTarget.SendCollection || target == Enums.PopupTarget.DeleteCollection) {
				$scope.LeftGallery = isLeftGallery;
				$scope.popup.selectedScreenshots = [];
				$scope.popup.resetPopupSelection(isLeftGallery);
			}
			else {
				$scope.selectScreenshot($scope.currentScreenshot, true);
			}

			$("html").css("overflow", "hidden");
			$scope.popup.target = target;
			$scope.popup.showParentPopup = true;
		},
		//open view screenshot
		openViewScreeshot: function () {
			$scope.popup.viewScreenshot($scope.currentScreenshot);
			$scope.popup.showParentPopup = true;

			$scope.popup.screenMultiClassRetainer = 0;

			if ($scope.popup.target != 'Delete') {
				$scope.popup.showViewPopup = true;
				$scope.popup.screenMultiClassRetainer = 1;
			}
		},
		//open editing canvas
		openEditScreeshot: function () {
			$log.info('openEditScreeshot');
			$timeout(function () {
				$scope.isReload = true;
				$scope.popup.viewScreenshot($scope.currentScreenshot);
				$scope.selectScreenshot($scope.currentScreenshot, $scope.isReload);
				$scope.isReload = false;
				$scope.popup.showParentPopup = true;
				$scope.popup.showEditPopup = true;
			}, 100);

			$scope.popup.screenMultiClassRetainer = 1;

			$("html").css("overflow", "hidden");
		},

		//close popup
		closePopups: function () {
			//enable the html's scrollbar on closing a popup 
			$("html").css("overflow", "auto");
			$scope.popup.showParentPopup = false;
			$scope.popup.target = '';

			if (canvas)
				canvas.clear();

			$scope.popup.showDivPopup = false;
			$scope.popup.showEditPopup = false;
			$scope.popup.showViewPopup = false;
		},

		//selecting multiple screenshots
		selectScreenshot: function (screenshot) {
			screenshot.isPopupSelected = !screenshot.isPopupSelected;
			if (screenshot.isPopupSelected) $scope.noOfScreenshotsSelected++;
			else $scope.noOfScreenshotsSelected--;
		},
		selectAllScreenshots: function (galleryIndex) {
			// if all screenshots are already selected
			if ($scope.noOfScreenshotsSelected == $scope.allGalleries[galleryIndex].length) {
				$scope.allGalleries[galleryIndex].forEach(function (entry) {
					entry.isPopupSelected = false;
				});
				$scope.noOfScreenshotsSelected = 0;
			} else {
				$scope.allGalleries[galleryIndex].forEach(function (entry) {
					entry.isPopupSelected = true;
				});
				$scope.noOfScreenshotsSelected = $scope.allGalleries[galleryIndex].length;
			}
		},
		//get seleted screenshots
		getSelected: function () {
			var screenshots = $scope.allGalleries[$scope.activeGalleryIndex];
			if (!$scope.LeftGallery) {
				var screenshots = $scope.allGalleries[1 - $scope.activeGalleryIndex];
			}

			var selected = [];
			for (var i = 0; i < screenshots.length; i++) {
				if (screenshots[i].isPopupSelected)
					selected.push(screenshots[i]);
			}

			// remove reload-time parameter from current screenshot if any.
			if ($scope.currentScreenshot !== {}) {
				var screenshotWithReloadTimeParam = $scope.currentScreenshot;
				screenshotWithReloadTimeParam.url = screenshotWithReloadTimeParam.url.split('?')[0];
			}
			
			return selected;
		},
		resetPopupSelection: function (isLeftGallery) {
			var screenshots = $scope.allGalleries[$scope.activeGalleryIndex];
			if (!$scope.LeftGallery)
				screenshots = $scope.allGalleries[1 - $scope.activeGalleryIndex];

			for (var i = 0; i < screenshots.length; i++)
				screenshots[i].isPopupSelected = false;
		},
		viewScreenshot: function (screenshot) {
			$scope.currentScreenshot = screenshot;
			if ($scope.data.file.file_type == Enums.FileType.VIDEO && videoElement.paused) {
				$scope.currentTime = screenshot.snapshot_time_ms;
			}

			var index = $scope.allGalleries[$scope.activeGalleryIndex].getIndexByValue('id', screenshot.id);
			$scope.popup.selectedViewScreenshotNumber = index + 1;
			$scope.popup.selectedViewScreenshotUrl = screenshot.url;
			$scope.popup.selectedViewScreenshotId = screenshot.id;
			$scope.popup.selectedViewScreenshotName = screenshot.name;

			if (checkToRemoveScreenshotNewStatus(screenshot))
				removeScreenshotNewStatus(screenshot);

			initializeCarousels(screenshot);
		},
		//get previous
		previousView: function () {
			var prev = $scope.allGalleries[$scope.activeGalleryIndex].getPreviousByValue('id', $scope.popup.selectedViewScreenshotId);

			if ($scope.popup.target == Enums.PopupTarget.Edit) {
				if (canvasHelper.changes.has() || $scope.currentScreenshot.audio_note !== $scope.popup.oldAudioNote) {
					var acceptChanges = confirm('You have unsaved notes on this screenshot, do you want to save them?')
					if (acceptChanges)
						$scope.saveCurrentScreenshot(); // save when moving across screenshots
				}

				$scope.selectScreenshot(prev, false);
			}
			$scope.popup.viewScreenshot(prev);
		},
		//get next
		nextView: function () {
			var next = $scope.allGalleries[$scope.activeGalleryIndex].getNextByValue('id', $scope.popup.selectedViewScreenshotId);

			if ($scope.popup.target == Enums.PopupTarget.Edit) {
				if (canvasHelper.changes.has() || $scope.currentScreenshot.audio_note !== $scope.popup.oldAudioNote) {
					var acceptChanges = confirm('You have unsaved notes on this screenshot, do you want to save them?')
					if (acceptChanges)
						$scope.saveCurrentScreenshot(); // save when moving across screenshots
				}

				$scope.selectScreenshot(next, false);
			}
			$scope.popup.viewScreenshot(next);
		},

		// take action depending on modal target
		singleScreenshotModalAction: function () {
			if ($scope.popup.target == Enums.PopupTarget.AddNotes || $scope.popup.target == Enums.PopupTarget.Edit) // save if editing current screenshot or taking a new screenshot
				$scope.backToDisplay('#popupEdit');

			else if ($scope.popup.target == Enums.PopupTarget.View) // show edit tools (will be changed accordingly)
				$scope.popup.initPopup('Edit'); // just change the popup target to edit

			else if ($scope.popup.target == Enums.PopupTarget.Download) // download screenshot if modal is in download mode
				$scope.downloadScreenshot();

			else if ($scope.popup.target == Enums.PopupTarget.Send) ; // do nothing at the moment. 
		},
		//excute delete or download for multiple screenshot modal
		executeAction: function () {
			$scope.popup.selectedScreenshots = $scope.popup.getSelected();
			if ($scope.popup.selectedScreenshots.length == 0) {
				alert('please select files');
				return;
			}

			$scope.isDownloadingScreenshots = true;
			if ($scope.popup.target == Enums.PopupTarget.DownloadCollection) {
				videoNoteModelService.downloadScreenshots($scope.popup.selectedScreenshots)
						.then(function (files) {
							$scope.isDownloadingScreenshots = false;
							var content = createZipOfFiles(files);
							saveAs(content, "MyScreenshots.zip");
						},
								function (response) { // optional
									alert('Error: ' + response.error.message);
								});
				$scope.popup.closePopups();
			}
			else if ($scope.popup.target == Enums.PopupTarget.DeleteCollection) {

				// if screenshots from the bottom gallery are being deleted, update the bottom gallery
				if (!$scope.LeftGallery)
					$scope.gallerySlick.isUpdating = true;

				videoNoteModelService.deleteScreenshots($scope.popup.selectedScreenshots)
						.then(function (response) {
							$scope.isDownloadingScreenshots = false;
							var screenshots = $scope.popup.selectedScreenshots;
							for (var i = 0; i < screenshots.length; i++) {
								if ($scope.LeftGallery) {
									if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
										$scope.timelineSegments.updateSegment(screenshots[i], Enums.states.DELETE);
									}
									$scope.allGalleries[$scope.activeGalleryIndex].deleteByValue('id', screenshots[i].id);
								}
								else {
									$scope.allGalleries[1 - $scope.activeGalleryIndex].deleteByValue('id', screenshots[i].id);
									$scope.gallerySlick.isUpdating = false;
								}
							}

							//$scope.currentScreenshot = getNewScreenshot();
							$scope.popup.closePopups();

						}, function (response) { // optional
							alert('Error: ' + response.error.message);
						});
			}
			else if ($scope.popup.target == Enums.PopupTarget.SendCollection) {
				$scope.isDownloadingScreenshots = false;
				$scope.popup.closePopups();
			}
		},

		//start playing
		play: function () {
			$scope.popup.isPlaying = true;
			$scope.popup.playNext();
		},
		//pause
		pause: function () {
			$scope.popup.isPlaying = false;
		},
		//play main timeout function
		playNext: function () {
			if ($scope.popup.isPlaying && ($scope.popup.showViewPopup || $scope.popup.showEditPopup)) {
				setTimeout(function () {
					if ($scope.popup.isPlaying) {
						$scope.popup.nextView();
						$scope.popup.playNext();
						$scope.$apply();
					}
				}, 3000);
			}
		}
	};

	//close popup in esc button
	//To detect escape button
	document.onkeydown = function (evt) {
		evt = evt || window.event;
		if (evt.keyCode == 27) {
			$scope.$apply(function () {
				$scope.popup.isPlaying = false;
				$scope.popup.closePopups();
			});
		}
	};
	//watcher on the zoom value if changed the fill Segments function is called
	$scope.$watch('timelineSegments.zoomValue', function (newValue, oldValue) {
		$scope.timelineSegments.NoOfSegments = $scope.timelineSegments.zoomValue * 8;
		//check if the video element initiated and whether there is a change in the zoomvalue
		if (videoElement !== undefined && (newValue - oldValue) !== 0) {
			//$scope.timelineSegments.reloadTimeline();// = 
			$scope.timeSegmentsList = $scope.timelineSegments.fillSegments($scope.allGalleries[$scope.activeGalleryIndex]);
			document.getElementById('timeline').style.width = (($scope.timelineSegments.NoOfSegments + 2) * 120) + "px";
			$('.scroll-pane').jScrollPane();
		}
	});
	$scope.$watch('popup.showDivPopup', function (newValue, oldValue) {
		if (newValue) {
			$scope.noOfScreenshotsSelected = 0;
		}
	});

	// watches to update the 'new' screenshots
	$scope.$watch('popup.showEditPopup', function (newVal, oldVal) {
		var screenshot = $scope.currentScreenshot;

		if (checkToRemoveScreenshotNewStatus(screenshot))
			removeScreenshotNewStatus(screenshot);
	});
	$scope.$watch('popup.showViewPopup', function (newVal, oldVal) {
		var screenshot = $scope.currentScreenshot;
		
		if (checkToRemoveScreenshotNewStatus(screenshot))
			removeScreenshotNewStatus(screenshot);
	});

	// Init scope variables
	//text of return or resume button
	$scope.resumeButtonValue = '';
	$scope.canvasSize = {};
	$scope.config = config;
	$scope.isAudioFilterOn = true;
	$scope.isVideoFilterOn = true;
	$scope.isViewingScreenshot = false;
	$scope.config = config;
	$scope.data = {
		project: undefined,
		file: undefined,
		screenshots: []
	};

	$scope.timeSegmentsList = []; // Time Segments list used in timeline
	$scope.directorGallery = [];
	$scope.editorGallery = [];
	$scope.allGalleries = [];
	$scope.allUsersData = [];
	$scope.updaterTitle = '';
	$scope.updateDate = '';
	$scope.noOfScreenshotsSelected = 0;
	$scope.editorCurrentTime = -1;
	$scope.directorCurrentTime = -1;
	$scope.currentScreenshot = getNewScreenshot();
	$scope.currentTime = -1; // Current highlighting time, used in timeline
	debugScope = $scope;
	// Load Data from Server
	$scope.activeGalleryIndex = Enums.activeGallery.DIRECTOR;
	$scope.allowChanges = 1;
	$scope.thisUserRoleHTMLmodel = 0;
	$scope.fileInfo = '';

	$scope.deleteionInProcess = 0;
	$scope.LeftGallery = true;
	$scope.userSave = false;
	//flaging if the canvas is reloading its content
	$scope.isReload = false;
	$scope.projectFiles = 0;

	//Slick carousel of the bottom gallery
	$scope.gallerySlick = {};
	$scope.gallerySlick.isUpdating = false;
	$scope.gallerySlick.breakpoints = [
		{
			breakpoint: 640,
			settings: {
				slidesToShow: 4,
				slidesToScroll: 2
			}
		},
		{
			breakpoint: 480,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 1
			}
		}
	];

	//hide and disabled button flags
	$scope.hideAndDisableButton = {
		disableSaveScreenshot: false,
		disableSendingSingleShot: false,
		disableDownloadSingleShot: false,
		disableDeleteSingleShot: false,
		disableCollectionDownload: false,
		disableCollectionDelete: false,
		disableSecondaryGalDelete: false,
		disableSecondaryGalDownload: false,
		hideSendCollectionsButton: false,
		hideSendingSingleShot: false,
		hidePrimaryGalDownload: false,
		hidePrimaryGalDelete: false,
		hidePrevFileButton: false,
		hideNextFileButton: false
	};

	$scope.CHANGE = false;

	var weekday = new Array(7);
	weekday[0] = "Sunday";
	weekday[1] = "Monday";
	weekday[2] = "Tuesday";
	weekday[3] = "Wednesday";
	weekday[4] = "Thursday";
	weekday[5] = "Friday";
	weekday[6] = "Saturday";

	//always last called
	$scope.getProjectAndFile($routeParams.fileId);
	$scope.initUserBasedFunctionality($scope.data.thisUserIsEditor);

	angular.element(document).ready(function () {

		console.log($scope);

		// At the start of the carousel animation, hide the canvas and the edit bar
		$('#carousel-edit-popup').on('slide.bs.carousel', function () {
			// wrapped inside a $timeout in order to update the model without using $apply which causes "$apply already in progress" error.
			$timeout(function () {
				$scope.isEditCarouselSliding = true;
			}, 0);
		});
		// At the end of the carousel animation, show the canvas and the edit bar
		$('#carousel-edit-popup').on('slid.bs.carousel', function () {
			// wrapped inside a $timeout in order to update the model without using $apply which causes "$apply already in progress" error.
			$timeout(function () {
				$scope.isEditCarouselSliding = false;
			}, 0);
		});

		// just to give time for the page to load
		var scrollbarInterval = setInterval(function () {
			if ($scope.data.file) {
				if ($scope.data.file.file_type == Enums.FileType.VIDEO) {
					document.getElementById('timeline').style.width = (($scope.timelineSegments.NoOfSegments + 2) * 120) + "px";
					$('.scroll-pane').jScrollPane();
				}
				clearInterval(scrollbarInterval);
			}
		}, 1000);

		// re-init the JSPane on window resize
		$(window).resize(function () {
			$(function () {
				$('.scroll-pane').jScrollPane();
				$('.scroll-pane-arrows').jScrollPane( {
					showArrows: true,
					horizontalGutter: 10
				});
			});
		});

		var group = '';
		var lastMove = '';
		$(function () {
			$('a[href*=#].anchor:not([href=#])').click(function () {
				if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {

					var target = $(this.hash);
					target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
					if (target.length) {
						$('html,body').animate({
							scrollTop: target.offset().top - 50
						}, 1000);
						return false;
					}
				}
			});
			$(window).scroll(function () {
				if ($(this).scrollTop() > 500) {
					$('.upArrow').show()
				} else {
					$('.upArrow').hide()
				}
			});
		});

		// Init Headroom for .header
		$(".header").headroom();

		// Init Headroom for .headroom-icons
		$(".headroom-icons").headroom({
			offset: 209
		});
		
		// mobile stuff?
		$(document).on('click', '.button-mobile', function () {
			$('body').toggleClass('opened-offcanvas');
		});

		/* Responsive menu */
		$('.mobile-tabs-menu button:nth-of-type(1)').click(function () {
			if ($('.mobile-tabs-menu button:nth-of-type(2),.mobile-tabs-menu button:nth-of-type(3)').hasClass('active')) {
				$('.vidljiv').animate({ 'left': '100%' }, 400);
				$('.vidljiv').removeClass('vidljiv');
				$('.video-project-director .container > p,.video-description-left,.description-right-up,.project-files-buttons').addClass('vidljiv');
				$('.vidljiv').css('left', '-100%');
				$('.vidljiv').animate({ 'left': '0%' }, 400);
			}
			else if ($('.mobile-tabs-menu button:nth-of-type(1)').hasClass('active')) {

			}
			else {
				$('.vidljiv').animate({ 'left': '100%' }, 400);
				$('.vidljiv').removeClass('vidljiv');
				$('.video-project-director .container > p,.video-description-left,.description-right-up').addClass('vidljiv');
				$('.vidljiv').animate({ 'left': '0%' }, 400);
			}
		});
		$('.mobile-tabs-menu button:nth-of-type(2)').click(function () {
			if ($('.mobile-tabs-menu button:nth-of-type(3)').hasClass('active')) {
				$('.vidljiv').animate({ 'left': '100%' }, 400);
				$('.vidljiv').removeClass('vidljiv');
				$('.description-right-down, .wrapper-freelanser,.project-files-buttons').addClass('vidljiv');
				$('.vidljiv').css('left', '-100%');
				$('.vidljiv').animate({ 'left': '0%' }, 400);
			}
			else if ($('.mobile-tabs-menu button:nth-of-type(2)').hasClass('active')) {

			}
			else {
				$('.vidljiv').animate({ 'left': '100%' }, 400);
				$('.vidljiv').removeClass('vidljiv');
				$('.description-right-down, .wrapper-freelanser,.project-files-buttons').addClass('vidljiv');
				$('.vidljiv').animate({ 'left': '0%' }, 400);
			}
		});
		$('.mobile-tabs-menu button:nth-of-type(3)').click(function () {
			if ($('.mobile-tabs-menu button:nth-of-type(3)').hasClass('active')) {

			}
			else {
				$('.vidljiv').animate({ 'left': '100%' }, 400);
				$('.vidljiv').removeClass('vidljiv');
				$('.video-upload,.project-files,.project-files-buttons').addClass('vidljiv');
				$('.vidljiv').animate({ 'left': '0%' }, 400);
			}
		});
		$(".mobile-tabs-menu button").click(function () {
			$(".mobile-tabs-menu button").removeClass("active");
			$(this).addClass("active");
		});
		/* Responsive menu End */
		
		/* Video snap show/hide landscape */
		$(".edit-tools").click(function () {
			$(".video-snap-checked").toggleClass("edit-block1");
			$(".screen-edit-buttons").toggleClass("edit-block");
			$("#video-snap div.item div.modal-footer").toggleClass("edit-block");
			$("#screen-edit div.item div.modal-footer").toggleClass("edit-block");
		});
		/* Video snap show/hide landscape End */
		$(".navbar-toggle").click(function () {
			$(".header").toggleClass("position-relative");
		});

		$(document).on('pagebeforeshow', '#index', function () {
			$("#edit-landscape-focus").popup({
				afteropen: function (event, ui) {
					$('#edit-landscape-input').focus();
				}
			});
		});

	/* I don't know what these are doing here!!

		// Trigger Lightbox
		$("#links a").tosrus();
		$("#links").tosrus({
			infinite: true,
			slides: {
				visible: 5
			}
		});
		$("#slider2 a").tosrus();
		$("#slider2").tosrus({
			infinite: true,
			slides: {
				visible: 5
			}
		});
		$("#slider3 a").tosrus();
		$("#slider3").tosrus({
			infinite: true,
			slides: {
				visible: 5
			}
		});
		// Trigger Lightbox End

		if ($(window).width() < 640) {
			$("#sliderTimeline a").tosrus();
			$("#sliderTimeline").tosrus({
				infinite: true,
				slides: {
					visible: 3
				}
			});
		}
		else {
			$("#sliderTimeline a").tosrus();
			$("#sliderTimeline").tosrus({
				infinite: true,
				slides: {
					visible: 7
				}
			});
		}


		$('.datepicker').datepicker();

		// Popup Datepicker
		var tmp = $.fn.popover.Constructor.prototype.show;
		$.fn.popover.Constructor.prototype.show = function () {
			tmp.call(this);
			if (this.options.callback) {
				this.options.callback();
			}
		}

		$(".start-date").popover({
			placement: 'bottom',
			content: '<h4>Edit Project Start Date</h4><div><input class="datepicker" type="text" /><button><img src="images/video-project/okay.png" alt="Okay" /></button><button><img src="images/video-project/cancel.png" alt="Cancel" /></button></div>',
			html: true,
			callback: function () {
				$('.datepicker').datepicker();
			}
		}).click(function (e) {
			e.preventDefault();
		});

		$(".end-date").popover({
			placement: 'bottom',
			content: '<h4>Edit Project Deadline Date</h4><div><input class="datepicker" type="text" /><button><img src="images/video-project/okay.png" alt="Okay" /></button><button><img src="images/video-project/cancel.png" alt="Cancel" /></button></div>',
			html: true,
			callback: function () {
				$('.datepicker').datepicker();
			}
		}).click(function (e) {
			e.preventDefault();
		});
		
		$('.styled-select').on('click', function () {
			if ($(this).attr('class') == 'styled-select default_select') {
				$('.select2-container').addClass("colored_select");
				$('.select2-container').find('.select2-results__option:hover:nth(2)').css('color', '#64FF65');
			}
		});

		$('#selecctall').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.checkbox1').each(function () { //loop through each checkbox
					this.checked = true;  //select all checkboxes with class "checkbox1"              
				});
			} else {
				$('.checkbox1').each(function () { //loop through each checkbox
					this.checked = false; //deselect all checkboxes with class "checkbox1"                      
				});
			}
		});
		$(".checkbox1").click(function () {
			if (!$(this).is(":checked")) {
				$("#selecctall").prop("checked", false);
			} else {
				var flag = 0;
				$(".checkbox1").each(function () {
					if (!this.checked)
						flag = 1;
				})
				if (flag == 0) { $("#selecctall").prop("checked", true); }
			}
		});

		$('#other-1').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.oth-software').show();
			} else {
				$('.oth-software').hide();
			}
		});
		$('#other').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.oth-software').show();
			} else {
				$('.oth-software').hide();
			}
		});

		$('#selecctall-p').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.checkbox1').each(function () { //loop through each checkbox
					this.checked = true;  //select all checkboxes with class "checkbox1"              
				});
			} else {
				$('.checkbox1').each(function () { //loop through each checkbox
					this.checked = false; //deselect all checkboxes with class "checkbox1"                      
				});
			}
		});
		$(".checkbox1").click(function () {
			if (!$(this).is(":checked")) {
				$("#selecctall-p").prop("checked", false);
			} else {
				var flag = 0;
				$(".checkbox1").each(function () {
					if (!this.checked)
						flag = 1;
				})
				if (flag == 0) { $("#selecctall-p").prop("checked", true); }
			}
		});

		$('#other-1').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.oth-software').show();
			} else {
				$('.oth-software').hide();
			}
		});
		$('#other').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.oth-software').show();
			} else {
				$('.oth-software').hide();
			}
		});

		$.extend($.fn.dataTable.defaults, {
			responsive: true
		});
		$(document).ready(function () {
			$('#example1').DataTable();
		});
		$('#example1').dataTable({
			"pageLength": 5
		});

		// tooltip init
		$(function () {
			$('[data-toggle="tooltip"]').tooltip()
		});

		$(function () {
			var myClick = $('[data-toggle="collapse"]');
			myClick.click(function () {
				$('body').toggleClass('opened-navigation');
			});
			// Navigation submenu

			$(document).on('click', '.nav-list li > a', function () {
				var parent = $(this).parents('li').eq(0);
				if (parent.hasClass('opened-submeny')) {
					parent.removeClass('opened-submeny');
				}
				else {
					$(this).parents('ul').eq(0).find('> li.opened-submeny').removeClass('opened-submeny');
					parent.addClass('opened-submeny');

				}
			});
		});

		if ($("#about").hasClass("opened")) {
			$("#about").animate({ right: -700 + "px" }, 2000);
		}

		// collapse, expand handlers
		$('#video-expandall').click(function () {
			$(this).css('color', '#474747');
			$('#video-collapseall').css('color', '#4b8dcb');
			$('.video-list').removeClass('video-toggle-collapsed');
			$('.single-video-featuredimg,.single-video-description').fadeIn();
			$('.project-more-opt.dropdown > button').css("display", "none");
		});
		$('#video-collapseall').click(function () {
			$(this).css('color', '#474747');
			$('#video-expandall').css('color', '#4b8dcb');
			$('.video-list').addClass('video-toggle-collapsed');
			$('.single-video-featuredimg,.single-video-description').fadeOut();
			$('.project-more-opt.dropdown > button').css("display", "block");
			$('.single-video-hover').hide();
		});

		$('.gallery').each(function () { // the containers for all your galleries
			$(this).magnificPopup({
				delegate: 'a', // the selector for gallery item
				type: 'image',
				gallery: {
					enabled: true
				}
			});
		});

		// Double select
		$('#dur-vid').change(function () {
			$('.other-time-hide').hide();
			$('#' + $(this).val()).show();
		});
		$('#music-genre-main').change(function () {
			$('.double-select').hide();
			$('#' + $(this).val()).show();
		});
		// Double select End
		var visina_slike = $('.video-description-left .video-span-wrap').height();
		$('.video-description-left .span-height').css('height', visina_slike);
		var visina_slike1 = $('.uploader-short-details').height();
		$('.uploader-avatar').css('height', visina_slike1);
		$('.mobile-tabs-menu button:nth-of-type(2)').click(function () {
			setTimeout(function () {
				var visina_slike1 = $('.uploader-short-details').height();
				$('.uploader-avatar').css('height', visina_slike1);
			}, 1);
		});

		$('button#project-delete-file').click(function() {
			$('.single-video-hover').fadeIn();
		});
		$('.single-video-hover-buttons button').click(function() {
			$('.single-video-hover').fadeOut();
		});

		$(".mobile-tabs-menu button:nth-of-type(1)").click(function(){
			$(".video-project-director .container > p").fadeIn();
			$(".video-description-left").fadeIn();
			$(".description-right-up").fadeIn();
			$(".description-right-down").hide();
			$(".video-upload").hide();
			$(".project-files").hide();
		});
		$(".mobile-tabs-menu button:nth-of-type(2)").click(function(){
			$(".video-project-director .container > p").hide();
			$(".video-description-left").hide();
			$(".description-right-up").hide();
			$(".description-right-down").fadeIn();
			$(".video-upload").hide();
			$(".project-files").hide();
		});
		$(".mobile-tabs-menu button:nth-of-type(3)").click(function(){
			$(".video-project-director .container > p").hide();
			$(".video-description-left").hide();
			$(".description-right-up").hide();
			$(".description-right-down").hide();
			$(".video-upload").fadeIn();
			$(".project-files").fadeIn();
		});

		// Select all checkbox download screenshots modal
		$('#dl-check-all').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.check1').each(function () { //loop through each checkbox
					this.checked = true;  //select all checkboxes with class "checkbox1"              
				});
			} else {
				$('.check1').each(function () { //loop through each checkbox
					this.checked = false; //deselect all checkboxes with class "checkbox1"                      
				});
			}
		});

		$(".check1").click(function () {
			if (!$(this).is(":checked")) {
				$("#dl-check-all").prop("checked", false);
			} else {
				var flag = 0;
				$(".check1").each(function () {
					if (!this.checked)
						flag = 1;
				})
				if (flag == 0) { $("#dl-check-all").prop("checked", true); }
			}
		});
		// send screenshot modal
		$('#dl-check-all1').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.check2').each(function () { //loop through each checkbox
					this.checked = true;  //select all checkboxes with class "checkbox1"              
				});
			} else {
				$('.check2').each(function () { //loop through each checkbox
					this.checked = false; //deselect all checkboxes with class "checkbox1"                      
				});
			}
		});
		$(".check2").click(function () {
			if (!$(this).is(":checked")) {
				$("#dl-check-all1").prop("checked", false);
			} else {
				var flag = 0;
				$(".check2").each(function () {
					if (!this.checked)
						flag = 1;
				})
				if (flag == 0) { $("#dl-check-all1").prop("checked", true); }
			}
		});
		$('#dl-check-all3').click(function (event) {  //on click
			if (this.checked) { // check select status
				$('.check3').each(function () { //loop through each checkbox
					this.checked = true;  //select all checkboxes with class "checkbox1"              
				});
			} else {
				$('.check3').each(function () { //loop through each checkbox
					this.checked = false; //deselect all checkboxes with class "checkbox1"                      
				});
			}
		});
		$(".check3").click(function () {
			if (!$(this).is(":checked")) {
				$("#dl-check-all3").prop("checked", false);
			} else {
				var flag = 0;
				$(".check3").each(function () {
					if (!this.checked)
						flag = 1;
				})
				if (flag == 0) { $("#dl-check-all3").prop("checked", true); }
			}
		});

		// Upload Button - Span
		var span = document.getElementsByClassName('upload-path');
		var uploader = document.getElementsByName('upload');
		// On change
		for (item in uploader) {
			// Detect changes
			uploader[item].onchange = function () {
				// Echo filename in span
				span[0].innerHTML = this.files[0].name;
			}
		}

		$(function () {
			$('[data-toggle="tooltip"]').tooltip()
		});
		$(function () {
			$('[data-toggle="popover"]').popover()
		});

		$('.project-files-buttons .change-buttons button').click(function () {
			$('.project-files-buttons .change-buttons button').removeClass('button-active');
			$(this).addClass('button-active');
		});

		$(".checkbox-inline1").click(function () {
			$('.fixed-price1').addClass('fxd');
			$('.fixed-price2').removeClass('fxd');
		});

		$(".checkbox-inline2").click(function () {
			$('.fixed-price2').addClass('fxd');
			$('.fixed-price1').removeClass('fxd');
		});

		// Video Notes Video Click
		$(".video-notes-wrapper > div > .col-sm-12").click(function () {
			$(".video-notes-wrapper > div > .col-sm-12").removeClass("selected");
			$(this).addClass("selected");
		});

		// Video Notes Video Click End
		$('#fixed-price').click(function () {
			$(".for-hide2").toggleClass('d-none1');
			var checkedBox = $(this).attr("checked");
			if (checkedBox === true) {
				$("#is_range").attr('checked', false);
			} else {
				$("#is_range").removeAttr('checked');
			}
		});
		$('#is_range').click(function () {
			$(".for-hide1").toggleClass('d-none1');
			$(".fixed-price2").toggleClass('d-none1');
			var checkedBox = $(this).attr("checked");
			if (checkedBox === true) {
				$("#fixed-price").attr('checked', false);
			} else {
				$("#fixed-price").removeAttr('checked');
			}
		});
		$('#allow_bid').click(function () {
			$(".for-hide1").toggleClass('d-none');
			$(".for-hide2").toggleClass('d-none');
		});

		// Scroller -- just a single solitary scrollbar in the entire project
		$(function () {
			$('.scroll-pane').jScrollPane();
			$('.scroll-pane-arrows').jScrollPane(
			{
				showArrows: true,
				horizontalGutter: 10
			});
		});

		// slick sliders
		$('.slickSlide').slick({
			infinite: false,
			speed: 300,
			slidesToShow: 7,
			slidesToScroll: 4,
			responsive: [
				{
					breakpoint: 640,
					settings: {
						slidesToShow: 4,
						slidesToScroll: 2
					}
				},
				{
					breakpoint: 480,
					settings: {
						slidesToShow: 2,
						slidesToScroll: 1
					}
				}
				// You can unslick at a given breakpoint now by adding:
				// settings: "unslick"
				// instead of a settings object
			]
		});

		$('.slickSlide5').slick({
			infinite: false,
			speed: 300,
			slidesToShow: 5,
			slidesToScroll: 4,
			responsive: [
				{
					breakpoint: 991,
					settings: {
						slidesToShow: 3,
						slidesToScroll: 2
					}
				},
				{
					breakpoint: 767,
					settings: {
						slidesToShow: 5,
						slidesToScroll: 2
					}
				},
				{
					breakpoint: 640,
					settings: {
						slidesToShow: 4,
						slidesToScroll: 2
					}
				},
				{
					breakpoint: 600,
					settings: {
						slidesToShow: 3,
						slidesToScroll: 1
					}
				}
			]
		});

		// these are in the project page, not in the videoNotes page!!
		$(".video-edi").click(function () {
			setTimeout(function () {

				$('.slickSlide1').slick({
					infinite: false,
					speed: 300,
					slidesToShow: 6,
					slidesToScroll: 4,
					responsive: [
						{
							breakpoint: 767,
							settings: {
								slidesToShow: 3,
								slidesToScroll: 2
							}
						},
						{
							breakpoint: 480,
							settings: {
								slidesToShow: 2,
								slidesToScroll: 1
							}
						}
					]
				});
			}, 500);
		});
		$(".video-dir").click(function () {
			setTimeout(function () {

				$('.slickSlide7').slick({
					infinite: false,
					speed: 300,
					slidesToShow: 6,
					slidesToScroll: 4,
					responsive: [
						{
							breakpoint: 767,
							settings: {
								slidesToShow: 3,
								slidesToScroll: 2
							}
						},
						{
							breakpoint: 480,
							settings: {
								slidesToShow: 2,
								slidesToScroll: 1
							}
						}
					]
				});
			}, 500);
		});

		$('.single-video-description .share-button,div#share-modal .share-button').click(function () {
		if ($('.single-video-description .share-clicked,div#share-modal .share-clicked').hasClass('kliknuto')) {
			$('.single-video-description .share-clicked,div#share-modal .share-clicked').removeClass('kliknuto');
			$('.single-video-description .share-clicked,div#share-modal .share-clicked').fadeOut();
		}
		else {
			$('.single-video-description .share-clicked,div#share-modal .share-clicked').addClass('kliknuto');
			$('.single-video-description .share-clicked,div#share-modal .share-clicked').fadeIn();
		}
		});
		// Popup on vp
		$(".popup-send-email-ss").click(function () {
			$(".popup-download-project").hide();
			$(".vp-edit-screen").hide();
			$(".send-screen-popup").fadeIn();
		});
		$(".popup-download-pf").click(function () {
			$(".send-screen-popup").hide();
			$(".vp-edit-screen").hide();
			$(".popup-download-project").fadeIn();
		});

		// temporary code
		$(".popup-edit-tools").click(function () {
			$(".screen-edit-container.edit-buttons").addClass("opa-ch1");
			$(".edit-buttons").addClass("edit-block");
			$(".screen-edit-container.edit-buttons, .edit-buttons").fadeIn();
			$(".video-snap-checked").addClass("edit-block1");
		});

		$(".edit-buttons .save-edit,.edit-buttons .close").click(function () {
			$(".screen-edit-container.edit-buttons, .edit-buttons").fadeOut();
			$(".video-snap-checked").removeClass("edit-block1");
			setTimeout(function () {
				$("#view-screensh .modal-footer").toggleClass("edit-block");
				$(".vp-edit-screen .screen-edit-container").toggleClass("opa-ch1");
			}, 200);
		});
		// end temporary code

		$("#view-screensh-dir #screen-edit .save-edit,#view-screensh-dir #screen-edit .close").click(function () {
			$("#view-screensh-dir .popup-download-project").removeClass("hide-popup-opacity");
			$("#view-screensh-dir .send-screen-popup").removeClass("hide-popup-opacity");
			$(".vp-edit-screen .screen-edit-container,#view-screensh-dir .modal-footer").fadeOut();
			$(".video-snap-checked").removeClass("edit-block1");
			setTimeout(function () {
				$("#view-screensh-dir .modal-footer").toggleClass("edit-block");
				$(".vp-edit-screen .screen-edit-container").toggleClass("opa-ch1");
			}, 200);
		});
		$(".vp-edit-screen .edit-tools").click(function () {
			$(".vp-edit-screen .screen-edit-container").toggleClass("opa-ch1");
			$(".vp-edit-screen .screen-edit-container,#view-screensh-dir .modal-footer,#view-screensh .modal-footer").addClass('dis-ch');
		});
		$(".vp-edit-screen .video-snap-checked").click(function () {
			$(".vp-edit-screen .screen-edit-container,#view-screensh-dir .modal-footer").toggleClass("opacity", "0");
		});
		// Popup on vp End

		// Doc Ready, Not Ready
		$('#dur-vid').change(function () {
			$('.other-time-hide').hide();
			$('#' + $(this).val()).show();
		});
		// Doc Ready, Not Ready  End

		// Popover duration
		$('.dur-trajanje').popover({
			placement: 'bottom',
			container: 'body',
			html: true,
			content: function () {
				return $(this).next('.video-duration-select').html();
			}
		});

		// Double Select
		$(function () {
			$('#music-genre-main').change(function () {
				$('.double-select').hide();
				$('#' + $(this).val()).show();
			});
		});
		// Double Select End
	*/
	});

});
