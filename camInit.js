let video = document.getElementById('video');
let canvas = document.getElementById('motion');
let score = document.getElementById('score');

function initSuccess() {
	DiffCamEngine.start();
}

function initError(e) {
	console.warn('Something went wrong.');
	console.log(e)
}

function capture(payload) {
	score.textContent = payload.score;
}

DiffCamEngine.init({
	video: video,
	motionCanvas: canvas,
	initSuccessCallback: initSuccess,
	initErrorCallback: initError,
	captureCallback: capture
});
