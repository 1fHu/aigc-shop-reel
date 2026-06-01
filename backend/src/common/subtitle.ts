import type { TTSWord, TTSResult } from '../modules/volcano/volcano-api.service';

export interface ASSEvent {
  start: string;
  end: string;
  text: string;
}

/** 秒(float) → ASS 时间戳格式 H:MM:SS.cc */
function secondsToASS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** 标点字符集：作为分组边界 */
const PUNCTUATION = new Set(['，', '。', '！', '？', '、', '；', '：', ',', '.', '!', '?', ' ']);

/**
 * 将 TTS 字级时间戳按 2-6 字分组合并为 ASS 字幕事件
 */
export function groupWords(words: TTSWord[]): ASSEvent[] {
  if (!words.length) return [];

  const events: ASSEvent[] = [];
  let buffer: TTSWord[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map((w) => w.word).join('');
    events.push({
      start: secondsToASS(buffer[0].startTime),
      end: secondsToASS(buffer[buffer.length - 1].endTime),
      text,
    });
    buffer = [];
  };

  for (const w of words) {
    // 纯标点跳过，但触发 flush
    if (PUNCTUATION.has(w.word)) {
      flush();
      continue;
    }
    buffer.push(w);
    // 达到 6 字或自然断句 → flush
    if (buffer.length >= 6) {
      flush();
    }
  }
  flush();
  return events;
}

/**
 * 生成完整 ASS 字幕文件内容
 */
export function wordsToASS(result: TTSResult): string {
  const allWords = result.sentences.flatMap((s) => s.words);
  const events = groupWords(allWords);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,52,&H00FFFFFF,&H00000000,&H80000000,1,0,2,80,80,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const dialogues = events.map(
    (e) => `Dialogue: 0,${e.start},${e.end},Default,,0,0,0,,${e.text}`,
  );

  return header + '\n' + dialogues.join('\n');
}

/**
 * 从 TTS 结果获取音频总时长（秒）
 */
export function getTTSDuration(result: TTSResult): number {
  return result.duration;
}
