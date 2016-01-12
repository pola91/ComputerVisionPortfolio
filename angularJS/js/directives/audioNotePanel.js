// This directive is insert html of edit and play with canvas
app.directive('audioNotePanel', function($timeout) {
    return {
    	restrict: 'E',
		replace: true,
        link: function(scope, element, attrs, controller) {
        },
        templateUrl: 'AngularApp/templates/directives/audioNotePanel.html'
    };
});