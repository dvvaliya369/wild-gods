import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

export type RegionId = 'sanctuary' | 'moonwood' | 'ashen-valley' | 'drowned-ruins';

export type GuardianSpawn = {
  id: 'moon-stag' | 'ember-boar' | 'tide-serpent';
  region: RegionId;
  position: Phaser.Math.Vector2;
};

export type CorruptionAnchor = {
  id: string;
  guardianId: GuardianSpawn['id'];
  position: Phaser.Math.Vector2;
};

export type Shrine = {
  id: string;
  region: RegionId;
  position: Phaser.Math.Vector2;
  marker: Phaser.GameObjects.Arc;
  activated: boolean;
};

export type WorldMap = {
  obstacles: Phaser.GameObjects.Zone[];
  guardianSpawns: GuardianSpawn[];
  corruptionAnchors: CorruptionAnchor[];
  shrines: Shrine[];
  playerStart: Phaser.Math.Vector2;
};

const COLORS = {
  sanctuary: 0x344d3c,
  moonwood: 0x173f31,
  moonwoodLight: 0x286247,
  ashen: 0x53372f,
  lava: 0xc75b32,
  drowned: 0x244b55,
  water: 0x347888,
  path: 0x9a8057,
  stone: 0x778078,
  gold: 0xd5ad55,
  corruption: 0x8158a7,
};

export const createWorld = (scene: Phaser.Scene): WorldMap => {
  const obstacles: Phaser.GameObjects.Zone[] = [];
  const random = new Phaser.Math.RandomDataGenerator(['wild-gods-world']);

  scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawRegions(scene, random);
  drawPaths(scene);
  drawSanctuary(scene, obstacles);
  drawMoonwood(scene, random, obstacles);
  drawAshenValley(scene, random, obstacles);
  drawDrownedRuins(scene, obstacles);

  const guardianSpawns = createGuardianSpawns(scene);
  const corruptionAnchors = createCorruptionAnchors(scene, obstacles);
  const shrines = createShrines(scene);
  drawRegionLabels(scene);

  return {
    obstacles,
    guardianSpawns,
    corruptionAnchors,
    shrines,
    playerStart: new Phaser.Math.Vector2(1800, 1270),
  };
};

const createShrines = (scene: Phaser.Scene): Shrine[] => {
  const definitions = [
    { id: 'central-sanctuary', region: 'sanctuary', x: 1800, y: 1200 },
    { id: 'moonwood-shrine', region: 'moonwood', x: 1080, y: 720 },
    { id: 'ashen-shrine', region: 'ashen-valley', x: 2520, y: 520 },
    { id: 'drowned-shrine', region: 'drowned-ruins', x: 2580, y: 1540 },
  ] as const;

  return definitions.map(({ id, region, x, y }) => {
    const marker = scene.add
      .circle(x, y, 27, 0x486758, 1)
      .setStrokeStyle(5, COLORS.gold, 0.8)
      .setDepth(12);
    scene.add
      .circle(x, y, 10, COLORS.gold, 0.75)
      .setDepth(13);

    return {
      id,
      region,
      position: new Phaser.Math.Vector2(x, y),
      marker,
      activated: false,
    };
  });
};

const drawRegions = (scene: Phaser.Scene, random: Phaser.Math.RandomDataGenerator): void => {
  const ground = scene.add.graphics().setDepth(0);
  ground.fillStyle(COLORS.moonwood);
  ground.fillRect(0, 0, 1500, WORLD_HEIGHT);
  ground.fillStyle(COLORS.ashen);
  ground.fillRect(1500, 0, WORLD_WIDTH - 1500, 1200);
  ground.fillStyle(COLORS.drowned);
  ground.fillRect(1500, 1200, WORLD_WIDTH - 1500, 1200);
  ground.fillStyle(COLORS.sanctuary);
  ground.fillCircle(1800, 1200, 520);

  ground.fillStyle(0xffffff, 0.045);
  for (let index = 0; index < 420; index += 1) {
    ground.fillCircle(
      random.between(15, WORLD_WIDTH - 15),
      random.between(15, WORLD_HEIGHT - 15),
      random.between(2, 7),
    );
  }
};

const drawPaths = (scene: Phaser.Scene): void => {
  const paths = scene.add.graphics().setDepth(2);
  paths.lineStyle(96, 0x4a3b2b, 0.7);
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(1300, 1180);
  paths.lineTo(850, 1120);
  paths.lineTo(420, 960);
  paths.strokePath();
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(2210, 980);
  paths.lineTo(2670, 720);
  paths.lineTo(3120, 520);
  paths.strokePath();
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(2240, 1430);
  paths.lineTo(2700, 1700);
  paths.lineTo(3140, 1900);
  paths.strokePath();

  paths.lineStyle(66, COLORS.path, 1);
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(1300, 1180);
  paths.lineTo(850, 1120);
  paths.lineTo(420, 960);
  paths.strokePath();
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(2210, 980);
  paths.lineTo(2670, 720);
  paths.lineTo(3120, 520);
  paths.strokePath();
  paths.beginPath();
  paths.moveTo(1800, 1200);
  paths.lineTo(2240, 1430);
  paths.lineTo(2700, 1700);
  paths.lineTo(3140, 1900);
  paths.strokePath();
};

const drawSanctuary = (scene: Phaser.Scene, obstacles: Phaser.GameObjects.Zone[]): void => {
  const sanctuary = scene.add.graphics().setDepth(4);
  sanctuary.fillStyle(0x263a30, 0.9);
  sanctuary.fillCircle(1800, 1200, 350);
  sanctuary.lineStyle(16, COLORS.gold, 0.5);
  sanctuary.strokeCircle(1800, 1200, 310);
  sanctuary.lineStyle(5, COLORS.gold, 0.32);
  sanctuary.strokeCircle(1800, 1200, 190);

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const x = 1800 + Math.cos(angle) * 300;
    const y = 1200 + Math.sin(angle) * 300;
    sanctuary.fillStyle(COLORS.stone);
    sanctuary.fillRect(x - 18, y - 42, 36, 84);
    addObstacle(scene, obstacles, x, y, 36, 60);
  }

  sanctuary.fillStyle(COLORS.gold, 0.75);
  sanctuary.fillCircle(1800, 1200, 34);
};

const drawMoonwood = (
  scene: Phaser.Scene,
  random: Phaser.Math.RandomDataGenerator,
  obstacles: Phaser.GameObjects.Zone[],
): void => {
  const forest = scene.add.graphics().setDepth(5);

  for (let index = 0; index < 72; index += 1) {
    const x = random.between(70, 1380);
    const y = random.between(70, WORLD_HEIGHT - 70);
    const nearMainPath = y > 850 && y < 1320 && x > 250;
    const nearArena = Phaser.Math.Distance.Between(x, y, 690, 1080) < 330;
    if (nearMainPath || nearArena) continue;

    const radius = random.between(28, 48);
    forest.fillStyle(0x0b261b);
    forest.fillCircle(x + 7, y + 10, radius);
    forest.fillStyle(COLORS.moonwoodLight);
    forest.fillCircle(x, y, radius);
    forest.fillStyle(0x519167, 0.45);
    forest.fillCircle(x - radius * 0.28, y - radius * 0.3, radius * 0.42);
    addObstacle(scene, obstacles, x, y + radius * 0.45, radius, radius * 0.6);
  }

  forest.lineStyle(8, 0xa9d7c2, 0.25);
  forest.strokeCircle(690, 1080, 285);
};

const drawAshenValley = (
  scene: Phaser.Scene,
  random: Phaser.Math.RandomDataGenerator,
  obstacles: Phaser.GameObjects.Zone[],
): void => {
  const valley = scene.add.graphics().setDepth(3);
  valley.fillStyle(COLORS.lava, 0.72);
  valley.fillRoundedRect(2050, 110, 160, 700, 70);
  valley.fillRoundedRect(2240, 70, 900, 125, 55);
  addObstacle(scene, obstacles, 2130, 430, 145, 650);
  addObstacle(scene, obstacles, 2690, 132, 860, 110);

  for (let index = 0; index < 36; index += 1) {
    const x = random.between(1650, WORLD_WIDTH - 80);
    const y = random.between(230, 1080);
    const nearPath = Math.abs(y - (1450 - x * 0.29)) < 130;
    const nearArena = Phaser.Math.Distance.Between(x, y, 3010, 600) < 330;
    if (nearPath || nearArena) continue;

    const size = random.between(24, 58);
    valley.fillStyle(0x302a28);
    valley.fillTriangle(x - size, y + size / 2, x, y - size, x + size, y + size / 2);
    addObstacle(scene, obstacles, x, y, size * 1.2, size);
  }

  valley.lineStyle(8, 0xffb05c, 0.28);
  valley.strokeCircle(3010, 600, 290);
};

const drawDrownedRuins = (scene: Phaser.Scene, obstacles: Phaser.GameObjects.Zone[]): void => {
  const ruins = scene.add.graphics().setDepth(3);
  ruins.fillStyle(COLORS.water, 0.68);
  ruins.fillRoundedRect(2060, 1510, 420, 760, 90);
  ruins.fillRoundedRect(2500, 2050, 970, 210, 80);
  addObstacle(scene, obstacles, 2270, 1890, 390, 720);
  addObstacle(scene, obstacles, 2985, 2155, 930, 180);

  const columns = [
    [2620, 1420], [2760, 1320], [2920, 1450], [3230, 1500], [3340, 1740],
    [2630, 1950], [2940, 2020], [3270, 1980],
  ];

  columns.forEach(([x = 0, y = 0], index) => {
    ruins.fillStyle(index % 2 === 0 ? 0x70868a : 0x596f73);
    ruins.fillRect(x - 24, y - 58, 48, 116);
    addObstacle(scene, obstacles, x, y, 48, 86);
  });

  ruins.lineStyle(8, 0x8fd4df, 0.3);
  ruins.strokeCircle(3070, 1740, 300);
};

const createGuardianSpawns = (scene: Phaser.Scene): GuardianSpawn[] => {
  const spawns: GuardianSpawn[] = [
    { id: 'moon-stag', region: 'moonwood', position: new Phaser.Math.Vector2(690, 1080) },
    { id: 'ember-boar', region: 'ashen-valley', position: new Phaser.Math.Vector2(3010, 600) },
    { id: 'tide-serpent', region: 'drowned-ruins', position: new Phaser.Math.Vector2(3070, 1740) },
  ];

  const markers = scene.add.graphics().setDepth(6);
  spawns.forEach((spawn) => {
    markers.fillStyle(COLORS.gold, 0.8);
    markers.fillCircle(spawn.position.x, spawn.position.y, 26);
    markers.lineStyle(4, 0xf5e4a8, 0.8);
    markers.strokeCircle(spawn.position.x, spawn.position.y, 42);
  });

  return spawns;
};

const createCorruptionAnchors = (
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Zone[],
): CorruptionAnchor[] => {
  const anchors: CorruptionAnchor[] = [
    { id: 'stag-north', guardianId: 'moon-stag', position: new Phaser.Math.Vector2(610, 770) },
    { id: 'stag-west', guardianId: 'moon-stag', position: new Phaser.Math.Vector2(390, 1120) },
    { id: 'stag-south', guardianId: 'moon-stag', position: new Phaser.Math.Vector2(760, 1370) },
    { id: 'boar-north', guardianId: 'ember-boar', position: new Phaser.Math.Vector2(2960, 290) },
    { id: 'boar-east', guardianId: 'ember-boar', position: new Phaser.Math.Vector2(3330, 620) },
    { id: 'boar-south', guardianId: 'ember-boar', position: new Phaser.Math.Vector2(2850, 900) },
    { id: 'serpent-north', guardianId: 'tide-serpent', position: new Phaser.Math.Vector2(3060, 1400) },
    { id: 'serpent-east', guardianId: 'tide-serpent', position: new Phaser.Math.Vector2(3400, 1770) },
    { id: 'serpent-south', guardianId: 'tide-serpent', position: new Phaser.Math.Vector2(3040, 2040) },
  ];

  const crystals = scene.add.graphics().setDepth(7);
  anchors.forEach((anchor) => {
    const { x, y } = anchor.position;
    crystals.fillStyle(COLORS.corruption, 0.9);
    crystals.fillTriangle(x, y - 42, x - 24, y + 28, x + 24, y + 28);
    crystals.lineStyle(4, 0xc99bec, 0.65);
    crystals.strokeTriangle(x, y - 42, x - 24, y + 28, x + 24, y + 28);
    addObstacle(scene, obstacles, x, y, 44, 50);
  });

  return anchors;
};

const drawRegionLabels = (scene: Phaser.Scene): void => {
  const labels = [
    ['MOONWOOD', 650, 180],
    ['SHATTERED SANCTUARY', 1800, 760],
    ['ASHEN VALLEY', 2920, 300],
    ['DROWNED RUINS', 3000, 1320],
  ] as const;

  labels.forEach(([label, x, y]) => {
    scene.add
      .text(x, y, label, {
        color: '#f3ead0',
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        fontStyle: 'bold',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(20);
  });
};

const addObstacle = (
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Zone[],
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  const obstacle = scene.add.zone(x, y, width, height);
  scene.physics.add.existing(obstacle, true);
  obstacles.push(obstacle);
};
