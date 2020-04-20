import BezierEasing from 'bezier-easing';
import EventEmitter from 'eventemitter3';
import gsap from 'gsap';

let emitter;
let audioContext;
let audioNode;
let gainNode;
let analyserNode;
let byteFrequencyData;
let byteTimeDomainData;
let audioBuffer;
let volume = 1.0;
let fadeVolume = { value: 1.0 };
let fadeVolumeTween;
let playTime;
let pauseTime = 0;

export const init = () => {
  emitter = new EventEmitter();
  audioContext = new AudioContext();
  gainNode = audioContext.createGain();
  analyserNode = audioContext.createAnalyser();
  analyserNode.minDecibels = -170;
  analyserNode.maxDecibels = 0;
  analyserNode.smoothingTimeConstant = 0.9;
  analyserNode.fftSize = 256;

  gainNode.connect(analyserNode);
  analyserNode.connect(audioContext.destination);

  byteFrequencyData = new Uint8Array(analyserNode.fftSize / 2);
  byteTimeDomainData = new Uint8Array(analyserNode.fftSize / 2);
};

export const onPlayProgress = listener => emitter.on('play.progress', listener);
export const onPlayEnd      = listener => emitter.on('play.done', listener);

export const getFrequencyData = () => {
  if (audioNode) {
    analyserNode.getByteFrequencyData(byteFrequencyData);
  }

  return byteFrequencyData;
};

export const getTimeDomainData = () => {
  if (audioNode) {
    analyserNode.getByteTimeDomainData(byteTimeDomainData)
  }

  return byteTimeDomainData;
};

export const getPosition = () => {
  if (!audioBuffer) {
    return 0;
  }

  return Math.min((isPlaying() ? getTime() : pauseTime) / audioBuffer.duration, 1);
};

export const setPosition = value => {
  pause();
  pauseTime = value * audioBuffer.duration;
  startPlaying();
};

export const isPlaying = () => !!audioNode;

export const getVolume = () => volume;

export const setVolume = value => {
  volume = value;
  updateGain();
};

export const setSong = (audioData, callback) => {
  stop();

  audioContext.decodeAudioData(audioData, buffer => {
    audioBuffer = buffer;
    callback();
  });
};

export const play = () => {
  fadeIn();
  startPlaying();
};

export const stop = () => {
  pause();
  pauseTime = 0;
};

export const pause = () => {
  if (audioNode) {
    pauseTime = getTime();
    audioNode.stop(0);
    audioNode.disconnect(0);
    audioNode = undefined;
  }

  if (fadeVolumeTween) {
    fadeVolumeTween.kill();
    fadeVolume = { value: 1.0 };
  }
};

const fadeIn = () => {
  gainNode.gain.value = 0;
  fadeVolume = { value: 0 };
  fadeVolumeTween = gsap.to(fadeVolume, {
    duration: 1,
    value: 1,
    ease: BezierEasing(0.65, 0, 0.05, 1),
    onUpdate: updateGain
  });
};

const startPlaying = () => {
  if (pauseTime > audioBuffer.duration) {
    pauseTime = 0;
  }

  audioNode = audioContext.createBufferSource();
  audioNode.buffer = audioBuffer;
  audioNode.connect(gainNode);
  audioNode.start(0, pauseTime, audioBuffer.duration - pauseTime);
  playTime = audioContext.currentTime - pauseTime;
  updateGain();
};

const updateGain = () => {
  gainNode.gain.value = Math.pow(volume * fadeVolume.value, 3);
};

const getTime = () => audioContext.currentTime - playTime;
