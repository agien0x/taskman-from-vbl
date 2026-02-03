import { useState, useRef } from "react";

interface UseVoiceInputProps {
  onTranscription: (text: string) => void;
  supabaseClient: any;
  toast: (props: { title?: string; description?: string; variant?: string }) => void;
}

export const useVoiceInput = ({ onTranscription, supabaseClient, toast }: UseVoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать запись. Проверьте доступ к микрофону.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        
        if (!base64Audio) {
          throw new Error("Failed to convert audio to base64");
        }

        // Send to voice-to-text edge function
        const { data: transcriptionData, error: transcriptionError } = await supabaseClient.functions.invoke(
          "voice-to-text",
          {
            body: { audio: base64Audio },
          }
        );

        if (transcriptionError) throw transcriptionError;

        const transcribedText = transcriptionData.text;

        // Return raw transcription without correction
        // Correction will be applied by agent if selected
        onTranscription(transcribedText);
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать аудио",
        variant: "destructive",
      });
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
