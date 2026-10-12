// The yeti used to be deleted when it touched a tree. That never actually
// happened in-game because moving objects were not culled, so the yeti always
// trampled straight through. Moving objects are culled now, so this is kept as
// an explicit no-op to preserve the behaviour players are used to.
const monsterHitsTree = () => {};
const treeHitsMonster = () => {};

const treeHitsSkier = (tree, skier) => {
	skier.hasHitObstacle(tree);
};

const rockHitsSkier = (rock, skier) => {
	skier.hasHitObstacle(rock);
};

const jumpHitsSkier = (jump, skier) => {
	skier.hasHitJump(jump);
};

const obstacleHitsSkier = (obstacle, skier) => {
	skier.hasHitObstacle(obstacle);
};

// Coordinate convention: [x, y, w, h] or [x, y, w, h, true].
//  - A trailing `true` means "draw this region mirrored horizontally". The
//    sheet's west-facing row is a pixel-exact mirror of the east row, so this
//    gives west-facing art for frames that only exist facing east (the walk
//    cycle, the lunge, the dog, the alternate skin).
//  - sprite-characters.png: y/h span the full band between the green separator
//    lines and x/w are pixel-tight. Sprite.draw() places frames by their
//    top-left corner, so a shared height per row keeps feet on the same
//    baseline and stops frames bobbing when an animation switches.
//    Bands: 0-33, 37-70, 74-108, 112-154, 158-200, 204-222, 226-257,
//           267-300, 304-344, 348-374, 378-404, 408-448.
//  - skifree-objects.png: pixel-tight boxes, never touching the blue lines
//    at rows 63-65 and 130-132.
// Hit boxes are [left, top, right, bottom] in sprite-local pixels.

const mirror = ([x, y, w, h]) => [x, y, w, h, true];

const walkFrames = rowY => ({
	walkEast1: [0, rowY, 13, 27],
	walkEast2: [15, rowY, 15, 27],
	walkEast3: [33, rowY, 14, 27],
	walkEast4: [49, rowY, 20, 27],
	walkEast5: [71, rowY, 18, 27],
	walkEast6: [91, rowY, 19, 27],
	walkEast7: [112, rowY, 16, 27],
	walkEast8: [130, rowY, 15, 27],
	lungeEast1: [147, rowY, 22, 27],
	lungeEast2: [171, rowY, 21, 27],
	lungeEast3: [194, rowY, 33, 27],
});

const withWestMirrors = frames => {
	const out = { ...frames };
	for (const [key, box] of Object.entries(frames)) {
		if (key.includes('East')) out[key.replace('East', 'West')] = mirror(box);
	}
	return out;
};

const defaultSkierParts = {
	blank: [0, 0, 0, 0],

	// Row 1 (band y 0-33)
	east: [0, 0, 23, 34],
	esEast: [25, 0, 22, 34],
	sEast: [49, 0, 16, 34],
	south: [67, 0, 15, 34],
	jumping: [84, 0, 32, 34],          // spread-eagle: the default airborne pose
	somersault1: [118, 0, 29, 34],     // flip, inverted with skis up
	somersault2: [149, 0, 31, 34],     // flip, upside down legs apart
	trickTwistEast: [182, 0, 28, 34],  // body turned side-on, skis pointing east
	trickSkisUp: [212, 0, 28, 34],     // seen from behind, skis vertical, snow spray
	ouch: [242, 0, 31, 34],            // includes "OUCH!" and its cloud

	// Row 2 (band y 37-70) — pixel-exact mirrors of row 1
	west: [1, 37, 23, 34],
	wsWest: [26, 37, 22, 34],
	sWest: [50, 37, 16, 34],
	trickTwistWest: [182, 37, 28, 34],

	// Row 3 (band y 74-108)
	hit: [0, 74, 31, 35],              // sitting in the snow after a crash
	skate1: [33, 74, 23, 35],          // 2-frame skating push (both face east)
	skate2: [58, 74, 23, 35],
	tumble: [83, 74, 32, 35],          // upside down with crossed skis: bad landing
	daffy: [117, 74, 25, 35],          // one ski forward, one back

	// Rows 10 (band y 348-374): walk + pole lunge, mirrored for west
	...withWestMirrors(walkFrames(348)),
};

const sprites = {

	// ─── Player Skier (sprite-characters.png) ───────────────────────────────
	skier: {
		$imageFile: 'sprite-characters.png',
		parts: defaultSkierParts,
		hitBoxes: {
			0: [7, 20, 27, 34]
		},
		id: 'player',
		hitBehaviour: {}
	},

	// ─── Alternate Skier Skin (olive hair) ──────────────────────────────────
	// Rows 8, 9 and 11 repeat the default skier with olive hair (#7C8500).
	// There is no west row for this skin, so west frames are mirrors.
	skierAlt: {
		$imageFile: 'sprite-characters.png',
		parts: (() => {
			const east = {
				east: [0, 267, 23, 34],
				esEast: [25, 267, 22, 34],
				sEast: [49, 267, 16, 34],
				trickTwistEast: [182, 267, 28, 34],
			};
			return {
				blank: [0, 0, 0, 0],
				...east,
				west: mirror(east.east),
				wsWest: mirror(east.esEast),
				sWest: mirror(east.sEast),
				trickTwistWest: mirror(east.trickTwistEast),
				south: [67, 267, 15, 34],
				jumping: [84, 267, 32, 34],
				somersault1: [118, 267, 29, 34],
				somersault2: [149, 267, 31, 34],
				trickSkisUp: [212, 267, 28, 34],
				ouch: [242, 267, 31, 34],

				// Band y 304-344 is taller (it also holds two yeti frames), so these
				// start at y310 to share row 3's 35px height and baseline.
				hit: [0, 310, 31, 35],
				skate1: [33, 310, 23, 35],
				skate2: [58, 310, 23, 35],
				tumble: [83, 310, 32, 35],
				daffy: [117, 310, 25, 35],

				...withWestMirrors(walkFrames(378)),
			};
		})(),
		hitBoxes: {
			0: [7, 20, 27, 34]
		},
		id: 'player',
		hitBehaviour: {}
	},

	// ─── Abominable Snow Monster (Yeti) ──────────────────────────────────────
	monster: {
		$imageFile: 'sprite-characters.png',
		parts: {
			// Row 4 (band y 112-154)
			roar1: [0, 112, 32, 43],
			roar2: [34, 112, 28, 43],
			sEast1: [64, 112, 25, 43],
			sEast2: [91, 112, 30, 43],
			eating1: [123, 112, 32, 43],
			eating2: [157, 112, 29, 43],
			eating3: [188, 112, 29, 43],
			eating4: [219, 112, 23, 43],
			eating5: [244, 112, 26, 43],       // fork/toothpick pose

			// Row 5 (band y 158-200)
			patBelly: [0, 158, 26, 43],
			sWest1: [65, 158, 25, 43],
			sWest2: [91, 158, 30, 43],

			// Eating frames 1-2 for the alt skin. Their band (y 304-344) and the
			// fight band below are 41px, not 43, so these draw 2px shorter.
			eatingAlt1: [144, 304, 32, 41],
			eatingAlt2: [178, 304, 29, 41],

			// Row 12 (band y 408-448) — the fight-back sequence
			fightRoar: [0, 408, 28, 41],
			stabbed: [30, 408, 44, 41],        // skier + yeti in one frame
			stabbedWest: mirror([30, 408, 44, 41]),
			knockout: [76, 408, 41, 41]
		},
		hitBehaviour: {
			tree: monsterHitsTree
		}
	},

	// ─── Snowboarder (band y 226-257) ────────────────────────────────────────
	snowboarder: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast: [73, 226, 20, 32],
			sWest: [95, 226, 26, 32],
			grab: [123, 226, 25, 32],
			somersault: [150, 226, 32, 32],
			hit: [184, 226, 30, 32]
		},
		hitBoxes: {
			0: [2, 13, 22, 32]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Novice Skier NPC (band y 226-257) ──────────────────────────────────
	noviceSkier: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast: [0, 226, 22, 32],
			sWest: [24, 226, 21, 32],
			dazed: [47, 226, 24, 32]
		},
		hitBoxes: {
			0: [2, 13, 20, 32]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Dog NPC (band y 204-222) ────────────────────────────────────────────
	// All four frames face east; west is drawn mirrored.
	dog: {
		$imageFile: 'sprite-characters.png',
		parts: {
			runEast1: [0, 204, 21, 19],
			runEast2: [23, 204, 21, 19],
			barkEast1: [46, 204, 20, 19],     // "WOOF!" frame 1
			barkEast2: [67, 204, 19, 19],     // "WOOF!" frame 2
			runWest1: mirror([0, 204, 21, 19]),
			runWest2: mirror([23, 204, 21, 19]),
			barkWest1: mirror([46, 204, 20, 19]),
			barkWest2: mirror([67, 204, 19, 19])
		},
		hitBoxes: {
			0: [2, 6, 19, 19]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Ski Lift ────────────────────────────────────────────────────────────
	liftTower: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [55, 0, 24, 63]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [4, 44, 20, 63],
			1: [0, 0, 24, 63]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	// Rides the left cable, empty, going downhill
	emptyChairLift: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [81, 33, 26, 30]
		},
		zIndexesOccupied: [1],
		hitBoxes: {
			1: [0, 0, 26, 30]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},
	// Rides the right cable, carrying two skiers uphill
	occupiedChairLift: {
		$imageFile: 'sprite-characters.png',
		parts: {
			main: [215, 226, 26, 32]
		},
		zIndexesOccupied: [1],
		hitBoxes: {
			1: [0, 0, 26, 32]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Trees & Terrain Obstacles (skifree-objects.png) ────────────────────
	smallTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 31, 28, 32]
		},
		hitBoxes: {
			0: [0, 16, 28, 32]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	tallTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [96, 66, 32, 64]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [0, 54, 32, 64],
			1: [0, 10, 32, 54]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	// Occupies z=1 too, so a jumping skier still touches it. main.js turns
	// that airborne touch into setting the tree alight instead of a crash.
	deadTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 103, 22, 27]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [2, 10, 20, 27],
			1: [0, 0, 22, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	burningTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			frame1: [24, 103, 22, 27],
			frame2: [48, 103, 22, 27],
			frame3: [72, 103, 22, 27]
		},
		hitBoxes: {
			0: [2, 10, 20, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	decoratedTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [281, 31, 28, 32]
		},
		hitBoxes: {
			0: [0, 16, 28, 32]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	decoratedTree2: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [311, 31, 26, 32]
		},
		hitBoxes: {
			0: [0, 16, 26, 32]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	rock: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [30, 52, 23, 11]
		},
		hitBoxes: {
			0: [0, 0, 23, 11]
		},
		hitBehaviour: {
			skier: rockHitsSkier
		}
	},
	stump: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [253, 52, 16, 11]
		},
		hitBoxes: {
			0: [0, 2, 16, 11]
		},
		hitBehaviour: {
			skier: rockHitsSkier
		}
	},
	// Upper cluster of grey arcs: a deep-snow patch
	thickSnow: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [187, 31, 64, 25]
		},
		hitBehaviour: {}
	},
	// Ground-level grey arcs: individual mogul bumps
	mogul: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [161, 55, 24, 8]
		},
		hitBehaviour: {}
	},
	mogulSmall: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [143, 59, 16, 4]
		},
		hitBehaviour: {}
	},
	mogulA: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [187, 56, 18, 5]
		},
		hitBehaviour: {}
	},
	mogulB: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [208, 58, 18, 5]
		},
		hitBehaviour: {}
	},
	mogulC: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [237, 57, 14, 5]
		},
		hitBehaviour: {}
	},
	jump: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [109, 55, 32, 8]
		},
		hitBehaviour: {
			skier: jumpHitsSkier
		}
	},
	// Occupies z=1 so it can be grabbed mid-air (see main.js)
	mushroom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [271, 52, 8, 11]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [0, 0, 8, 11],
			1: [0, 0, 8, 11]
		},
		hitBehaviour: {}
	},

	// ─── Course Billboards & Signage ─────────────────────────────────────────
	signStart: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [260, 103, 42, 27]
		},
		hitBehaviour: {}
	},
	signFreestyle: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [130, 95, 40, 35]
		},
		hitBoxes: {
			0: [2, 19, 38, 35]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signSlalom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [172, 94, 40, 36]
		},
		hitBoxes: {
			0: [2, 20, 38, 36]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signTreeSlalom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [214, 94, 44, 36]
		},
		hitBoxes: {
			0: [2, 20, 42, 36]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signStartLeft: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 135, 42, 27]
		},
		hitBoxes: {
			0: [4, 12, 42, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},

	// ─── Slalom Gates & Finish Line ──────────────────────────────────────────
	gateRed: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [44, 138, 12, 24]
		},
		hitBoxes: {
			0: [0, 8, 12, 24]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	gateBlue: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [58, 138, 12, 24]
		},
		hitBoxes: {
			0: [0, 8, 12, 24]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	poleSmiley: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [72, 138, 12, 24]
		},
		hitBoxes: {
			0: [0, 8, 12, 24]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	poleFrowny: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [86, 138, 12, 24]
		},
		hitBoxes: {
			0: [0, 8, 12, 24]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signFinishLeft: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [100, 133, 51, 29]
		},
		hitBoxes: {
			0: [2, 12, 49, 29]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signFinishRight: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [152, 133, 50, 29]
		},
		hitBoxes: {
			0: [2, 12, 48, 29]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	}
};

export default sprites;
