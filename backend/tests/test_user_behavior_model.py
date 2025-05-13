import unittest
import networkx as nx
import sys
import os
import torch

# Add the parent directory to the path to import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.gnn import (
    GNNUserBehaviorPredictor, 
    NetworkDataProcessor
)

class TestUserBehaviorModel(unittest.TestCase):
    def setUp(self):
        # Create a simple test graph
        self.G = nx.karate_club_graph()
        
        # Ensure the graph has node attributes
        for node in self.G.nodes():
            self.G.nodes[node]['club'] = 'A' if node < 17 else 'B'
    
    def test_gnn_user_behavior_predictor_init(self):
        """Test the GNNUserBehaviorPredictor initialization"""
        model = GNNUserBehaviorPredictor(input_dim=1)
        
        # Check model structure
        self.assertIsNotNone(model.conv1)
        self.assertIsNotNone(model.conv2)
        self.assertIsNotNone(model.predictor)
    
    def test_gnn_user_behavior_predictor_forward(self):
        """Test the GNNUserBehaviorPredictor forward pass"""
        # Prepare data
        data = NetworkDataProcessor.prepare_graph_data(self.G)
        
        # Create model
        model = GNNUserBehaviorPredictor(input_dim=data.x.size(1))
        
        # Forward pass
        out = model(data.x, data.edge_index)
        
        # Check output dimensions
        self.assertEqual(out.shape[0], self.G.number_of_nodes())
        self.assertEqual(out.shape[1], 1)  # Default output_dim for activity prediction is 1
    
    def test_user_behavior_prediction_training(self):
        """Test the training loop for user behavior prediction"""
        # Prepare data
        data = NetworkDataProcessor.prepare_graph_data(self.G)
        
        # Create model and optimizer
        model = GNNUserBehaviorPredictor(input_dim=data.x.size(1))
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
        
        # Create mock activity data (using node degrees as proxy)
        degrees = torch.tensor([[d] for d in dict(self.G.degree()).values()], dtype=torch.float)
        if degrees.max() > 0:
            degrees = degrees / degrees.max()  # Normalize to [0,1]
        
        # Training loop (just a few epochs for testing)
        model.train()
        initial_loss = None
        final_loss = None
        
        for epoch in range(5):
            optimizer.zero_grad()
            
            # Forward pass
            out = model(data.x, data.edge_index)
            
            # Calculate loss
            loss = torch.nn.functional.mse_loss(out, degrees)
            
            # Record loss
            if epoch == 0:
                initial_loss = loss.item()
            if epoch == 4:
                final_loss = loss.item()
            
            # Backward pass
            loss.backward()
            optimizer.step()
        
        # Verify that training reduced the loss
        self.assertIsNotNone(initial_loss)
        self.assertIsNotNone(final_loss)
        self.assertLess(final_loss, initial_loss)
    
    def test_prediction_correlation_with_centrality(self):
        """Test if behavior predictions correlate with node centrality"""
        # Prepare data
        data = NetworkDataProcessor.prepare_graph_data(self.G)
        
        # Create and train model
        model = GNNUserBehaviorPredictor(input_dim=data.x.size(1))
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
        
        # Train for a few epochs
        for epoch in range(10):
            optimizer.zero_grad()
            out = model(data.x, data.edge_index)
            degrees = torch.tensor([[d] for d in dict(self.G.degree()).values()], dtype=torch.float)
            if degrees.max() > 0:
                degrees = degrees / degrees.max()
            loss = torch.nn.functional.mse_loss(out, degrees)
            loss.backward()
            optimizer.step()
        
        # Get predictions
        model.eval()
        with torch.no_grad():
            predictions = model(data.x, data.edge_index)
        
        # Convert to numpy for easier comparison
        predictions_np = predictions.numpy().flatten()
        
        # Get node degrees and betweenness centrality
        degrees = torch.tensor([d for d in dict(self.G.degree()).values()], dtype=torch.float).numpy()
        if degrees.max() > 0:
            degrees = degrees / degrees.max()
        
        betweenness = nx.betweenness_centrality(self.G)
        betweenness_values = torch.tensor([betweenness[n] for n in sorted(self.G.nodes())], dtype=torch.float).numpy()
        
        # Calculate correlation with degrees (should be positive since we trained on this)
        correlation_degrees = correlation(predictions_np, degrees)
        
        # Check for positive correlation with degrees
        self.assertGreater(correlation_degrees, 0.5, "Predictions should correlate with node degrees")
        
        # Betweenness centrality might also correlate, but less directly
        correlation_betweenness = correlation(predictions_np, betweenness_values)
        self.assertGreaterEqual(correlation_betweenness, 0.0, "Predictions should not negatively correlate with betweenness")


def correlation(x, y):
    """Calculate Pearson correlation coefficient between two arrays"""
    import numpy as np
    
    # Remove mean
    x_m = x - np.mean(x)
    y_m = y - np.mean(y)
    
    # Calculate correlation
    r_num = np.sum(x_m * y_m)
    r_den = np.sqrt(np.sum(x_m**2) * np.sum(y_m**2))
    
    # Handle division by zero
    if r_den == 0:
        return 0
    
    r = r_num / r_den
    return r


if __name__ == '__main__':
    unittest.main() 