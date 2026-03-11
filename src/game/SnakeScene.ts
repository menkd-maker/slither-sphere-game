import Phaser from 'phaser';
import { Howl } from 'howler';

const GRID_SIZE = 20;
const INITIAL_SNAKE_SPEED = 180;
const GAME_SIZE = 400;

export class SnakeScene extends Phaser.Scene {
  private snake: Phaser.GameObjects.Rectangle[] = [];
  private food: Phaser.GameObjects.Arc | null = null;
  private direction: { x: number; y: number } = { x: 1, y: 0 };
  private nextDirection: { x: number; y: number } = { x: 1, y: 0 };
  private score: number = 0;
  private moveTimer: number = 0;
  private isAlive: boolean = false;
  private moveInterval: number = INITIAL_SNAKE_SPEED;
  
  private eatSound!: Howl;
  private deathSound!: Howl;
  private isMuted: boolean = localStorage.getItem('snake-muted') === 'true';

  constructor() {
    super('SnakeScene');
  }

  init() {
    this.eatSound = new Howl({
      src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'],
      volume: 0.3
    });
    this.deathSound = new Howl({
      src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'],
      volume: 0.4
    });
  }

  create() {
    this.setupListeners();
    this.cameras.main.setBackgroundColor('rgba(17, 24, 39, 0)');
    this.createGrid();
  }

  createGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1f2937, 0.4);
    for (let x = 0; x <= GAME_SIZE; x += GRID_SIZE) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, GAME_SIZE);
    }
    for (let y = 0; y <= GAME_SIZE; y += GRID_SIZE) {
      graphics.moveTo(0, y);
      graphics.lineTo(GAME_SIZE, y);
    }
    graphics.strokePath();
  }

  setupListeners() {
    // Custom events from React UI
    const startGameHandler = () => this.resetGame();
    const toggleMuteHandler = (e: any) => { this.isMuted = e.detail.isMuted; };
    const moveSnakeHandler = (e: any) => { this.handleInput(e.detail.direction); };

    window.addEventListener('startGame', startGameHandler);
    window.addEventListener('toggleMute', toggleMuteHandler);
    window.addEventListener('moveSnake', moveSnakeHandler);

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W': this.handleInput('UP'); break;
        case 'ArrowDown':
        case 's':
        case 'S': this.handleInput('DOWN'); break;
        case 'ArrowLeft':
        case 'a':
        case 'A': this.handleInput('LEFT'); break;
        case 'ArrowRight':
        case 'd':
        case 'D': this.handleInput('RIGHT'); break;
      }
    });

    this.events.on('destroy', () => {
      window.removeEventListener('startGame', startGameHandler);
      window.removeEventListener('toggleMute', toggleMuteHandler);
      window.removeEventListener('moveSnake', moveSnakeHandler);
    });
  }

  handleInput(dir: string) {
    if (!this.isAlive) return;
    if (dir === 'UP' && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
    else if (dir === 'DOWN' && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
    else if (dir === 'LEFT' && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
    else if (dir === 'RIGHT' && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
  }

  resetGame() {
    this.snake.forEach(segment => segment.destroy());
    this.snake = [];
    if (this.food) this.food.destroy();

    this.score = 0;
    this.moveInterval = INITIAL_SNAKE_SPEED;
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.isAlive = true;
    this.moveTimer = 0;

    // Head
    const headX = 10 * GRID_SIZE + GRID_SIZE / 2;
    const headY = 10 * GRID_SIZE + GRID_SIZE / 2;
    
    for (let i = 0; i < 3; i++) {
      const segment = this.add.rectangle(
        headX - (i * GRID_SIZE),
        headY,
        GRID_SIZE - 2,
        GRID_SIZE - 2,
        0x10b981
      ).setOrigin(0.5);
      
      if (i === 0) segment.setFillStyle(0x34d399);
      this.snake.push(segment);
    }

    this.spawnFood();
  }

  spawnFood() {
    if (this.food) this.food.destroy();

    let x, y;
    let collision;
    do {
      collision = false;
      const cols = GAME_SIZE / GRID_SIZE;
      const rows = GAME_SIZE / GRID_SIZE;
      x = Math.floor(Math.random() * cols) * GRID_SIZE + GRID_SIZE / 2;
      y = Math.floor(Math.random() * rows) * GRID_SIZE + GRID_SIZE / 2;

      for (const segment of this.snake) {
        if (segment.x === x && segment.y === y) {
          collision = true;
          break;
        }
      }
    } while (collision);

    this.food = this.add.circle(x, y, (GRID_SIZE / 2) - 2, 0xfbbf24)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xd97706);
    
    this.tweens.add({
      targets: this.food,
      scale: 1.25,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Cubic.easeInOut'
    });
  }

  update(time: number, delta: number) {
    if (!this.isAlive) return;

    this.moveTimer += delta;

    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.moveSnake();
    }
  }

  moveSnake() {
    this.direction = { ...this.nextDirection };

    const head = this.snake[0];
    const newX = head.x + this.direction.x * GRID_SIZE;
    const newY = head.y + this.direction.y * GRID_SIZE;

    // Wall Collision
    if (newX < 0 || newX > GAME_SIZE || newY < 0 || newY > GAME_SIZE) {
      this.gameOver();
      return;
    }

    // Self Collision
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === newX && this.snake[i].y === newY) {
        this.gameOver();
        return;
      }
    }

    // Check Food
    const ateFood = this.food && this.food.x === newX && this.food.y === newY;

    if (ateFood) {
      this.score += 10;
      if (!this.isMuted) this.eatSound.play();
      window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: { score: this.score } }));
      
      // Grow: Add new head, keep tail
      const newHead = this.add.rectangle(newX, newY, GRID_SIZE - 2, GRID_SIZE - 2, 0x34d399).setOrigin(0.5);
      this.snake.unshift(newHead);
      
      this.spawnFood();
      // Speed up
      this.moveInterval = Math.max(60, INITIAL_SNAKE_SPEED - Math.floor(this.score / 20) * 8);
    } else {
      // Normal move: move tail to head
      const tail = this.snake.pop()!;
      tail.setPosition(newX, newY);
      this.snake.unshift(tail);
    }

    // Refresh colors
    this.snake.forEach((seg, i) => {
      seg.setFillStyle(i === 0 ? 0x34d399 : 0x10b981);
    });
  }

  gameOver() {
    if (!this.isAlive) return;
    this.isAlive = false;
    if (!this.isMuted) this.deathSound.play();
    window.dispatchEvent(new CustomEvent('gameOver'));

    this.cameras.main.shake(300, 0.015);
    
    this.snake.forEach(seg => {
      seg.setFillStyle(0xef4444);
      this.tweens.add({
        targets: seg,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: 2
      });
    });
  }
}