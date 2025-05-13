# Data Directory

This directory contains the input and output data files for the Social Network Analysis System.

## Structure

- `input/`: Place your network data files in this directory. The system will automatically detect and process them.
- `output/`: Processed data and analysis results will be saved in this directory.

## Supported Input File Formats

### CSV Format

CSV files should have at least the following columns:

- `source`: The source node ID
- `target`: The target node ID
- `weight` (optional): The weight of the edge

Example:

```csv
source,target,weight
1,2,1
1,3,2
2,3,1
```

## Output File Formats

### Processed Network Data (JSON)

```json
{
  "nodes": [
    {
      "id": "hash_of_node_id",
      "name": "User hash_prefix",
      "group": 1
    },
    ...
  ],
  "edges": [
    {
      "source": "hash_of_source_id",
      "target": "hash_of_target_id",
      "weight": 1
    },
    ...
  ]
}
```

### Analysis Results (JSON)

Analysis results are saved in different formats depending on the type of analysis:

#### Centrality Analysis

```json
{
  "result_type": "centrality",
  "algorithm": "betweenness",
  "data": {
    "node_id_1": 0.8,
    "node_id_2": 0.5,
    ...
  }
}
```

#### Community Detection

```json
{
  "result_type": "communities",
  "algorithm": "louvain",
  "data": {
    "node_id_1": 0,
    "node_id_2": 0,
    "node_id_3": 1,
    ...
  }
}
```

#### Link Prediction

```json
{
  "result_type": "link_prediction",
  "algorithm": "common_neighbors",
  "data": [
    {
      "source": "node_id_1",
      "target": "node_id_4",
      "score": 0.75
    },
    ...
  ]
}
``` 