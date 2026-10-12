// Who a yeti (or Bigfoot) is after.
//
// It chases the player by default. If a novice skier, snowboarder or dog is
// suddenly a good deal closer than the player, it goes after them instead:
//  - novices and snowboarders get caught and eaten (the usual eating frames),
//    after which it pats its belly and goes back to hunting the player;
//  - dogs bolt, far faster than a yeti, and the yeti gives up almost at once.
//    It never catches a dog, and ignores that dog from then on.

import {
	HUNT_SWITCH_RATIO,
	HUNT_GIVE_UP_RATIO,
	HUNT_MAX_PREY_DISTANCE,
	DOG_CHASE_MS,
} from './constants.js';

const distance = (a, b) => Math.hypot(a.mapPosition[0] - b.mapPosition[0], a.mapPosition[1] - b.mapPosition[1]);

function isBusy(monster) {
	return monster.deleted || monster.isEating || monster.isStunned || monster.isFull
		|| monster.isPattingBelly || monster.isKnockedOut?.();
}

function isAvailablePrey(npc, monster) {
	return !npc.deleted && !npc.isHidden && !npc.beingEaten && !monster._ignoredPrey?.has(npc);
}

// One decision step for one monster. Returns what happened, for sound and tests:
//   'none' | 'hunt' | 'dog' | 'abandon' | 'eat'
//
// opts.isDog(npc)      true for dogs (chased briefly, never eaten)
// opts.eat(monster, npc)   start eating a caught novice / snowboarder
// opts.scare(dog, monster) make a dog flee
export function updateHunt(monster, { player, prey, now, isDog, eat, scare }) {
	if (isBusy(monster)) return 'none';
	monster._ignoredPrey ??= new Set();

	const current = monster.prey;
	const toPlayer = distance(monster, player);

	if (current) {
		const gone = !isAvailablePrey(current, monster);
		const tooFar = !gone && distance(monster, current) > toPlayer * HUNT_GIVE_UP_RATIO;
		const boredOfDog = !gone && isDog(current) && now >= monster.dogChaseUntil;
		if (gone || tooFar || boredOfDog) {
			if (isDog(current)) monster._ignoredPrey.add(current); // won't fall for the same dog twice
			monster.prey = null;
			monster.follow(player);
			return 'abandon';
		}
		if (!isDog(current) && monster.hits(current)) {
			current.beingEaten = true;
			monster.prey = null;
			eat(monster, current);
			return 'eat';
		}
		return 'none';
	}

	// Not after anything else: is something tastier suddenly much closer?
	let best = null;
	let bestDistance = Infinity;
	for (const npc of prey) {
		if (!isAvailablePrey(npc, monster)) continue;
		if (distance(npc, player) > HUNT_MAX_PREY_DISTANCE) continue; // only things near the action
		const d = distance(monster, npc);
		if (d < bestDistance) {
			best = npc;
			bestDistance = d;
		}
	}
	if (!best || bestDistance >= toPlayer * HUNT_SWITCH_RATIO) return 'none';

	monster.prey = best;
	monster.follow(best);
	if (isDog(best)) {
		monster.dogChaseUntil = now + DOG_CHASE_MS;
		scare(best, monster);
		return 'dog';
	}
	return 'hunt';
}
