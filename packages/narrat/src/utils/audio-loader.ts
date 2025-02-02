import {
  audioConfig,
  audioFileConfig,
  getAssetUrl,
  getAudioFadeTimings,
} from '../config';
import { Howl, Howler } from 'howler';
import { warning } from './error-handling';
import { logger } from './logger';
import { useAudio } from '@/stores/audio-store';
import { AudioConfig, AudioFileConfig } from '@/config/audio-config';
import { timeout } from './promises';

export const howlerMap: {
  [key: string]: Howl;
} = {};

Howler.volume(0.5);

let audioTriggers: { [key: string]: string } = {};

export async function loadAudioAssets(config: AudioConfig): Promise<void[]> {
  logger.log(`Loading audio`);
  const loadingPromises: Array<Promise<void>> = [];
  Howler.volume(config.options.volume);
  for (const key in config.files) {
    const sound = config.files[key];
    if (!sound.src) {
      sound.src = sound.path!;
      if (!sound.path) {
        console.error(
          `Audio config for ${key} doesn't have any \`src\` value to find the file`,
        );
      }
      console.warn(
        'Using `path` for audio and musics is deprecated. Please replace `path` with `src` in your config file!',
      );
    }
    loadingPromises.push(loadAudio(key, config.files[key]));
  }
  if (config.audioTriggers) {
    audioTriggers = config.audioTriggers;
  }
  return Promise.all(loadingPromises);
}

export function audioEvent(event: string) {
  if (audioTriggers[event]) {
    useAudio().playChannel('sound', audioTriggers[event], 0);
  }
}

export async function loadAudio(
  key: string,
  config: AudioFileConfig,
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.log(`Loading audio ${config.src}`);
    const sound = new Howl({
      ...config,
      src: getAssetUrl(config.src!),
    });
    sound.load();
    howlerMap[key] = sound;
    resolve();
    // sound.once('load', () => {
    //   console.log(`Loaded audio ${path}`);
    //   resolve();
    // });
  });
}

export function stopHowlerById(musicKey: string, howlerId: number) {
  const audio = getAudio(musicKey);
  if (!audio) {
    warning(`Could not find music ${musicKey}`);
    return;
  }
  audio.stop(howlerId);
}

export function getAudio(key: string): Howl | undefined {
  return howlerMap[key];
}

export function calculateAudioVolume(
  channelVolume: number,
  audioVolume: number,
) {
  return channelVolume * audioVolume;
}
export function standalonePlayMusic(key: string) {
  const music = getAudio(key)!;
  const { fadeInTime } = getAudioFadeTimings(key);
  const id = music.play();
  const audioStore = useAudio();
  const volume = audioStore.audioVolume('music', key);
  music.fade(0, volume, fadeInTime, id);
  return id;
}

export async function standaloneStopMusic(key: string, id: number) {
  const audio = getAudio(key)!;
  const { fadeOutTime } = getAudioFadeTimings(key);
  audio.fade(audio.volume(id) as number, 0, fadeOutTime, id);
  await timeout(fadeOutTime);
  audio.stop(id);
}
