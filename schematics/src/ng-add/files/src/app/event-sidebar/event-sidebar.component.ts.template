import { Component, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as EventActions from '../store/actions/event.actions';
import * as MapActions from '../store/actions/map.actions';
import { selectSelectedEvent, selectEvents, selectEventLoading, selectEventError } from '../store/selectors/event.selectors';
import { QuizService, QuizQuestion } from '../services/quiz.service';
import { Subscription, Observable } from 'rxjs';

@Component({
  selector: 'app-event-sidebar',
  templateUrl: './event-sidebar.component.html',
  styleUrls: ['./event-sidebar.component.css'],
  standalone: true,
  imports: [AsyncPipe],
})
export class EventSidebarComponent implements OnInit, OnDestroy {
  selectedEvent$!: Observable<any>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  questions: QuizQuestion[] = [];
  selectedAnswers: (number | null)[] = [];
  showResults = false;
  correctCount = 0;

  private subscriptions: Subscription[] = [];
  private allEvents: any[] = [];

  constructor(
    private store: Store<AppState>,
    private quizService: QuizService,
  ) {}

  ngOnInit(): void {
    this.selectedEvent$ = this.store.select(selectSelectedEvent);
    this.loading$ = this.store.select(selectEventLoading);
    this.error$ = this.store.select(selectEventError);

    const eventsSub = this.store.select(selectEvents).subscribe(events => {
      this.allEvents = events;
    });
    this.subscriptions.push(eventsSub);

    const selectedSub = this.selectedEvent$.subscribe(event => {
      if (event) {
        this.resetQuiz();
        this.questions = this.quizService.generateQuestions(event, this.allEvents);
      } else {
        this.resetQuiz();
      }
    });
    this.subscriptions.push(selectedSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  selectAnswer(questionIndex: number, optionIndex: number): void {
    if (this.showResults) return;
    this.selectedAnswers[questionIndex] = optionIndex;
  }

  submitAnswers(): void {
    this.showResults = true;
    this.correctCount = this.questions.filter(
      (q, i) => q.options[this.selectedAnswers[i] ?? -1] === q.correctAnswer
    ).length;
  }

  isCorrect(q: QuizQuestion, optIndex: number): boolean {
    return this.showResults && q.options[optIndex] === q.correctAnswer;
  }

  isSelectedWrong(q: QuizQuestion, i: number, optIndex: number): boolean {
    return this.showResults && this.selectedAnswers[i] === optIndex && q.options[optIndex] !== q.correctAnswer;
  }

  resetQuiz(): void {
    this.questions = [];
    this.selectedAnswers = [];
    this.showResults = false;
    this.correctCount = 0;
  }

  retryQuiz(event: any): void {
    this.resetQuiz();
    this.questions = this.quizService.generateQuestions(event, this.allEvents);
  }

  allQuestionsAnswered(): boolean {
    return this.selectedAnswers.length === this.questions.length &&
           this.selectedAnswers.every(a => a !== null);
  }

  getEventTitle(id: string): string {
    return this.allEvents.find(e => e.id === id)?.title ?? id;
  }

  closeSidebar(): void {
    this.store.dispatch(EventActions.clearSelectedEvent());
    this.store.dispatch(MapActions.clearSelectedEvent());
  }
}