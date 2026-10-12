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

const sprites = {

	// ─── Player Skier Tricks & Poses (sprite-characters.png) ────────────────
	skier: {
		$imageFile: 'sprite-characters.png',
		parts: {
			blank: [0, 0, 0, 0],
			east: [0, 0, 24, 34],
			esEast: [24, 0, 24, 34],
			sEast: [49, 0, 17, 34],
			south: [65, 0, 17, 34],
			sWest: [49, 37, 17, 34],
			wsWest: [24, 37, 24, 34],
			west: [0, 37, 24, 34],

			// Crashes
			ouch: [242, 0, 31, 34],
			ouchCloud: [232, 0, 48, 34],
			hit: [0, 78, 31, 29],

			// Freestyle Tricks & Poses
			jumping: [84, 0, 32, 34],
			somersault1: [116, 0, 32, 34],
			somersault2: [148, 0, 32, 34],
			trickTipCross: [181, 0, 25, 34],
			trickTwinTips: [208, 0, 23, 34],
			daffy: [77, 75, 27, 30],         // Corrected: cleanly captures crossed skis without pole sliver
			push: [106, 75, 24, 30],
			skateEast: [31, 75, 20, 30],
			skateWest: [53, 75, 21, 30],

			// Uphill Walking Cycle (East)
			walkEast1: [0, 340, 20, 34],
			walkEast2: [21, 340, 20, 34],
			walkEast3: [42, 340, 21, 34],
			walkEast4: [64, 340, 24, 34],
			walkEast5: [89, 340, 25, 34],
			walkEast6: [115, 340, 23, 34],
			walkEast7: [139, 340, 23, 34],
			walkEast8: [163, 340, 24, 34],
			walkEast9: [188, 340, 25, 34],

			// Uphill Walking Cycle (West)
			walkWest1: [0, 377, 20, 34],
			walkWest2: [21, 377, 20, 34],
			walkWest3: [42, 377, 21, 34],
			walkWest4: [64, 377, 24, 34],
			walkWest5: [89, 377, 25, 34],
			walkWest6: [115, 377, 23, 34],
			walkWest7: [139, 377, 23, 34],
			walkWest8: [163, 377, 24, 34],
			walkWest9: [188, 377, 25, 34]
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
			roar1: [0, 112, 30, 43],
			roar2: [31, 112, 32, 43],
			sEast1: [64, 112, 26, 43],
			sEast2: [90, 112, 32, 43],
			sWest1: [64, 158, 26, 43],
			sWest2: [90, 158, 32, 43],
			patBelly: [0, 158, 28, 43],
			eating1: [122, 112, 34, 43],
			eating2: [156, 112, 31, 43],
			eating3: [187, 112, 31, 43],
			eating4: [219, 112, 25, 43],
			eating5: [243, 112, 26, 43],
			toothPick1: [270, 112, 25, 43],
			toothPick2: [296, 112, 26, 43],
			knockout: [77, 448, 43, 26]
		},
		hitBehaviour: {
			tree: monsterHitsTree
		}
	},

	// ─── Snowboarder ─────────────────────────────────────────────────────────
	snowboarder: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast: [73, 229, 20, 29],
			sWest: [95, 228, 26, 30],
			grab: [122, 227, 24, 31],
			somersault: [147, 227, 34, 31],
			hit: [182, 228, 28, 30]
		},
		hitBoxes: {
			0: [2, 10, 22, 29]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Novice Skier NPC ────────────────────────────────────────────────────
	noviceSkier: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast: [0, 228, 22, 29],
			sWest: [23, 228, 22, 29],
			dazed: [46, 228, 25, 29]
		},
		hitBoxes: {
			0: [2, 10, 20, 29]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Dog NPC ─────────────────────────────────────────────────────────────
	dog: {
		$imageFile: 'sprite-characters.png',
		parts: {
			runLeft: [0, 206, 23, 17],
			runRight: [24, 206, 23, 17],
			bark: [48, 199, 36, 24],
			pee: [86, 204, 21, 19]
		},
		hitBoxes: {
			0: [2, 2, 20, 17]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Vendor Cart Obstacle ────────────────────────────────────────────────
	vendorCart: {
		$imageFile: 'sprite-characters.png',
		parts: {
			main: [211, 226, 27, 32]
		},
		hitBoxes: {
			0: [2, 14, 25, 32]
		},
		hitBehaviour: {
			skier: obstacleHitsSkier
		}
	},

	// ─── Trees & Terrain Obstacles ───────────────────────────────────────────
	smallTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 28, 30, 34]
		},
		hitBoxes: {
			0: [0, 18, 30, 34]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	tallTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [95, 66, 32, 64]
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
			main: [0, 99, 21, 29]          // Corrected: clears blue line
		},
		hitBoxes: {
			0: [2, 12, 19, 29]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	burningTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			frame1: [23, 95, 23, 33],
			frame2: [47, 95, 23, 33],
			frame3: [71, 95, 21, 33]
		},
		hitBoxes: {
			0: [2, 12, 21, 33]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	decoratedTallTree: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [284, 1, 32, 64] 
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [0, 52, 32, 64],            // Base footing collision on snow
			1: [0, 10, 32, 52]             // Tree branches collision when jumping
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
			main: [254, 53, 16, 12]
		},
		hitBoxes: {
			0: [0, 2, 16, 12]
		},
		hitBehaviour: {
			skier: rockHitsSkier
		}
	},
	thickSnow: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [143, 53, 43, 10]
		},
		hitBehaviour: {}
	},
	mogul: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [143, 53, 43, 10]
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
			main: [272, 53, 10, 12]
		},
		hitBoxes: {
			0: [0, 0, 10, 12]
		},
		hitBehaviour: {}
	},

	// ─── Ski Lift ────────────────────────────────────────────────────────────
	liftTower: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [58, 0, 24, 66]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [4, 44, 20, 66],
			1: [0, 0, 24, 66]
		},
		hitBehaviour: {
			skier: treeHitsSkier,
			monster: treeHitsMonster
		}
	},
	emptyChairLift: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [87, 34, 27, 32]
		},
		zIndexesOccupied: [1],
		hitBoxes: {
			1: [0, 0, 27, 32]
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
		hitBehaviour: {}
	},
	signFreestyle: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [130, 96, 42, 34]
		},
		hitBoxes: {
			0: [2, 18, 40, 34]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signSlalom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [173, 96, 42, 34]
		},
		hitBoxes: {
			0: [2, 18, 40, 34]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signTreeSlalom: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [216, 96, 43, 34]
		},
		hitBoxes: {
			0: [2, 18, 41, 34]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signStartLeft: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [0, 137, 43, 27]
		},
		hitBoxes: {
			0: [5, 12, 38, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},

	// ─── Slalom Gates & Finish Line ──────────────────────────────────────────
	gateRed: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [44, 137, 12, 27]
		},
		hitBoxes: {
			0: [0, 10, 12, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	gateBlue: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [57, 137, 12, 27]
		},
		hitBoxes: {
			0: [0, 10, 12, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	poleSmiley: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [70, 137, 14, 27]
		},
		hitBoxes: {
			0: [0, 10, 14, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	poleFrowny: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [85, 137, 14, 27]
		},
		hitBoxes: {
			0: [0, 10, 14, 27]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signFinishLeft: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [104, 131, 48, 33]
		},
		hitBoxes: {
			0: [4, 15, 44, 33]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	},
	signFinishRight: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [153, 131, 48, 33]
		},
		hitBoxes: {
			0: [4, 15, 44, 33]
		},
		hitBehaviour: {
			skier: treeHitsSkier
		}
	}
};

export default sprites;