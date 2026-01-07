import hashlib
import sys
import os
import json
from pathlib import Path

def compute_sha256(file_path, show_progress=True):
    """
    Compute SHA256 hash of a file
    
    Args:
        file_path: Path to the file
        show_progress: Whether to show progress for large files
    
    Returns:
        Hex digest of the hash or None on error
    """
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{file_path}' not found.")
        return None

    file_size = os.path.getsize(file_path)
    sha256_hash = hashlib.sha256()
    
    try:
        with open(file_path, "rb") as f:
            bytes_read = 0
            # Read and update hash in blocks of 4K
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
                bytes_read += len(byte_block)
                
                # Show progress for files larger than 1MB
                if show_progress and file_size > 1024 * 1024:
                    progress = (bytes_read / file_size) * 100
                    print(f"\rHashing: {progress:.1f}%", end='', flush=True)
            
            if show_progress and file_size > 1024 * 1024:
                print()  # New line after progress
                
        return sha256_hash.hexdigest()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return None

def format_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def process_file(file_path, output_json=False):
    """Process a single file and return hash information"""
    file_hash = compute_sha256(file_path)
    
    if not file_hash:
        return None
    
    file_info = {
        'file': str(file_path),
        'hash': file_hash,
        'size': os.path.getsize(file_path),
        'size_formatted': format_size(os.path.getsize(file_path))
    }
    
    if output_json:
        print(json.dumps(file_info, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"📄 File: {file_info['file']}")
        print(f"📊 Size: {file_info['size_formatted']}")
        print(f"🔐 SHA256: {file_info['hash']}")
        print(f"{'='*60}\n")
    
    return file_info

def batch_process(directory, pattern="*", output_json=False):
    """Process multiple files in a directory"""
    path = Path(directory)
    files = list(path.glob(pattern))
    
    if not files:
        print(f"❌ No files found matching pattern '{pattern}' in {directory}")
        return []
    
    print(f"📁 Processing {len(files)} file(s)...\n")
    
    results = []
    for file_path in files:
        if file_path.is_file():
            result = process_file(file_path, output_json=False)
            if result:
                results.append(result)
    
    if output_json:
        print(json.dumps(results, indent=2))
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Single file:  python compute_hash.py <file_path> [--json]")
        print("  Batch mode:   python compute_hash.py --batch <directory> [--pattern <pattern>] [--json]")
        print("\nExamples:")
        print("  python compute_hash.py model.h5")
        print("  python compute_hash.py model.h5 --json")
        print("  python compute_hash.py --batch ./models")
        print("  python compute_hash.py --batch ./models --pattern '*.h5'")
        sys.exit(1)
    
    output_json = '--json' in sys.argv
    
    if '--batch' in sys.argv:
        batch_idx = sys.argv.index('--batch')
        if batch_idx + 1 >= len(sys.argv):
            print("❌ Error: --batch requires a directory path")
            sys.exit(1)
        
        directory = sys.argv[batch_idx + 1]
        pattern = "*"
        
        if '--pattern' in sys.argv:
            pattern_idx = sys.argv.index('--pattern')
            if pattern_idx + 1 < len(sys.argv):
                pattern = sys.argv[pattern_idx + 1]
        
        batch_process(directory, pattern, output_json)
    else:
        file_path = sys.argv[1]
        process_file(file_path, output_json)
