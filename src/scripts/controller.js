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
let expandSpeedSlider;
let songToggleBar;
let songIndex = 0;

export const init = () => {
  player.init();
  playerUi = new PlayerView('#player');
  positionSlider = new SliderView('#position-slider', 0);
  volumeSlider = new SliderView('#volume-slider', player.getVolume());
  expandSpeedSlider = new SliderView('#expand-speed-slider', 1);
  songToggleBar = new ToggleBarView('#song-toggle-bar', songIndex);

  const updatePlayerVolumeFromSlider = () => {
    player.setVolume(volumeSlider.getPosition());
  };

  const updateExpandSpeedFromSlider = () => {
    playerUi.setExpandSpeed(1 / Math.max(0.01, expandSpeedSlider.getPosition()));
  };

  playerUi.onPlayButtonPress(() => {
    if (!player.isPlaying()) {
      player.play();
      [ positionSlider, volumeSlider, expandSpeedSlider, songToggleBar ].forEach(view => view.setVisible(true));
    }
  });
  playerUi.onPauseButtonPress(() => {
    if (player.isPlaying()) {
      player.pause();
      [ positionSlider, volumeSlider, expandSpeedSlider, songToggleBar ].forEach(view => view.setVisible(false));
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

  expandSpeedSlider.onDragProgress(updateExpandSpeedFromSlider);
  expandSpeedSlider.onJump(updateExpandSpeedFromSlider);

  songToggleBar.onButtonClick(index => {
    songIndex = index;
    player.stop();
    positionSlider.setInactive(true);
    loadSong(index, data => {
      player.setSong(data, () => {
        if (songIndex === index) {
          player.play();
          positionSlider.setInactive(false);
        }
      });
    });
  });

  loadSong(songIndex, data => {
    player.setSong(data, () => {
      document.querySelector('#viewport').classList.remove('hidden');
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
