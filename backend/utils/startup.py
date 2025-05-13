"""
Startup utilities for the Social Network Analysis System.
This module contains functions to be executed during application startup.
"""
import logging
import threading
import sys
import os
from pathlib import Path
import importlib.util

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('startup')

def import_module_from_path(module_name, file_path):
    """
    Import a module from a file path.
    
    Args:
        module_name: Name to assign to the module.
        file_path: Path to the module file.
        
    Returns:
        module: The imported module or None if import failed.
    """
    try:
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        logger.error(f"Failed to import module {module_name} from {file_path}: {str(e)}")
        return None

def start_file_monitor_thread():
    """
    Start the file monitoring process in a background thread.
    
    Returns:
        threading.Thread: The started thread.
    """
    try:
        logger.info("Starting file monitor in background thread")
        
        # Get the path to the file_monitor.py module
        file_monitor_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '../data/file_monitor.py')
        )
        
        # Import the module
        file_monitor = import_module_from_path('file_monitor', file_monitor_path)
        if not file_monitor:
            logger.error("Failed to import file_monitor module")
            return None
        
        # Create and start the thread
        monitor_thread = threading.Thread(
            target=file_monitor.start_monitoring,
            daemon=True  # Thread will be terminated when main process exits
        )
        monitor_thread.start()
        
        logger.info("File monitor thread started")
        return monitor_thread
        
    except Exception as e:
        logger.error(f"Failed to start file monitor thread: {str(e)}")
        return None

def process_existing_files():
    """
    Process any existing files in the input directory during startup.
    """
    try:
        logger.info("Processing existing files in input directory")
        
        # Get the path to the file_monitor.py module
        file_monitor_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '../data/file_monitor.py')
        )
        
        # Import the module
        file_monitor = import_module_from_path('file_monitor', file_monitor_path)
        if not file_monitor:
            logger.error("Failed to import file_monitor module")
            return
        
        # Get the input directory path
        input_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '../../data/input')
        )
        
        # Ensure directory exists
        os.makedirs(input_dir, exist_ok=True)
        
        # Process each file
        for filename in os.listdir(input_dir):
            file_path = os.path.join(input_dir, filename)
            if os.path.isfile(file_path):
                logger.info(f"Processing existing file: {file_path}")
                _, ext = os.path.splitext(file_path)
                if ext.lower() == '.csv':
                    network_data = file_monitor.NetworkDataProcessor.process_csv_file(file_path)
                    if network_data:
                        file_monitor.NetworkDataProcessor.save_network_data(network_data, file_path)
        
        logger.info("Finished processing existing files")
        
    except Exception as e:
        logger.error(f"Failed to process existing files: {str(e)}") 