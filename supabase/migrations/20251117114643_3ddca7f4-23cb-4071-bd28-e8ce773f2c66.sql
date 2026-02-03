-- Create function to get database schema information
CREATE OR REPLACE FUNCTION public.get_database_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables_data jsonb;
  columns_data jsonb;
  result jsonb;
BEGIN
  -- Get all tables in public schema
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'table_schema', table_schema
    )
  )
  INTO tables_data
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;

  -- Get all columns for public schema tables
  SELECT jsonb_object_agg(
    table_name,
    columns
  )
  INTO columns_data
  FROM (
    SELECT 
      table_name,
      jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable
        )
        ORDER BY ordinal_position
      ) as columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  ) t;

  -- Combine results
  result := jsonb_build_object(
    'tables', COALESCE(tables_data, '[]'::jsonb),
    'columnsByTable', COALESCE(columns_data, '{}'::jsonb)
  );

  RETURN result;
END;
$$;