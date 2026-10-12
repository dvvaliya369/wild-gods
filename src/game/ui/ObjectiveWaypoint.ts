import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';

export class ObjectiveWaypoint extends Phaser.GameObjects.Container {
  private readonly arrow: Phaser.GameObjects.Polygon;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, 155);
    scene.add.existing(this);

    const panel = scene.add
      .rectangle(0, 0, 390, 48, 0x07130f, 0.86)
      .setStrokeStyle(2, 0xd5ad55, 0.65);
    this.arrow = scene.add.polygon(
      -170,
      0,
      [-18, -6, 4, -6, 4, -13, 20, 0, 4, 13, 4, 6, -18, 6],
      0xffffff,
      1,
    );
    this.label = scene.add
      .text(15, 0, '', {
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([panel, this.arrow, this.label]);
    this.setScrollFactor(0);
    this.setDepth(360);
  }

  updateTarget(
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number,
    targetLabel: string,
    color: number,
    action: 'Q' | 'E',
  ): void {
    const distance = Phaser.Math.Distance.Between(playerX, playerY, targetX, targetY);
    const meters = Math.max(1, Math.round(distance / 10));
    const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
    const direction = this.getDirection(targetX - playerX, targetY - playerY);
    const actionText = distance <= 600 ? ` · PRESS ${action}` : '';
    this.arrow.setRotation(angle).setFillStyle(color);
    this.label.setText(`${targetLabel} · ${direction} · ${meters}m${actionText}`);
    this.setVisible(true);
  }

  private readonly getDirection = (deltaX: number, deltaY: number): string => {
    const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const angle = Math.atan2(deltaY, deltaX);
    const index = Math.round((angle + Math.PI * 2) / (Math.PI / 4)) % directions.length;
    return directions[index] ?? 'N';
  };
}
