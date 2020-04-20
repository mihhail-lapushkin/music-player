import EventEmitter from 'eventemitter3';

export default class ToggleBarView {

  constructor(selector, initialActive) {
    this.rootElement = document.querySelector(selector);
    this.buttons = Array.from(this.rootElement.querySelectorAll('button'));
    this.emitter = new EventEmitter();

    this.setActiveIndex(initialActive);

    if ('ontouchstart' in document.documentElement) {
      this.rootElement.classList.add('touch');
    }

    this.buttons.forEach((button, i) => {
      button.addEventListener('click', () => {
        this.setActiveIndex(i);
        this.emitter.emit('click', i);
      });
    });
  }

  onButtonClick(listener) {
    this.emitter.on('click', listener);
  }

  setActiveIndex(value) {
    this.buttons.forEach(button => {
      button.classList.remove('active');
    });

    this.buttons[value].classList.add('active');
  }

  setVisible(value) {
    if (value) {
      this.rootElement.classList.add('visible');
    } else {
      this.rootElement.classList.remove('visible');
    }
  }
}
