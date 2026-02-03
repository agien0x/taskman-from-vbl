# VibeCode Task Migration: Cloud to Supabase

This migration package enables transferring task data from external cloud-based task management systems to the VibeCode Supabase platform.

## 📋 Migration Overview

The migration process handles the complete transfer of task management data including:
- Core task data (titles, descriptions, priorities, dates)
- Task relationships and dependencies
- Task assignments and user permissions
- Comments and discussions
- Time tracking logs
- File attachments

## 🗂️ File Structure

```
migrations/
├── export_cloud_data.sql          # Export script for cloud systems
├── import_to_supabase.sql          # Import script for Supabase
├── migrate_cloud_to_supabase.sh    # Orchestration script
└── README.md                       # This documentation
```

## 🚀 Quick Start

### Prerequisites

1. **Database Access**
   - PostgreSQL client (`psql`) installed
   - Read access to source cloud database
   - Write access to VibeCode Supabase database

2. **Environment Variables**
   ```bash
   export CLOUD_DB_URL="postgresql://user:pass@host:port/dbname"
   export SUPABASE_DB_URL="postgresql://user:pass@host:port/dbname"
   ```

3. **Database Schema Preparation**
   - Ensure source database has the expected table structure
   - Review and modify export script if needed

### Execution Options

#### Option 1: Automated Migration (Recommended)
```bash
# Make script executable
chmod +x migrations/migrate_cloud_to_supabase.sh

# Run complete migration
./migrations/migrate_cloud_to_supabase.sh
```

#### Option 2: Manual Step-by-Step
```bash
# Step 1: Export data from cloud
psql "$CLOUD_DB_URL" -f migrations/export_cloud_data.sql > cloud_export.sql

# Step 2: Transform data (if needed)
# Apply custom transformations here

# Step 3: Import to Supabase
psql "$SUPABASE_DB_URL" -f migrations/import_to_supabase.sql
```

## 📊 Data Mapping

### Core Task Fields

| Cloud System | VibeCode Supabase | Notes |
|-------------|-------------------|-------|
| `id` | `id` | New UUID generated |
| `title` | `title` | Direct mapping |
| `description` | `content` | Field name change |
| `status` | `column_id` | Status to column mapping |
| `priority` | `priority` | Enum mapping |
| `assignee` | `owner_id` | User mapping |
| `start_date` | `start_date` | Direct mapping |
| `due_date` | `end_date` | Field name change |
| `estimated_hours` | `planned_hours` | Field name change |

### Priority Mapping

| Cloud Priority | Supabase Priority |
|----------------|-------------------|
| `low` | `low` |
| `medium` | `medium` |
| `high` | `high` |
| `null`/`none` | `none` |

### Status to Column Mapping

| Cloud Status | Supabase Column |
|--------------|------------------|
| `todo` | `todo` |
| `in_progress` | `in-progress` |
| `done` | `done` |
| `backlog` | `backlog` |

## 🔧 Customization

### Adapting Export Script

Modify `export_cloud_data.sql` to match your cloud database schema:

```sql
-- Update table and column names in SELECT statements
SELECT 
    your_id_field as task_id,
    your_title_field as title,
    -- Map other fields accordingly
FROM your_tasks_table
WHERE your_condition;
```

### Data Transformations

For complex transformations, add processing between export and import:

```bash
# Example: Using Python for transformation
python3 transform_data.py cloud_export.sql > transformed_export.sql
```

### Import Modifications

Customize `import_to_supabase.sql` for:
- Additional field mappings
- Business logic during import
- Custom validation rules

## 🔍 Verification

### Automatic Verification
The migration script automatically runs verification queries that show:
- Number of imported tasks
- Number of imported relationships
- Number of imported assignments
- Data consistency checks

### Manual Verification
Run these queries to verify migration success:

```sql
-- Check task count
SELECT COUNT(*) FROM public.tasks;

-- Check task relationships
SELECT COUNT(*) FROM public.task_relations;

-- Check assignments
SELECT COUNT(*) FROM public.task_assignments;

-- Verify data integrity
SELECT 
    t.id,
    t.title,
    COUNT(tr.child_id) as child_count
FROM public.tasks t
LEFT JOIN public.task_relations tr ON t.id = tr.parent_id
GROUP BY t.id, t.title
ORDER BY child_count DESC;
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Test connection
psql "$CLOUD_DB_URL" -c "SELECT 1;"
psql "$SUPABASE_DB_URL" -c "SELECT 1;"
```

#### Permission Errors
- Ensure PostgreSQL user has read access to source database
- Ensure Supabase user has write access to target tables
- Check RLS policies on Supabase tables

#### Data Type Mismatches
```sql
-- Check data types before import
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'your_table';
```

#### Large Dataset Performance
- Export data in batches using LIMIT/OFFSET
- Disable indexes during import
- Increase memory allocation for psql

### Recovery

#### Rollback Failed Migration
```sql
-- Clean up partial import
TRUNCATE TABLE public.task_assignments CASCADE;
TRUNCATE TABLE public.task_relations CASCADE;
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.time_logs CASCADE;
TRUNCATE TABLE public.task_versions CASCADE;
TRUNCATE TABLE public.tasks CASCADE;
```

#### Partial Migration Recovery
```sql
-- Find last successfully imported record
SELECT MAX(created_at) FROM public.tasks;

-- Resume from that point
-- (Modify import script with WHERE clause)
```

## 📈 Performance Optimization

### For Large Datasets (>10,000 tasks)
1. **Batch Processing**
   ```sql
   -- Process in batches of 1000 records
   WHERE id BETWEEN 1 AND 1000
   ```

2. **Index Management**
   ```sql
   -- Drop indexes before import
   DROP INDEX IF EXISTS idx_tasks_column_id;
   
   -- Recreate after import
   CREATE INDEX idx_tasks_column_id ON public.tasks(column_id);
   ```

3. **Memory Settings**
   ```bash
   export PGPAGER=cat
   export PGCLIENTENCODING=UTF8
   ```

## 🔄 Maintenance

### Post-Migration Tasks
1. Update application configuration
2. Verify user permissions
3. Test all task operations
4. Update documentation
5. Train users on new system

### Monitoring
Set up monitoring for:
- Database performance
- Task creation/update rates
- User adoption metrics
- Error rates

## 📞 Support

For migration assistance:
1. Check this documentation first
2. Review log files generated during migration
3. Verify all prerequisites are met
4. Test with a small dataset first

## 📝 Changelog

### v1.0.0
- Initial migration framework
- Support for core task data
- Relationship and assignment migration
- Automated verification
- Rollback capabilities