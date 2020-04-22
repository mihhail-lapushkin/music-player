import BezierEasing from 'bezier-easing';
import EventEmitter from 'eventemitter3';
import gsap from 'gsap';
import _ from 'lodash';

const gray = value => rgb(value, value, value);
const rgb = (r, g, b) => 'rgb(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ')';

const swiftEnter = BezierEasing(0.65, 0, 0.05, 1);
const swiftExit = BezierEasing(0.65, 0, 0.1, 1);

const PI2 = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
const STROKE_COLOR = 189;
const BUTTON_COLOR = 66;
const BUTTON_HOVER_COLOR = 33;
const FREQUENCY_DATA_MAX_VALUE = 256;
const BUTTON_CIRCLE_RADIUS = 0.1;
const EXPANDED_RADIUS = 0.5;
const HALF_EXPANDED_RADIUS = EXPANDED_RADIUS / 2;
const TWEEN_DURATION = 0.8;
const BUTTON_TWEEN_DURATION = 0.5;

export default class PlayerView {

  constructor(selector) {
    this.rootElement = document.querySelector(selector);
    this.canvasElement = this.rootElement.querySelector('canvas');
    this.canvasContext = this.canvasElement.getContext('2d');
    this.emitter = new EventEmitter();

    this.canvasSize = this.canvasElement.width = this.canvasElement.height = parseInt(window.getComputedStyle(this.rootElement).width);
    this.canvasCenter = this.canvasSize / 2;

    this.animationSpeed = 1;
    this.mouseOverButton = false;
    this.expanded = false;
    this.expandInterrupted = false;
    this.tweenedProps = {
      buttonColor: BUTTON_COLOR,
      loadedPercent: 0,
      expandPercent: 0,
      buttonMorphPercent: 0
    };

    const baseImage = new Image();
    baseImage.src = `${window.musicPlayer_resourcesRoot || ''}base.jpg`;
    baseImage.addEventListener('load', () => {
      this.baseImageFill = this.canvasContext.createPattern(baseImage, 'no-repeat');
    });
    const topImage = new Image();
    topImage.src = `${window.musicPlayer_resourcesRoot || ''}top.jpg`;
    topImage.addEventListener('load', () => {
      this.topImageFill = this.canvasContext.createPattern(topImage, 'no-repeat');
    });

    this.canvasElement.addEventListener('click', this.handleCanvasClick.bind(this));
    this.canvasElement.addEventListener('mouseenter', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mouseleave', this.handleMouseMove.bind(this));
  }

  setAnimationSpeed(value) {
    this.animationSpeed = value;
  }

  onPlayButtonPress(listener) {
    this.emitter.on('play', listener);
  }

  onPauseButtonPress(listener) {
    this.emitter.on('pause', listener);
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
      duration: TWEEN_DURATION * this.animationSpeed,
      ease: this.expanded ? swiftExit : swiftEnter
    });

    this.buttonMorphTween = gsap.to(this.tweenedProps, {
      buttonMorphPercent: this.expanded ? 0 : 1,
      duration: BUTTON_TWEEN_DURATION * this.animationSpeed,
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

    return Math.sqrt(centerOffsetX * centerOffsetX + centerOffsetY * centerOffsetY) <= BUTTON_CIRCLE_RADIUS * this.canvasSize;
  }

  handleMouseMove(e) {
    const mouseInside = this.isMouseInsideButton(e);

    if (mouseInside === !this.mouseOverButton) {
      this.mouseOverButton = mouseInside;

      gsap.to(this.tweenedProps, {
        duration: BUTTON_TWEEN_DURATION,
        buttonColor: mouseInside ? BUTTON_HOVER_COLOR : BUTTON_COLOR,
        ease: mouseInside ? swiftEnter : swiftExit
      });

      if (mouseInside) {
        this.rootElement.classList.add('pointer-cursor');
      } else {
        this.rootElement.classList.remove('pointer-cursor');
      }
    }
  }

  draw(frequencyData) {
    this.canvasContext.clearRect(0, 0, this.canvasSize, this.canvasSize);
    this.canvasContext.lineWidth = 1;
    this.canvasContext.strokeStyle = gray(STROKE_COLOR);

    const currentRadiusPercent = BUTTON_CIRCLE_RADIUS + (EXPANDED_RADIUS - BUTTON_CIRCLE_RADIUS) * this.tweenedProps.expandPercent;
    const currentRadius = currentRadiusPercent * this.canvasSize;
    const maxValuePercent = _.max(frequencyData) / FREQUENCY_DATA_MAX_VALUE;
    const maxAllowedPercent = currentRadiusPercent / HALF_EXPANDED_RADIUS - 1;

    this.canvasContext.fillStyle = currentRadiusPercent >= HALF_EXPANDED_RADIUS / 2 ? this.baseImageFill : 'white';

    if (currentRadiusPercent < HALF_EXPANDED_RADIUS) {
      this.canvasContext.beginPath();
      this.canvasContext.arc(this.canvasCenter, this.canvasCenter, currentRadius, 0, PI2);
      this.canvasContext.fill();
      this.canvasContext.stroke();
      this.canvasContext.closePath();
    }

    if (currentRadiusPercent >= HALF_EXPANDED_RADIUS) {
      this.drawFrequencyData(frequencyData, maxValuePercent, maxAllowedPercent);
      this.canvasContext.fillStyle = this.topImageFill;
      this.canvasContext.globalAlpha = Math.max((Math.pow(_.sum(frequencyData) / (frequencyData.length * FREQUENCY_DATA_MAX_VALUE) + 0.5, 4) - 0.5), 0);
      this.drawFrequencyData(frequencyData, maxValuePercent, maxAllowedPercent);
      this.canvasContext.globalAlpha = 1;
      this.canvasContext.stroke();
    }

    this.canvasContext.fillStyle = 'white';

    if (currentRadiusPercent >= HALF_EXPANDED_RADIUS / 2) {
      this.canvasContext.beginPath();

      frequencyData.forEach((dataValue, i) => {
        const theta1 = PI2 * i / frequencyData.length;
        const theta2 = PI2 * (i + 1) / frequencyData.length;
        const radiusPercent = HALF_EXPANDED_RADIUS * (1 + -0.5 * Math.max(dataValue / FREQUENCY_DATA_MAX_VALUE, 2 - currentRadiusPercent / (HALF_EXPANDED_RADIUS / 2)));
        const radius = Math.floor(radiusPercent * this.canvasSize);

        this.canvasContext.arc(this.canvasCenter, this.canvasCenter, radius, theta1, theta2);
      });

      this.canvasContext.closePath();
      this.canvasContext.fill();
      this.canvasContext.stroke();
    }

    this.drawButton();
  }

  drawFrequencyData(frequencyData, maxValuePercent, maxAllowedPercent) {
    this.canvasContext.beginPath();

    frequencyData.forEach((dataValue, i) => {
      const theta1 = PI2 * i / frequencyData.length;
      const theta2 = PI2 * (i + 1) / frequencyData.length;
      const radiusPercent = HALF_EXPANDED_RADIUS * (1 + Math.min(dataValue / FREQUENCY_DATA_MAX_VALUE, maxAllowedPercent * maxValuePercent));
      const radius = Math.floor(radiusPercent * this.canvasSize);

      this.canvasContext.arc(this.canvasCenter, this.canvasCenter, radius, theta1, theta2);
    });

    this.canvasContext.closePath();
    this.canvasContext.fill();
  }

  drawButton() {
    const getRotatedMatrix = rad => {
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

    const getRotation = () => {
      if (this.expanded && this.expandInterrupted || !this.expanded && !this.expandInterrupted) {
        return getRotatedMatrix(HALF_PI * (4 - this.tweenedProps.buttonMorphPercent));
      }

      return getRotatedMatrix(HALF_PI * this.tweenedProps.buttonMorphPercent);
    };

    const rotation = getRotation();
    const morphPercent = this.tweenedProps.buttonMorphPercent;

    this.canvasContext.setTransform(rotation[0], rotation[1], rotation[2], rotation[3], this.canvasCenter, this.canvasCenter);
    this.canvasContext.fillStyle = gray(this.tweenedProps.buttonColor);

    const playButtonRadius = Math.floor(BUTTON_CIRCLE_RADIUS / GOLDEN_RATIO * this.canvasSize);
    const x1 = -0.5 * playButtonRadius;
    const y1 = Math.sin(-PI2 / 3) * playButtonRadius;
    const x2 = -0.5 * playButtonRadius;
    const y2 = Math.sin(PI2 / 3) * playButtonRadius;
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
