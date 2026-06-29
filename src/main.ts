import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#f3ead7',
  scene: [BootScene],
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
