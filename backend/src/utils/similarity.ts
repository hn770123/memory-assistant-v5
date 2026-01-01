/**
 * Levenshtein距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // 初期化
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 距離計算
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 削除
        matrix[i][j - 1] + 1, // 挿入
        matrix[i - 1][j - 1] + cost // 置換
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * 2つのテキストの類似度を計算（0.0 〜 1.0）
 * 1.0 = 完全一致、0.0 = 全く異なる
 */
export function calculateSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0;
  if (!text1 || !text2) return 0.0;

  // 正規化（小文字化、トリミング）
  const normalized1 = text1.toLowerCase().trim();
  const normalized2 = text2.toLowerCase().trim();

  // Levenshtein距離を計算
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // 類似度に変換（距離が小さいほど類似度が高い）
  const similarity = 1 - distance / maxLength;

  return Math.max(0, Math.min(1, similarity));
}

/**
 * キーワードベースの類似度計算（補助的な方法）
 */
export function calculateKeywordSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0;
  if (!text1 || !text2) return 0.0;

  // 単語に分割（日本語と英語の両方に対応）
  const words1 = extractWords(text1);
  const words2 = extractWords(text2);

  if (words1.length === 0 || words2.length === 0) return 0.0;

  // 共通する単語の数を数える
  const commonWords = words1.filter((word) => words2.includes(word));
  const unionSize = new Set([...words1, ...words2]).size;

  // Jaccard係数を計算
  return commonWords.length / unionSize;
}

/**
 * テキストから単語を抽出
 */
function extractWords(text: string): string[] {
  // 小文字化して不要な文字を削除
  const normalized = text.toLowerCase().replace(/[、。「」！？\s]/g, ' ');

  // 英単語を抽出
  const englishWords = normalized.match(/[a-z]+/g) || [];

  // 日本語文字を1文字ずつ分割（簡易的な処理）
  const japaneseChars = normalized
    .replace(/[a-z\s]/g, '')
    .split('')
    .filter((char) => char.length > 0);

  // 結合して重複を除去
  return [...new Set([...englishWords, ...japaneseChars])];
}

/**
 * ハイブリッド類似度計算（Levenshteinとキーワードの両方を使用）
 */
export function calculateHybridSimilarity(text1: string, text2: string): number {
  const levenshteinSim = calculateSimilarity(text1, text2);
  const keywordSim = calculateKeywordSimilarity(text1, text2);

  // 重み付け平均（Levenshtein: 60%, キーワード: 40%）
  return levenshteinSim * 0.6 + keywordSim * 0.4;
}
