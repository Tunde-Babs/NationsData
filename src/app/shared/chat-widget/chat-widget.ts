import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AssistantService } from '../../core/services/assistant.service';

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  link?: unknown[];
}

@Component({
  selector: 'app-chat-widget',
  imports: [RouterLink],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss'
})
export class ChatWidget {
  private readonly assistant = inject(AssistantService);

  @ViewChild('scroll') scroll?: ElementRef<HTMLElement>;

  readonly open = signal(false);
  readonly input = signal('');
  readonly loading = signal(false);
  readonly messages = signal<ChatMsg[]>([
    {
      role: 'bot',
      text:
        "Hi! I'm the NationsData assistant. Ask me anything about a country — its " +
        'capital, population, currency, GDP, when it was founded, or who has led it.'
    }
  ]);

  readonly suggestions = [
    'Capital of Japan',
    'Population of India',
    'When was Brazil founded?',
    'Who is the president of Kenya?'
  ];

  toggle(): void {
    this.open.update((v) => !v);
  }

  send(text?: string): void {
    const q = (text ?? this.input()).trim();
    if (!q || this.loading()) return;
    this.push({ role: 'user', text: q });
    this.input.set('');
    this.loading.set(true);
    this.assistant.ask(q).subscribe((ans) => {
      this.push({ role: 'bot', text: ans.text, link: ans.link });
      this.loading.set(false);
    });
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  private push(m: ChatMsg): void {
    this.messages.update((a) => [...a, m]);
    setTimeout(() => {
      const el = this.scroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
