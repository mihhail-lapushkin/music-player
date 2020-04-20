import EventEmitter from 'eventemitter3';

const getEventX = e => e.touches ? e.touches[0].clientX : e.clientX;

export default class SliderView {

  constructor(selector, initialPosition) {
    this.rootElement = document.querySelector(selector);
    this.barElement = this.rootElement.querySelector('.bar');
    this.barFillElement = this.rootElement.querySelector('.bar .fill');
    this.barHitArea = this.rootElement.querySelector('.bar-hit-area');
    this.knobElement = this.rootElement.querySelector('.knob');
    this.emitter = new EventEmitter();

    this.setPosition(initialPosition);

    if ('ontouchstart' in document.documentElement) {
      this.rootElement.classList.add('touch');
    }

    this.knobElement.addEventListener('mousedown', this.handleKnobPress.bind(this));
    this.knobElement.addEventListener('touchstart', this.handleKnobPress.bind(this));
    this.barHitArea.addEventListener('mouseup', this.handleBarRelease.bind(this));

    window.addEventListener('mouseup', this.handleGlobalRelease.bind(this));
    window.addEventListener('touchend', this.handleGlobalRelease.bind(this));
    window.addEventListener('mousemove', this.handleGlobalMove.bind(this));
    window.addEventListener('touchmove', this.handleGlobalMove.bind(this));
  }

  handleKnobPress(e) {
      this.setDragged(true);
      this.dragStartKnobPosition = this.getKnobLeft();
      this.dragStartX = getEventX(e);
      this.emitter.emit('drag.start');
  }

  handleBarRelease(e) {
      this.setKnobLeft(getEventX(e) - this.rootElement.getBoundingClientRect().left - this.getKnobSize() / 2);
      this.emitter.emit('jump');
  }

  handleGlobalRelease() {
    if (this.isDragged()) {
      this.setDragged(false);
      this.emitter.emit('drag.end');
    }
  }

  handleGlobalMove(e) {
    if (this.isDragged()) {
      this.setKnobLeft(this.dragStartKnobPosition + getEventX(e) - this.dragStartX);
      this.emitter.emit('drag.progress');
    }
  }

  onDragStart(listener) {
    this.emitter.on('drag.start', listener);
  }

  onDragEnd(listener) {
    this.emitter.on('drag.end', listener);
  }

  onDragProgress(listener) {
    this.emitter.on('drag.progress', listener);
  }

  onJump(listener) {
    this.emitter.on('jump', listener);
  }

  getPosition() {
    return this.getKnobLeft() / this.getBarWidth();
  }

  setPosition(value) {
    if (!this.isDragged()) {
      this.setKnobLeft(value * this.getBarWidth());
    }
  }

  getKnobLeft() {
    return parseInt(this.knobElement.style.left);
  }

  getBarWidth() {
    return parseInt(window.getComputedStyle(this.barElement).width);
  }

  getKnobSize() {
    return parseInt(window.getComputedStyle(this.knobElement).width);
  }

  isDragged() {
    return this.rootElement.classList.contains('dragged');
  }

  setDragged(value) {
    if (value) {
      this.rootElement.classList.add('dragged');
    } else {
      this.rootElement.classList.remove('dragged');
    }
  }

  setVisible(value) {
    if (value) {
      this.rootElement.classList.add('visible');
    } else {
      this.rootElement.classList.remove('visible');
    }
  }

  setInactive(value) {
    if (value) {
      this.rootElement.classList.add('inactive');
    } else {
      this.rootElement.classList.remove('inactive');
    }
  }

  setKnobLeft(value) {
    this.knobElement.style.left = this.barFillElement.style.width = `${Math.min(Math.max(value, 0), this.getBarWidth())}px`;
  }
}
