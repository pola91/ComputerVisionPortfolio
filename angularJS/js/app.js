var app = angular.module('vidnotes', ['ngResource', 'ngRoute', 'slick', 'as.sortable', 'ngAnimate']);
app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/',{//to remove
        redirectTo: '/project/1' 
      }).when('/project/:projectID', {
        templateUrl: '/AngularApp/views/project.html',
        controller: 'VideoProjectController as project',
      }).when('/videoNotes/:fileId', {
        templateUrl: '/AngularApp/views/videoNotes.html',
        controller: 'VideoNotesController as video',
      })
  }]);