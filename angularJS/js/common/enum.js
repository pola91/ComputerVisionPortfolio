var Enums = {};
Enums.FileType = {
	VIDEO: 'video',
	IMAGE: 'image'
};
Enums.OrderDirection = {
	UP: 'up',
	DOWN: 'down'
};
Enums.MouseEvents = {
	MouseDown: 'mousedown',
	MouseUp: 'mouseup',
	MouseOut: 'mouseout',
	MouseMove: 'mousemove',
	MouseOver: 'mouseover'
};
Enums.CanvasEditBarMode = {
	Nothing: 'nothing',
	Text: 'text',
	Line: 'line',
	Rectangle: 'rectangle',
	LineArrow: 'lineArrow',
	Circle: 'circle',
	FreeDrawing: 'freeDrawing',
	Crop: 'crop',
	Blur: 'blur',
	LineArrowText: 'lineArrowText'
}
Enums.ObjectType = {
	IText: 'i-text',
	Blur: 'blur',
	Line: 'line',
	Rectangle: 'rectangle',
	Circle: 'circle',
	TwoPointsLineArrow: {
		Arrow: 'twoPointsLineArrow_arrow',
		Line: 'twoPointsLineArrow_line',
		Base: 'twoPointsLineArrow_base'
	},
	LineArrowText: {
		Arrow: 'twoPointsLineArrowText_arrow',
		Line: 'twoPointsLineArrowText_line',
		Base: 'twoPointsLineArrowText_base',
		Text: 'twoPointsLineArrowText_text'
	}
}
Enums.PopupTarget = {
	DownloadCollection: 'DownloadCollection',
	DeleteCollection: 'DeleteCollection',
	SendCollection: 'SendCollection',
	Download: 'Download',
	Delete: 'Delete',
	AddNotes: 'AddNotes',
	View: 'View',
	Edit: 'Edit',
	Send: 'Send'
}
Enums.resumeButtonValues = {
	Save:'Save',
	SaveAndResume:'Save and Resume',
	SaveAndResumeVideo:'Save and Resume Video',
	SendToEditor: 'Send To Editor',
	SendToDirector: 'Send To Director',
	Download: 'Download',
	AddNotes: 'Add Notes'
}
Enums.states = {
	ADD: 0,
	EDIT: 1,
	DELETE: 2
};

Enums.activeGallery = {
	DIRECTOR: 0,
	EDITOR: 1
};

Enums.currentUser = {
	DIRECTOR: 0,
	EDITOR: 1
};
Enums.classStyle = {
	BLUE: 0,
	GREEN: 1,
	DISABLED: 2
};

// gallery modal, in video project page, mode
Enums.galleryModal = {
	VIEW: 'view',
	DOWNLOAD: 'download',
	SEND: 'send'
};