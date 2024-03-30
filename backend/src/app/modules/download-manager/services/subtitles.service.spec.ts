import { Test, TestingModule } from '@nestjs/testing';
import { SubtitlesLanguagesInSeasonEpisodeFoldersOptions, SubtitlesService } from './subtitles.service';
import { Volume } from 'memfs';

describe('SubtitlesService', () => {
  let service: SubtitlesService;
  const opts: SubtitlesLanguagesInSeasonEpisodeFoldersOptions = {
    languages: [
      { lang: 'en', aliases: ['English', 'en', 'eng'] },
      { lang: 'el', aliases: ['Greek', 'el', 'gr', 'gre'] },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubtitlesService],
    }).compile();

    service = module.get<SubtitlesService>(SubtitlesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subtitlesLanguagesInSeasonEpisodeFolders', () => {
    it('should return correct file plan for single language', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, opts);
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
      ]);
    });

    it('should return correct file plan for multiple languages', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
          '2_Greek.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, opts);
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E01/2_Greek.srt', to: '/showS01E01.el.srt', opType: 'move' },
      ]);
    });

    it('should return correct file plan for multiple subtitles in same language', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
          '2_English.srt': 'subtitle content middle',
          '3_English.srt': 'subtitle content the longest',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, opts);
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E01/3_English.srt', to: '/showS01E01.en.sdh.srt', opType: 'move' },
        { from: '/showS01E01/2_English.srt', to: '/showS01E01.en.forced.srt', opType: 'move' },
      ]);
    });

    it('should return empty array if no subtitles found', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, opts);
      expect(result).toEqual([]);
    });
  });
});
