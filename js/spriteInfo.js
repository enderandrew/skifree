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

const snowboarderHitsSkier = (snowboarder, skier) => {
	skier.hasHitObstacle(snowboarder);
};

const sprites = {
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
			ouch: [242, 0, 31, 34],
			hit: [0, 78, 31, 31],
			jumping: [84, 0, 32, 34],
			somersault1: [116, 0, 32, 34],
			somersault2: [148, 0, 32, 34]
		},
		hitBoxes: {
			0: [7, 20, 27, 34]
		},
		id: 'player',
		hitBehaviour: {}
	},
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
	thickSnow: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [143, 53, 43, 10]
		},
		hitBehaviour: {}
	},
	rock: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [30, 52, 23, 11]
		},
		hitBehaviour: {
			skier: rockHitsSkier
		}
	},
	monster: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast1: [64, 112, 26, 43],
			sEast2: [90, 112, 32, 43],
			sWest1: [64, 158, 26, 43],
			sWest2: [90, 158, 32, 43],
			eating1: [122, 112, 34, 43],
			eating2: [156, 112, 31, 43],
			eating3: [187, 112, 31, 43],
			eating4: [219, 112, 25, 43],
			eating5: [243, 112, 26, 43]
		},
		hitBehaviour: {
			tree: monsterHitsTree
		}
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
	signStart: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [260, 103, 42, 27]
		},
		hitBehaviour: {}
	},
	snowboarder: {
		$imageFile: 'sprite-characters.png',
		parts: {
			sEast: [73, 229, 20, 29],
			sWest: [95, 228, 26, 30]
		},
		hitBehaviour: {
			skier: snowboarderHitsSkier
		}
	},
	liftTower: {
		$imageFile: 'skifree-objects.png',
		parts: {
			main: [58, 0, 24, 66]
		},
		zIndexesOccupied: [0, 1],
		hitBoxes: {
			0: [4, 44, 20, 66], // Base/footing collision on snow
			1: [0, 0, 24, 66]   // Full column collision when jumping
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
		zIndexesOccupied: [1], // Aerial only (Z = 1)
		hitBoxes: {
			1: [0, 0, 27, 32]
		},
		hitBehaviour: {
			skier: (chair, skier) => skier.hasHitObstacle(chair)
		}
	},
};

export default sprites;