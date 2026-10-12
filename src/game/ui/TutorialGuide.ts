import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

type TutorialStep = 'move' | 'attack' | 'dodge' | 'lure' | 'complete';

const TUTORIAL_TEXT: Record<Exclude<TutorialStep, 'complete'>, string> = {
  move: 'MOVE  Use WASD or arrow keys to explore.  [T to skip tutorial]',
  attack: 'ATTACK  Aim and left-click to thrust your spear.  [T to skip]',
  dodge: 'DODGE  Press Space to evade attacks.  [T to skip]',
  lure: 'LURE  Press Q near a guardian to redirect its power.  [T to skip]',
};

export class TutorialGuide extends Phaser.GameObjects.Container {
  private readonly startPosition: Phaser.Math.Vector2;
  private readonly message: Phaser.GameObjects.Text;
  private readonly onComplete: () => void;
  private step: TutorialStep = 'move';

  constructor(scene: Phaser.Scene, startX: number, startY: number, onComplete: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.startPosition = new Phaser.Math.Vector2(startX, startY);
    this.onComplete = onComplete;

    const panel = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 74, 620, 58, 0x07130f, 0.92)
      .setStrokeStyle(2, 0xd5ad55, 0.75);
    this.message = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 74, TUTORIAL_TEXT.move, {
        align: 'center',
        color: '#f3ead0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([panel, this.message]);
    this.setScrollFactor(0);
    this.setDepth(450);
  }

  updatePlayerPosition(x: number, y: number): void {
    if (
      this.step === 'move'
      && Phaser.Math.Distance.Between(this.startPosition.x, this.startPosition.y, x, y) >= 90
    ) {
      this.advance('attack');
    }
  }

  recordAttack(): void {
    if (this.step === 'attack') this.advance('dodge');
  }

  recordDodge(): void {
    if (this.step === 'dodge') this.advance('lure');
  }

  recordLure(): void {
    if (this.step !== 'lure') return;
    this.finish('The Wild Gods answer your call. Restore all three guardians.');
  }

  skip(): void {
    if (this.step === 'complete') return;
    this.finish('Tutorial skipped. Follow the objective arrow to the Moon Stag.');
  }

  isComplete(): boolean {
    return this.step === 'complete' || !this.active;
  }

  private readonly advance = (step: Exclude<TutorialStep, 'move' | 'complete'>): void => {
    this.step = step;
    this.message.setText(TUTORIAL_TEXT[step]);
    this.setAlpha(0.45);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 180,
    });
  };

  private readonly finish = (text: string): void => {
    this.step = 'complete';
    this.message.setText(text);
    this.onComplete();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 1100,
      duration: 400,
      onComplete: () => this.destroy(),
    });
  };
}
