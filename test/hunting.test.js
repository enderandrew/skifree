import { describe, it, expect, vi, afterEach } from 'vitest';
import sprites from '../js/spriteInfo.js';
import Skier from '../js/lib/skier.js';
import Monster from '../js/lib/monster.js';
import Dog from '../js/lib/dog.js';
import NoviceSkier from '../js/lib/noviceSkier.js';
import Snowboarder from '../js/lib/snowboarder.js';
import { updateHunt } from '../js/lib/hunting.js';
import { DOG_CHASE_MS, DOG_FLEE_SPEED, MONSTER_STANDARD_SPEED } from '../js/lib/constants.js';

afterEach(() => vi.useRealTimers());

function scene({ playerAt = [0, 0], yetiAt = [0, -400] } = {}) {
	const player = new Skier(sprites.skier);
	player.setMapPosition(...playerAt);
	const yeti = new Monster(sprites.monster);
	yeti.setMapPosition(...yetiAt);
	yeti.follow(player);
	const eat = vi.fn();
	const scare = vi.fn();
	const step = (prey, now = 0) => updateHunt(yeti, { player, prey, now, isDog: n => n instanceof Dog, eat, scare });
	return { player, yeti, eat, scare, step };
}

describe('yeti choosing prey', () => {
	it('keeps chasing the player when nothing is much closer', () => {
		const { yeti, player, step } = scene();
		const novice = new NoviceSkier(sprites.noviceSkier);
		novice.setMapPosition(0, -100); // 300 away vs 400 to the player: not enough
		expect(step([novice])).toBe('none');
		expect(yeti._trackedSpriteToMoveToward).toBe(player);
	});

	it('switches to a novice or snowboarder that is suddenly much closer', () => {
		for (const npc of [new NoviceSkier(sprites.noviceSkier), new Snowboarder(sprites.snowboarder)]) {
			const { yeti, step } = scene();
			npc.setMapPosition(20, -350);
			expect(step([npc])).toBe('hunt');
			expect(yeti._trackedSpriteToMoveToward).toBe(npc);
		}
	});

	it('eats the prey on contact, then the NPC vanishes into the eating frames', () => {
		vi.useFakeTimers();
		const { yeti, eat, step } = scene();
		const novice = new NoviceSkier(sprites.noviceSkier);
		novice.setMapPosition(0, -390);
		step([novice]);
		yeti.hits = () => true; // touching
		expect(step([novice])).toBe('eat');
		expect(eat).toHaveBeenCalledWith(yeti, novice);

		// The real eat step
		const done = vi.fn();
		yeti.eatPrey(novice, done);
		expect(novice.isHidden).toBe(true);
		expect(yeti._getFrame()).toMatch(/^eating/);
		vi.advanceTimersByTime(300 * 6);
		expect(novice.deleted).toBe(true);
		expect(done).toHaveBeenCalledOnce();
	});

	it('goes back to the player if the prey gets away', () => {
		const { yeti, player, step } = scene();
		const boarder = new Snowboarder(sprites.snowboarder);
		boarder.setMapPosition(0, -380);
		step([boarder]);
		boarder.setMapPosition(0, 600); // shot off downhill, now 1000 away vs 400
		expect(step([boarder])).toBe('abandon');
		expect(yeti._trackedSpriteToMoveToward).toBe(player);
	});

	it('ignores prey far from the player', () => {
		const { step } = scene({ yetiAt: [3000, 0] });
		const novice = new NoviceSkier(sprites.noviceSkier);
		novice.setMapPosition(3000, 50);
		expect(step([novice])).toBe('none');
	});

	it('does not chase anything while busy', () => {
		const { yeti, step } = scene();
		const novice = new NoviceSkier(sprites.noviceSkier);
		novice.setMapPosition(0, -390);
		yeti.isStunned = true;
		expect(step([novice])).toBe('none');
	});
});

describe('yeti and dogs', () => {
	it('scares the dog, never eats it, gives up quickly and then ignores it', () => {
		const { yeti, player, eat, scare, step } = scene();
		const dog = new Dog(sprites.dog);
		dog.setMapPosition(10, -380);
		expect(step([dog], 0)).toBe('dog');
		expect(scare).toHaveBeenCalledWith(dog, yeti);
		yeti.hits = () => true;              // even touching it...
		expect(step([dog], 100)).toBe('none');
		expect(eat).not.toHaveBeenCalled();  // ...no dog is eaten
		expect(step([dog], DOG_CHASE_MS)).toBe('abandon');
		expect(yeti._trackedSpriteToMoveToward).toBe(player);
		expect(step([dog], DOG_CHASE_MS + 100)).toBe('none'); // won't fall for it again
	});

	it('a scared dog runs away much faster than a yeti, then calms down', () => {
		vi.useFakeTimers();
		vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
		const dog = new Dog(sprites.dog);
		dog.setMapPosition(0, 0);
		const yeti = new Monster(sprites.monster);
		yeti.setMapPosition(50, -50); // to the east
		dog.fleeFrom(yeti);
		expect(dog.isFleeing()).toBe(true);
		expect(dog.speed).toBe(DOG_FLEE_SPEED);
		expect(DOG_FLEE_SPEED).toBeGreaterThan(MONSTER_STANDARD_SPEED * 1.5);
		const x0 = dog.mapPosition[0];
		dog.cycle(1);
		expect(dog.mapPosition[0]).toBeLessThan(x0); // away from the yeti
		expect(dog.facing).toBe('west');
		vi.advanceTimersByTime(3100);
		dog.cycle(1);
		expect(dog.isFleeing()).toBe(false);
		expect(dog.speed).toBeLessThan(DOG_FLEE_SPEED);
	});
});
