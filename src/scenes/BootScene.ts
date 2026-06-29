import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'Pretend Working Demo - Preproduction Shell', {
        color: '#2b2b2b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
      })
      .setOrigin(0.5);
  }
}
