import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import type { GuardianId } from '../services/gameStorage';
import type { GuardianSpawn, Shrine } from '../world/createWorld';

const MAP_WIDTH = 230;
const MAP_HEIGHT = 145;
const MAP_X = GAME_WIDTH - MAP_WIDTH - 24;
const MAP_Y = GAME_HEIGHT - MAP_HEIGHT - 24;

const GUARDIAN_COLORS: Record<GuardianId, number> = {
  'moon-stag': 0xd5ad55,
  'ember-boar': 0xe8794a,
  'tide-serpent': 0x8fdbea,
};

export class WorldMiniMap extends Phaser.GameObjects.Container {
  private readonly playerMarker: Phaser.GameObjects.Arc;
  private readonly guardianMarkers = new Map<GuardianId, Phaser.GameObjects.Arc>();
  private readonly shrineMarkers = new Map<string, Phaser.GameObjects.Arc>();

  constructor(scene: Phaser.Scene, guardianSpawns: GuardianSpawn[], shrines: Shrine[]) {
    super(scene, MAP_X, MAP_Y);
    scene.add.existing(this);

    const map = scene.add.graphics();
    map.fillStyle(0x07130f, 0.9);
    map.fillRoundedRect(0, 0, MAP_WIDTH, MAP_HEIGHT, 10);
    map.fillStyle(0x173f31, 0.95);
    map.fillRect(8, 8, (1500 / WORLD_WIDTH) * (MAP_WIDTH - 16), MAP_HEIGHT - 16);
    map.fillStyle(0x53372f, 0.95);
    map.fillRect(
      8 + (1500 / WORLD_WIDTH) * (MAP_WIDTH - 16),
      8,
      ((WORLD_WIDTH - 1500) / WORLD_WIDTH) * (MAP_WIDTH - 16),
      (1200 / WORLD_HEIGHT) * (MAP_HEIGHT - 16),
    );
    map.fillStyle(0x244b55, 0.95);
    map.fillRect(
      8 + (1500 / WORLD_WIDTH) * (MAP_WIDTH - 16),
      8 + (1200 / WORLD_HEIGHT) * (MAP_HEIGHT - 16),
      ((WORLD_WIDTH - 1500) / WORLD_WIDTH) * (MAP_WIDTH - 16),
      (1200 / WORLD_HEIGHT) * (MAP_HEIGHT - 16),
    );
    map.fillStyle(0x486758, 1);
    map.fillCircle(...this.toMapPosition(1800, 1200), 15);
    map.lineStyle(2, 0xd5ad55, 0.65);
    map.strokeRoundedRect(1, 1, MAP_WIDTH - 2, MAP_HEIGHT - 2, 10);
    this.add(map);

    shrines.forEach((shrine) => {
      const [x, y] = this.toMapPosition(shrine.position.x, shrine.position.y);
      const marker = scene.add.circle(x, y, 3, 0xa8b4a9, 0.9);
      this.shrineMarkers.set(shrine.id, marker);
      this.add(marker);
    });

    guardianSpawns.forEach((spawn) => {
      const [x, y] = this.toMapPosition(spawn.position.x, spawn.position.y);
      const marker = scene.add
        .circle(x, y, 6, GUARDIAN_COLORS[spawn.id], 1)
        .setStrokeStyle(2, 0xf3ead0, 0.8);
      this.guardianMarkers.set(spawn.id, marker);
      this.add(marker);
    });

    this.playerMarker = scene.add
      .circle(0, 0, 4, 0xffffff, 1)
      .setStrokeStyle(2, 0x07130f, 1);
    this.add(this.playerMarker);
    this.setScrollFactor(0);
    this.setDepth(350);
  }

  updatePlayer(x: number, y: number): void {
    const [mapX, mapY] = this.toMapPosition(x, y);
    this.playerMarker.setPosition(mapX, mapY);
  }

  setGuardianPurified(id: GuardianId): void {
    this.guardianMarkers.get(id)?.setFillStyle(0x8fe0c5).setAlpha(0.65);
  }

  updateGuardian(id: GuardianId, x: number, y: number): void {
    const [mapX, mapY] = this.toMapPosition(x, y);
    this.guardianMarkers.get(id)?.setPosition(mapX, mapY);
  }

  setShrineActivated(id: string): void {
    this.shrineMarkers.get(id)?.setFillStyle(0xd5ad55).setRadius(4);
  }

  private readonly toMapPosition = (worldX: number, worldY: number): [number, number] => [
    8 + (worldX / WORLD_WIDTH) * (MAP_WIDTH - 16),
    8 + (worldY / WORLD_HEIGHT) * (MAP_HEIGHT - 16),
  ];
}
