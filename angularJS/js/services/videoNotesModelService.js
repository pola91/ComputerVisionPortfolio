app.factory('videoNoteModelService', function ($http, $q, $resource, $log) {
	return {
		getProjectAndFile:function(fileID){
			return angularHelper.ajaxGetCall(config.serviceURL + 'videoNote/getProjectAndFileAndScreenshots/'+fileID,$http,$q);
		},
        getFile:function(fileID){
			return angularHelper.ajaxGetCall(config.serviceURL + 'videoNote/getFile/'+fileID,$http,$q);
		},
		addScreenshot: function(screenshot) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'videoNote/addScreenshot', screenshot, $http, $q);
		},
		updateScreenshot: function(screenshot) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'videoNote/updateScreenshot', screenshot, $http, $q);
		},
		updateScreenshotField: function(screenshotID, fieldName, fieldValue){
			var params = {screenshot_id:screenshotID,field_name:fieldName,field_value:fieldValue};
			return angularHelper.ajaxPostCall(config.serviceURL + 'videoNote/updateScreenshotField',params,$http,$q);	
		},
		deleteScreenshot: function(screenshotID){
			return angularHelper.ajaxGetCall(config.serviceURL + 'videoNote/deleteScreenshot/'+screenshotID,$http,$q);
		},
		downloadScreenshot:function(screenshotID){
			return angularHelper.ajaxGetCall(config.serviceURL + 'videoNote/downloadScreenshot/'+screenshotID,$http,$q);						
		},
		downloadScreenshots:function(screenshots){
			return angularHelper.ajaxPostCall(config.serviceURL + 'videoNote/downloadScreenshots',{screenshots:JSON.stringify(screenshots)},$http,$q);				
		},
		deleteScreenshots:function(screenshots){
			return angularHelper.ajaxPostCall(config.serviceURL + 'videoNote/deleteScreenshots',{screenshots:JSON.stringify(screenshots)},$http,$q);				
		},
		updateProjectName: function (projectID, projectName) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/updateName', { project_id: projectID, title: projectName }, $http, $q);
		},
		updateFileName: function (fileID, fileName) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/updateFileName', { file_id: fileID, file_name: fileName }, $http, $q);
		}
	};
});
