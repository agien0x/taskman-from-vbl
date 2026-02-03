import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TableInfo {
  table_name: string;
  table_schema: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export const useDatabaseSchema = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [columnsByTable, setColumnsByTable] = useState<Record<string, ColumnInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const { data, error: functionError } = await supabase.functions.invoke('get-database-schema');

        if (functionError) {
          console.error('Error fetching schema:', functionError);
          setError(functionError.message);
          return;
        }

        if (data) {
          setTables(data.tables || []);
          setColumnsByTable(data.columnsByTable || {});
        }
      } catch (err) {
        console.error('Error in fetchSchema:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, []);

  const loadColumns = (tableName: string): ColumnInfo[] => {
    return columnsByTable[tableName] || [];
  };

  return {
    tables,
    loading,
    error,
    loadColumns,
  };
};
