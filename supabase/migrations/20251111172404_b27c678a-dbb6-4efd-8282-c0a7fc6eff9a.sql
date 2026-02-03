-- Добавляем поля для хранения сырого содержимого инпутов и правил роутинга
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS inputs_raw TEXT,
ADD COLUMN IF NOT EXISTS router_raw TEXT;