import { Injectable } from '@nestjs/common';
import path from 'path';
import { Volume } from 'memfs/lib/volume';
import { findFileOrFolder } from '../../../helpers';

interface IFilePlan {
  from: string;
  to: string;
  opType: 'move' | 'copy';
}

interface ISubtitleFile {
  file: string;
  lang: string;
  lines: number;
}

export type SubtitlesLanguagesInSeasonEpisodeFoldersOptions = {
  languages: {
    lang: string;
    aliases: string[];
  }[];
};

@Injectable()
export class SubtitlesService {
  private readonly VIDEO_EXTENSIONS = ['.mkv', '.mp4'];
  private readonly SUBTITLE_EXTENSION = '.srt';

  /**
   * Processes RARBG subtitles structure and creates file plans for Plex-compatible organization.
   * 
   * Transforms this structure:
   *   showS01E01.mkv
   *   showS01E02.mkv
   *   Subs/Any-Depth/
   *     showS01E01/
   *       2_English.srt
   *       3_English.srt
   *     showS01E02/
   *       3_English.srt
   *       4_English.srt
   * 
   * Into Plex-compatible structure with proper naming conventions.
   */
  subtitlesLanguagesInSeasonEpisodeFolders(
    volume: Volume, 
    opts: SubtitlesLanguagesInSeasonEpisodeFoldersOptions
  ): IFilePlan[] {
    const filePlans: IFilePlan[] = [];

    for (const file of volume.readdirSync('/')) {
      const videoFile = `/${file}`;
      
      if (!this.isVideoFile(volume, videoFile)) continue;

      const filename = path.basename(videoFile, path.extname(videoFile));
      const subtitleFolder = findFileOrFolder(volume, filename, 'folder');
      
      if (!subtitleFolder) continue;

      const subtitlePlans = this.processSubtitleFolder(volume, subtitleFolder, filename, opts);
      filePlans.push(...subtitlePlans);
    }

    return filePlans;
  }

  private isVideoFile(volume: Volume, filePath: string): boolean {
    try {
      const stat = volume.statSync(filePath);
      if (!stat.isFile()) return false;
      
      return this.VIDEO_EXTENSIONS.some(ext => filePath.endsWith(ext));
    } catch {
      return false;
    }
  }

  private processSubtitleFolder(
    volume: Volume,
    folderPath: string,
    filename: string,
    opts: SubtitlesLanguagesInSeasonEpisodeFoldersOptions
  ): IFilePlan[] {
    const filePlans: IFilePlan[] = [];
    const subtitlesByLanguage = this.collectSubtitlesByLanguage(volume, folderPath, opts);

    for (const [language, subtitles] of subtitlesByLanguage) {
      const sortedSubtitles = subtitles.sort((a, b) => a.lines - b.lines);
      const plans = this.createFilePlansForLanguage(filename, language, sortedSubtitles);
      filePlans.push(...plans);
    }

    return filePlans;
  }

  private collectSubtitlesByLanguage(
    volume: Volume,
    folderPath: string,
    opts: SubtitlesLanguagesInSeasonEpisodeFoldersOptions
  ): Map<string, ISubtitleFile[]> {
    const subtitlesByLanguage = new Map<string, ISubtitleFile[]>();

    for (const fileNode of volume.readdirSync(folderPath)) {
      const filePath = path.join(folderPath, fileNode as string);
      
      if (!filePath.endsWith(this.SUBTITLE_EXTENSION)) continue;

      const language = this.detectLanguage(filePath, opts.languages);
      if (!language) continue;

      const lineCount = this.countSubtitleLines(volume, filePath);
      const subtitleFile: ISubtitleFile = {
        file: filePath,
        lang: language,
        lines: lineCount
      };

      const existingSubtitles = subtitlesByLanguage.get(language) || [];
      existingSubtitles.push(subtitleFile);
      subtitlesByLanguage.set(language, existingSubtitles);
    }

    return subtitlesByLanguage;
  }

  private detectLanguage(filePath: string, languages: { lang: string; aliases: string[] }[]): string | null {
    const fileName = path.basename(filePath).toLowerCase();
    
    for (const language of languages) {
      const hasMatchingAlias = language.aliases.some(alias => 
        fileName.includes(alias.toLowerCase())
      );
      
      if (hasMatchingAlias) {
        return language.lang;
      }
    }

    return null;
  }

  private countSubtitleLines(volume: Volume, filePath: string): number {
    try {
      const content = volume.readFileSync(filePath, 'utf8') as string;
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  private createFilePlansForLanguage(
    filename: string,
    language: string,
    subtitles: ISubtitleFile[]
  ): IFilePlan[] {
    const plans: IFilePlan[] = [];
    const remainingSubtitles = [...subtitles];

    // Smallest file becomes .lang.srt
    if (remainingSubtitles.length > 0) {
      const smallest = remainingSubtitles.shift()!;
      plans.push({
        from: smallest.file,
        to: `/${filename}.${language}.srt`,
        opType: 'move'
      });
    }

    // Largest file becomes .lang.sdh.srt
    if (remainingSubtitles.length > 0) {
      const largest = remainingSubtitles.pop()!;
      plans.push({
        from: largest.file,
        to: `/${filename}.${language}.sdh.srt`,
        opType: 'move'
      });
    }

    // Third file becomes .lang.forced.srt
    if (remainingSubtitles.length > 0) {
      const forced = remainingSubtitles.pop()!;
      plans.push({
        from: forced.file,
        to: `/${filename}.${language}.forced.srt`,
        opType: 'move'
      });
    }

    // Remaining files get numbered suffixes (in order of remaining array)
    remainingSubtitles.forEach((subtitle, index) => {
      plans.push({
        from: subtitle.file,
        to: `/${filename}.${language}.${index}.srt`,
        opType: 'move'
      });
    });

    return plans;
  }
}
