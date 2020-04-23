import range from 'array-range';
import gsap from 'gsap';
import _ from 'lodash';
import shuffle from 'shuffle-array';

import * as player from './player';
import PlayerView from './PlayerView';
import SliderView from './SliderView';
import ToggleBarView from './ToggleBarView';

let frequenciesOrder;
let playerUi;
let positionSlider;
let volumeSlider;
let playerAnimationSpeedSlider;
let songToggleBar;
let songIndex = 0;

export const init = () => {
  player.init();
  playerUi = new PlayerView('#player');
  positionSlider = new SliderView('#position-slider', 0);
  volumeSlider = new SliderView('#volume-slider', player.getVolume());
  playerAnimationSpeedSlider = new SliderView('#player-animation-speed-slider', 1);
  songToggleBar = new ToggleBarView('#song-toggle-bar', songIndex);

  const updatePlayerVolumeFromSlider = () => {
    player.setVolume(volumeSlider.getPosition());
  };

  const updatePlayerAnimationSpeedFromSlider = () => {
    playerUi.setAnimationSpeed(1 / Math.max(0.01, playerAnimationSpeedSlider.getPosition()));
  };

  playerUi.onPlayButtonPress(() => {
    if (!player.isPlaying()) {
      player.play();
      [ positionSlider, volumeSlider, playerAnimationSpeedSlider, songToggleBar ].forEach(view => view.setVisible(true));
    }
  });
  playerUi.onPauseButtonPress(() => {
    if (player.isPlaying()) {
      player.pause();
      [ positionSlider, volumeSlider, playerAnimationSpeedSlider, songToggleBar ].forEach(view => view.setVisible(false));
    }
  });

  player.onPlayProgress(positionSlider.setPosition);
  positionSlider.onDragStart(() => {
    player.pause();
  });
  positionSlider.onDragEnd(() => {
    player.setPosition(positionSlider.getPosition());
  });
  positionSlider.onJump(() => {
    player.pause();
    player.setPosition(positionSlider.getPosition());
  });

  volumeSlider.onDragProgress(updatePlayerVolumeFromSlider);
  volumeSlider.onJump(updatePlayerVolumeFromSlider);

  playerAnimationSpeedSlider.onDragProgress(updatePlayerAnimationSpeedFromSlider);
  playerAnimationSpeedSlider.onJump(updatePlayerAnimationSpeedFromSlider);

  songToggleBar.onButtonClick(index => {
    songIndex = index;
    player.stop();
    positionSlider.setInactive(true);
    playerUi.setInactive(true);
    loadSong(index, data => {
      player.setSong(data, () => {
        if (songIndex === index) {
          player.play();
          positionSlider.setInactive(false);
          playerUi.setInactive(false);
        }
      });
    });
  });

  loadSong(songIndex, data => {
    player.setSong(data, () => {
      document.querySelector('#viewport').classList.remove('loading');
      playerUi.setInactive(false);
      playerUi.setSpinner(false);
    });
  });

  frequenciesOrder = shuffle(range(player.getFrequencyData().length));

  gsap.ticker.add(() => {
    positionSlider.setPosition(player.getPosition());
    playerUi.draw(_(player.getFrequencyData())
      .map((data, i) => [ data, i ])
      .sortBy(([ _, i ]) => frequenciesOrder[i])
      .map(([ data ]) => data)
      .value());
  });
};

export const loadSong = (i, callback) => {
  const xhr = new XMLHttpRequest();
  xhr.responseType = 'arraybuffer';
  xhr.addEventListener('load', () => callback(xhr.response));
  xhr.open('GET', `${window.musicPlayer_resourcesRoot || ''}song${i + 1}.mp3`, true);
  xhr.send(null);
};
