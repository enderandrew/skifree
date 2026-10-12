function isMobileDevice() {
	if (typeof navigator === 'undefined') return false;

	const hasTouchScreen = (
		(navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
		(typeof window !== 'undefined' && 'ontouchstart' in window)
	);

	const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile/i;
	const isMobileUA = mobileRegex.test(navigator.userAgent || '');

	return hasTouchScreen && isMobileUA;
}

export default isMobileDevice;