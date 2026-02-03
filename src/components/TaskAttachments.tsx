import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Image, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Attachment {
  url: string;
  name: string;
  size: number;
}

interface TaskAttachmentsProps {
  taskId: string;
  attachments: Attachment[];
  onUpdate: (attachments: Attachment[]) => void;
}

export const TaskAttachments = ({ taskId, attachments, onUpdate }: TaskAttachmentsProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Unique ID for file input to prevent conflicts when multiple instances exist
  const fileInputId = `file-upload-${taskId}`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Неверный формат",
            description: `${file.name} не является изображением`,
            variant: "destructive",
          });
          continue;
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(fileName);

        newAttachments.push({
          url: publicUrl,
          name: file.name,
          size: file.size,
        });
      }

      const updatedAttachments = [...attachments, ...newAttachments];

      // Update task with new attachments
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ attachments: updatedAttachments as any })
        .eq('id', taskId);

      if (updateError) throw updateError;

      onUpdate(updatedAttachments);

      toast({
        title: "Успешно",
        description: `Загружено изображений: ${newAttachments.length}`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      // Extract file path from URL
      const urlParts = attachment.url.split('/task-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('task-attachments')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // Update task
      const updatedAttachments = attachments.filter(a => a.url !== attachment.url);
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ attachments: updatedAttachments as any })
        .eq('id', taskId);

      if (updateError) throw updateError;

      onUpdate(updatedAttachments);

      toast({
        title: "Успешно",
        description: "Изображение удалено",
      });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить изображение",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Изображения</span>
        <Button
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => document.getElementById(fileInputId)?.click()}
          className="ml-auto"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Загрузка..." : "Загрузить"}
        </Button>
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {attachments && attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((attachment, index) => (
            <Card key={index} className="relative group overflow-hidden cursor-pointer" onClick={() => setPreviewImage(attachment.url)}>
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(attachment);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2">
                <p className="text-xs truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
