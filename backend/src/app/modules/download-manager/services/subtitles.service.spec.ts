import { Test, TestingModule } from '@nestjs/testing';
import { SubtitlesLanguagesInSeasonEpisodeFoldersOptions, SubtitlesService } from './subtitles.service';
import { Volume } from 'memfs';

describe('SubtitlesService', () => {
  let service: SubtitlesService;
  
  const defaultOptions: SubtitlesLanguagesInSeasonEpisodeFoldersOptions = {
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
    it('should return correct file plan for single language subtitle', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content\nwith multiple lines',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { 
          from: '/showS01E01/1_English.srt', 
          to: '/showS01E01.en.srt', 
          opType: 'move' 
        },
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

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E01/2_Greek.srt', to: '/showS01E01.el.srt', opType: 'move' },
      ]);
    });

    it('should handle multiple subtitles in same language with proper sorting', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'short',
          '2_English.srt': 'medium length subtitle content',
          '3_English.srt': 'this is the longest subtitle content with many lines\nand more content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E01/3_English.srt', to: '/showS01E01.en.sdh.srt', opType: 'move' },
        { from: '/showS01E01/2_English.srt', to: '/showS01E01.en.forced.srt', opType: 'move' },
      ]);
    });

    it('should handle more than 3 subtitles with numbered suffixes', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'short',
          '2_English.srt': 'medium',
          '3_English.srt': 'longer content',
          '4_English.srt': 'this is the longest subtitle content with many lines\nand more content',
          '5_English.srt': 'another subtitle',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      // After sorting by line count: 1 (shortest), 2, 3, 5, 4 (longest)
      // Processing: 1 -> .srt, 4 -> .sdh.srt, 5 -> .forced.srt, remaining: 2, 3
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E01/4_English.srt', to: '/showS01E01.en.sdh.srt', opType: 'move' },
        { from: '/showS01E01/5_English.srt', to: '/showS01E01.en.forced.srt', opType: 'move' },
        { from: '/showS01E01/2_English.srt', to: '/showS01E01.en.0.srt', opType: 'move' },
        { from: '/showS01E01/3_English.srt', to: '/showS01E01.en.1.srt', opType: 'move' },
      ]);
    });

    it('should return empty array when no video files found', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([]);
    });

    it('should return empty array when no subtitle folder found', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([]);
    });

    it('should handle multiple video files with their respective subtitles', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E02.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
        },
        '/showS01E02': {
          '1_English.srt': 'subtitle content',
          '2_Greek.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
        { from: '/showS01E02/1_English.srt', to: '/showS01E02.en.srt', opType: 'move' },
        { from: '/showS01E02/2_Greek.srt', to: '/showS01E02.el.srt', opType: 'move' },
      ]);
    });

    it('should ignore non-srt files in subtitle folders', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
          '1_English.txt': 'text file',
          '1_English.vtt': 'vtt file',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
      ]);
    });

    it('should handle unrecognized language files', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mkv': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
          '1_Spanish.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      // Only English should be processed, Spanish should be ignored
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
      ]);
    });

    it('should handle different video file extensions', () => {
      const volume = Volume.fromNestedJSON({
        '/showS01E01.mp4': 'video content',
        '/showS01E01': {
          '1_English.srt': 'subtitle content',
        },
      });

      const result = service.subtitlesLanguagesInSeasonEpisodeFolders(volume, defaultOptions);
      
      expect(result).toEqual([
        { from: '/showS01E01/1_English.srt', to: '/showS01E01.en.srt', opType: 'move' },
      ]);
    });
  });
});
