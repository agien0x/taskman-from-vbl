-- Fix existing function by moving ORDER BY inside jsonb_agg
CREATE OR REPLACE FUNCTION public.get_database_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tables_data jsonb;
  columns_data jsonb;
  result jsonb;
BEGIN
  -- Get all tables in public schema with ORDER BY inside jsonb_agg
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'table_schema', table_schema
    )
    ORDER BY table_name
  )
  INTO tables_data
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

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
$function$;

-- Create simple function to get list of tables
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TABLE(table_name text, table_schema text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT table_name::text, table_schema::text
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$function$;

-- Create simple function to get columns for a specific table
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT column_name::text, data_type::text, is_nullable::text
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ORDER BY ordinal_position;
$function$;