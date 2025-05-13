"""
File monitoring module for the Social Network Analysis System.
This module watches for changes in the data input directory and processes new files.
"""
import os
import time
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import hashlib
import pandas as pd
import networkx as nx
import json
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('file_monitor')

# Input and output directories
INPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/input'))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/output'))

# Ensure directories exist
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

class NetworkDataProcessor:
    """Processes network data files into anonymized graph format."""

    @staticmethod
    def anonymize_user_id(user_id):
        """
        Anonymize a user ID using SHA-256 hashing.
        
        Args:
            user_id: The original user ID.
            
        Returns:
            str: Anonymized user ID hash.
        """
        # Convert to string if not already
        user_id_str = str(user_id)
        # Create SHA-256 hash
        hash_obj = hashlib.sha256(user_id_str.encode())
        # Return hex digest
        return hash_obj.hexdigest()

    @staticmethod
    def process_csv_file(file_path, node_id_field='source', node_label_field='label', 
                        source_field='source', target_field='target', weight_field='weight',
                        anonymize=True, skip_first_row=True):
        """
        Process a CSV file containing network data.
        
        Args:
            file_path: Path to the CSV file.
            node_id_field: Field name for node ID.
            node_label_field: Field name for node label.
            source_field: Field name for edge source.
            target_field: Field name for edge target.
            weight_field: Field name for edge weight.
            anonymize: Whether to anonymize node IDs.
            skip_first_row: Whether to skip the first row.
            
        Returns:
            dict: Processed network data with nodes and edges.
        """
        try:
            # Read the CSV file - using custom field names
            df = pd.read_csv(file_path, skiprows=1 if skip_first_row else 0)
            
            # Check if required columns exist
            required_cols = [source_field, target_field]
            if not all(col in df.columns for col in required_cols):
                logger.error(f"Missing required columns in {file_path}")
                return None
            
            # Create empty network data structure
            network_data = {
                'nodes': [],
                'edges': []
            }
            
            # Process nodes (unique sources and targets)
            unique_nodes = set(df[source_field].unique()) | set(df[target_field].unique())
            node_mapping = {}  # Original ID to anonymized ID
            
            for node_id in unique_nodes:
                anon_id = NetworkDataProcessor.anonymize_user_id(node_id) if anonymize else str(node_id)
                node_mapping[str(node_id)] = anon_id
                
                # Add node to the data
                node_name = f"User {anon_id[:8]}"  # Default name
                
                # Try to get node label if the field exists
                if node_label_field in df.columns:
                    # Find the first occurrence of this node in any row
                    matching_rows = df[(df[source_field] == node_id) | (df[target_field] == node_id)]
                    if not matching_rows.empty and not pd.isna(matching_rows.iloc[0].get(node_label_field, None)):
                        node_name = str(matching_rows.iloc[0][node_label_field])
                
                network_data['nodes'].append({
                    'id': anon_id,
                    'name': node_name,
                    'group': 1  # Default group, can be updated based on community detection
                })
            
            # Process edges
            for _, row in df.iterrows():
                source_id = str(row[source_field])
                target_id = str(row[target_field])
                
                # Skip if source or target not in mapping (shouldn't happen with the code above)
                if source_id not in node_mapping or target_id not in node_mapping:
                    continue
                
                # Get anonymized IDs
                anon_source = node_mapping[source_id]
                anon_target = node_mapping[target_id]
                
                # Add edge with weight (default 1 if not present)
                weight = 1
                if weight_field in df.columns:
                    try:
                        weight = float(row[weight_field])
                    except (ValueError, TypeError):
                        weight = 1
                
                network_data['edges'].append({
                    'source': anon_source,
                    'target': anon_target,
                    'weight': weight
                })
            
            return network_data
            
        except Exception as e:
            logger.error(f"Error processing CSV file {file_path}: {str(e)}")
            return None

    @staticmethod
    def process_json_file(file_path):
        """
        Process a JSON file containing network data.
        
        Args:
            file_path: Path to the JSON file.
            
        Returns:
            dict: Processed network data with nodes and edges.
        """
        try:
            # Read the JSON file
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Check if required structure exists (nodes and links/edges)
            if 'nodes' not in data:
                logger.error(f"Missing 'nodes' in JSON file {file_path}")
                return None
                
            # Links might be called 'links' or 'edges'
            edges_key = 'links' if 'links' in data else 'edges'
            if edges_key not in data:
                logger.error(f"Missing '{edges_key}' in JSON file {file_path}")
                return None
            
            # Create empty network data structure
            network_data = {
                'nodes': [],
                'edges': []
            }
            
            # Process nodes
            node_mapping = {}  # Original ID to anonymized ID
            
            for node in data['nodes']:
                if 'id' not in node:
                    logger.warning(f"Node without ID in {file_path}, skipping")
                    continue
                    
                node_id = str(node['id'])
                anon_id = NetworkDataProcessor.anonymize_user_id(node_id)
                node_mapping[node_id] = anon_id
                
                # Get node name if available, otherwise use anonymized ID
                name = node.get('name', node.get('label', f"User {anon_id[:8]}"))
                
                # Get group/community if available
                group = node.get('group', node.get('community', 1))
                
                # Add node to the data
                network_data['nodes'].append({
                    'id': anon_id,
                    'name': name,
                    'group': group
                })
            
            # Process edges
            for edge in data[edges_key]:
                source_key = 'source' if 'source' in edge else 'from'
                target_key = 'target' if 'target' in edge else 'to'
                
                if source_key not in edge or target_key not in edge:
                    logger.warning(f"Edge without source/target in {file_path}, skipping")
                    continue
                
                source_id = str(edge[source_key])
                target_id = str(edge[target_key])
                
                # Skip if source or target not in mapping
                if source_id not in node_mapping or target_id not in node_mapping:
                    logger.warning(f"Edge references unknown node: {source_id}->{target_id}")
                    continue
                
                # Get anonymized IDs
                anon_source = node_mapping[source_id]
                anon_target = node_mapping[target_id]
                
                # Get weight if available
                weight = edge.get('weight', edge.get('value', 1))
                
                network_data['edges'].append({
                    'source': anon_source,
                    'target': anon_target,
                    'weight': float(weight)
                })
            
            return network_data
            
        except Exception as e:
            logger.error(f"Error processing JSON file {file_path}: {str(e)}")
            return None

    @staticmethod
    def process_graphml_file(file_path):
        """
        Process a GraphML file containing network data.
        
        Args:
            file_path: Path to the GraphML file.
            
        Returns:
            dict: Processed network data with nodes and edges.
        """
        try:
            # Read the GraphML file using NetworkX
            G = nx.read_graphml(file_path)
            
            # Create empty network data structure
            network_data = {
                'nodes': [],
                'edges': []
            }
            
            # Process nodes
            node_mapping = {}  # Original ID to anonymized ID
            
            for node_id in G.nodes():
                anon_id = NetworkDataProcessor.anonymize_user_id(node_id)
                node_mapping[node_id] = anon_id
                
                # Get node attributes
                node_attrs = G.nodes[node_id]
                name = node_attrs.get('name', node_attrs.get('label', f"User {anon_id[:8]}"))
                group = node_attrs.get('group', node_attrs.get('community', 1))
                
                # Add node to the data
                network_data['nodes'].append({
                    'id': anon_id,
                    'name': name,
                    'group': int(group) if isinstance(group, (int, float, str)) else 1
                })
            
            # Process edges
            for source, target, edge_attrs in G.edges(data=True):
                # Get anonymized IDs
                anon_source = node_mapping[source]
                anon_target = node_mapping[target]
                
                # Get weight if available
                weight = edge_attrs.get('weight', edge_attrs.get('value', 1))
                
                network_data['edges'].append({
                    'source': anon_source,
                    'target': anon_target,
                    'weight': float(weight)
                })
            
            return network_data
            
        except Exception as e:
            logger.error(f"Error processing GraphML file {file_path}: {str(e)}")
            return None

    @staticmethod
    def save_network_data(network_data, original_file_path):
        """
        Save processed network data to output directory.
        
        Args:
            network_data: The network data to save.
            original_file_path: The original input file path.
            
        Returns:
            str: Path to the saved output file.
        """
        try:
            if not network_data:
                return None
            
            # Create output filename based on input file
            input_filename = os.path.basename(original_file_path)
            filename_without_ext = os.path.splitext(input_filename)[0]
            output_filename = f"{filename_without_ext}_processed.json"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            # Save as JSON
            with open(output_path, 'w') as f:
                json.dump(network_data, f, indent=2)
            
            # Also copy to frontend public directory for easy access
            frontend_public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../frontend/public/data/network'))
            os.makedirs(frontend_public_dir, exist_ok=True)
            frontend_output_path = os.path.join(frontend_public_dir, output_filename)
            
            try:
                # Copy to frontend directory
                with open(frontend_output_path, 'w') as f:
                    json.dump(network_data, f, indent=2)
                logger.info(f"Network data also copied to frontend public directory: {frontend_output_path}")
            except Exception as copy_err:
                logger.warning(f"Could not copy to frontend directory: {str(copy_err)}")
            
            logger.info(f"Network data saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error saving network data: {str(e)}")
            return None


class InputFileHandler(FileSystemEventHandler):
    """Handles file system events for the input directory."""
    
    def on_created(self, event):
        """
        Handle file creation event.
        
        Args:
            event: The file system event.
        """
        if event.is_directory:
            return
        
        file_path = event.src_path
        logger.info(f"New file detected: {file_path}")
        
        # Process after a short delay to ensure file is fully written
        time.sleep(1)
        self._process_file(file_path)
    
    def on_modified(self, event):
        """
        Handle file modification event.
        
        Args:
            event: The file system event.
        """
        if event.is_directory:
            return
        
        file_path = event.src_path
        logger.info(f"File modified: {file_path}")
        
        # Process after a short delay to ensure file is fully written
        time.sleep(1)
        self._process_file(file_path)
    
    def _process_file(self, file_path):
        """
        Process a file based on its extension.
        
        Args:
            file_path: Path to the file to process.
        """
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()  # Normalize extension to lowercase
        
        if ext == '.csv':
            logger.info(f"Processing CSV file: {file_path}")
            network_data = NetworkDataProcessor.process_csv_file(file_path)
            if network_data:
                output_path = NetworkDataProcessor.save_network_data(network_data, file_path)
                if output_path:
                    logger.info(f"Successfully processed {file_path} to {output_path}")
        elif ext == '.json':
            logger.info(f"Processing JSON file: {file_path}")
            network_data = NetworkDataProcessor.process_json_file(file_path)
            if network_data:
                output_path = NetworkDataProcessor.save_network_data(network_data, file_path)
                if output_path:
                    logger.info(f"Successfully processed {file_path} to {output_path}")
        elif ext == '.graphml':
            logger.info(f"Processing GraphML file: {file_path}")
            network_data = NetworkDataProcessor.process_graphml_file(file_path)
            if network_data:
                output_path = NetworkDataProcessor.save_network_data(network_data, file_path)
                if output_path:
                    logger.info(f"Successfully processed {file_path} to {output_path}")
        else:
            logger.warning(f"Unsupported file type: {ext}")


def start_monitoring():
    """Start the file monitoring process."""
    logger.info(f"Starting file monitoring in {INPUT_DIR}")
    
    event_handler = InputFileHandler()
    observer = Observer()
    observer.schedule(event_handler, INPUT_DIR, recursive=False)
    observer.start()
    
    try:
        # Keep the observer running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    
    observer.join()


if __name__ == "__main__":
    # Process any existing files first
    for filename in os.listdir(INPUT_DIR):
        file_path = os.path.join(INPUT_DIR, filename)
        if os.path.isfile(file_path):
            logger.info(f"Processing existing file: {file_path}")
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            if ext == '.csv':
                network_data = NetworkDataProcessor.process_csv_file(file_path)
                if network_data:
                    NetworkDataProcessor.save_network_data(network_data, file_path)
            elif ext == '.json':
                network_data = NetworkDataProcessor.process_json_file(file_path)
                if network_data:
                    NetworkDataProcessor.save_network_data(network_data, file_path)
            elif ext == '.graphml':
                network_data = NetworkDataProcessor.process_graphml_file(file_path)
                if network_data:
                    NetworkDataProcessor.save_network_data(network_data, file_path)
            else:
                logger.warning(f"Skipping unsupported file type: {ext}")
    
    # Start monitoring for new files
    start_monitoring() 