/* =====================================================================
   Gaming World of Jarvis — GAME CATALOGUE
   Add a game: copy one object below, give it a unique id, and (for a
   playable game) add games/<script>.js. See README "Adding a game".
   ===================================================================== */
window.GV_CATEGORIES = [
  { id: "shooting",  name: "Shooting",  icon: "🎯" },
  { id: "sniper",    name: "Sniper",    icon: "🔭" },
  { id: "submarine", name: "Submarine", icon: "🌊" },
  { id: "racing",    name: "Racing",    icon: "🏁" },
  { id: "adventure", name: "Adventure", icon: "🗺️" },
  { id: "kids",      name: "Kids",      icon: "🧸" },
  { id: "puzzles",   name: "Puzzles",   icon: "🧩" },
  { id: "arcade",    name: "Arcade",    icon: "🕹️" },
  { id: "board",     name: "Board & Strategy", icon: "♟️" },
  { id: "horror",    name: "Ghost & Zombie", icon: "🧟" }
];

window.GV_GAMES = [
  /* ---------------- FEATURED / COMING SOON (from the launch plan) ---------------- */
  {
    id: "shadow-front", title: "Shadow Front", tagline: "Sniper and soldier shooting game.",
    status: "coming-soon", premium: false, kids: false, featured: false, trending: 0, added: "2026-10-26",
    categories: ["shooting", "sniper"], difficulty: "Hard", age: "16+",
    platforms: ["Android (prototype in testing)", "Google Play (coming soon)"],
    liteVersion: "sniper-range",
    storyline: "The year is 2041. A private army known as the Shadow Front has seized the border city of Varkh. You are Kaal — a lone marksman dropped behind enemy lines with a prototype rifle, a dying radio and one job: break the siege before dawn. Climb ruined towers, track convoys through the fog and take the shots nobody else can.",
    controls: [["Touch / Mouse", "Aim & fire"], ["Pinch / Wheel", "Zoom scope"], ["Hold breath", "Steady aim"]],
    instructions: ["Complete story missions across 5 war-torn districts.", "Wind, distance and bullet drop affect every shot.", "Upgrade rifles, scopes and outfits between missions."],
    note: "Shadow Front is our 3D third-person sniper shooter for Android, now in prototype testing. Its Google Play listing will appear here once it is published. Train today in the free Sniper Range."
  },
  {
    id: "turbo-racing", title: "Turbo Racing", tagline: "Car racing and upgrades.",
    status: "coming-soon", premium: false, kids: false, trending: 0, added: "2026-10-15",
    categories: ["racing"], difficulty: "Medium", age: "3+",
    platforms: ["Android (coming soon)", "Web (lite version available)"],
    liteVersion: "turbo-rush",
    storyline: "From midnight city streets to mountain passes — race, earn, and upgrade your garage from a rusty hatchback to a neon hypercar.",
    controls: [["Arrows / A-D", "Steer"], ["Up / W", "Boost"], ["Touch", "Left / right buttons"]],
    instructions: ["Career mode with car upgrades and paint jobs.", "Play the free Turbo Rush endless mode online now."],
    note: "Full racing career coming soon. Turbo Rush is free to play today."
  },
  {
    id: "dino-adventure", title: "Dino Adventure", tagline: "Children's adventure game.",
    status: "coming-soon", premium: false, kids: true, trending: 0, added: "2026-10-12",
    categories: ["kids", "adventure"], difficulty: "Easy", age: "3+",
    platforms: ["Android (coming soon)", "Web (lite version available)"],
    liteVersion: "dino-dash",
    storyline: "Little Rexi has lost her egg-siblings across Volcano Valley! Help her jump, splash and explore friendly worlds to bring the family home.",
    controls: [["Tap / Space", "Jump"]],
    instructions: ["Gentle, ad-free adventure made for young players.", "Play the free Dino Dash online now."],
    note: "A kid-safe adventure with no ads and no in-game purchases. Dino Dash is free to play today."
  },

  /* ---------------- STUDIO ORIGINALS (full web games, hosted in games/<slug>/) ---------------- */
  {
    id: "shadow-strike", title: "Shadow Strike", tagline: "3D third-person shooter. Defend the Command Center.",
    status: "playable", premium: false, kids: false, flagship: true, featured: true, trending: 0, added: "2026-10-26", isNew: true,
    embed: "games/shadow-strike/", orientation: "landscape", shots: 3,
    categories: ["shooting"], difficulty: "Hard", age: "16+",
    platforms: ["Web (desktop & mobile)", "Android (in development)"],
    storyline: "Hold the Command Center against wave after wave of soldiers, heavies and armoured vehicles, then face the Iron Goliath boss. Shadow Strike is a full 3D shooter in your browser with neon visuals, bloom and slow-motion boss kills, plus Survival mode and an Armory to tune your loadout.",
    controls: [["WASD", "Move"], ["Mouse", "Aim (click the game to lock the mouse)"], ["Left click", "Fire"], ["Right click", "Aim down sights"], ["Shift", "Sprint"], ["Space / Ctrl", "Dash"], ["C", "Jump"], ["R", "Reload"], ["Touch", "On-screen sticks and buttons"]],
    instructions: ["Protect the Command Center: if its health reaches zero the mission fails.", "Clear each wave; every 10th level ends with a boss.", "Graphics quality adapts automatically; change it in Settings.", "Best in landscape on phones."]
  },
  {
    id: "deep-sea-strike", title: "Deep Sea Strike", tagline: "3D submarine warfare: 10 oceans, 250 levels.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 1, added: "2026-10-24", isNew: true,
    embed: "games/deep-sea-strike/", orientation: "landscape", shots: 3, liteVersion: "deep-sea-patrol",
    categories: ["submarine", "shooting"], difficulty: "Medium", age: "12+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Command an attack submarine across 10 oceans and 250 unique levels. Hunt enemy fleets, lock on with torpedoes, unleash specials and take on giant bosses like the Leviathan. Unlock 6 submarines, upgrade them in the garage and try 3 battle modes. Each player gets their own captain profile on the device.",
    controls: [["W / S", "Thrust"], ["A / D or arrows", "Turn"], ["R or E / F or Q", "Rise / dive"], ["Shift", "Boost"], ["Space / left mouse", "Fire (hold)"], ["T / Tab / right mouse", "Lock target"], ["X / C / 1–6", "Specials"], ["B / V", "Ability / Ultimate"], ["Touch", "Joystick + on-screen buttons"]],
    instructions: ["Create a captain (name and password) to save your own progress on this device.", "Pick an ocean and a level, read the briefing, then dive in.", "Earn coins and stars to upgrade hulls, torpedoes and abilities.", "Rotate your phone to landscape for the best view."]
  },
  {
    id: "velocity-15k", title: "Velocity 15K", tagline: "3D motorbike racing through world cities.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 2, added: "2026-10-21",
    embed: "games/velocity-15k/", orientation: "landscape", shots: 3,
    categories: ["racing"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Ride 10 different bikes, from scooters to superbikes, through real 3D city streets full of traffic, landmarks and neon. Velocity 15K is built to be accessible: auto-steer, one-button mode, auto-accelerate, high contrast and screen-reader announcements let everyone race.",
    controls: [["Arrows / WASD", "Steer, accelerate and brake"], ["Space", "Accelerate"], ["P / Esc", "Pause"], ["M", "Sound"], ["H", "High contrast"], ["Touch", "On-screen buttons"]],
    instructions: ["Choose a bike and colour in the Garage; each has its own speed and handling.", "Dodge traffic and race the clock across the city.", "Turn on assists (auto-steer, one-button mode) in Settings if you need them."]
  },
  {
    id: "upstaggles", title: "Upstaggles", tagline: "3D adventure: run, jump, climb and fight. 250 levels.",
    status: "playable", premium: false, kids: true, flagship: true, trending: 3, added: "2026-10-27", isNew: true,
    embed: "games/upstaggles/", orientation: "landscape", shots: 2,
    categories: ["adventure", "kids"], difficulty: "Medium", age: "7+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Bounce through 10 worlds and 250 stages, from Beginner Valley to the Ultimate Universe. Ride moving platforms, dodge lasers and fireballs, swim, glide in low gravity and beat 10 giant bosses, from the Stone Guardian to the Ultimate Staggle Emperor.",
    controls: [["WASD / arrows", "Move"], ["Space", "Jump / double jump"], ["E or J", "Spin attack"], ["Shift or K", "Dash"], ["Mouse drag, Z / X", "Camera"], ["Esc / P", "Pause"], ["Touch", "Joystick + JUMP / SPIN / DASH"]],
    instructions: ["Reach the goal flag in each stage; collect coins on the way.", "Bosses can only be hurt while dizzy: spin, dash or stomp them.", "A boss waits at the end of every world (every 25th level)."]
  },
  {
    id: "bubble-sub", title: "Bubble Sub: Ocean Quest", tagline: "A gentle submarine adventure for the whole family.",
    status: "playable", premium: false, kids: true, trending: 4, added: "2026-10-26", isNew: true,
    embed: "games/bubble-sub/", orientation: "landscape", shots: 3,
    categories: ["kids", "submarine", "adventure"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Dive into sunny reefs with jellyfish and puffers, icy seas with drifting floes, pitch-dark trenches with anglerfish and ancient ruins guarded by statues. Bubble Sub is a calm, colourful underwater adventure with three difficulty levels, so young divers and grown-ups can play together.",
    controls: [["Arrows / WASD", "Steer"], ["Touch (left side)", "Drag to steer"], ["Touch (right side)", "Bubble shot"]],
    instructions: ["Choose Relaxed, Normal or Expert before you dive.", "Steer around hazards and collect treasures.", "Extra worlds and submarines sit behind a grown-up gate."]
  },
  {
    id: "flipfall", title: "Flipfall", tagline: "One-tap gravity-flip runner.",
    status: "playable", premium: false, kids: false, trending: 5, added: "2026-10-22",
    embed: "games/flipfall/", orientation: "landscape", shots: 2,
    categories: ["arcade"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Your runner never stops. Flip gravity between floor and ceiling to dodge spikes, gaps and moving walls as the speed keeps climbing. Easy to learn in five seconds, hard to put down.",
    controls: [["Tap / Click / Space", "Flip gravity"], ["S", "Sound on/off"]],
    instructions: ["Flip between floor and ceiling to avoid spikes and gaps.", "It speeds up the further you go.", "Unlock new skins at 25 m, 75 m and 150 m."]
  },
  {
    id: "orbiflick", title: "OrbiFlick", tagline: "One tap. One chance. Endless addiction.",
    status: "playable", premium: false, kids: false, trending: 6, added: "2026-10-22",
    embed: "games/orbiflick/", orientation: "portrait", shots: 2,
    categories: ["arcade"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "A neon ball circles two tracks. Tap to flick between the inner and outer orbit, dodge the red obstacles and grab coins. Build combos up to x9, unlock 8 skins with trails and beat the daily challenge.",
    controls: [["Tap / Click / Space", "Switch track"]],
    instructions: ["Flick between tracks to dodge red obstacles.", "Near misses and coins boost your combo.", "Speed rises every 150 points."]
  },
  {
    id: "sixty-second-king", title: "60 Second King", tagline: "One minute. Tap fast. Claim the throne.",
    status: "playable", premium: false, kids: false, trending: 7, added: "2026-10-22",
    embed: "games/sixty-second-king/", orientation: "portrait", shots: 3,
    categories: ["arcade"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "You have exactly 60 seconds. Tap gems, grab golden crowns, catch extra time and avoid the bombs. Chain hits for a combo multiplier up to x10, then send a challenge link to a friend.",
    controls: [["Tap / Click", "Hit gems, crowns and clocks"], ["Space / Enter", "Start"], ["M", "Mute"]],
    instructions: ["Gem +10, Crown +30, Clock +3 seconds.", "Bombs cost 40 points, 2 seconds and your combo.", "Every 5 hits in a row raises your multiplier."]
  },
  {
    id: "stack-rush", title: "Stack Rush", tagline: "Tap to drop. Stack perfect. Climb higher.",
    status: "playable", premium: false, kids: false, trending: 8, added: "2026-10-22",
    embed: "games/stack-rush/", orientation: "portrait", shots: 3,
    categories: ["arcade"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Blocks slide in from the side. Tap at the right moment to drop each one on the tower. Anything that hangs over gets sliced off, so perfect drops keep your tower wide as you climb through colourful levels.",
    controls: [["Tap / Click", "Drop block"], ["Space / Enter / ↓", "Drop block"], ["Esc", "Menu"]],
    instructions: ["Line each block up with the one below.", "Overhanging parts are cut off and the next block gets smaller.", "Perfect drops earn bonuses; spend coins in the shop."]
  },
  {
    id: "wobble-king", title: "Wobble King", tagline: "Wobbly ragdoll obstacle courses.",
    status: "playable", premium: false, kids: true, trending: 9, added: "2026-10-22",
    embed: "games/wobble-king/", orientation: "portrait", shots: 3,
    categories: ["arcade", "kids", "adventure"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Guide a wobbly little king through silly obstacle courses full of pits, ramps and swinging hazards. Wobble, jump and bounce to the finish, and dress him up with fun costumes along the way.",
    controls: [["← → / A D", "Move"], ["Space / ↑ / W", "Jump"], ["R", "Respawn"], ["Touch", "Left, right and jump buttons"]],
    instructions: ["Reach the finish of each course to unlock the next.", "Falling into a pit sends you back to the last checkpoint.", "Collect coins to unlock costumes."]
  },
  {
    id: "pallanguli-legends", title: "Pallanguli Legends", tagline: "The traditional Tamil seed-and-pit game. பல்லாங்குழி",
    status: "playable", premium: false, kids: false, trending: 10, added: "2026-10-21",
    embed: "games/pallanguli-legends/", orientation: "landscape", shots: 3,
    categories: ["board", "puzzles"], difficulty: "Medium", age: "7+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Play Pallanguli, the classic mancala-family game from Tamil Nadu, against the computer (5 levels) or a friend. Choose Classic, Four-seed (Pasu), Six-seed or Multi-round rules, learn with a guided tutorial, and switch between English and Tamil.",
    controls: [["Tap / Click", "Pick a pit to sow"], ["Menu", "Rules, tutorial, language and variants"]],
    instructions: ["Pick up all the seeds in a pit and sow them one by one, anti-clockwise.", "Capture seeds according to the variant you choose.", "The player with the most seeds at the end wins."]
  },
  {
    id: "vyroniq-racing", title: "Vyroniq Racing", tagline: "Open-wheel 3D racing. Fictional teams, real speed.",
    status: "playable", premium: true, kids: false, flagship: true, trending: 11, added: "2026-10-21",
    embed: "games/vyroniq-racing/", orientation: "landscape", shots: 3,
    categories: ["racing"], difficulty: "Hard", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Race 5 formula-style cars on 3 original circuits: Velocity GP, the Neon Harbour night street track and Apex Mountain. Arcade-sim physics, an 8-speed gearbox, tyre wear, pit stops, weather, a full Career and Time Trial against your own ghost.",
    controls: [["Arrows / WASD", "Steer, throttle, brake"], ["X", "Drift"], ["Space", "Boost"], ["E / Q", "Shift up / down"], ["P / T", "Pit / pit tyre"], ["C", "Camera"], ["Esc", "Pause"], ["Touch / tilt / gamepad", "Supported"]],
    instructions: ["Start in the Rookie Cup and earn V-Coins to buy faster cars.", "Stay on track: going off slows you and invalidates the lap.", "Assists (ABS, traction, racing line) can be switched on in Settings. Premium game."]
  },
  {
    id: "mystery-quest", title: "Mystery Quest: 1000 Worlds", tagline: "Every level unlocks a new secret.",
    status: "playable", premium: true, kids: false, trending: 12, added: "2026-10-23",
    embed: "games/mystery-quest/", orientation: "portrait", shots: 3,
    categories: ["puzzles", "adventure"], difficulty: "Medium", age: "7+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "A grid puzzle adventure with 250 stages across 5 worlds: Enchanted Forest, Desert Treasure, Frozen Kingdom, Underwater City and Volcano Island. Each world adds a new mechanic, from boulders and quicksand to slippery ice, water currents and fire vents, and ends with a boss stage. Every stage is proven solvable.",
    controls: [["Swipe / Arrows / WASD", "Move"], ["Tap a neighbouring cell", "Move"], ["Z", "Undo"], ["R", "Restart"], ["H", "Hint"]],
    instructions: ["Find the keys, open the doors and reach the exit.", "Fewer moves earn more stars and coins.", "Stuck? Use a hint or undo. Premium game (about 40 MB download on first play)."]
  },
  {
    id: "one-move", title: "One Move", tagline: "150 brain puzzles. You get exactly one move.",
    status: "playable", premium: true, kids: false, trending: 13, added: "2026-10-22",
    embed: "games/one-move/", orientation: "landscape", shots: 3,
    categories: ["puzzles"], difficulty: "Hard", age: "7+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Every level gives you one move. Shift a matchstick to fix the equation, slide a crate into place, turn a mirror to bounce the beam, or pull one plank to rescue the hero. 150 levels in 6 worlds, and any valid answer counts.",
    controls: [["Tap / Click", "Select and move"], ["Hint button", "Get a hint (costs coins)"]],
    instructions: ["Study the puzzle, then make your single move.", "Four puzzle types: Matchsticks, Slide, Bounce and Rescue.", "Earn coins for hints and colour themes. Premium game."]
  },

  /* ---------------- PLAYABLE NOW — FREE (6) ---------------- */
  {
    id: "sniper-range", title: "Shadow Front: Sniper Range", tagline: "Train your aim before the war begins.",
    status: "playable", premium: false, kids: false, trending: 1, added: "2026-10-22", isNew: true,
    script: "sniper.js", categories: ["sniper", "shooting"], difficulty: "Medium", age: "12+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Before Kaal could face the Shadow Front, he spent a thousand mornings on the Varkh training range. Steel plates pop up, cardboard troopers slide through the dust and the clock never stops. Hit fast, hit centre, and earn your call sign.",
    controls: [["Mouse / Touch", "Aim (move scope)"], ["Click / Tap", "Fire"], ["Arrow keys", "Move scope"], ["Space", "Fire"], ["R", "Reload"]],
    instructions: ["You have 60 seconds and a 5-round magazine.", "Centre hits (bullseye / head) score triple.", "Shooting a civilian card (blue) costs points.", "Reload with R, or it reloads automatically when empty."],
    store: ["skin-scope-gold", "skin-scope-plasma", "skin-rifle-dragon"]
  },
  {
    id: "deep-sea-patrol", title: "Deep Sea Strike: Patrol", tagline: "Dodge mines. Sink subs. Survive the deep.",
    status: "playable", premium: false, kids: false, trending: 2, added: "2026-10-21", isNew: true,
    script: "submarine.js", categories: ["submarine", "shooting", "adventure"], difficulty: "Medium", age: "7+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "The Trident's first patrol goes wrong fast: a minefield, hunter subs and a sonar that keeps glitching. Hold the line for as long as you can and send everything back to the bottom.",
    controls: [["Arrows / WASD", "Move submarine"], ["Space", "Fire torpedo"], ["Touch", "On-screen buttons or drag"]],
    instructions: ["Destroy enemy subs (+50) and mines (+20).", "Collect gold air bubbles to repair hull.", "You have 3 hull points — the game gets faster over time."],
    store: ["hull-sub-stealth"]
  },
  {
    id: "turbo-rush", title: "Turbo Racing: Rush", tagline: "Endless highway. No brakes.",
    status: "playable", premium: false, kids: false, trending: 3, added: "2026-10-19",
    script: "racer.js", categories: ["racing"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Midnight. Neon highway. Your car, a full tank and a stream of traffic. How far can you go before you clip a bumper?",
    controls: [["← → / A D", "Steer"], ["↑ / W", "Nitro boost"], ["Touch", "Left / right halves of the screen"]],
    instructions: ["Weave through traffic — speed climbs every few seconds.", "Grab blue fuel cells for bonus points.", "One crash ends the run."],
    store: ["paint-car-inferno", "paint-car-chrome"]
  },
  {
    id: "dino-dash", title: "Dino Dash", tagline: "Jump, giggle and run with Rexi!",
    status: "playable", premium: false, kids: true, trending: 4, added: "2026-10-17",
    script: "dino.js", categories: ["kids", "adventure"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Rexi the little dinosaur is racing home before sunset. Help her hop over cactus and rocks and duck the silly swooping birds!",
    controls: [["Space / ↑ / Tap", "Jump"], ["↓", "Duck"]],
    instructions: ["Jump over obstacles — you have 3 hearts.", "Pick up stars for extra points.", "No ads, no purchases — made for kids."]
  },
  {
    id: "memory-jungle", title: "Memory Jungle", tagline: "Flip, match and remember!",
    status: "playable", premium: false, kids: true, trending: 6, added: "2026-10-14",
    script: "memory.js", categories: ["kids", "puzzles"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "The jungle animals are playing hide and seek behind the leaves. Find every pair to win!",
    controls: [["Click / Tap", "Flip a card"], ["Arrow keys + Space", "Move and flip"]],
    instructions: ["Flip two cards. If they match, they stay open.", "Find all 8 pairs in as few moves as possible.", "Fewer moves and less time = more stars."]
  },
  {
    id: "neon-snake", title: "Neon Snake", tagline: "The classic, rewired.",
    status: "playable", premium: false, kids: false, trending: 5, added: "2026-10-10",
    script: "snake.js", categories: ["puzzles"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "A rogue program loose in the Jarvis grid. Eat data cores, grow longer, and don't bite your own tail.",
    controls: [["Arrows / WASD", "Turn"], ["Swipe / D-pad", "Turn (mobile)"], ["P", "Pause"]],
    instructions: ["Eat cores to grow (+10).", "Pink bonus cores appear for a short time (+50).", "Hitting a wall or yourself ends the game."],
    store: ["skin-snake-rainbow"]
  },

  /* ---------------- NEW MINI GAMES — FREE (6) ---------------- */
  {
    id: "color-blast-3", title: "Color Blast 3", tagline: "Swap, match and blast your way through 50 levels.",
    status: "playable", premium: false, kids: false, trending: 9, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "colorblast.js", categories: ["puzzles", "arcade"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "The Color Lab has overflowed with glowing energy balls. Line them up, set off rockets, bombs and rainbow orbs, crack the crystal tiles and smash the crates to restore order — one satisfying cascade at a time.",
    controls: [["Swipe / Drag", "Swap two neighbouring balls"], ["Tap + Tap", "Select, then tap a neighbour to swap"], ["Arrows + Space", "Move cursor, pick up and swap"], ["P / Esc", "Pause"]],
    instructions: ["Swap two neighbouring balls to line up 3 or more of the same colour.", "Match 4 for a Rocket, an L or T shape for a Bomb, 5 in a row for a Rainbow orb.", "Each level has a goal (score, colours, crystals or crates) and a move limit — finish with moves to spare for more stars.", "Boosters: Hammer smashes one ball, Shuffle mixes the board.", "60-second Challenge: unlimited moves, beat your high score before the timer runs out."]
  },
  {
    id: "turbo-lane-rush", title: "Turbo Lane Rush", tagline: "Three lanes. Endless speed. Grab the coins!",
    status: "playable", premium: false, kids: false, trending: 10, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "lanerush.js", categories: ["arcade", "racing", "adventure"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Neon City's rooftop rail lines have become the hottest race track in town. Sprint down three lanes, leap barriers, slide under gates and dodge oncoming trams while you collect every coin to unlock eight runners.",
    controls: [["Swipe ← →  /  Arrows / A D", "Change lane"], ["Swipe ↑  /  ↑ / W / Space", "Jump"], ["Swipe ↓  /  ↓ / S", "Slide"], ["P / Esc", "Pause"]],
    instructions: ["Dodge trams and barriers — jump over low barriers, slide under high gates.", "Collect coins and power-ups: Magnet, 2× Score and Shield.", "Complete 30 missions (3 at a time) for bonus coins.", "Spend coins to unlock 8 runners, each with a small perk.", "Beat the Daily Challenge target for a coin bonus. The speed keeps rising!"]
  },
  {
    id: "bubble-kingdom", title: "Bubble Kingdom", tagline: "Aim, pop and rescue the trapped stars.",
    status: "playable", premium: false, kids: true, trending: 11, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "bubblekingdom.js", categories: ["puzzles", "kids", "arcade"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "A grumpy storm cloud has trapped the Kingdom's star-sprites inside bubbles high above the castle. Grab the royal bubble cannon, aim carefully and pop your way through 100 levels to set every star free.",
    controls: [["Drag", "Aim the cannon"], ["Release", "Shoot"], ["← → / Space", "Aim and shoot with keys"], ["Tap the spare bubble / ↓", "Swap bubbles"]],
    instructions: ["Shoot bubbles to make groups of 3 or more of the same colour.", "Bubbles that are no longer hanging from the top fall and score big.", "Free every trapped star (pop a bubble next to it, or drop it) to win.", "Special bubbles: Bomb, Rainbow and Stone. Boosters: Fireball, Rainbow and Long aim.", "Fewer shots used = more stars (up to 3). No ads, no purchases."]
  },
  {
    id: "mini-soldier-strike", title: "Mini Soldier Strike", tagline: "Hold the base against drones, robots and bosses.",
    status: "playable", premium: false, kids: false, trending: 12, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "soldierstrike.js", categories: ["shooting", "arcade"], difficulty: "Medium", age: "7+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Outpost Kilo is the last base standing between a rogue robot factory and the valley. Private Ash mans the turret: blast drone swarms, stop walking mechs and take down five giant bosses, then spend your salvage on better guns and thicker armour.",
    controls: [["Drag / Mouse", "Aim"], ["Tap / Hold / Click", "Fire"], ["← → / A D", "Aim with keys"], ["Space", "Fire"], ["P / Esc", "Pause"]],
    instructions: ["Survive every wave of a mission to win it — 40 missions in all.", "A boss arrives every 8th mission (5 bosses).", "Earn salvage credits to buy 10 weapons and upgrade armour, repair and damage in the Armoury.", "If the base armour reaches zero, the mission fails — upgrade and try again."]
  },
  {
    id: "parking-escape", title: "Parking Escape", tagline: "Slide the cars. Free the red one.",
    status: "playable", premium: false, kids: true, trending: 13, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "parking.js", categories: ["puzzles", "kids", "arcade"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "Rush hour at the Jarvis Mall car park and everyone is boxed in! Slide cars and trucks back and forth to open a path so the little red car can drive out of the exit.",
    controls: [["Drag a vehicle", "Slide it along its lane"], ["Arrows + Space", "Select a vehicle and move it"], ["Hint button", "Show the next best move"], ["Undo / Restart", "Take back moves"]],
    instructions: ["Cars only slide forwards and backwards in their own lane.", "Clear a path so the red car can leave through the exit on the right.", "Each level has a move limit — solve it in the fewest moves for 3 stars.", "Every one of the 100 levels is checked to be solvable. Stuck? Use a hint (earn more by getting 3 stars)."]
  },
  {
    id: "sky-tower-stack", title: "Sky Tower Stack", tagline: "One tap. One block. How high can you go?",
    status: "playable", premium: false, kids: true, trending: 14, added: "2026-10-27", isNew: true, pack: "mini6",
    script: "skytower.js", categories: ["arcade", "kids"], difficulty: "Easy", age: "3+",
    platforms: ["Web (desktop & mobile)", "Android (coming soon)"],
    storyline: "The city wants a tower that touches space. Every block slides in from the side — drop it at just the right moment. Anything hanging over the edge is sliced off, so the tower gets narrower unless your timing is perfect.",
    controls: [["Tap / Click", "Drop the block"], ["Space / Enter", "Drop the block"], ["P / Esc", "Pause"]],
    instructions: ["Drop each moving block on top of the tower.", "Overhanging parts are trimmed away — miss completely and the tower falls.", "Perfect drops build a combo: 3 in a row makes the block grow back.", "Play Endless for a high score, or beat 30 Challenges.", "Unlock 6 tower themes by building higher."]
  },

  /* ---------------- PLAYABLE NOW — PREMIUM (2) ---------------- */
  {
    id: "star-vanguard", title: "Star Vanguard", tagline: "Wave after wave. One ship. No retreat.",
    status: "playable", premium: true, kids: false, trending: 7, added: "2026-10-23", isNew: true,
    script: "shooter.js", categories: ["shooting", "adventure"], difficulty: "Hard", age: "7+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "The Vanguard fleet is gone. You fly its last fighter against the swarm, gathering power cores from the wreckage to upgrade your guns mid-flight.",
    controls: [["Arrows / WASD", "Fly"], ["Auto", "Guns fire automatically"], ["Touch", "Drag anywhere to fly"]],
    instructions: ["Destroy enemy waves; every 5th wave is a mothership.", "Green cores upgrade your weapon, pink cores restore shields.", "Premium members only."],
    store: ["outfit-commando", "outfit-ghost"]
  },
  {
    id: "neon-blocks", title: "Neon Blocks", tagline: "Stack, clear, chase the high score.",
    status: "playable", premium: true, kids: false, trending: 8, added: "2026-10-23", isNew: true,
    script: "blocks.js", categories: ["puzzles"], difficulty: "Medium", age: "3+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "The grid is filling up. Rotate, slide and drop glowing blocks to clear lines before they reach the top.",
    controls: [["← →", "Move"], ["↑ / X", "Rotate"], ["↓", "Soft drop"], ["Space", "Hard drop"], ["Touch", "On-screen buttons"]],
    instructions: ["Complete a row to clear it.", "Clear several rows at once for big combos.", "Speed increases every 10 lines. Premium members only."]
  },

  /* ---------------- GHOST & ZOMBIE PACK (5) ---------------- */
  {
    id: "ghost-hunt", title: "Ghost Hunt: Haunted Hospital", tagline: "3D ghost-hunting horror: 100 floors of a haunted hospital.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 15, added: "2026-10-27", isNew: true, pack: "horror5",
    embed: "games/ghost-hunt/", orientation: "landscape", shots: 3,
    categories: ["horror", "adventure"], difficulty: "Medium", age: "12+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "An abandoned hospital, 100 floors deep and crawling with restless spirits. Burn ghosts with your UV beam, collect every key, rescue the trapped patients and restore power at the fuse boxes, then reach the glowing exit elevator. Every 10th floor the possessed Head Doctor hunts you. Full 3D with flickering lights, fog and jump scares.",
    controls: [["WASD", "Move"], ["Mouse", "Look (click the game to lock the mouse)"], ["Left click / Space", "UV beam (hold, burns ghosts, drains battery)"], ["E (hold)", "Rescue patients, pull fuse levers"], ["Shift", "Run"], ["Q", "Medkit"], ["Esc / P", "Pause"], ["Touch", "Joystick, drag to look, BEAM / USE / RUN / MED buttons"]],
    instructions: ["Collect every key, rescue the trapped patients and restore power with the fuse boxes.", "Then reach the glowing EXIT elevator. Watch your back: ghosts appear behind you.", "Every 10th floor the possessed Head Doctor hunts you. Survive all 100 levels.", "Best in landscape on phones."]
  },
  {
    id: "zombie-war", title: "Zombie War: Last City", tagline: "3D zombie shooter: retake the city in 250 missions.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 16, added: "2026-10-27", isNew: true, pack: "horror5",
    embed: "games/zombie-war/", orientation: "landscape", shots: 3,
    categories: ["horror", "shooting"], difficulty: "Hard", age: "16+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "The city has fallen to the undead. Fight through 250 missions: survive the waves, hold out until the evac arrives, or rescue survivors at the green beacons. Ammo is scarce, so aim for the head, grab supply drops and blow up red barrels to take out whole crowds. Every 3rd mission is at night, and every 10th the giant mutated Commander attacks.",
    controls: [["WASD", "Move"], ["Shift", "Sprint"], ["Mouse", "Aim (click the game to lock the mouse)"], ["Left click", "Shoot"], ["Right click", "Aim down sights"], ["R", "Reload"], ["G", "Grenade"], ["1–4 / wheel / Q", "Switch weapon"], ["E (hold)", "Rescue survivor"], ["Esc / P", "Pause"], ["Touch", "Joystick + RUN, FIRE, RELOAD, NADE, SWAP, USE buttons"]],
    instructions: ["Complete the mission goal: survive the waves, hold out for evac, or rescue the survivors.", "Green bloated zombies explode, so kill them from a distance.", "Shoot red barrels to blow up crowds and watch for supply drops.", "Every 10th mission is a boss: the mutated Commander. Clear all 250 to retake the city."]
  },
  {
    id: "ghost-village", title: "Ghost Village: Curse of the Night", tagline: "3D village horror: survive 150 cursed nights.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 17, added: "2026-10-27", isNew: true, pack: "horror5",
    embed: "games/ghost-village/", orientation: "landscape", shots: 3,
    categories: ["horror", "adventure"], difficulty: "Medium", age: "12+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Something follows you in the dark. Survive 150 cursed nights in a haunted village armed with a holy lantern: light the sacred diyas, banish spirits, collect amulets, seal haunted wells or survive until dawn. A pale ghost silently follows you and vanishes only when you look at her, so listen for the heartbeat and look back. Every 10th night the Spirit Queen rises.",
    controls: [["WASD", "Move"], ["Mouse", "Look (click the game to lock the mouse)"], ["Left click", "Fire holy flame"], ["R", "Refill lamp"], ["E / F (hold)", "Interact"], ["Q / right click", "Temple bell blast"], ["Shift", "Sprint"], ["Esc / P", "Pause"], ["Touch", "Left stick, drag right side to look, fire / refill / interact / bell / sprint buttons"]],
    instructions: ["Each night has an objective shown at the top left; complete it before dawn.", "The Follower vanishes when you turn and look at her. If you hear a heartbeat, look back!", "Use the temple bell blast when spirits surround you.", "Every 10th night is a boss: banish the Spirit Queen. Earn coins for upgrades in the Shop."]
  },
  {
    id: "zombie-express", title: "Zombie Express: Death Train", tagline: "Zombie train survival in 3D: 200 runs.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 18, added: "2026-10-27", isNew: true, pack: "horror5",
    embed: "games/zombie-express/", orientation: "landscape", shots: 3,
    categories: ["horror", "shooting"], difficulty: "Hard", age: "16+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "The last train out of the city. It never stops, and neither do they. Survive 200 runs aboard the infected express, from Easy to Extreme: fight coach by coach to the engine, protect trapped survivors, hold out until the next safe station, or vent the gas from infected coaches. Zombies smash through the windows, and when the power fails only your torch remains. Every 10th run the Mutated Train Driver attacks.",
    controls: [["WASD", "Move"], ["Mouse", "Aim (click the game to lock the mouse)"], ["Left click", "Shoot"], ["R", "Reload"], ["1 / 2 / 3 or X", "Switch weapon"], ["Q / right click", "Shove"], ["E (hold)", "Use"], ["Shift", "Sprint"], ["Esc / P", "Pause"], ["Touch", "Left stick, drag right side to aim, shoot / reload / weapon / shove / use / sprint buttons"]],
    instructions: ["Complete each run's goal: clear the coaches, protect survivors, hold out or vent the infected coaches.", "Watch the windows: zombies smash through the glass.", "Shove zombies back when they get close, and keep reloading between fights.", "Every 10th run is a boss: the Mutated Train Driver. Unlock weapons in the Shop."]
  },
  {
    id: "nightmare-house", title: "Nightmare House: Escape the Dead", tagline: "3D horror escape: 300 nights in a haunted mansion.",
    status: "playable", premium: false, kids: false, flagship: true, trending: 19, added: "2026-10-27", isNew: true, pack: "horror5",
    embed: "games/nightmare-house/", orientation: "landscape", shots: 4,
    categories: ["horror", "shooting", "adventure"], difficulty: "Hard", age: "16+",
    platforms: ["Web (desktop & mobile)"],
    storyline: "Trapped in a cursed mansion, you must survive until sunrise across 300 nights. Find clues and secret bookshelf doors, banish ghosts with the Spirit Lantern, gun down the walking dead and face the Immortal Master of the House every 10th night. Shoot his soul urns to break his shield, then beat the final boss to unlock one of 3 endings. Earn coins for 6 upgrades. Full 3D with flickering lights, shadows, fog, bloom and jump scares.",
    controls: [["WASD", "Move"], ["Mouse", "Look (click the game to lock the mouse)"], ["Left click", "Fire revolver"], ["Q / right click", "Spirit Lantern (ghosts)"], ["E", "Use / open"], ["R", "Reload"], ["Shift", "Sprint"], ["F", "Flashlight"], ["Esc", "Pause"], ["Touch", "Joystick, look pad + on-screen buttons"]],
    instructions: ["Collect the clues to unseal the exit door, then escape before sunrise.", "Ghosts can only be hurt by the Spirit Lantern; zombies need bullets.", "Every 10th night is a boss: destroy the soul urns first.", "Change graphics quality in the menu. Best in landscape on phones."]
  }
];

/* ---------------- IN-GAME STORE (₹10 – ₹150) ---------------- */
window.GV_STORE_ITEMS = [
  { id: "skin-scope-gold",    name: "Golden Reticle",      type: "Gun skin",    price: 10,  slot: "scope",  value: "#ffd23f", game: "sniper-range",    desc: "Gold scope reticle and lens glow for Sniper Range." },
  { id: "skin-scope-plasma",  name: "Plasma Reticle",      type: "Gun skin",    price: 29,  slot: "scope",  value: "#ff2bd6", game: "sniper-range",    desc: "Hot-pink plasma reticle with a pulsing glow." },
  { id: "skin-rifle-dragon",  name: "Dragon Rifle Wrap",   type: "Gun skin",    price: 49,  slot: "rifle",  value: "#ff5a1f", game: "sniper-range",    desc: "Fiery dragon-scale rifle wrap shown on your barrel." },
  { id: "paint-car-inferno",  name: "Inferno Paint",       type: "Car upgrade", price: 19,  slot: "car",    value: "#ff3b3b", game: "turbo-rush",      desc: "Flame-red paint job with racing stripes." },
  { id: "paint-car-chrome",   name: "Liquid Chrome",       type: "Car upgrade", price: 39,  slot: "car",    value: "#d9e4f5", game: "turbo-rush",      desc: "Mirror chrome finish that shines under neon." },
  { id: "hull-sub-stealth",   name: "Stealth Hull",        type: "Sub upgrade", price: 25,  slot: "sub",    value: "#2a3342", game: "deep-sea-patrol", desc: "Matte-black stealth hull for the Trident." },
  { id: "skin-snake-rainbow", name: "Rainbow Snake",       type: "Cosmetic",    price: 15,  slot: "snake",  value: "rainbow", game: "neon-snake",      desc: "Your snake cycles through every neon colour." },
  { id: "outfit-commando",    name: "Commando Livery",     type: "Outfit",      price: 79,  slot: "ship",   value: "#3ddc84", game: "star-vanguard",   desc: "Jungle-green pilot outfit and ship livery." },
  { id: "outfit-ghost",       name: "Ghost Operative",     type: "Outfit",      price: 99,  slot: "ship",   value: "#e8f6ff", game: "star-vanguard",   desc: "White ghost-ops outfit with icy ship trails." },
  { id: "bundle-starter",     name: "Starter Mega Bundle", type: "Bundle",      price: 150, bundle: ["skin-scope-gold", "skin-scope-plasma", "skin-rifle-dragon", "paint-car-inferno", "paint-car-chrome", "hull-sub-stealth", "skin-snake-rainbow"], desc: "7 cosmetics in one pack for Sniper Range, Turbo Rush, Deep Sea Patrol and Neon Snake." }
];
