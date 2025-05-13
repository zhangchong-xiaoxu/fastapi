"""
Integration tests for the Network API endpoints
"""
import unittest
import os
import tempfile
import json
import shutil
from fastapi.testclient import TestClient
from main import app

class TestNetworkAPI(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.client = TestClient(app)
        
        # Create temp directories for testing
        self.test_dir = tempfile.TemporaryDirectory()
        self.input_dir = os.path.join(self.test_dir.name, 'input')
        self.output_dir = os.path.join(self.test_dir.name, 'output')
        os.makedirs(self.input_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Save original directories
        from data.file_monitor import INPUT_DIR as ORIGINAL_INPUT_DIR
        from data.file_monitor import OUTPUT_DIR as ORIGINAL_OUTPUT_DIR
        self.original_input_dir = ORIGINAL_INPUT_DIR
        self.original_output_dir = ORIGINAL_OUTPUT_DIR
        
        # Set new directories
        import data.file_monitor
        data.file_monitor.INPUT_DIR = self.input_dir
        data.file_monitor.OUTPUT_DIR = self.output_dir
        
        # Set new directories in network API
        import api.network
        api.network.INPUT_DIR = self.input_dir
        api.network.OUTPUT_DIR = self.output_dir
        
        # Create a sample processed JSON file
        self.sample_network = {
            "nodes": [
                {"id": "node1", "name": "Node 1", "group": 1},
                {"id": "node2", "name": "Node 2", "group": 1},
                {"id": "node3", "name": "Node 3", "group": 2}
            ],
            "edges": [
                {"source": "node1", "target": "node2", "weight": 1.0},
                {"source": "node1", "target": "node3", "weight": 2.0}
            ]
        }
        
        self.test_file_path = os.path.join(self.output_dir, "test_network_processed.json")
        with open(self.test_file_path, 'w') as f:
            json.dump(self.sample_network, f)

    def tearDown(self):
        """Tear down test fixtures"""
        # Restore original directories
        import data.file_monitor
        data.file_monitor.INPUT_DIR = self.original_input_dir
        data.file_monitor.OUTPUT_DIR = self.original_output_dir
        
        import api.network
        api.network.INPUT_DIR = self.original_input_dir
        api.network.OUTPUT_DIR = self.original_output_dir
        
        # Clean up
        self.test_dir.cleanup()

    def test_get_network_data(self):
        """Test getting network data"""
        response = self.client.get("/api/network")
        self.assertEqual(response.status_code, 200)
        
        # Verify response structure
        data = response.json()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)

    def test_get_metrics(self):
        """Test getting network metrics"""
        response = self.client.get("/api/network/metrics")
        self.assertEqual(response.status_code, 200)
        
        # Verify response structure
        data = response.json()
        expected_metrics = ["node_count", "edge_count", "density", "average_degree"]
        for metric in expected_metrics:
            self.assertIn(metric, data)

    def test_list_files(self):
        """Test listing network files"""
        response = self.client.get("/api/network/files")
        self.assertEqual(response.status_code, 200)
        
        # Verify response is a list
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Verify it includes our test file
        self.assertTrue(any(item["filename"] == os.path.basename(self.test_file_path) for item in data))

    def test_get_snapshots(self):
        """Test getting network snapshots for comparison"""
        response = self.client.get("/api/network/snapshots")
        self.assertEqual(response.status_code, 200)
        
        # Verify response is a list
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Verify it includes our test file
        test_file_basename = os.path.basename(self.test_file_path)
        self.assertTrue(any(item["id"] == test_file_basename for item in data))

    def test_file_upload(self):
        """Test uploading a network file"""
        # Create a test CSV file
        csv_content = "source,target,weight\nuser1,user2,1.0\nuser1,user3,2.0\nuser2,user3,1.5"
        test_csv_path = os.path.join(self.test_dir.name, 'test_upload.csv')
        with open(test_csv_path, 'w') as f:
            f.write(csv_content)
        
        # Upload the file
        with open(test_csv_path, 'rb') as f:
            response = self.client.post(
                "/api/network/upload",
                files={"file": ("test_upload.csv", f, "text/csv")},
                data={
                    "nodeIdField": "source",
                    "nodeLabelField": "label",
                    "sourceLinkField": "source",
                    "targetLinkField": "target",
                    "weightField": "weight",
                    "anonymize": "true",
                    "skipFirstRow": "true"
                }
            )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("filename", data)
        self.assertIn("status", data)
        
        # Verify file was processed and saved
        expected_output_path = os.path.join(self.output_dir, "test_upload_processed.json")
        self.assertTrue(os.path.exists(expected_output_path))


if __name__ == '__main__':
    unittest.main() 