import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface WidgetToken {
  id: string;
  token: string;
  name: string;
  permissions: any;
  parent_task_id: string | null;
  created_at: string;
  last_used_at: string | null;
}

export default function WidgetDocs() {
  const [tokens, setTokens] = useState<WidgetToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    const { data, error } = await supabase
      .from('widget_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Ошибка загрузки токенов');
      return;
    }

    setTokens(data || []);
    if (data && data.length > 0) {
      setSelectedToken(data[0].token);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Введите название токена');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-widget-token', {
        body: {
          name: newTokenName,
          permissions: { read: true, write: true, delete: false },
        },
      });

      if (error) throw error;

      toast.success('Токен создан');
      setNewTokenName('');
      loadTokens();
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Ошибка создания токена');
    }
  };

  const deleteToken = async (tokenId: string) => {
    const { error } = await supabase
      .from('widget_tokens')
      .delete()
      .eq('id', tokenId);

    if (error) {
      toast.error('Ошибка удаления токена');
      return;
    }

    toast.success('Токен удален');
    loadTokens();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  const generateEmbedCode = (type: 'widget' | 'badge') => {
    if (type === 'widget') {
      return `<!-- Полный виджет задач -->
<script type="module">
  import { TaskWidget } from 'https://your-domain.com/widget/index.js';
</script>

<task-widget 
  api-token="${selectedToken}"
  theme="light">
</task-widget>`;
    } else {
      return `<!-- Флажок задачи -->
<script type="module">
  import { TaskBadgeWidget } from 'https://your-domain.com/widget/index.js';
</script>

<task-badge 
  api-token="${selectedToken}"
  task-id="${selectedTaskId || 'YOUR_TASK_ID'}"
  position="top-right">
</task-badge>`;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Виджеты Таск-Менеджера</h1>
        <p className="text-muted-foreground">
          Встраивайте задачи на любой сайт с помощью Web Components
        </p>
      </div>

      <Tabs defaultValue="tokens" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tokens">API Токены</TabsTrigger>
          <TabsTrigger value="widget">Виджет</TabsTrigger>
          <TabsTrigger value="badge">Флажки</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Управление токенами</h2>
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="Название токена"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
              <Button onClick={createToken}>
                <Plus className="h-4 w-4 mr-2" />
                Создать
              </Button>
            </div>

            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{token.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {token.token}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Создан: {new Date(token.created_at).toLocaleDateString('ru-RU')}
                      {token.last_used_at && (
                        <> • Использован: {new Date(token.last_used_at).toLocaleDateString('ru-RU')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(token.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="widget" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Полный виджет задач</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Выберите токен:</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                {tokens.map((token) => (
                  <option key={token.id} value={token.token}>
                    {token.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-muted p-4 rounded-lg mb-4">
              <pre className="text-sm overflow-x-auto">
                <code>{generateEmbedCode('widget')}</code>
              </pre>
            </div>

            <Button onClick={() => copyToClipboard(generateEmbedCode('widget'))}>
              <Copy className="h-4 w-4 mr-2" />
              Копировать код
            </Button>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">Атрибуты:</h3>
              <ul className="space-y-2 text-sm">
                <li><code className="bg-muted px-2 py-1 rounded">api-token</code> - API токен для доступа</li>
                <li><code className="bg-muted px-2 py-1 rounded">theme</code> - Тема: "light" или "dark"</li>
              </ul>
              
              <h3 className="font-semibold mb-2 mt-4">Особенности:</h3>
              <ul className="space-y-2 text-sm">
                <li>🔄 <strong>Realtime синхронизация</strong> - автоматическое обновление через WebSocket</li>
                <li>⚡ <strong>Мгновенные изменения</strong> - все изменения видны сразу во всех виджетах</li>
                <li>🎯 <strong>Без перезагрузки</strong> - данные обновляются без refresh страницы</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Пример использования API:</h3>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Создание задачи из другого проекта Lovable
const response = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-create/YOUR_TOKEN/tasks',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Новая задача',
      content: 'Описание задачи',
      column_id: 'todo',
      priority: 'medium'
    })
  }
);

// Получение списка задач
const tasks = await fetch(
  'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1/widget-api-list/YOUR_TOKEN/tasks'
).then(r => r.json());`}
            </pre>
          </Card>

          <Card className="p-6 mt-4">
            <h3 className="font-semibold mb-4">Realtime обновления (автоматические):</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Виджеты автоматически подключаются к Realtime через WebSocket и обновляются при изменении данных.
              Никаких дополнительных настроек не требуется!
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600 font-mono text-xs">✓ INSERT</span>
                  <span className="text-sm">Новые задачи появляются автоматически</span>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-600 font-mono text-xs">✓ UPDATE</span>
                  <span className="text-sm">Изменения синхронизируются мгновенно</span>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-pink-600 font-mono text-xs">✓ DELETE</span>
                   <span className="text-sm">Удаленные задачи исчезают сразу</span>
                 </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="badge" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Флажки задач</h2>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Токен:</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                >
                  {tokens.map((token) => (
                    <option key={token.id} value={token.token}>
                      {token.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ID задачи:</label>
                <Input
                  placeholder="UUID задачи"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg mb-4">
              <pre className="text-sm overflow-x-auto">
                <code>{generateEmbedCode('badge')}</code>
              </pre>
            </div>

            <Button onClick={() => copyToClipboard(generateEmbedCode('badge'))}>
              <Copy className="h-4 w-4 mr-2" />
              Копировать код
            </Button>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">Атрибуты:</h3>
              <ul className="space-y-2 text-sm">
                <li><code className="bg-muted px-2 py-1 rounded">api-token</code> - API токен</li>
                <li><code className="bg-muted px-2 py-1 rounded">task-id</code> - ID задачи</li>
                <li><code className="bg-muted px-2 py-1 rounded">position</code> - Позиция: "top-right", "top-left", "bottom-right", "bottom-left"</li>
              </ul>

              <h3 className="font-semibold mb-2 mt-4">Особенности:</h3>
              <ul className="space-y-2 text-sm">
                <li>🔄 <strong>Realtime обновления</strong> - статус и данные обновляются автоматически</li>
                <li>🎯 <strong>Клик для открытия</strong> - нажатие открывает полную задачу в новом окне</li>
                <li>🎨 <strong>Цветовые индикаторы</strong> - статус задачи виден по цвету флажка</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">REST API Endpoints</h2>
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-muted rounded">
            <code className="text-green-600">GET</code> <code>/widget-api-list/:token/tasks</code>
            <p className="text-muted-foreground mt-1">Получить список задач</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <code className="text-blue-600">POST</code> <code>/widget-api-create/:token/tasks</code>
            <p className="text-muted-foreground mt-1">Создать новую задачу</p>
          </div>
           <div className="p-3 bg-muted rounded">
             <code className="text-pink-600">PUT</code> <code>/widget-api-update/:token/tasks/:id</code>
             <p className="text-muted-foreground mt-1">Обновить задачу</p>
           </div>
           <div className="p-3 bg-muted rounded">
             <code className="text-pink-600">DELETE</code> <code>/widget-api-delete/:token/tasks/:id</code>
             <p className="text-muted-foreground mt-1">Удалить задачу</p>
           </div>
          <div className="p-3 bg-muted rounded">
            <code className="text-green-600">GET</code> <code>/widget-api-get/:token/tasks/:id</code>
            <p className="text-muted-foreground mt-1">Получить одну задачу</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
