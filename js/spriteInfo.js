const monsterHitsTree = monster => {
	monster.deleteOnNextCycle();
};

const treeHitsMonster = (tree, monster) => {
	monster.deleteOnNextCycle();
};

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

// Coordinate convention (all [x, y, w, h]):
//  - sprite-characters.png: y/h span the full band between the green separator
//    lines, x/w are pixel-tight. Sprite.draw() places frames by their top-left
//    corner, so a shared height per row keeps feet on the same baseline and
//    stops frames from bobbing up and down when the animation switches.
//    Bands: 0-33, 37-70, 74-108, 112-154, 158-200, 204-222, 226-257,
//           267-300, 304-344, 348-374, 378-404, 408-448.
//  - skifree-objects.png: pixel-tight boxes, never touching the blue lines
//    at rows 63-65 and 130-132.
// Hit boxes are [left, top, right, bottom] in sprite-local pixels.

const sprites = {

	// ─── Player Skier (sprite-characters.png) ───────────────────────────────
	skier: {
		$imageFile: 'sprite-characters.png',
		parts: {
			blank: [0, 0, 0, 0],

			// Row 1 (band y 0-33)
			east: [0, 0, 23, 34],
			esEast: [25, 0, 22, 34],
			sEast: [49, 0, 16, 34],
			south: [67, 0, 15, 34],
			jumping: [84, 0, 32, 34],
			somersault1: [118, 0, 29, 34],
			somersault2: [149, 0, 31, 34],
			trickTipCross: [182, 0, 28, 34],   // was 25 wide: right 4px cut off
			trickTwinTips: [212, 0, 28, 34],   // was x208: grabbed 2px of the previous frame; includes its snow-spray dots
			ouch: [242, 0, 31, 34],            // includes the "OUCH!" text and its own cloud

			// Row 2 (band y 37-70) — mirrored versions
			west: [1, 37, 23, 34],
			wsWest: [26, 37, 22, 34],
			sWest: [50, 37, 16, 34],
			trickTipCrossWest: [182, 37, 28, 34], // NEW: mirror of trickTipCross

			// Row 3 (band y 74-108). The old boxes here were 3-8px off and cut
			// the bottom 3px (skis) off every frame.
			hit: [0, 74, 31, 35],
			skateEast: [33, 74, 23, 35],       // note: both "skate" frames face the same way —
			skateWest: [58, 74, 23, 35],       //   these are a 2-frame skating cycle, not east/west
			daffy: [83, 74, 32, 35],           // upside-down, crossed skis
			push: [117, 74, 25, 35],           // leaping with poles back

			// Rows 10-11 (bands y 348-374 / 378-404): 11 frames, all facing east.
			// Frames 1-8 are the walk, 9-11 are a pole-thrust lunge.
			// There is NO west-facing walk art on the sheet; row 378 is the
			// alternate (olive-hair) skin, not a mirror. walkWest* reuses the east
			// boxes until you either flip the canvas or draw west frames.
			// skier.js cycles `% 9`; change that to `% 8` for this walk.
			walkEast1: [0, 348, 13, 27],
			walkEast2: [15, 348, 15, 27],
			walkEast3: [33, 348, 14, 27],
			walkEast4: [49, 348, 20, 27],
			walkEast5: [71, 348, 18, 27],
			walkEast6: [91, 348, 19, 27],
			walkEast7: [112, 348, 16, 27],
			walkEast8: [130, 348, 15, 27],
			lunge1: [147, 348, 22, 27],
			lunge2: [171, 348, 21, 27],
			lunge3: [194, 348, 33, 27],

			walkWest1: [0, 348, 13, 27],
			walkWest2: [15, 348, 15, 27],
			walkWest3: [33, 348, 14, 27],
			walkWest4: [49, 348, 20, 27],
			walkWest5: [71, 348, 18, 27],
			walkWest6: [91, 348, 19, 27],
			walkWest7: [112, 348, 16, 27],
			walkWest8: [130, 348, 15, 27]
		},
		hitBoxes: {
			0: [7, 20, 27, 34]
		},
		id: 'player',
		hitBehaviour: {}
	},

	// ─── Alternate Skier Skin (olive hair) ──────────────────────────────────
	// Rows 8-9 and 11 are pixel-for-pixel copies of the default skier except
	// for the hair colour (#7C8500). Same layout, same part names.
	skierAlt: {
		$imageFile: 'sprite-characters.png',
		parts: {
			blank: [0, 0, 0, 0],
			east: [0, 267, 23, 34],
			esEast: [25, 267, 22, 34],
			sEast: [49, 267, 16, 34],
			south: [67, 267, 15, 34],
			jumping: [84, 267, 32, 34],
			somersault1: [118, 267, 29, 34],
			somersault2: [149, 267, 31, 34],
			trickTipCross: [182, 267, 28, 34],
			trickTwinTips: [212, 267, 28, 34],
			ouch: [242, 267, 31, 34],

			// Row 3 equivalent (band y 304-344 is taller because of the yeti frames)
			hit: [0, 304, 31, 41],
			skateEast: [33, 304, 23, 41],
			skateWest: [58, 304, 23, 41],
			daffy: [83, 304, 32, 41],
			push: [117, 304, 25, 41],

			walkEast1: [0, 378, 13, 27],
			walkEast2: [15, 378, 15, 27],
			walkEast3: [33, 378, 14, 27],
			walkEast4: [49, 378, 20, 27],
			walkEast5: [71, 378, 18, 27],
			walkEast6: [91, 378, 19, 27],
			walkEast7: [112, 378, 16, 27],
			walkEast8: [130, 378, 15, 27],
			lunge1: [147, 378, 22, 27],
			lunge2: [171, 378, 21, 27],
			lunge3: [194, 378, 33, 27]
			// No mirrored (west) row exists for this skin.
		},
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
			roar1: [0, 112, 32, 43],           // was 30 wide: right 2px cut
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

			// Eating frames for the alt skin (band y 304-344)
			eatingAlt1: [144, 304, 32, 41],
			eatingAlt2: [178, 304, 29, 41],

			// Row 12 (band y 408-448) — the fight-back sequence
			fightRoar: [0, 408, 28, 41],       // NEW
			stabbed: [30, 408, 44, 41],        // NEW: skier + yeti in one frame
			knockout: [76, 408, 41, 41]        // was y448: pointed at empty space below the art
			// toothPick1/2 removed: x270/x296 are past the 273px sheet edge
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
			somersault: [150, 226, 32, 32],    // was y227: top row cut
			hit: [184, 226, 30, 32]            // was 182/28: right 4px cut
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
			sEast: [0, 226, 22, 32],           // old boxes cut the bottom row (ski tips)
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
	// Both run frames face the same way (2-frame cycle), as do both bark
	// frames. bark used to start at y199, which pulled in the green line.
	dog: {
		$imageFile: 'sprite-characters.png',
		parts: {
			runLeft: [0, 204, 21, 19],         // really run1
			runRight: [23, 204, 21, 19],       // really run2
			bark1: [46, 204, 20, 19],          // "WOOF!" frame 1
			bark2: [67, 204, 19, 19]           // "WOOF!" frame 2
			// pee removed: nothing at x86-106 on the sheet
		},
		hitBoxes: {
			0: [2, 6, 20, 19]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Occupied Chair Lift (band y 226-257) ────────────────────────────────
	// This is what was labelled vendorCart: red chair, hanger arm, two riders.
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
			main: [96, 66, 32, 64]             // was x95: right column cut
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
	deadTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 103, 22, 27]
		},
		hitBoxes: {
			0: [2, 10, 20, 27]
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
			frame3: [72, 103, 22, 27]          // was 71/21: right 2px cut
		},
		hitBoxes: {
			0: [2, 10, 20, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	// Not actually tall: these are two small decorated-tree variants at the
	// top-right of the sheet. The old box (y1-64) ran into the blue line.
	// Key kept so main.js keeps working; consider renaming to decoratedTree.
	decoratedTallTree: {
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
			main: [253, 52, 16, 11]            // was y53/h12: bottom row was the blue line
		},
		hitBoxes: {
			0: [0, 2, 16, 11]
		},
		hitBehaviour: {
			skier: rockHitsSkier
		}
	},
	// The grey arcs between the jump and the stump: the upper cluster reads
	// as a deep-snow patch, the ground-level arcs as individual moguls.
	// thickSnow and mogul previously shared one box that sliced through two bumps.
	thickSnow: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [187, 31, 64, 25]
		},
		hitBehaviour: {}
	},
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
	mogulVariants: {
		// Remaining ground-level bumps, if you want variety
		$imageFile: 'skifree-objects.png',
		parts: {
			a: [187, 56, 18, 5],
			b: [208, 58, 18, 5],
			c: [237, 57, 14, 5]
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
	mushroom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [271, 52, 8, 11]             // was y53/h12: bottom row was the blue line
		},
		hitBoxes: {
			0: [0, 0, 8, 11]
		},
		hitBehaviour: {}
	},

	// ─── Ski Lift ────────────────────────────────────────────────────────────
	liftTower: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [55, 0, 24, 63]              // was x58/h66: left 3px cut, blue line at bottom
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
	emptyChairLift: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [81, 33, 26, 30]             // was x87: left 6px (hanger) cut, blue line at bottom
		},
		zIndexesOccupied: [1],
		hitBoxes: {
			1: [0, 0, 26, 30]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Course Billboards & Signage ─────────────────────────────────────────
	signStart: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [260, 103, 42, 27]
		},
		hitBehaviour: {}                       // has a post but no hit box — intentional?
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
			main: [172, 94, 40, 36]            // was x173: bled 1px of the Tree Slalom sign
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
			main: [58, 138, 12, 24]            // was x57: right column cut
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
			main: [100, 133, 51, 29]           // was 104,131: left 4px cut, blue line on top
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
			main: [152, 133, 50, 29]           // was 153,131: blue line on top
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
