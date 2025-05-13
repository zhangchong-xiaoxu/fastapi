import torch
import torch.nn as nn
import torch.nn.functional as F
import networkx as nx
import numpy as np
import time
import os
import joblib
import warnings

# Flag to track if torch_geometric is available
TORCH_GEOMETRIC_AVAILABLE = False

try:
    from torch_geometric.nn import GCNConv, GATConv
    from torch_geometric.data import Data
    from torch_geometric.utils import from_networkx
    from torch_sparse import SparseTensor
    from torch_geometric.utils import to_undirected, to_dense_adj
    from torch_geometric.nn import SAGEConv
    TORCH_GEOMETRIC_AVAILABLE = True
except ImportError:
    warnings.warn("torch_geometric not installed. GNN functionality will be limited.")


class GNNLinkPredictor(nn.Module):
    """
    Graph Neural Network model for link prediction in social networks.
    Uses a Graph Convolutional Network (GCN) architecture.
    """
    def __init__(self, input_dim, hidden_dim=64, output_dim=32):
        super(GNNLinkPredictor, self).__init__()
        self.conv1 = GCNConv(input_dim, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, output_dim)
        self.predictor = nn.Sequential(
            nn.Linear(output_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x, edge_index):
        # Node embedding
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.3, training=self.training)
        x = self.conv2(x, edge_index)
        return x
    
    def predict_link(self, x, node_pairs):
        # For each node pair, concatenate node embeddings and predict link probability
        src_embs = x[node_pairs[:, 0]]
        dst_embs = x[node_pairs[:, 1]]
        combined = torch.cat([src_embs, dst_embs], dim=1)
        return self.predictor(combined)


class GNNUserBehaviorPredictor(nn.Module):
    """
    Graph Neural Network model for predicting user behavior based on network structure
    and user features using Graph Attention Networks (GAT).
    """
    def __init__(self, input_dim, hidden_dim=64, output_dim=1):
        super(GNNUserBehaviorPredictor, self).__init__()
        self.conv1 = GATConv(input_dim, hidden_dim, heads=4, dropout=0.3)
        self.conv2 = GATConv(hidden_dim * 4, hidden_dim, heads=1, dropout=0.3)
        self.predictor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, output_dim)
        )
        
    def forward(self, x, edge_index):
        # Node embedding
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        x = self.conv2(x, edge_index)
        x = F.elu(x)
        
        # Activity prediction
        return self.predictor(x)


class NetworkDataProcessor:
    """
    Utility class to convert NetworkX graphs to PyTorch Geometric Data objects
    and prepare data for training GNN models.
    """
    @staticmethod
    def prepare_graph_data(G, node_features=None):
        """
        Convert NetworkX graph to PyTorch Geometric Data object
        
        Args:
            G: NetworkX graph
            node_features: Dictionary mapping node IDs to feature vectors
                          If None, uses node degree as the only feature
        
        Returns:
            PyTorch Geometric Data object
        """
        # If no features provided, use node degree as feature
        if node_features is None:
            # Get node degrees
            degrees = dict(G.degree())
            # Sort nodes to ensure consistent order
            sorted_nodes = sorted(G.nodes())
            # Create feature matrix (1D for now - just degree)
            x = torch.tensor([[degrees[node]] for node in sorted_nodes], dtype=torch.float)
            # Create node mapping for edge indices
            node_mapping = {node: i for i, node in enumerate(sorted_nodes)}
        else:
            # Use provided features
            sorted_nodes = sorted(G.nodes())
            x = torch.tensor([node_features[node] for node in sorted_nodes], dtype=torch.float)
            node_mapping = {node: i for i, node in enumerate(sorted_nodes)}
        
        # Create edge index
        edge_index = []
        for src, dst in G.edges():
            edge_index.append([node_mapping[src], node_mapping[dst]])
            # For undirected graphs, add reverse edge
            if not G.is_directed():
                edge_index.append([node_mapping[dst], node_mapping[src]])
        
        edge_index = torch.tensor(edge_index, dtype=torch.long).t()
        
        return Data(x=x, edge_index=edge_index)
    
    @staticmethod
    def prepare_link_prediction_data(G, test_ratio=0.1):
        """
        Prepare data for link prediction task
        
        Args:
            G: NetworkX graph
            test_ratio: Ratio of edges to use for testing
        
        Returns:
            train_data: Data object with training edges
            test_edges: Edges removed for testing
            test_negatives: Negative samples (non-edges) for testing
        """
        # Make a copy of the graph
        train_G = G.copy()
        
        # Split edges into train and test
        all_edges = list(G.edges())
        np.random.shuffle(all_edges)
        n_test = int(len(all_edges) * test_ratio)
        test_edges = all_edges[:n_test]
        
        # Remove test edges from training graph
        train_G.remove_edges_from(test_edges)
        
        # Sample negative edges (node pairs without edges)
        test_negatives = []
        non_edges = list(nx.non_edges(G))
        if len(non_edges) > n_test:
            test_negatives = non_edges[:n_test]
        else:
            test_negatives = non_edges
        
        # Prepare PyTorch Geometric data
        train_data = NetworkDataProcessor.prepare_graph_data(train_G)
        
        return train_data, test_edges, test_negatives


def train_link_prediction_model(G, epochs=100, hidden_dim=64, output_dim=32, lr=0.01):
    """
    Train a GNN model for link prediction
    
    Args:
        G: NetworkX graph
        epochs: Number of training epochs
        hidden_dim: Hidden dimension size
        output_dim: Output embedding dimension
        lr: Learning rate
    
    Returns:
        Trained model
    """
    if not TORCH_GEOMETRIC_AVAILABLE:
        print("Warning: torch_geometric not installed. Using fallback link prediction.")
        return FallbackLinkPredictor(G)
    
    # Original implementation...
    # Prepare data
    train_data, test_edges, test_negatives = NetworkDataProcessor.prepare_link_prediction_data(G)
    
    # Create model
    input_dim = train_data.x.size(1)
    model = GNNLinkPredictor(input_dim, hidden_dim, output_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    
    # Training loop
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        
        # Forward pass
        node_embeddings = model(train_data.x, train_data.edge_index)
        
        # Sample positive and negative edges for training
        pos_edges = train_data.edge_index.t().numpy()
        # Randomly sample negative edges (non-edges)
        neg_edge_index = []
        for _ in range(pos_edges.shape[0] // 2):  # Half because undirected edges are duplicated
            while True:
                i, j = np.random.randint(0, train_data.x.size(0), 2)
                if i != j and not train_data.contains_edge(i, j):
                    neg_edge_index.append([i, j])
                    break
        
        neg_edges = np.array(neg_edge_index)
        
        # Combine positive and negative examples with labels
        edge_samples = np.vstack([pos_edges[:pos_edges.shape[0]//2], neg_edges])  # Use half of pos edges
        edge_labels = torch.tensor(
            [1] * (pos_edges.shape[0]//2) + [0] * len(neg_edges),
            dtype=torch.float
        )
        
        # Predict links
        edge_predictions = model.predict_link(node_embeddings, torch.tensor(edge_samples, dtype=torch.long))
        
        # Calculate loss
        loss = F.binary_cross_entropy(edge_predictions.squeeze(), edge_labels)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
    
    return model


def predict_new_links(G, model, top_k=10):
    """
    Predict potential new links in the network
    
    Args:
        G: NetworkX graph
        model: Trained GNN link prediction model
        top_k: Number of top predictions to return
    
    Returns:
        List of tuples (node1, node2, score) representing predicted links
    """
    if not TORCH_GEOMETRIC_AVAILABLE or isinstance(model, FallbackLinkPredictor):
        return model.predict_links(top_k)
        
    # Original implementation...
    # Prepare data
    data = NetworkDataProcessor.prepare_graph_data(G)
    
    # Get node embeddings
    model.eval()
    with torch.no_grad():
        node_embeddings = model(data.x, data.edge_index)
    
    # Generate candidate pairs (non-edges)
    candidates = list(nx.non_edges(G))
    
    # If there are too many candidates, sample a subset
    if len(candidates) > 10000:
        candidates = np.random.choice(candidates, 10000, replace=False)
    
    # Predict probability for each candidate
    predictions = []
    batch_size = 1000
    
    # Convert node identifiers to indices
    sorted_nodes = sorted(G.nodes())
    node_mapping = {node: i for i, node in enumerate(sorted_nodes)}
    
    for i in range(0, len(candidates), batch_size):
        batch_candidates = candidates[i:i+batch_size]
        
        # Convert node pairs to indices
        indexed_candidates = [[node_mapping[u], node_mapping[v]] for u, v in batch_candidates]
        
        # Predict link probabilities
        with torch.no_grad():
            scores = model.predict_link(
                node_embeddings,
                torch.tensor(indexed_candidates, dtype=torch.long)
            ).squeeze().cpu().numpy()
        
        # Add to predictions list
        for (u, v), score in zip(batch_candidates, scores):
            predictions.append((u, v, float(score)))
    
    # Sort by score and return top k
    predictions.sort(key=lambda x: x[2], reverse=True)
    return predictions[:top_k]


# Add fallback implementations for when torch_geometric is not available
class FallbackLinkPredictor:
    """Simple fallback predictor using jaccard coefficient when torch_geometric is not available"""
    def __init__(self, G):
        self.G = G
        # Pre-compute jaccard coefficient for non-edges
        self.predictions = []
        for u, v in nx.non_edges(G):
            # Calculate jaccard coefficient manually
            neighbors_u = set(G.neighbors(u))
            neighbors_v = set(G.neighbors(v))
            jaccard = 0
            if len(neighbors_u) > 0 or len(neighbors_v) > 0:
                jaccard = len(neighbors_u.intersection(neighbors_v)) / len(neighbors_u.union(neighbors_v))
            self.predictions.append((u, v, jaccard))
        
        # Sort by score
        self.predictions.sort(key=lambda x: x[2], reverse=True)
    
    def predict_links(self, top_k=10):
        """Return top k predicted links"""
        return self.predictions[:top_k]


class GNNScalablePredictor(nn.Module):
    """
    Scalable Graph Neural Network model for large networks
    Uses GraphSAGE which scales better than GCN or GAT for large graphs
    """
    def __init__(self, input_dim, hidden_dim=64, output_dim=1):
        super(GNNScalablePredictor, self).__init__()
        self.conv1 = SAGEConv(input_dim, hidden_dim)
        self.conv2 = SAGEConv(hidden_dim, hidden_dim)
        self.predictor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, output_dim)
        )
        
    def forward(self, x, edge_index):
        # Node embedding
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.3, training=self.training)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        
        # Activity prediction
        return self.predictor(x)


class ModelManager:
    """
    Utility class to manage model training, saving, and loading for large networks
    """
    @staticmethod
    def save_model(model, model_path):
        """Save a trained PyTorch model"""
        torch.save(model.state_dict(), model_path)
        print(f"Model saved to {model_path}")
    
    @staticmethod
    def load_model(model_class, model_path, input_dim, **kwargs):
        """Load a trained PyTorch model"""
        model = model_class(input_dim=input_dim, **kwargs)
        model.load_state_dict(torch.load(model_path))
        model.eval()
        return model
    
    @staticmethod
    def save_node_mapping(node_mapping, mapping_path):
        """Save node mapping for future reference"""
        joblib.dump(node_mapping, mapping_path)
    
    @staticmethod
    def load_node_mapping(mapping_path):
        """Load node mapping"""
        return joblib.load(mapping_path)
    
    @staticmethod
    def get_model_path(model_type, identifier):
        """Generate standardized model path"""
        os.makedirs('models', exist_ok=True)
        return f"models/{model_type}_{identifier}.pt"
    
    @staticmethod
    def get_mapping_path(model_type, identifier):
        """Generate standardized mapping path"""
        os.makedirs('models', exist_ok=True)
        return f"models/{model_type}_{identifier}_mapping.pkl"


def train_user_behavior_prediction_model_optimized(G, epochs=50, batch_size=128, use_sage=True, save_model=True, model_identifier="default"):
    """
    Train GNN model for user behavior prediction with optimizations for larger networks
    
    Args:
        G: NetworkX graph
        epochs: Number of training epochs
        batch_size: Batch size for training
        use_sage: Whether to use GraphSAGE (better for larger networks)
        save_model: Whether to save the trained model
        model_identifier: Identifier for saving the model
    
    Returns:
        Trained model and node mapping dictionary
    """
    if not TORCH_GEOMETRIC_AVAILABLE:
        print("Warning: torch_geometric not installed. Using fallback behavior prediction.")
        # Return a simple object that can be used by the fallback predictor
        node_mapping = {i: node for i, node in enumerate(sorted(G.nodes()))}
        return None, node_mapping
        
    # Original implementation
    start_time = time.time()
    
    # Prepare data
    data = NetworkDataProcessor.prepare_graph_data(G)
    input_dim = data.x.size(1)
    node_mapping = {i: node for i, node in enumerate(sorted(G.nodes()))}
    
    # Create model
    if use_sage:
        model = GNNScalablePredictor(input_dim=input_dim)
    else:
        model = GNNUserBehaviorPredictor(input_dim=input_dim)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    
    # Use GPU if available
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    data = data.to(device)
    
    # For large networks, convert to SparseTensor for better efficiency
    if len(G.nodes()) > 10000:
        print("Converting to SparseTensor for better performance...")
        edge_index = data.edge_index
        adj = SparseTensor(
            row=edge_index[0], 
            col=edge_index[1],
            sparse_sizes=(data.x.size(0), data.x.size(0))
        )
        data.adj = adj
    
    # Create proxy for activity data (node degrees)
    degrees = torch.tensor([[d] for d in dict(G.degree()).values()], dtype=torch.float).to(device)
    if degrees.max() > 0:
        degrees = degrees / degrees.max()  # Normalize to [0,1]
    
    # Training loop with progress reporting
    model.train()
    best_loss = float('inf')
    
    print(f"Starting training on {device} with {len(G.nodes())} nodes and {len(G.edges())} edges")
    for epoch in range(epochs):
        optimizer.zero_grad()
        
        # Forward pass
        out = model(data.x, data.edge_index)
        
        # Calculate loss
        loss = F.mse_loss(out, degrees)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 10 == 0 or epoch == 0:
            elapsed = time.time() - start_time
            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}, Time: {elapsed:.2f}s")
        
        # Save best model
        if loss.item() < best_loss:
            best_loss = loss.item()
            best_state = model.state_dict().copy()
    
    # Load best model
    model.load_state_dict(best_state)
    
    # Save the model if requested
    if save_model:
        model_path = ModelManager.get_model_path("user_behavior", model_identifier)
        mapping_path = ModelManager.get_mapping_path("user_behavior", model_identifier)
        ModelManager.save_model(model, model_path)
        ModelManager.save_node_mapping(node_mapping, mapping_path)
        print(f"Training completed in {time.time() - start_time:.2f}s. Model saved.")
    else:
        print(f"Training completed in {time.time() - start_time:.2f}s.")
    
    return model, node_mapping


def predict_user_activity_optimized(G, model=None, node_mapping=None, top_k=10, model_path=None, mapping_path=None):
    """
    Predict user activity levels based on network structure
    
    Args:
        G: NetworkX graph
        model: Pre-trained GNN model (optional)
        node_mapping: Node mapping dictionary (optional)
        top_k: Number of top active users to return
        model_path: Path to saved model (optional)
        mapping_path: Path to saved node mapping (optional)
    
    Returns:
        List of dicts with user ID, name, predicted activity, and degree
    """
    if not TORCH_GEOMETRIC_AVAILABLE:
        print("Warning: torch_geometric not installed. Using fallback activity prediction.")
        # Simple fallback using degree centrality as activity predictor
        centrality = nx.degree_centrality(G)
        results = []
        for node, score in centrality.items():
            node_data = G.nodes[node]
            results.append({
                "id": node,
                "name": node_data.get("name", f"Node {node}"),
                "predicted_activity": float(score),
                "degree": G.degree(node)
            })
        
        # Sort by predicted activity
        results.sort(key=lambda x: x["predicted_activity"], reverse=True)
        return results[:top_k]
        
    # Original implementation
    start_time = time.time()
    
    # Load model if not provided
    if model is None and model_path is not None:
        input_dim = 1  # Default, will be adjusted based on data
        if os.path.exists(model_path):
            # Determine model class from path
            if "user_behavior" in model_path:
                if "scalable" in model_path:
                    model_class = GNNScalablePredictor
                else:
                    model_class = GNNUserBehaviorPredictor
            else:
                model_class = GNNUserBehaviorPredictor
            
            # Prepare data to get input dimension
            temp_data = NetworkDataProcessor.prepare_graph_data(G)
            input_dim = temp_data.x.size(1)
            
            # Load model
            model = ModelManager.load_model(model_class, model_path, input_dim)
            print(f"Loaded model from {model_path}")
        else:
            raise ValueError(f"Model path {model_path} not found and no model provided")
    
    # Load node mapping if not provided
    if node_mapping is None and mapping_path is not None:
        if os.path.exists(mapping_path):
            node_mapping = ModelManager.load_node_mapping(mapping_path)
            print(f"Loaded node mapping from {mapping_path}")
        else:
            # Create new mapping if not found
            node_mapping = {i: node for i, node in enumerate(sorted(G.nodes()))}
    elif node_mapping is None:
        # Create new mapping if not provided
        node_mapping = {i: node for i, node in enumerate(sorted(G.nodes()))}
    
    # Use GPU if available
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    if model is not None:
        model = model.to(device)
    
    # Prepare data
    data = NetworkDataProcessor.prepare_graph_data(G)
    data = data.to(device)
    
    # Get predictions
    if model is not None:
        model.eval()
        with torch.no_grad():
            predictions = model(data.x, data.edge_index).cpu().numpy()
    else:
        # If no model is available, use degree centrality as a fallback
        print("No model available, using node degree as prediction")
        degrees = np.array([[d] for d in dict(G.degree()).values()])
        max_degree = np.max(degrees) if degrees.size > 0 and np.max(degrees) > 0 else 1.0
        predictions = degrees / max_degree  # Normalize
    
    # Format results
    results = []
    for i, node_id in enumerate(sorted(G.nodes())):
        node_id = node_mapping.get(i, node_id)  # Use mapping if available
        node_data = G.nodes[node_id]
        
        try:
            activity_value = float(predictions[i][0]) if i < len(predictions) else 0.0
        except (IndexError, TypeError):
            # Handle case where predictions might have wrong shape
            activity_value = 0.0
        
        results.append({
            "id": node_id,
            "name": node_data.get("name", f"Node {node_id}"),
            "predicted_activity": activity_value,
            "degree": G.degree(node_id)
        })
    
    # Sort by predicted activity
    results.sort(key=lambda x: x["predicted_activity"], reverse=True)
    
    print(f"Prediction completed in {time.time() - start_time:.2f}s")
    return results[:top_k] 