import { Injectable } from '@nestjs/common';
import path from 'path';
import { Volume } from 'memfs/lib/volume';
import { findFileOrFolder } from '../../../helpers';

interface IFilePlan {
  from: string;
  to: string;
  opType: 'move' | 'copy';
}

export type SubtitlesLanguagesInSeasonEpisodeFoldersOptions = {
  languages: {
    lang: string;
    aliases: string[]
  }[];
};

@Injectable()
export class SubtitlesService {

  /**
   * RARBG subtitles are usually in a separate folder, this method will move them to the video folder
   * Will turn this structure into plex compatible structure
   *   showS01E01.mkv
   *   showS01E02.mkv
   *   Subs|Anything|Any-Depth/
   *     showS01E01/
   *       2_English.srt
   *       3_English.srt
   *     showS01E02/
   *       3_English.srt
   *       4_English.srt
   *
   */
  subtitlesLanguagesInSeasonEpisodeFolders(volume: Volume, opts: SubtitlesLanguagesInSeasonEpisodeFoldersOptions): IFilePlan[] {
    const rVal: IFilePlan[] = [];
    for (const file of volume.readdirSync('/')) {
      const videoFile = `/${file}`;
      if (!volume.statSync(videoFile).isFile()) continue;
      if (!(videoFile.endsWith('.mkv') || videoFile.endsWith('.mp4'))) continue;

      // The filename without the extension use path to get the filename without the extension
      const filename = path.basename(videoFile, path.extname(videoFile));

      const folder = findFileOrFolder(volume, filename, 'folder');
      if (!folder) continue;

      // search for subtitle files
      const subs: Map<string, { file: string, lang: string, lines: number }[]> = new Map();
      for (const fileNode of volume.readdirSync(folder)) {
        const file = path.join(folder, fileNode as string);
        if (file.toString().endsWith('.srt')) {
          // process subtitle file
          const subtitle = volume.readFileSync(file, 'utf8') as string;
          const lines = subtitle.split('\n');

          // determine language
          for (const lang of opts.languages) {
            const matched = lang.aliases.find(alias => file.toLowerCase().includes(alias)) !== undefined;
            if (!matched) continue;
            const langSubs = subs.get(lang.lang) || [];
            langSubs.push({ file: file as string, lang: matched ? lang.lang : 'unknown', lines: lines.length });
            subs.set(lang.lang, langSubs);
          }
        }
      }

      // Get all keys from the map as array
      const languages = Array.from(subs.keys());
      for (const lang of languages) {
        const langSubs = subs.get(lang);
        if (!langSubs) continue;

        // sort by number of lines ASC
        langSubs.sort((a, b) => a.lines - b.lines);

        // smallest file is .lang.srt, remove it from the array
        if (langSubs.length) {
          const smallest = langSubs.shift();
          rVal.push({
            from: smallest.file,
            to: path.join('/', `${ filename }.${ smallest.lang }.srt`),
            opType: 'move'
          });
          // fs.renameSync(smallest.file, path.join(folderPath, `${ filename }.${ smallest.lang }.srt`));
        }

        // largest file is .lang.sdh.srt, remove it from the array
        if (langSubs.length) {
          const largest = langSubs.pop();
          rVal.push({
            from: largest.file,
            to: path.join('/', `${ filename }.${ largest.lang }.sdh.srt`),
            opType: 'move'
          });
          // fs.renameSync(largest.file, path.join(folderPath, `${ filename }.${ largest.lang }.sdh.srt`));
        }

        // if there's a 3rd file (array not empty), it's .lang.forced.srt, remove it from array
        if (langSubs.length) {
          const forced = langSubs.pop();
          rVal.push({ from: forced.file, to: path.join('/', `${ filename }.${ forced.lang }.forced.srt`), opType: 'move' });
          // fs.renameSync(forced.file, path.join(folderPath, `${ filename }.${ forced.lang }.forced.srt`));
        }

        // if more than 3 files the rest are .lang.xxx.srt
        for (let i = 0; langSubs.length > 0; i++) {
          rVal.push({ from: langSubs[i].file, to: path.join('/', `${ filename }.${ langSubs[i].lang }.${i}.srt`), opType: 'move' });
          // fs.renameSync(langSubs[i].file, path.join(folderPath, `${ filename }.${ langSubs[i].lang }.xxx.srt`));
        }
      }
    }

    return rVal;
  }
}
