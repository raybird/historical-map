import { Injectable } from '@angular/core';
import { HistoricalEvent } from '../models/event.model';

export interface QuizQuestion {
  id: string;
  type: 'period' | 'location' | 'keyword' | 'sequence';
  question: string;
  options: string[];
  correctAnswer: string;
}

@Injectable({ providedIn: 'root' })
export class QuizService {

  generateQuestions(event: HistoricalEvent, allEvents: HistoricalEvent[]): QuizQuestion[] {
    if (!event) return [];
    const questions: QuizQuestion[] = [];

    const periodQ = this.buildPeriodQuestion(event, allEvents);
    if (periodQ) questions.push(periodQ);

    const locationQ = this.buildLocationQuestion(event, allEvents);
    if (locationQ) questions.push(locationQ);

    const keywordQ = this.buildKeywordQuestion(event, allEvents);
    if (keywordQ) questions.push(keywordQ);

    const sequenceQ = this.buildSequenceQuestion(event, allEvents);
    if (sequenceQ) questions.push(sequenceQ);

    return this.shuffle(questions).slice(0, 3);
  }

  private buildPeriodQuestion(event: HistoricalEvent, allEvents: HistoricalEvent[]): QuizQuestion | null {
    if (!event.date?.period) return null;
    const correct = event.date.period;
    const pool = [...new Set(allEvents.map((item) => item.date?.period).filter(Boolean))] as string[];
    const distractors = this.shuffle(pool.filter((period) => period !== correct)).slice(0, 3);
    if (distractors.length < 3) return null;
    const options = this.shuffle([...distractors, correct]);
    return {
      id: `period-${event.id}`,
      type: 'period',
      question: `「${event.title}」發生於哪個時期？`,
      options,
      correctAnswer: correct
    };
  }

  private buildLocationQuestion(event: HistoricalEvent, allEvents: HistoricalEvent[]): QuizQuestion | null {
    if (!event.location?.name) return null;
    const correct = event.location.name;
    const others = allEvents
      .filter((item) => item.id !== event.id && item.location?.name && item.location.name !== correct)
      .map((item) => item.location.name);
    const picked = this.shuffle([...new Set(others)]).slice(0, 3);
    if (picked.length < 3) return null;
    return {
      id: `location-${event.id}`,
      type: 'location',
      question: `「${event.title}」發生在何處？`,
      options: this.shuffle([...picked, correct]),
      correctAnswer: correct
    };
  }

  private buildKeywordQuestion(event: HistoricalEvent, allEvents: HistoricalEvent[]): QuizQuestion | null {
    const keywords = event.keywords || [];
    if (keywords.length === 0) return null;
    const correct = this.pickRandom(keywords) as string;
    const keywordPool = [...new Set(allEvents.flatMap((item) => item.keywords || []))]
      .filter((keyword) => !keywords.includes(keyword));
    const picked = this.shuffle(keywordPool).slice(0, 3);
    if (picked.length < 3) return null;
    return {
      id: `keyword-${event.id}`,
      type: 'keyword',
      question: `以下哪個關鍵詞與「${event.title}」最相關？`,
      options: this.shuffle([...picked, correct]),
      correctAnswer: correct
    };
  }

  private buildSequenceQuestion(event: HistoricalEvent, allEvents: HistoricalEvent[]): QuizQuestion | null {
    const eventYear = this.parseYear(event.date?.start);
    if (eventYear === null) return null;

    const next = allEvents
      .filter((item) => item.id !== event.id)
      .map((item) => ({ event: item, year: this.parseYear(item.date?.start) }))
      .filter((item) => item.year !== null && item.year > eventYear)
      .sort((a, b) => (a.year as number) - (b.year as number))[0]?.event;

    if (!next) return null;

    const distractors = this.shuffle(
      allEvents
        .filter((item) => item.id !== event.id && item.id !== next.id)
        .map((item) => item.title)
    ).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      id: `sequence-${event.id}`,
      type: 'sequence',
      question: `「${event.title}」之後緊接著哪個事件？`,
      options: this.shuffle([...distractors, next.title]),
      correctAnswer: next.title
    };
  }

  private parseYear(dateStr: string | undefined): number | null {
    if (!dateStr) return null;
    if (dateStr.startsWith('-')) {
      const year = parseInt(dateStr.substring(1).split('-')[0], 10);
      return isNaN(year) ? null : -year;
    }
    const year = parseInt(dateStr.split('-')[0], 10);
    return isNaN(year) ? null : year;
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
