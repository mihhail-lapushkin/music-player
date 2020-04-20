import BezierEasing from 'bezier-easing';
import EventEmitter from 'eventemitter3';
import gsap from 'gsap';
import _ from 'lodash';

const gray = value => rgb(value, value, value);
const rgb = (r, g, b) => 'rgb(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ')';

const goldenRatio = (1 + Math.sqrt(5)) / 2;
const swiftEnter = BezierEasing(0.65, 0, 0.05, 1);
const swiftExit = BezierEasing(0.65, 0, 0.1, 1);

const buttonCircleRadius = 0.1;
const expandedRadius = 0.5;
const halfExpandedRadius = expandedRadius / 2;

export default class PlayerView {

  constructor(selector) {
    this.rootElement = document.querySelector(selector);
    this.canvasElement = this.rootElement.querySelector('canvas');
    this.canvasContext = this.canvasElement.getContext('2d');
    this.emitter = new EventEmitter();

    this.canvasSize = this.canvasElement.width = this.canvasElement.height = parseInt(window.getComputedStyle(this.rootElement).width);
    this.canvasCenter = this.canvasSize / 2;

    this.expandSpeed = 1;
    this.mouseOverButton = false;
    this.expanded = false;
    this.expandInterrupted = false;
    this.tweenedProps = {
      buttonColor: 66,
      loadedPercent: 0,
      expandPercent: 0,
      buttonMorphPercent: 0
    };

    const baseImage = new Image();
    baseImage.src = `${window.musicPlayer_resourcesRoot || ''}base.jpg`;
    baseImage.addEventListener('load', () => {
      this.baseImageFill = this.canvasContext.createPattern(baseImage, 'no-repeat');
      this.handleImageLoad();
    });
    const topImage = new Image();
    topImage.src = `${window.musicPlayer_resourcesRoot || ''}top.jpg`;
    topImage.addEventListener('load', () => {
      this.topImageFill = this.canvasContext.createPattern(topImage, 'no-repeat');
      this.handleImageLoad();
    });

    this.canvasElement.addEventListener('click', this.handleCanvasClick.bind(this));
    this.canvasElement.addEventListener('mouseenter', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mouseleave', this.handleMouseMove.bind(this));
  }

  setExpandSpeed(value) {
    this.expandSpeed = value;
  }

  onPlayButtonPress(listener) {
    this.emitter.on('play', listener);
  }

  onPauseButtonPress(listener) {
    this.emitter.on('pause', listener);
  }

  handleImageLoad() {
    if (this.baseImageFill && this.topImageFill) {
      this.rootElement.classList.remove('hidden');
    }
  }

  handleCanvasClick(e) {
    if (!this.isMouseInsideButton(e)) {
      return;
    }

    if (this.buttonMorphTween && this.buttonMorphTween.progress() < 1) {
      this.expandInterrupted = !this.expandInterrupted;
    } else {
      this.expandInterrupted = false;
    }

    gsap.to(this.tweenedProps, {
      expandPercent: this.expanded ? 0 : 1,
      duration: 0.8 * this.expandSpeed,
      ease: this.expanded ? swiftExit : swiftEnter
    });

    this.buttonMorphTween = gsap.to(this.tweenedProps, {
      buttonMorphPercent: this.expanded ? 0 : 1,
      duration: 0.5 * this.expandSpeed,
      ease: this.expanded ? swiftExit : swiftEnter
    });

    this.emitter.emit(this.expanded ? 'pause' : 'play');

    this.expanded = !this.expanded;
  }

  isMouseInsideButton(e) {
    if (e.type === 'mouseleave') {
      return false;
    }

    const centerOffsetX = Math.abs(e.offsetX - this.canvasCenter);
    const centerOffsetY = Math.abs(e.offsetY - this.canvasCenter);

    return Math.sqrt(centerOffsetX * centerOffsetX + centerOffsetY * centerOffsetY) <= buttonCircleRadius * this.canvasSize;
  }

  handleMouseMove(e) {
    if (this.isMouseInsideButton(e)) {
      if (!this.mouseOverButton) {
        this.mouseOverButton = true;

        gsap.to(this.tweenedProps, {
          duration: 0.5,
          buttonColor: 33,
          ease: swiftEnter
        });

        this.rootElement.classList.add('pointer-cursor');
      }
    } else {
      if (this.mouseOverButton) {
        this.mouseOverButton = false;

        gsap.to(this.tweenedProps, {
          duration: 0.5,
          buttonColor: 66,
          ease: swiftExit
        });

        this.rootElement.classList.remove('pointer-cursor');
      }
    }
  }

  draw(frequencies) {
    this.canvasContext.clearRect(0, 0, this.canvasSize, this.canvasSize);
    this.canvasContext.lineWidth = 1;
    this.canvasContext.strokeStyle = gray(189);

    const currentRadiusPercent = buttonCircleRadius + (expandedRadius - buttonCircleRadius) * this.tweenedProps.expandPercent;
    const currentRadius = currentRadiusPercent * this.canvasSize;
    const maxValuePercent = _.max(frequencies) / 256;
    const maxAllowedPercent = currentRadiusPercent / halfExpandedRadius - 1;

    this.canvasContext.fillStyle = currentRadiusPercent >= halfExpandedRadius / 2 ? this.baseImageFill : 'white';

    if (currentRadiusPercent < halfExpandedRadius) {
      this.canvasContext.beginPath();
      this.canvasContext.arc(this.canvasCenter, this.canvasCenter, currentRadius, 0, Math.PI * 2);
      this.canvasContext.fill();
      this.canvasContext.stroke();
      this.canvasContext.closePath();
    }

    if (currentRadiusPercent >= halfExpandedRadius) {
      this.drawFrequencies(frequencies, maxValuePercent, maxAllowedPercent, 1);
      this.canvasContext.fillStyle = this.topImageFill;
      this.canvasContext.globalAlpha = Math.max((Math.pow(_.sum(frequencies) / (frequencies.length * 256) + 0.5, 4) - 0.5), 0);
      this.drawFrequencies(frequencies, maxValuePercent, maxAllowedPercent, 1);
      this.canvasContext.globalAlpha = 1;
      this.canvasContext.stroke();
    }

    this.canvasContext.fillStyle = 'white';

    if (currentRadiusPercent >= halfExpandedRadius / 2) {
      this.canvasContext.beginPath();

      frequencies.forEach((frequency, i) => {
        const theta1 = Math.PI * 2 * i / frequencies.length;
        const theta2 = Math.PI * 2 * (i + 1) / frequencies.length;
        const radiusPercent = halfExpandedRadius * (1 + -0.5 * Math.max(frequency / 256, 2 - currentRadiusPercent / (halfExpandedRadius / 2)));
        const radius = Math.floor(radiusPercent * this.canvasSize);

        this.canvasContext.arc(this.canvasCenter, this.canvasCenter, radius, theta1, theta2);
      });

      this.canvasContext.closePath();
      this.canvasContext.fill();
      this.canvasContext.stroke();
    }

    this.drawButton();
  }

  drawFrequencies(frequencies, maxValuePercent, maxAllowedPercent, expandAmountAndDirection) {
    this.canvasContext.beginPath();

    frequencies.forEach((frequency, i) => {
      const theta1 = Math.PI * 2 * i / frequencies.length;
      const theta2 = Math.PI * 2 * (i + 1) / frequencies.length;
      const radiusPercent = halfExpandedRadius * (1 + expandAmountAndDirection * Math.min(frequency / 256, maxAllowedPercent * maxValuePercent));
      const radius = Math.floor(radiusPercent * this.canvasSize);

      this.canvasContext.arc(this.canvasCenter, this.canvasCenter, radius, theta1, theta2);
    });

    this.canvasContext.closePath();
    this.canvasContext.fill();
  }

  drawButton() {
    const rotatedMatrix = rad => {
      const matrix = [1, 0, 0, 1, 0, 0];
    
      const c = Math.cos(rad);
      const s = Math.sin(rad);
    
      const m11 = matrix[0] * c + matrix[2] * s;
      const m12 = matrix[1] * c + matrix[3] * s;
      const m21 = matrix[0] * -s + matrix[2] * c;
      const m22 = matrix[1] * -s + matrix[3] * c;
    
      matrix[0] = m11;
      matrix[1] = m12;
      matrix[2] = m21;
      matrix[3] = m22;
    
      return matrix;
    };

    let rotation;
    const morphPercent = this.tweenedProps.buttonMorphPercent;

    if (this.expanded) {
      if (this.expandInterrupted) {
        rotation = rotatedMatrix(Math.PI / 2 * (4 - morphPercent));
      } else {
        rotation = rotatedMatrix(Math.PI / 2 * morphPercent);
      }
    } else {
      if (this.expandInterrupted) {
        rotation = rotatedMatrix(Math.PI / 2 * morphPercent);
      } else {
        rotation = rotatedMatrix(Math.PI / 2 * (4 - morphPercent));
      }
    }

    this.canvasContext.setTransform(rotation[0], rotation[1], rotation[2], rotation[3], this.canvasCenter, this.canvasCenter);
    this.canvasContext.fillStyle = gray(this.tweenedProps.buttonColor);

    const playButtonRadius = Math.floor(buttonCircleRadius / goldenRatio * this.canvasSize);
    const x1 = -0.5 * playButtonRadius;
    const y1 = Math.sin(-Math.PI * 2 / 3) * playButtonRadius;
    const x2 = -0.5 * playButtonRadius;
    const y2 = Math.sin(Math.PI * 2 / 3) * playButtonRadius;
    const x3 = 1 * playButtonRadius;
    const y3 = 0;
    const xd = morphPercent * playButtonRadius * 0.25;

    if (morphPercent === 0) {
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(x1, y1);
      this.canvasContext.lineTo(x2, y2);
      this.canvasContext.lineTo(x3, y3);
      this.canvasContext.closePath();
      this.canvasContext.fill();
    } else if (morphPercent > 0) {
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(x1 - xd, y1);
      this.canvasContext.lineTo(x1 - xd, y3 - morphPercent * 2);
      this.canvasContext.lineTo(x3 - xd, y3 - morphPercent * 2);
      this.canvasContext.lineTo(x3 - xd, y3 - morphPercent * (y3 - y1));
      this.canvasContext.closePath();
      this.canvasContext.fill();

      this.canvasContext.beginPath();
      this.canvasContext.moveTo(x2 - xd, y2);
      this.canvasContext.lineTo(x2 - xd, y3 + morphPercent * 2);
      this.canvasContext.lineTo(x3 - xd, y3 + morphPercent * 2);
      this.canvasContext.lineTo(x3 - xd, y3 + morphPercent * (y2 - y3));
      this.canvasContext.closePath();
      this.canvasContext.fill();
    }

    this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
  }
}
