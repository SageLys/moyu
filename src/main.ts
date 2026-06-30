import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/constants';
import { validateConfigReferences } from './core/validation';

// 开发构建：启动时跑一次配置引用自检，发现问题打印到控制台（不阻断运行）。
if (import.meta.env.DEV) {
  const configErrors = validateConfigReferences();
  if (configErrors.length > 0) {
    console.error(`[config] ${configErrors.length} 处配置引用错误:`, configErrors);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#9AAAB5',
  scene: [PreloadScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
