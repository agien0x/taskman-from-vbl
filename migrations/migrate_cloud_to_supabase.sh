#!/bin/bash

# =============================================================================
# VibeCode Task Migration: Cloud to Supabase
# =============================================================================
# This script orchestrates the complete migration from external cloud systems
# to the VibeCode Supabase platform.

set -e  # Exit on any error

# Configuration
# =============================================================================
MIGRATION_DIR="./migrations"
EXPORT_SCRIPT="$MIGRATION_DIR/export_cloud_data.sql"
IMPORT_SCRIPT="$MIGRATION_DIR/import_to_supabase.sql"
LOG_FILE="$MIGRATION_DIR/migration_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required files exist
    if [[ ! -f "$EXPORT_SCRIPT" ]]; then
        error "Export script not found: $EXPORT_SCRIPT"
        exit 1
    fi
    
    if [[ ! -f "$IMPORT_SCRIPT" ]]; then
        error "Import script not found: $IMPORT_SCRIPT"
        exit 1
    fi
    
    # Check if PostgreSQL client is available
    if ! command -v psql &> /dev/null; then
        error "psql is not installed or not in PATH"
        exit 1
    fi
    
    # Check if required environment variables are set
    if [[ -z "$SUPABASE_DB_URL" ]]; then
        error "SUPABASE_DB_URL environment variable is not set"
        exit 1
    fi
    
    if [[ -z "$CLOUD_DB_URL" ]]; then
        error "CLOUD_DB_URL environment variable is not set"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Export data from cloud system
export_cloud_data() {
    log "Exporting data from cloud system..."
    
    # Create export directory
    EXPORT_DIR="$MIGRATION_DIR/export_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$EXPORT_DIR"
    
    # Export each data type
    psql "$CLOUD_DB_URL" -f "$EXPORT_SCRIPT" > "$EXPORT_DIR/cloud_export.sql"
    
    # Verify export
    if [[ $? -ne 0 ]]; then
        error "Cloud data export failed"
        exit 1
    fi
    
    success "Cloud data exported to: $EXPORT_DIR"
    echo "$EXPORT_DIR" > "$MIGRATION_DIR/last_export_dir.txt"
}

# Transform exported data to match VibeCode schema
transform_data() {
    log "Transforming data for VibeCode schema..."
    
    EXPORT_DIR=$(cat "$MIGRATION_DIR/last_export_dir.txt")
    TRANSFORMED_DIR="$EXPORT_DIR/transformed"
    mkdir -p "$TRANSFORMED_DIR"
    
    # Apply transformations using sed/awk or Python if needed
    # This is a placeholder for any data transformation logic
    
    success "Data transformation completed"
}

# Import data into Supabase
import_to_supabase() {
    log "Importing data into Supabase..."
    
    EXPORT_DIR=$(cat "$MIGRATION_DIR/last_export_dir.txt")
    
    # Execute import script with data
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$IMPORT_SCRIPT"
    
    if [[ $? -ne 0 ]]; then
        error "Supabase import failed"
        exit 1
    fi
    
    success "Data imported into Supabase"
}

# Verify migration integrity
verify_migration() {
    log "Verifying migration integrity..."
    
    # Run verification queries
    VERIFICATION_SQL="
    -- Count imported records
    SELECT 
        'tasks' as table_name, 
        COUNT(*) as record_count 
    FROM public.tasks
    
    UNION ALL
    
    SELECT 
        'task_relations' as table_name, 
        COUNT(*) as record_count 
    FROM public.task_relations
    
    UNION ALL
    
    SELECT 
        'task_assignments' as table_name, 
        COUNT(*) as record_count 
    FROM public.task_assignments
    ORDER BY table_name;
    "
    
    echo "Migration Verification Results:" | tee -a "$LOG_FILE"
    psql "$SUPABASE_DB_URL" -c "$VERIFICATION_SQL" | tee -a "$LOG_FILE"
    
    success "Migration verification completed"
}

# Cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."
    
    find "$MIGRATION_DIR" -name "temp_*" -type f -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main execution
main() {
    log "Starting VibeCode task migration from Cloud to Supabase"
    log "Migration started at: $(date)"
    
    # Create migration directory if it doesn't exist
    mkdir -p "$MIGRATION_DIR"
    
    # Execute migration steps
    check_prerequisites
    export_cloud_data
    transform_data
    import_to_supabase
    verify_migration
    cleanup
    
    log "Migration completed successfully at: $(date)"
    success "All migration tasks completed!"
    
    # Display summary
    echo ""
    echo "=== Migration Summary ==="
    echo "Log file: $LOG_FILE"
    echo "Export directory: $(cat "$MIGRATION_DIR/last_export_dir.txt" 2>/dev/null || echo 'Not available')"
    echo "Completion time: $(date)"
    echo ""
}

# Handle script interruption
trap 'error "Script interrupted by user"; cleanup; exit 1' INT

# Error handling
trap 'error "Script failed during execution"; cleanup; exit 1' ERR

# Execute main function
main "$@"