export type PreviewYoutubeTrack = {
  code: string;
  image: string;
  name: string;
  duration_ms: number;
  isLive: boolean;
};

export type YoutubeTrack = {
  code: string;
  image: string;
  name: string;
  duration_ms: number;
  isLive: boolean;
  playUri: string;
  playUriExpire: Date;
};
