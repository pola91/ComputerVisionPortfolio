app.factory('projectModelService', function ($http, $q, $resource, $log) {
	return {
		getProject:function(projectID){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/getProjectAndFiles',{ project_id: projectID },$http,$q);
		},
		addProjectFiles:function(filesData,projectID){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/addFiles',{files:JSON.stringify(filesData),project_id:projectID},$http,$q);
		},
		changeProjectFileOrder:function(fileID,direction){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/changeFileOrder',{file_id:fileID,direction:direction},$http,$q);
		},
		changeProjectFileOrderMultipleSteps: function (fileID, steps) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/changeFileOrderMultipleSteps', { file_id: fileID, steps: steps }, $http, $q);
		},
		editProjectFileNote:function(fileID,note){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/editFileNote',{file_id:fileID,note:note},$http,$q);
		},
		deleteProjectFile:function(fileID){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/deleteFile',{file_id:fileID},$http,$q);
		},
		removeDeleteFile: function (fileID) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/removeDeleteFile', {file_id:fileID},$http,$q);
		},
		setDeleteFile: function (fileID, is_deleted) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/setDeleteFile', { file_id: fileID, is_deleted: is_deleted }, $http, $q);
		},
		getProjectScreenshots:function(projectID){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/getScreenshots',{project_id:projectID},$http,$q);
		},
		downloadProjectScreenshots:function(projectID){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/downloadScreenshots',{project_id:projectID},$http,$q);
		},
		updateProjectName :function(projectID,projectName){
			return angularHelper.ajaxPostCall(config.serviceURL+'project/updateName',{project_id:projectID,title:projectName},$http,$q);
		},
		setFileState : function (file_id,state) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/setFileState', { file_id: file_id, state: state}, $http, $q);
		},
		setAllowChanges : function (projectID, allowChanges) {
			return angularHelper.ajaxPostCall(config.serviceURL + 'project/setAllowChanges', { project_id: projectID, allowChanges: allowChanges}, $http, $q);
		},
    getSingleProject:function(projectID, token){
      return angularHelper.ajaxGetCall('/api/projects/'+projectID+'?token='+token, $http,$q);
    },
    getVideoDurations:function(){
      return angularHelper.ajaxGetCall('api/video-durations', $http,$q);
    },
    authenticate: function(userdata){
      return angularHelper.ajaxPostCall('/api/tokens/authenticate/', { username: userdata.username, password: userdata.password }, $http, $q);
    },
	};
});
