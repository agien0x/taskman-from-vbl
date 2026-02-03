import { useState, ReactNode } from "react";
import { Mic, Bot, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { AgentSelector } from "../AgentSelector";
import { useVoiceInput } from "../../hooks/useVoiceInput";

interface VoiceInputWithAgentsProps {
  value: string;
  onChange: (value: string) => void;
  children: (props: {
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
  }) => ReactNode;
  templateSettingsComponent?: ReactNode;
  supabaseClient: any;
  toast: (props: { title?: string; description?: string; variant?: string }) => void;
}

export const VoiceInputWithAgents = ({
  value,
  onChange,
  children,
  templateSettingsComponent,
  supabaseClient,
  toast,
}: VoiceInputWithAgentsProps) => {
  const [originalText, setOriginalText] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const { isRecording, startRecording, stopRecording } = useVoiceInput({
    onTranscription: async (text) => {
      // Добавляем новый текст к существующему
      const newText = value ? `${value} ${text}` : text;
      setOriginalText(newText);

      // Process with selected agents
      if (selectedAgentIds.length > 0) {
        await processWithAgents(newText, selectedAgentIds);
      } else {
        onChange(newText);
      }
    },
    supabaseClient,
    toast,
  });

  const processWithAgents = async (text: string, agentIds: string[]) => {
    if (!text.trim() || agentIds.length === 0) {
      onChange(text);
      return;
    }

    setIsProcessing(true);
    try {
      let currentText = text;
      
      // Обрабатываем последовательно каждым агентом
      for (const agentId of agentIds) {
        const { data, error } = await supabaseClient.functions.invoke("test-agent", {
          body: {
            agentId,
            input: currentText,
            context: {
              source: "voice_input",
              timestamp: new Date().toISOString(),
            }
          },
        });

        if (error) {
          console.error(`Agent ${agentId} error:`, error);
          continue;
        }

        // Parse the output - it might be structured JSON or plain text
        let processedText = data.output;
        try {
          const parsed = JSON.parse(data.output);
          if (parsed.content !== undefined) {
            processedText = parsed.content;
          }
        } catch {
          // Not JSON, use as is
        }

        currentText = processedText;
      }

      onChange(currentText);
      toast({
        title: "Текст обработан",
        description: `Обработано ${agentIds.length} агентами`,
      });
    } catch (error) {
      console.error("Error processing with agents:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать текст через агентов",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAgentSelect = async (agentIds: string[]) => {
    setSelectedAgentIds(agentIds);

    // If no agents selected, restore original text
    if (agentIds.length === 0) {
      if (originalText && originalText !== value) {
        onChange(originalText);
        toast({
          title: "Восстановлено",
          description: "Показан оригинальный транскрипт",
        });
      }
      return;
    }
    
    // Process current text with the selected agents
    const textToProcess = originalText || value;
    if (textToProcess && textToProcess.trim()) {
      if (!originalText) {
        setOriginalText(textToProcess);
      }
      await processWithAgents(textToProcess, agentIds);
    }
  };

  const restoreOriginal = () => {
    if (originalText) {
      onChange(originalText);
      toast({
        title: "Восстановлено",
        description: "Исходный текст восстановлен",
      });
    }
  };

  return (
    <div className="relative">
      {children({
        value,
        onChange,
        disabled: isProcessing,
      })}
      
      <div className="absolute right-2 bottom-2 flex gap-1 z-10">
        {originalText && originalText !== value && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={restoreOriginal}
                  className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Вернуться к исходному тексту</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {templateSettingsComponent}

        <TooltipProvider>
          <Tooltip open={showAgentSelector ? false : undefined}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className={`h-7 w-7 p-0 bg-background/80 backdrop-blur-sm ${selectedAgentIds.length > 0 ? "text-primary" : ""}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <div className="relative">
                    <Bot className="h-3.5 w-3.5" />
                    {selectedAgentIds.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-white text-[8px] flex items-center justify-center">
                        {selectedAgentIds.length}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Выбрать агентов для обработки</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={isRecording ? stopRecording : startRecording}
                className={`h-7 w-7 p-0 bg-background/80 backdrop-blur-sm ${isRecording ? "text-destructive" : ""}`}
                disabled={isProcessing}
              >
                <Mic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? "Остановить запись" : "Голосовой ввод"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {showAgentSelector && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <AgentSelector
            selectedAgentIds={selectedAgentIds}
            onAgentSelect={handleAgentSelect}
            supabaseClient={supabaseClient}
          />
        </div>
      )}
    </div>
  );
};
