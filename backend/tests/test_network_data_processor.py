"""
Unit tests for the NetworkDataProcessor class
"""
import unittest
import os
import json
import tempfile
import pandas as pd
import networkx as nx
from data.file_monitor import NetworkDataProcessor

class TestNetworkDataProcessor(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        # Create a temporary directory for test files
        self.test_dir = tempfile.TemporaryDirectory()
        
        # Create test CSV data
        self.csv_data = pd.DataFrame({
            'source': ['user1', 'user1', 'user2', 'user3'],
            'target': ['user2', 'user3', 'user4', 'user4'],
            'weight': [1.0, 2.0, 1.5, 3.0],
            'label': ['User 1', 'User 1', 'User 2', 'User 3']
        })
        
        # Create a test CSV file
        self.csv_file_path = os.path.join(self.test_dir.name, 'test_network.csv')
        self.csv_data.to_csv(self.csv_file_path, index=False)
        
        # Create test JSON data
        self.json_data = {
            'nodes': [
                {'id': 'node1', 'name': 'Node 1', 'group': 1},
                {'id': 'node2', 'name': 'Node 2', 'group': 1},
                {'id': 'node3', 'name': 'Node 3', 'group': 2}
            ],
            'links': [
                {'source': 'node1', 'target': 'node2', 'weight': 1.0},
                {'source': 'node1', 'target': 'node3', 'weight': 2.0}
            ]
        }
        
        # Create a test JSON file
        self.json_file_path = os.path.join(self.test_dir.name, 'test_network.json')
        with open(self.json_file_path, 'w') as f:
            json.dump(self.json_data, f)
        
        # Create test GraphML data
        self.G = nx.Graph()
        self.G.add_node('node1', name='Node 1', group=1)
        self.G.add_node('node2', name='Node 2', group=1)
        self.G.add_node('node3', name='Node 3', group=2)
        self.G.add_edge('node1', 'node2', weight=1.0)
        self.G.add_edge('node1', 'node3', weight=2.0)
        
        # Create a test GraphML file
        self.graphml_file_path = os.path.join(self.test_dir.name, 'test_network.graphml')
        nx.write_graphml(self.G, self.graphml_file_path)

    def tearDown(self):
        """Tear down test fixtures"""
        self.test_dir.cleanup()

    def test_process_csv_file(self):
        """Test processing a CSV file"""
        result = NetworkDataProcessor.process_csv_file(
            self.csv_file_path,
            node_id_field='source',
            node_label_field='label',
            source_field='source',
            target_field='target',
            weight_field='weight',
            anonymize=False,
            skip_first_row=False
        )
        
        # Check if the result is not None
        self.assertIsNotNone(result)
        
        # Check if the result has the expected structure
        self.assertIn('nodes', result)
        self.assertIn('edges', result)
        
        # Check if all nodes are processed
        unique_nodes = set(self.csv_data['source']).union(set(self.csv_data['target']))
        self.assertEqual(len(result['nodes']), len(unique_nodes))
        
        # Check if all edges are processed
        self.assertEqual(len(result['edges']), len(self.csv_data))
        
        # Verify edge weights
        edge_weights = {(e['source'], e['target']): e['weight'] for e in result['edges']}
        for _, row in self.csv_data.iterrows():
            self.assertEqual(edge_weights.get((row['source'], row['target'])), row['weight'])

    def test_process_json_file(self):
        """Test processing a JSON file"""
        result = NetworkDataProcessor.process_json_file(self.json_file_path)
        
        # Check if the result is not None
        self.assertIsNotNone(result)
        
        # Check if the result has the expected structure
        self.assertIn('nodes', result)
        self.assertIn('edges', result)
        
        # Check if all nodes are processed
        self.assertEqual(len(result['nodes']), len(self.json_data['nodes']))
        
        # Check if all edges are processed
        self.assertEqual(len(result['edges']), len(self.json_data['links']))
        
        # Verify node attributes (anonymized, so check count and structure)
        for node in result['nodes']:
            self.assertIn('id', node)
            self.assertIn('name', node)
            self.assertIn('group', node)

    def test_process_graphml_file(self):
        """Test processing a GraphML file"""
        result = NetworkDataProcessor.process_graphml_file(self.graphml_file_path)
        
        # Check if the result is not None
        self.assertIsNotNone(result)
        
        # Check if the result has the expected structure
        self.assertIn('nodes', result)
        self.assertIn('edges', result)
        
        # Check if all nodes are processed
        self.assertEqual(len(result['nodes']), self.G.number_of_nodes())
        
        # Check if all edges are processed
        self.assertEqual(len(result['edges']), self.G.number_of_edges())
        
        # Verify node attributes (anonymized, so check count and structure)
        for node in result['nodes']:
            self.assertIn('id', node)
            self.assertIn('name', node)
            self.assertIn('group', node)

    def test_save_network_data(self):
        """Test saving network data to a file"""
        # Create a simple network
        network_data = {
            'nodes': [
                {'id': 'node1', 'name': 'Node 1', 'group': 1},
                {'id': 'node2', 'name': 'Node 2', 'group': 1}
            ],
            'edges': [
                {'source': 'node1', 'target': 'node2', 'weight': 1.0}
            ]
        }
        
        # Create a temporary output directory
        output_dir = os.path.join(self.test_dir.name, 'output')
        os.makedirs(output_dir, exist_ok=True)
        
        # Original output directory
        original_output_dir = NetworkDataProcessor.OUTPUT_DIR
        try:
            # Override the output directory for testing
            NetworkDataProcessor.OUTPUT_DIR = output_dir
            
            # Save the network data
            output_path = NetworkDataProcessor.save_network_data(network_data, self.csv_file_path)
            
            # Check if the output path is not None
            self.assertIsNotNone(output_path)
            
            # Check if the file exists
            self.assertTrue(os.path.exists(output_path))
            
            # Read the saved file and verify its content
            with open(output_path, 'r') as f:
                saved_data = json.load(f)
            
            # Compare the original and saved data
            self.assertEqual(saved_data, network_data)
        finally:
            # Restore the original output directory
            NetworkDataProcessor.OUTPUT_DIR = original_output_dir


if __name__ == '__main__':
    unittest.main() 