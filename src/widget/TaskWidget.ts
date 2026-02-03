import { WidgetAPI, WidgetTask } from './widget-api';

const styles = `
:host {
  --widget-bg: #ffffff;
  --widget-text: #1a1a1a;
  --widget-border: #e5e7eb;
  --widget-accent: #3b82f6;
  --widget-hover: #f3f4f6;
  --widget-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
:host([theme="dark"]) {
  --widget-bg: #1f2937;
  --widget-text: #f9fafb;
  --widget-border: #374151;
  --widget-hover: #374151;
}
.widget-container {
  background: var(--widget-bg);
  color: var(--widget-text);
  border: 1px solid var(--widget-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--widget-shadow);
  max-height: 600px;
  overflow-y: auto;
}
.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--widget-border);
}
.widget-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--widget-bg);
  border: 1px solid var(--widget-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.task-item:hover {
  background: var(--widget-hover);
  border-color: var(--widget-accent);
}
.task-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--widget-border);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.task-checkbox.checked {
  background: var(--widget-accent);
  border-color: var(--widget-accent);
  position: relative;
}
.task-checkbox.checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
}
.task-content {
  flex: 1;
  min-width: 0;
}
.task-title {
  font-weight: 500;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-meta {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  gap: 8px;
  align-items: center;
}
.priority-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.priority-high {
  background: #fecaca;
  color: #991b1b;
}
.priority-medium {
  background: #fed7aa;
  color: #9a3412;
}
.priority-low {
  background: #dbeafe;
  color: #1e40af;
}
.loading, .error {
  text-align: center;
  padding: 32px;
  color: #6b7280;
}
.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
}
`;

export class TaskWidget extends HTMLElement {
  private api: WidgetAPI | null = null;
  private tasks: WidgetTask[] = [];
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['api-token', 'theme', 'parent-task-id'];
  }

  connectedCallback() {
    this.render();
    this.initializeWidget();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      if (name === 'api-token') {
        this.initializeWidget();
      } else {
        this.render();
      }
    }
  }

  private async initializeWidget() {
    const token = this.getAttribute('api-token');
    
    if (!token) {
      this.renderError('API token is required');
      return;
    }

    this.api = new WidgetAPI({ apiToken: token });
    await this.loadTasks();
  }

  private async loadTasks() {
    try {
      this.renderLoading();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }

      this.tasks = await this.api.getTasks();
      this.render();
      
      // Set up realtime updates
      this.setupRealtime();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.renderError(error instanceof Error ? error.message : 'Failed to load tasks');
    }
  }

  private async setupRealtime() {
    if (!this.api) return;

    try {
      await this.api.initializeRealtime();
      
      this.api.subscribeToChanges((payload) => {
        console.log('Realtime event:', payload.eventType, payload.new);

        if (payload.eventType === 'INSERT') {
          this.tasks.push(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          const index = this.tasks.findIndex(t => t.id === payload.new.id);
          if (index !== -1) {
            this.tasks[index] = payload.new;
          }
        } else if (payload.eventType === 'DELETE') {
          this.tasks = this.tasks.filter(t => t.id !== payload.old.id);
        }

        this.render();
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

  private async handleTaskClick(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !this.api) return;

    try {
      const newStatus = task.column_id === 'done' ? 'todo' : 'done';
      await this.api.updateTask(taskId, { column_id: newStatus });
      await this.loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  private render() {
    const theme = this.getAttribute('theme') || 'light';
    
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="widget-container" data-theme="${theme}">
        <div class="widget-header">
          <h3 class="widget-title">Задачи</h3>
          <span class="task-meta">${this.tasks.length} задач</span>
        </div>
        <div class="task-list">
          ${this.tasks.map(task => this.renderTask(task)).join('')}
        </div>
      </div>
    `;

    // Attach event listeners
    this.shadow.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.getAttribute('data-task-id');
        if (taskId) this.handleTaskClick(taskId);
      });
    });
  }

  private renderTask(task: WidgetTask): string {
    const isChecked = task.column_id === 'done';
    const priorityClass = task.priority ? `priority-${task.priority}` : '';
    
    return `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-checkbox ${isChecked ? 'checked' : ''}"></div>
        <div class="task-content">
          <h4 class="task-title">${this.escapeHtml(task.title)}</h4>
          <div class="task-meta">
            ${task.priority && task.priority !== 'none' ? 
              `<span class="priority-badge ${priorityClass}">${task.priority}</span>` : ''}
            <span>${new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderLoading() {
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="widget-container">
        <div class="loading">Загрузка...</div>
      </div>
    `;
  }

  private renderError(message: string) {
    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="widget-container">
        <div class="error">Ошибка: ${this.escapeHtml(message)}</div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('task-widget', TaskWidget);
