export default function setupInput({
	player, game, canvas, camera,
	spawnMonster, spawnBoarder, spawnDog = () => {}, spawnNoviceSkier = () => {},
	playerLunge = () => {}, toggleSkin = () => {}, resetGame,
	konami = null,
}) {
	const KONAMI_KEYS = {
		ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
		KeyB: 'b', KeyA: 'a',
	};

	canvas.style.touchAction = 'none';

	const executeJumpOrTrick = () => {
		if (game.isPaused()) {
			resetGame();
			return;
		}
		if (player.isJumping) {
			player.trickFlip();
		} else {
			player.jump();
		}
	};

	const handleLeft = () => {
		if (player.isJumping) {
			player.trickTwisterLeft();
		} else if (player.direction === 270) {
			player.stepWest();
		} else {
			player.turnWest();
		}
	};

	const handleRight = () => {
		if (player.isJumping) {
			player.trickTwisterRight();
		} else if (player.direction === 90) {
			player.stepEast();
		} else {
			player.turnEast();
		}
	};

	const handleDown = () => {
		if (player.isJumping) {
			player.trickFlip();
		} else {
			player.setDirection(180);
			player.startMovingIfPossible();
		}
	};

	const handleUp = () => {
		if (player.isJumping) {
			player.trickDaffy();
		} else if (player.direction === 90 || player.direction === 270) {
			player.stepUp();
		} else {
			player.stop();
		}
	};

	// ─── Mouse & Pointer Events ───────────────────────────────────────────────

	let lastTapTime = 0;
	let activePointerId = null;

	canvas.addEventListener('pointerdown', e => {
		activePointerId = e.pointerId;
		canvas.setPointerCapture(e.pointerId);

		// Primary button click triggers Jump
		if (e.button === 0) {
			const now = performance.now();
			if (now - lastTapTime < 300) {
				player.speedBoost();
			} else {
				executeJumpOrTrick();
			}
			lastTapTime = now;
		}
	});

	canvas.addEventListener('pointermove', e => {
		if (e.pointerType === 'mouse' || e.pointerId === activePointerId) {
			const rect = canvas.getBoundingClientRect();
			const [x, y] = camera
				? camera.cssToLogical(e.clientX - rect.left, e.clientY - rect.top)
				: [e.clientX - rect.left, e.clientY - rect.top];
			game.setMouseX(x);
			game.setMouseY(y);
			if (!player.isJumping) {
				player.resetDirection();
				player.startMovingIfPossible();
			}
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
		if (['Space', 'Insert', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
			e.preventDefault();
		}
		// Held-key auto-repeat still steers and walks, but only a real
		// press counts towards the Konami code
		if (konami && !e.repeat) {
			// While the code is waiting for B then A, those keys only count
			// towards the code (no snowboarder spawn, no step left).
			const isButton = e.code === 'KeyB' || e.code === 'KeyA';
			const swallow = isButton && konami.expectsButton();
			konami.feed(KONAMI_KEYS[e.code] ?? 'other');
			if (swallow) return;
		}

		switch (e.code) {
			// Left
			case 'ArrowLeft':
			case 'KeyA':
			case 'Numpad4':
				handleLeft();
				break;

			// Right
			case 'ArrowRight':
			case 'KeyD':
			case 'Numpad6':
				handleRight();
				break;

			// Down
			case 'ArrowDown':
			case 'KeyS':
			case 'Numpad2':
				handleDown();
				break;

			// Up
			case 'ArrowUp':
			case 'KeyW':
			case 'Numpad8':
				handleUp();
				break;

			// Jump Keys
			case 'Insert':
			case 'Space':
			case 'KeyE':
			case 'Numpad0':
				executeJumpOrTrick();
				break;

			// Numpad Direct Directions
			case 'Numpad7':
				player.setDirection(270);
				break;
			case 'Numpad9':
				player.setDirection(90);
				break;
			case 'Numpad1':
				player.setDirection(210);
				player.startMovingIfPossible();
				break;
			case 'Numpad3':
				player.setDirection(150);
				player.startMovingIfPossible();
				break;

			// Modifiers & Cheats
			case 'KeyF':
				player.speedBoost();
				break;
			case 'KeyM':
				spawnMonster();
				break;
			case 'KeyB':
				spawnBoarder();
				break;
			case 'KeyG':
				spawnDog();
				break;
			case 'KeyN':
				spawnNoviceSkier();
				break;
			case 'KeyX':
				playerLunge();
				break;
			case 'KeyC':
				toggleSkin();
				break;
		}
	});

	// ─── Gamepad API Polling ──────────────────────────────────────────────────

	const previousButtonStates = new Map();
	let stickSteerCooldown = 0;

	const isButtonPressed = btn => (typeof btn === 'object' ? btn.pressed : btn > 0.5);

	const pollGamepads = () => {
		const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
		const gp = gamepads[0] || gamepads[1];
		if (!gp) return;

		const prev = previousButtonStates.get(gp.index) || {};
		const current = {};

		// Face buttons, Bumpers, and Triggers all act as Jump/Trick triggers
		const jumpButtons = [0, 1, 2, 3, 4, 5, 6, 7];
		let anyJumpPressed = false;
		for (const idx of jumpButtons) {
			if (gp.buttons[idx] && isButtonPressed(gp.buttons[idx])) {
				if (!prev[`btn${idx}`]) {
					// Standard mapping: button 1 (right face) is B, button 0 (bottom face) is A
					const token = idx === 1 ? 'b' : idx === 0 ? 'a' : 'other';
					const swallow = konami && token !== 'other' && konami.expectsButton();
					konami?.feed(token);
					if (!swallow) anyJumpPressed = true;
				}
				current[`btn${idx}`] = true;
			}
		}

		if (anyJumpPressed) {
			executeJumpOrTrick();
		}

		// Start / Pause
		const buttonStart = isButtonPressed(gp.buttons[9]);
		if (buttonStart && !prev.buttonStart) resetGame();
		current.buttonStart = buttonStart;

		// D-Pad Steering
		const dpadUp = isButtonPressed(gp.buttons[12]);
		const dpadDown = isButtonPressed(gp.buttons[13]);
		const dpadLeft = isButtonPressed(gp.buttons[14]);
		const dpadRight = isButtonPressed(gp.buttons[15]);

		if (dpadUp && !prev.dpadUp) { konami?.feed('up'); handleUp(); }
		if (dpadDown && !prev.dpadDown) { konami?.feed('down'); handleDown(); }
		if (dpadLeft && !prev.dpadLeft) { konami?.feed('left'); handleLeft(); }
		if (dpadRight && !prev.dpadRight) { konami?.feed('right'); handleRight(); }

		current.dpadUp = dpadUp;
		current.dpadDown = dpadDown;
		current.dpadLeft = dpadLeft;
		current.dpadRight = dpadRight;

		// Analog Stick
		const stickX = gp.axes[0] || 0;
		const stickY = gp.axes[1] || 0;
		const DEADZONE = 0.35;

		stickSteerCooldown--;
		if (stickSteerCooldown <= 0) {
			if (stickY < -0.7) {
				handleUp();
				stickSteerCooldown = 15;
			} else if (stickY > 0.7) {
				handleDown();
				stickSteerCooldown = 15;
			} else if (stickX < -DEADZONE) {
				handleLeft();
				stickSteerCooldown = 10;
			} else if (stickX > DEADZONE) {
				handleRight();
				stickSteerCooldown = 10;
			}
		}

		previousButtonStates.set(gp.index, current);
	};

	game.beforeCycle(pollGamepads);
}