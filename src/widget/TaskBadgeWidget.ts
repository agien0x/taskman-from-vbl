import { WidgetAPI, WidgetTask } from './widget-api';

const styles = `
:host {
  display: block;
  z-index: 9999;
}
.widget-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.widget-badge:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.widget-badge.status-done {
  background: #10b981;
}
.widget-badge.status-inprogress {
  background: #f59e0b;
}
.widget-badge.status-todo {
  background: #6b7280;
}
`;

export class TaskBadgeWidget extends HTMLElement {
  private api: WidgetAPI | null = null;
  private task: WidgetTask | null = null;
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['api-token', 'task-id', 'position'];
  }

  connectedCallback() {
    this.render();
    this.initializeWidget();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      if (name === 'api-token' || name === 'task-id') {
        this.initializeWidget();
      } else {
        this.updatePosition();
      }
    }
  }

  private async initializeWidget() {
    const token = this.getAttribute('api-token');
    const taskId = this.getAttribute('task-id');
    
    if (!token || !taskId) {
      this.renderError('API token and task ID are required');
      return;
    }

    this.api = new WidgetAPI({ apiToken: token });
    await this.loadTask(taskId);
  }

  private async loadTask(taskId: string) {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      this.task = await this.api.getTask(taskId);
      this.render();
      this.setupRealtime(taskId);
    } catch (error) {
      console.error('Error loading task:', error);
      this.renderError(error instanceof Error ? error.message : 'Failed to load task');
    }
  }

  private async setupRealtime(taskId: string) {
    if (!this.api) return;

    try {
      await this.api.initializeRealtime();
      
      this.api.subscribeToChanges((payload) => {
        // Only update if this is the task we're displaying
        if (payload.new.id === taskId || payload.old?.id === taskId) {
          console.log('Task badge realtime update:', payload.eventType);

          if (payload.eventType === 'UPDATE') {
            this.task = payload.new;
            this.render();
          } else if (payload.eventType === 'DELETE') {
            this.renderError('Task deleted');
          }
        }
      });
    } catch (error) {
      console.error('Error setting up realtime:', error);
    }
  }

  disconnectedCallback() {
    if (this.api) {
      this.api.unsubscribe();
    }
  }

  private updatePosition() {
    const position = this.getAttribute('position') || 'top-right';
    this.style.position = 'fixed';
    
    const positions: Record<string, any> = {
      'top-right': { top: '16px', right: '16px' },
      'top-left': { top: '16px', left: '16px' },
      'bottom-right': { bottom: '16px', right: '16px' },
      'bottom-left': { bottom: '16px', left: '16px' },
    };

    const pos = positions[position] || positions['top-right'];
    Object.assign(this.style, pos);
  }

  private handleBadgeClick() {
    if (!this.task) return;
    
    // Open task in new window or dispatch custom event
    const event = new CustomEvent('task-badge-click', {
      detail: { taskId: this.task.id },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
    
    // Open task manager
    window.open(`/?task=${this.task.id}`, '_blank');
  }

  private render() {
    if (!this.task) {
      this.renderLoading();
      return;
    }

    const statusClass = `status-${this.task.column_id.toLowerCase().replace(' ', '')}`;
    
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <button class="widget-badge ${statusClass}" type="button">
        <span>ð</span>
        <span>${this.escapeHtml(this.task.title)}</span>
      </button>
    `;

    const badge = this.shadow.querySelector('.widget-badge');
    badge?.addEventListener('click', () => this.handleBadgeClick());
    
    this.updatePosition();
  }

  private renderLoading() {
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="widget-badge">
        <span>â³</span>
      </div>
    `;
    this.updatePosition();
  }

  private renderError(message: string) {
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="widget-badge" style="background: #ef4444;">
        <span>â</span>
        <span>${this.escapeHtml(message)}</span>
      </div>
    `;
    this.updatePosition();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('task-badge', TaskBadgeWidget);
