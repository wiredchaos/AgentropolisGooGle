export interface NormalizedDocument {
  content: string;
  provenance: string;
  normalizedAt: Date;
  wordCount: number;
}

export class NormalizerService {
  normalize(rawContent: string, sourceUrl: string): NormalizedDocument {
    const content = this.cleanText(rawContent);
    return {
      content,
      provenance: sourceUrl,
      normalizedAt: new Date(),
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
