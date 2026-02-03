import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const uploadImageToStorage = async (file: File): Promise<string | null> => {
  console.log('uploadImageToStorage called with file:', file.name, file.type, file.size);
  
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      toast({
        title: "Неподдерживаемый формат",
        description: "Пожалуйста, загрузите изображение в формате JPG, PNG, GIF или WEBP",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла: 5MB",
        variant: "destructive",
      });
      return null;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      toast({
        title: "Ошибка авторизации",
        description: "Пожалуйста, войдите в систему для загрузки изображений",
        variant: "destructive",
      });
      return null;
    }
    
    if (!user) {
      console.error('User not authenticated');
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в систему для загрузки изображений",
        variant: "destructive",
      });
      return null;
    }

    console.log('User authenticated:', user.id);

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    console.log('Uploading file to:', fileName);

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('task-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('task-images')
      .getPublicUrl(data.path);

    console.log('Public URL:', publicUrl);
    
    toast({
      title: "Изображение загружено",
      description: "Изображение успешно добавлено",
    });

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить изображение. Попробуйте ещё раз.",
      variant: "destructive",
    });
    return null;
  }
};
