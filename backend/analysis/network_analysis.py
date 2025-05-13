"""
Network analysis module for the Social Network Analysis System.
This module provides algorithms for analyzing social network structure.
"""
import networkx as nx
import logging
import json
import os
from typing import Dict, Any, List, Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('network_analysis')

# Output directory for analysis results
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/output'))
os.makedirs(OUTPUT_DIR, exist_ok=True)


class NetworkAnalyzer:
    """Provides network analysis functionality using NetworkX."""

    @staticmethod
    def load_network_from_json(file_path: str) -> Optional[nx.Graph]:
        """
        Load a network from a JSON file.
        
        Args:
            file_path: Path to the JSON file.
            
        Returns:
            nx.Graph: NetworkX graph object or None if loading fails.
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Create graph
            G = nx.Graph()
            
            # Add nodes
            for node in data.get('nodes', []):
                G.add_node(node['id'], **{k: v for k, v in node.items() if k != 'id'})
            
            # Add edges
            for edge in data.get('edges', []):
                G.add_edge(edge['source'], edge['target'], weight=edge.get('weight', 1))
            
            return G
            
        except Exception as e:
            logger.error(f"Error loading network from {file_path}: {str(e)}")
            return None

    @staticmethod
    def calculate_centrality(G: nx.Graph, algorithm: str = 'degree') -> Dict[str, float]:
        """
        Calculate node centrality measures.
        
        Args:
            G: NetworkX graph object.
            algorithm: Centrality algorithm to use ('degree', 'betweenness', 'closeness', 'eigenvector').
            
        Returns:
            dict: Node IDs to centrality values.
        """
        if not G:
            return {}
        
        try:
            if algorithm == 'degree':
                centrality = nx.degree_centrality(G)
            elif algorithm == 'betweenness':
                centrality = nx.betweenness_centrality(G)
            elif algorithm == 'closeness':
                centrality = nx.closeness_centrality(G)
            elif algorithm == 'eigenvector':
                centrality = nx.eigenvector_centrality(G, max_iter=1000)
            else:
                logger.warning(f"Unknown centrality algorithm: {algorithm}, using degree centrality")
                centrality = nx.degree_centrality(G)
            
            return centrality
            
        except Exception as e:
            logger.error(f"Error calculating {algorithm} centrality: {str(e)}")
            return {}

    @staticmethod
    def detect_communities(G: nx.Graph, algorithm: str = 'louvain') -> Dict[str, int]:
        """
        Detect communities in the network.
        
        Args:
            G: NetworkX graph object.
            algorithm: Community detection algorithm to use.
            
        Returns:
            dict: Node IDs to community assignments.
        """
        if not G:
            return {}
        
        try:
            if algorithm == 'louvain':
                # Import community module (python-louvain)
                try:
                    import community as community_louvain
                    partition = community_louvain.best_partition(G)
                    return partition
                except ImportError:
                    logger.warning("python-louvain package not installed, using label propagation instead")
                    algorithm = 'label_propagation'
            
            if algorithm == 'label_propagation':
                communities = nx.algorithms.community.label_propagation_communities(G)
                # Convert to dictionary of node to community index
                result = {}
                for i, community in enumerate(communities):
                    for node in community:
                        result[node] = i
                return result
            
            if algorithm == 'girvan_newman':
                # This is computationally expensive for large networks
                comp = nx.algorithms.community.girvan_newman(G)
                # We only take the first iteration for simplicity
                communities = tuple(sorted(c) for c in next(comp))
                result = {}
                for i, community in enumerate(communities):
                    for node in community:
                        result[node] = i
                return result
                
            # Default to label propagation if algorithm not recognized
            logger.warning(f"Unknown community detection algorithm: {algorithm}, using label propagation")
            communities = nx.algorithms.community.label_propagation_communities(G)
            result = {}
            for i, community in enumerate(communities):
                for node in community:
                    result[node] = i
            return result
            
        except Exception as e:
            logger.error(f"Error detecting communities using {algorithm}: {str(e)}")
            return {}

    @staticmethod
    def predict_links(G: nx.Graph, algorithm: str = 'common_neighbors') -> List[Dict[str, Any]]:
        """
        Predict potential new links in the network.
        
        Args:
            G: NetworkX graph object.
            algorithm: Link prediction algorithm to use.
            
        Returns:
            list: Potential new links with scores.
        """
        if not G:
            return []
        
        try:
            # Get all pairs of nodes that are not connected
            non_edges = list(nx.non_edges(G))
            
            # Calculate scores based on the chosen algorithm
            if algorithm == 'common_neighbors':
                preds = nx.common_neighbor_centrality(G, non_edges)
            elif algorithm == 'jaccard':
                preds = nx.jaccard_coefficient(G, non_edges)
            elif algorithm == 'adamic_adar':
                preds = nx.adamic_adar_index(G, non_edges)
            elif algorithm == 'preferential_attachment':
                preds = nx.preferential_attachment(G, non_edges)
            else:
                logger.warning(f"Unknown link prediction algorithm: {algorithm}, using common neighbors")
                preds = nx.common_neighbor_centrality(G, non_edges)
            
            # Convert to list of dictionaries
            results = []
            for u, v, score in preds:
                results.append({
                    'source': u,
                    'target': v,
                    'score': score
                })
            
            # Sort by score in descending order and return top 20
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[:20]
            
        except Exception as e:
            logger.error(f"Error predicting links using {algorithm}: {str(e)}")
            return []

    @staticmethod
    def calculate_network_metrics(G: nx.Graph) -> Dict[str, float]:
        """
        Calculate various network metrics.
        
        Args:
            G: NetworkX graph object.
            
        Returns:
            dict: Network metrics.
        """
        if not G:
            return {}
        
        try:
            metrics = {
                'node_count': G.number_of_nodes(),
                'edge_count': G.number_of_edges(),
                'density': nx.density(G),
                'average_degree': sum(dict(G.degree()).values()) / G.number_of_nodes()
            }
            
            # Only calculate these for connected graphs to avoid errors
            if nx.is_connected(G):
                metrics.update({
                    'diameter': nx.diameter(G),
                    'average_shortest_path_length': nx.average_shortest_path_length(G)
                })
            else:
                # For disconnected graphs, get the largest connected component
                largest_cc = max(nx.connected_components(G), key=len)
                largest_cc_graph = G.subgraph(largest_cc).copy()
                
                metrics.update({
                    'largest_component_size': len(largest_cc),
                    'largest_component_diameter': nx.diameter(largest_cc_graph),
                    'largest_component_avg_path': nx.average_shortest_path_length(largest_cc_graph)
                })
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating network metrics: {str(e)}")
            return {
                'node_count': G.number_of_nodes(),
                'edge_count': G.number_of_edges(),
                'density': nx.density(G),
                'average_degree': sum(dict(G.degree()).values()) / G.number_of_nodes()
            }

    @staticmethod
    def save_analysis_result(result: Dict[str, Any], analysis_type: str, filename: str) -> str:
        """
        Save analysis result to a JSON file.
        
        Args:
            result: Analysis result to save.
            analysis_type: Type of analysis (centrality, communities, etc.).
            filename: Base name for the output file.
            
        Returns:
            str: Path to the saved file.
        """
        try:
            output_filename = f"{filename}_{analysis_type}.json"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2)
            
            logger.info(f"Analysis result saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error saving analysis result: {str(e)}")
            return ""

# Module-level wrapper functions for convenience
def calculate_centrality(G: nx.Graph, algorithm: str = 'degree') -> Dict[str, float]:
    """
    Wrapper for NetworkAnalyzer.calculate_centrality
    """
    return NetworkAnalyzer.calculate_centrality(G, algorithm)

def detect_communities(G: nx.Graph, algorithm: str = 'louvain') -> Dict[str, int]:
    """
    Wrapper for NetworkAnalyzer.detect_communities
    """
    return NetworkAnalyzer.detect_communities(G, algorithm)

def calculate_network_metrics(G: nx.Graph) -> Dict[str, float]:
    """
    Wrapper for NetworkAnalyzer.calculate_network_metrics
    """
    return NetworkAnalyzer.calculate_network_metrics(G) 