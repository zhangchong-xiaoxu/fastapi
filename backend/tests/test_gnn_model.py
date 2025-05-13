import unittest
import networkx as nx
import sys
import os
import torch

# Add the parent directory to the path to import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.gnn import (
    GNNLinkPredictor, 
    GNNUserBehaviorPredictor, 
    NetworkDataProcessor,
    predict_new_links,
    train_link_prediction_model
)


class TestGNNModel(unittest.TestCase):
    def setUp(self):
        # Create a simple test graph
        self.G = nx.karate_club_graph()
        
        # Ensure the graph has node attributes
        for node in self.G.nodes():
            self.G.nodes[node]['club'] = 'A' if node < 17 else 'B'
    
    def test_network_data_processor(self):
        """Test the NetworkDataProcessor's graph data preparation"""
        data = NetworkDataProcessor.prepare_graph_data(self.G)
        
        # Check that the PyTorch Geometric Data object is properly created
        self.assertIsNotNone(data)
        self.assertEqual(data.x.shape[0], self.G.number_of_nodes())
        self.assertEqual(data.edge_index.shape[1], 2 * self.G.number_of_edges())  # undirected = 2x edges
    
    def test_link_prediction_data_preparation(self):
        """Test the link prediction data preparation"""
        train_data, test_edges, test_negatives = NetworkDataProcessor.prepare_link_prediction_data(
            self.G, test_ratio=0.1
        )
        
        # Check that train data is valid
        self.assertIsNotNone(train_data)
        
        # Check that test edges are selected
        test_edge_count = int(self.G.number_of_edges() * 0.1)
        self.assertLessEqual(len(test_edges), test_edge_count + 1)  # Allow for rounding
        
        # Check that negative samples exist
        self.assertGreater(len(test_negatives), 0)
        
        # Check that test edges are not in the training graph
        for source, target in test_edges:
            edge_in_train_data = False
            for i in range(train_data.edge_index.shape[1]):
                if (train_data.edge_index[0, i].item() == source and 
                    train_data.edge_index[1, i].item() == target):
                    edge_in_train_data = True
                    break
            self.assertFalse(edge_in_train_data)
    
    def test_gnn_link_predictor_forward(self):
        """Test the GNN Link Predictor forward pass"""
        # Prepare data
        data = NetworkDataProcessor.prepare_graph_data(self.G)
        
        # Create model
        model = GNNLinkPredictor(input_dim=data.x.size(1))
        
        # Forward pass
        embeddings = model(data.x, data.edge_index)
        
        # Check output dimensions
        self.assertEqual(embeddings.shape[0], self.G.number_of_nodes())
        self.assertEqual(embeddings.shape[1], 32)  # Default output_dim
    
    def test_link_prediction(self):
        """Test link prediction functionality"""
        # Skip if CUDA is not available to avoid slow tests
        if not torch.cuda.is_available():
            model = train_link_prediction_model(self.G, epochs=2)  # Very few epochs for testing
            predictions = predict_new_links(self.G, model, top_k=5)
            
            # Check that predictions are returned
            self.assertEqual(len(predictions), 5)
            
            # Check prediction format
            for source, target, score in predictions:
                self.assertIsInstance(source, int)
                self.assertIsInstance(target, int)
                self.assertIsInstance(score, float)
                self.assertGreaterEqual(score, 0.0)
                self.assertLessEqual(score, 1.0)
                
                # Ensure the predicted link doesn't already exist
                self.assertFalse(self.G.has_edge(source, target))


if __name__ == '__main__':
    unittest.main() 