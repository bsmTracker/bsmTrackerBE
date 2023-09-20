import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as youtubesearchapi from 'youtube-search-api';
import { YoutubeTrack, PreviewYoutubeTrack } from './type/youtube.type';
const youtubedl = require('youtube-dl-exec');
const { URL, URLSearchParams } = require('url');

@Injectable()
export class YoutubeService {
  constructor() {}

  async searchTracks(keyword: string): Promise<PreviewYoutubeTrack[]> {
    const trackList = await youtubesearchapi.GetListByKeyword(
      keyword,
      [false],
      [10],
      [
        {
          type: 'video',
        },
      ],
    );
    return Promise.all(
      trackList.items
        .filter((item: any) => item.isLive !== true)
        .map((youtubeTrack: any) => {
          return this.parseTracksForSearch(youtubeTrack);
        })
        .sort(function (a: PreviewYoutubeTrack, b: PreviewYoutubeTrack) {
          if (a.duration_ms > b.duration_ms) {
            return 1;
          }
          if (a.duration_ms < b.duration_ms) {
            return -1;
          }
          return 0;
        }),
    );
  }

  parseTracksForSearch(youtubeTrack: any): PreviewYoutubeTrack {
    const durationStr = youtubeTrack.length.simpleText;
    const durationArr = durationStr.split(':');
    let p = 0;
    let totalSec = 0;
    for (let i = durationArr.length - 1; i >= 0; i--) {
      totalSec += durationArr[i] * 60 ** p;
      p += 1;
    }
    const duration_ms = totalSec * 1000;
    const image =
      youtubeTrack.thumbnail.thumbnails[
        youtubeTrack.thumbnail.thumbnails.length - 1
      ].url;
    const parsedYoutubeTrack: PreviewYoutubeTrack = {
      code: youtubeTrack.id,
      image,
      name: youtubeTrack.title,
      duration_ms,
      isLive: youtubeTrack.isLive,
    };
    return parsedYoutubeTrack;
  }

  async getDetailedYoutubeTrack(code: string): Promise<YoutubeTrack> {
    try {
      const playInfo = await youtubedl(
        'https://www.youtube.com/watch?v=' + code,
        {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
        },
      );
      console.log('something');
      if (!playInfo) return null;
      const playUri = playInfo?.requested_formats?.find((d: any) =>
        d.resolution.includes('audio'),
      )?.url;
      if (!playUri) {
        return null;
      }
      const playUriObj = new URL(playUri);
      const queryParams = new URLSearchParams(playUriObj.searchParams);
      const expireValue = queryParams.get('expire');
      const playUriExpire = new Date();
      playUriExpire.setTime(Number(expireValue) * 1000);
      console.log(playUriExpire.toLocaleString());
      const data: YoutubeTrack = {
        code,
        name: playInfo.title,
        duration_ms: playInfo.duration * 1000,
        isLive: playInfo.is_live,
        playUri: playInfo.requested_formats[1].url,
        image: playInfo.thumbnail,
        playUriExpire,
      };
      if (data.isLive === true) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  async getPlayUri(trackCode: string) {
    const playInfo = await youtubedl(
      'https://www.youtube.com/watch?v=' + trackCode,
      {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      },
    );
    return playInfo?.requested_formats?.[1]?.url;
  }
}
