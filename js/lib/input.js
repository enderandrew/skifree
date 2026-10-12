export default function setupInput({ player, game, canvas, spawnMonster, spawnBoarder, resetGame }) {
	// Prevent native gestures (pull-to-refresh, pinch zoom) while touching the canvas
	canvas.style.touchAction = 'none';

	const updatePointerPosition = (clientX, clientY) => {
		const rect = canvas.getBoundingClientRect();
		game.setMouseX(clientX - rect.left);
		game.setMouseY(clientY - rect.top);
		player.resetDirection();
		player.startMovingIfPossible();
	};

	// ─── Mouse & Pointer Events ───────────────────────────────────────────────

	let lastTapTime = 0;
	let activePointerId = null;

	canvas.addEventListener('pointerdown', e => {
		activePointerId = e.pointerId;
		canvas.setPointerCapture(e.pointerId);

		const now = performance.now();
		if (now - lastTapTime < 300) {
			player.speedBoost();
		}
		lastTapTime = now;

		updatePointerPosition(e.clientX, e.clientY);
	});

	canvas.addEventListener('pointermove', e => {
		if (e.pointerType === 'mouse' || e.pointerId === activePointerId) {
			updatePointerPosition(e.clientX, e.clientY);
		}
	});

	const releasePointer = e => {
		if (e.pointerId === activePointerId) {
			activePointerId = null;
		}
	};

	canvas.addEventListener('pointerup', releasePointer);
	canvas.addEventListener('pointercancel', releasePointer);

	// ─── Native Keyboard Events ───────────────────────────────────────────────

	window.addEventListener('keydown', e => {
		// Prevent scrolling with arrows or spacebar
		if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
			e.preventDefault();
		}

		switch (e.code) {
			case 'KeyW':
			case 'ArrowUp':
				player.stop();
				break;

			case 'KeyA':
			case 'ArrowLeft':
				if (player.direction === 270) {
					player.stepWest();
				} else {
					player.turnWest();
				}
				break;

			case 'KeyS':
			case 'ArrowDown':
				player.setDirection(180);
				player.startMovingIfPossible();
				break;

			case 'KeyD':
			case 'ArrowRight':
				if (player.direction === 90) {
					player.stepEast();
				} else {
					player.turnEast();
				}
				break;

			case 'KeyF':
				player.speedBoost();
				break;

			case 'KeyT':
				player.attemptTrick();
				break;

			case 'KeyM':
				spawnMonster();
				break;

			case 'KeyB':
				spawnBoarder();
				break;

			case 'Space':
				resetGame();
				break;
		}
	});

	// ─── Gamepad API Polling ──────────────────────────────────────────────────

	const previousButtonStates = new Map();
	let stickSteerCooldown = 0;

	const isButtonPressed = (button) => {
		return typeof button === 'object' ? button.pressed : button > 0.5;
	};

	const pollGamepads = () => {
		const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
		const gp = gamepads[0] || gamepads[1];
		if (!gp) return;

		const prev = previousButtonStates.get(gp.index) || {};
		const current = {};

		const buttonA = isButtonPressed(gp.buttons[0]);
		const buttonB = isButtonPressed(gp.buttons[1]);
		const buttonX = isButtonPressed(gp.buttons[2]);
		const buttonStart = isButtonPressed(gp.buttons[9]);
		const dpadUp = isButtonPressed(gp.buttons[12]);
		const dpadDown = isButtonPressed(gp.buttons[13]);
		const dpadLeft = isButtonPressed(gp.buttons[14]);
		const dpadRight = isButtonPressed(gp.buttons[15]);

		// Actions (Edge-triggered on press down)
		if (buttonA && !prev.buttonA) player.attemptTrick();
		if ((buttonB && !prev.buttonB) || (buttonX && !prev.buttonX)) player.speedBoost();
		if (buttonStart && !prev.buttonStart) resetGame();

		// Steering (D-Pad edge triggered)
		if (dpadUp && !prev.dpadUp) player.stop();
		if (dpadDown && !prev.dpadDown) {
			player.setDirection(180);
			player.startMovingIfPossible();
		}
		if (dpadLeft && !prev.dpadLeft) {
			player.direction === 270 ? player.stepWest() : player.turnWest();
		}
		if (dpadRight && !prev.dpadRight) {
			player.direction === 90 ? player.stepEast() : player.turnEast();
		}

		// Analog Stick Steering (Stick X & Y with deadzone)
		const stickX = gp.axes[0] || 0;
		const stickY = gp.axes[1] || 0;
		const DEADZONE = 0.35;

		stickSteerCooldown--;
		if (stickSteerCooldown <= 0) {
			if (stickY < -0.7) {
				player.stop();
				stickSteerCooldown = 15;
			} else if (stickY > 0.7) {
				player.setDirection(180);
				player.startMovingIfPossible();
				stickSteerCooldown = 15;
			} else if (stickX < -DEADZONE) {
				player.direction === 270 ? player.stepWest() : player.turnWest();
				stickSteerCooldown = 10;
			} else if (stickX > DEADZONE) {
				player.direction === 90 ? player.stepEast() : player.turnEast();
				stickSteerCooldown = 10;
			}
		}

		current.buttonA = buttonA;
		current.buttonB = buttonB;
		current.buttonX = buttonX;
		current.buttonStart = buttonStart;
		current.dpadUp = dpadUp;
		current.dpadDown = dpadDown;
		current.dpadLeft = dpadLeft;
		current.dpadRight = dpadRight;

		previousButtonStates.set(gp.index, current);
	};

	game.beforeCycle(pollGamepads);
}