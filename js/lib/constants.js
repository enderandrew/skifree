// Skier physics
export const SKIER_STANDARD_SPEED = 5;
export const SKIER_BOOST_MULTIPLIER = 2;
export const SKIER_TURN_EASE_CYCLES = 70;
export const SKIER_DEAD_ZONE_X = 75;
export const SKIER_DIRECTION_THRESHOLD_SHARP = 300;
export const SKIER_BOOST_DURATION_MS = 2000;
export const SKIER_BOOST_COOLDOWN_MS = 10000;
export const SKIER_OUCH_DURATION_MS = 600;
export const SKIER_CRASH_RECOVERY_MS = 1500;
export const SKIER_JUMP_DURATION_MS = 1000;
export const SKIER_JUMP_SPEED_BONUS = 2;
export const SKIER_TRICK_INTERVAL_MS = 300;
export const SKIER_DEEP_SNOW_FACTOR = 0.5;   // speed multiplier while ploughing through deep snow
export const SKIER_SKATE_FRAME_MS = 120;

// Monster physics
export const MONSTER_STANDARD_SPEED = 6;
export const MONSTER_EATING_INTERVAL_MS = 300;
export const MONSTER_EATING_STAGES = 6;
export const MONSTER_ROAR_MS = 700;
export const MONSTER_PAT_BELLY_MS = 1200;
export const MONSTER_STABBED_MS = 500;
export const MONSTER_HURT_MS = 600;
export const MONSTER_KNOCKOUT_MS = 4000;
export const MONSTER_STRIKE_REACH_X = 56; // pole reach, map px
export const MONSTER_STRIKE_REACH_Y = 64;
export const MONSTER_KNOCKOUT_POINTS = 1000;

// Dog
export const DOG_STANDARD_SPEED = 2;
export const DOG_BARK_MS = 900;

// Novice skier
export const NOVICE_SKIER_STANDARD_SPEED = 2;
export const NOVICE_SKIER_DAZED_MS = 3000;

// Snowboarder physics
export const SNOWBOARDER_STANDARD_SPEED = 3;
export const SNOWBOARDER_TRICK_MS = 500;
export const SNOWBOARDER_CRASH_MS = 2500;

// Ski lift physics & layout
export const SKI_LIFT_STANDARD_SPEED = 2; // was 6: faster than the skier
export const SKI_LIFT_COLUMN_SPACING = 1500;
export const SKI_LIFT_TOWER_SPACING = 450;
export const SKI_LIFT_CHAIR_SPACING = 300;
export const SKI_LIFT_BASE_COLUMN_X = -250;

// Game world
export const PIXELS_PER_METRE = 18;
export const MONSTER_DISTANCE_THRESHOLD = 2000;
// Wind gusts
export const WIND_MIN_GAP_MS = 12000;   // calm spell between gusts
export const WIND_MAX_GAP_MS = 25000;
export const WIND_MIN_GUST_MS = 2500;   // how long a gust lasts
export const WIND_MAX_GUST_MS = 4500;
export const WIND_RAMP_FRACTION = 0.25; // share of the gust spent building / dying away
export const WIND_MAX_PUSH = 1.6;       // sideways map px per cycle at full strength
export const WIND_AIRBORNE_FACTOR = 1.5; // jumping skiers catch more wind
export const WIND_STANDING_FACTOR = 0.3; // edges dug in while stopped

// Easter eggs
export const BIGFOOT_SCALE = 1.5;            // drawn 50% larger than the yeti
export const KONAMI_LIVES = 30;
export const UFO_CHANCE_PER_SECOND = 1 / 200;
export const UFO_SPEED = 4;                  // map px per cycle across the screen
export const UFO_BOB_PX = 4;                 // gentle up-and-down hover
