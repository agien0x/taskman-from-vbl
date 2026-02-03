export const uploadImageToStorage = async (
  file: File,
  supabaseClient: any,
  toast: (props: { title?: string; description?: string; variant?: string }) => void
): Promise<string | null> => {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Пожалуйста, загрузите изображение в формате JPG, PNG, GIF или WEBP",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла: 5MB",
        variant: "destructive",
      });
      return null;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage
    const { data, error } = await supabaseClient.storage
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

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('task-images')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить изображение",
      variant: "destructive",
    });
    return null;
  }
};
