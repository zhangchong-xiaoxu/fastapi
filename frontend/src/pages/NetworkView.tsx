import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import NetworkControls, { NetworkControlsState } from '../components/NetworkControls';
import NodeDetail from '../components/NodeDetail';
import NetworkSearch from '../components/NetworkSearch';
import NetworkMetrics from '../components/NetworkMetrics';
import NetworkFilters, { NetworkFiltersState } from '../components/NetworkFilters';
import './NetworkView.css';
import PredictionResults, { PredictionLink } from '../components/PredictionResults';
import { networkApi, analysisApi } from '../services/api';
import axios from 'axios';

// 基本网络快照接口 - 与Dashboard和NetworkComparison组件保持一致
interface NetworkSnapshot {
  id: string;
  name: string;
  date: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
}

interface Node {
  id: string;
  name: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  weight: number;
}

interface NetworkData {
  id?: string;
  nodes: Node[];
  edges: Edge[];
}

// 重命名接口，避免与导入的组件名冲突
interface NetworkMetricsData {
  node_count: number;
  edge_count: number;
  density: number;
  average_degree: number;
  diameter?: number;
  largest_component_size?: number;
}

// Add more detailed network metrics interface
interface DetailedNetworkMetrics extends NetworkMetricsData {
  communities?: {
    count: number;
    distribution: number[];
  };
  degree_distribution?: {
    min: number;
    max: number;
    average: number;
    distribution: number[];
  };
  centrality?: {
    highest_betweenness: { id: string; name: string; value: number }[];
    highest_closeness: { id: string; name: string; value: number }[];
    highest_degree: { id: string; name: string; value: number }[];
  };
}

const NetworkView: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsState, setControlsState] = useState<NetworkControlsState>({
    nodeSize: 5,
    linkStrength: 0.5,
    showLabels: true,
    highlightCommunities: true,
    zoomLevel: 1,
    layoutAlgorithm: 'force'
  });
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Edge> | null>(null);
  const [networkInfo, setNetworkInfo] = useState<DetailedNetworkMetrics | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fetchingAdvancedMetrics, setFetchingAdvancedMetrics] = useState<boolean>(false);
  const [filterOptions, setFilterOptions] = useState<{
    groups: number[];
    minWeight: number;
    maxWeight: number;
    minDegree: number;
    maxDegree: number;
  }>({
    groups: [],
    minWeight: 1,
    maxWeight: 1,
    minDegree: 0,
    maxDegree: 0
  });
  const [filters, setFilters] = useState<NetworkFiltersState>({
    showGroups: [],
    minEdgeWeight: 1,
    maxNodeDegree: null,
    minNodeDegree: null,
    showIsolatedNodes: true
  });
  const [filteredData, setFilteredData] = useState<NetworkData | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictedLinks, setPredictedLinks] = useState<PredictionLink[]>([]);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [showPredictions, setShowPredictions] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<NetworkSnapshot[]>([]);

  // 辅助函数：检查文件可访问性
  const checkFileAccessibility = async () => {
    const urls = [
      '/sample_network.json',
      '/data/network/sample_network.json',
      '/data/network/sample-network_processed.json',
      '/data/network/community_network_processed.json',
      '/data/network/random_network_processed.json'
    ];
    
    console.log('检查文件可访问性...');
    const results: Record<string, boolean> = {};
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        results[url] = response.ok;
        console.log(`文件 ${url} ${response.ok ? '可访问' : '不可访问'} (状态: ${response.status})`);
      } catch (err) {
        results[url] = false;
        console.error(`检查 ${url} 时出错:`, err);
      }
    }
    
    // 如果所有文件都不可访问，尝试创建必要的目录并复制示例数据
    const allFailed = Object.values(results).every(result => result === false);
    if (allFailed) {
      console.warn('所有数据文件均不可访问，可能需要复制示例数据到正确的位置。');
    }
    
    return results;
  };

  // Fetch network data
  useEffect(() => {
    console.log('正在初始化NetworkView组件，准备加载网络数据...');
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. 首先尝试从API获取网络快照列表
        try {
          console.log('尝试从API获取网络快照...');
          const snapshotsResponse = await axios.get('/api/network/snapshots');
          
          if (snapshotsResponse.data && snapshotsResponse.data.length > 0) {
            // 保存所有快照数据
            setSnapshots(snapshotsResponse.data);
            console.log('成功获取网络快照列表:', snapshotsResponse.data);
            
            // 检查URL中是否有网络ID参数
            const urlParams = new URLSearchParams(window.location.search);
            const networkParam = urlParams.get('network');
            
            // 确定要加载的网络ID
            let selectedNetworkId: string;
            if (networkParam && snapshotsResponse.data.some((n: {id: string}) => n.id === networkParam)) {
              selectedNetworkId = networkParam;
            } else {
              // 默认使用最新的快照
              selectedNetworkId = snapshotsResponse.data[0].id;
            }
            
            console.log(`将加载网络快照: ${selectedNetworkId}`);
            
            // 2. 获取选定网络的详细数据
            try {
              // 尝试从API直接获取网络数据 - 使用标准API端点
              console.log(`尝试从API获取网络数据: /api/network/${selectedNetworkId}`);
              const networkResponse = await axios.get(`/api/network/snapshot/${selectedNetworkId}`);
              
              if (networkResponse.data && networkResponse.data.nodes && networkResponse.data.edges) {
                console.log('成功从API获取网络数据');
                
                // 确保所有节点都有正确的属性，便于搜索和可视化
                const processedNodes = networkResponse.data.nodes.map((node: any) => ({
                  id: node.id || node._id || `node-${Math.random().toString(36).substr(2, 9)}`,
                  name: node.name || node.label || `节点 ${node.id || '未命名'}`,
                  group: node.group || node.community || 1,
                }));
                
                // 规范化边数据
                const processedEdges = networkResponse.data.edges.map((edge: any) => ({
                  source: edge.source,
                  target: edge.target,
                  weight: edge.weight || 1
                }));
                
                // 设置网络数据
                const networkData = {
                  id: selectedNetworkId,
                  nodes: processedNodes,
                  edges: processedEdges
                };
                
                setData(networkData);
                setFilteredData(networkData);
                
                // 提取过滤器的初始选项
                const groups = Array.from(new Set(processedNodes.map((node: any) => node.group))).sort() as number[];
                
                // 计算边权重范围
                const weights: number[] = [];
                processedEdges.forEach((edge: any) => {
                  weights.push(typeof edge.weight === 'number' ? edge.weight : 1);
                });
                const minWeight = weights.length > 0 ? Math.min(...weights) : 1;
                const maxWeight = weights.length > 0 ? Math.max(...weights) : 1;
                
                // 计算节点度数
                const degrees: {[id: string]: number} = {};
                processedNodes.forEach((node: any) => {
                  degrees[node.id] = 0;
                });
                
                processedEdges.forEach((edge: any) => {
                  if (degrees[edge.source] !== undefined) degrees[edge.source]++;
                  if (degrees[edge.target] !== undefined) degrees[edge.target]++;
                });
                
                const degreeValues: number[] = [];
                Object.keys(degrees).forEach(key => {
                  degreeValues.push(degrees[key]);
                });
                const minDegree = degreeValues.length > 0 ? Math.min(...degreeValues) : 0;
                const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
                
                setFilterOptions({
                  groups,
                  minWeight,
                  maxWeight,
                  minDegree,
                  maxDegree
                });
                
                // 设置初始过滤器
                setFilters({
                  showGroups: groups,
                  minEdgeWeight: minWeight,
                  minNodeDegree: null,
                  maxNodeDegree: null,
                  showIsolatedNodes: true
                });
                
                // 从API获取网络指标
                try {
                  const metricsResponse = await axios.get('/api/network/metrics');
                  if (metricsResponse.data) {
                    setNetworkInfo({
                      node_count: processedNodes.length,
                      edge_count: processedEdges.length,
                      density: metricsResponse.data.find((m: any) => m.name === '密度')?.value || 0,
                      average_degree: metricsResponse.data.find((m: any) => m.name === '平均度')?.value || 0,
                      diameter: metricsResponse.data.find((m: any) => m.name === '直径')?.value,
                      largest_component_size: metricsResponse.data.find((m: any) => m.name === '最大连通分量')?.value
                    });
                  }
                } catch (metricsError) {
                  console.error('无法获取网络指标:', metricsError);
                  // 使用基本计算的指标
                  setNetworkInfo({
                    node_count: processedNodes.length,
                    edge_count: processedEdges.length,
                    density: (2 * processedEdges.length) / (processedNodes.length * (processedNodes.length - 1)),
                    average_degree: (2 * processedEdges.length) / processedNodes.length
                  });
                }
                
                setLoading(false);
                return;
              }
            } catch (networkError) {
              console.error('无法直接从API获取网络数据:', networkError);
            }
          }
        } catch (snapshotsError) {
          console.error('获取网络快照失败:', snapshotsError);
        }
        
        // 如果前面的方法都失败了，尝试从通用网络API端点获取数据
        try {
          console.log('尝试从通用网络API获取数据');
          const generalNetworkResponse = await axios.get('/api/network');
          
          if (generalNetworkResponse.data && generalNetworkResponse.data.nodes) {
            console.log('从通用网络API获取数据成功');
            
            const networkData = {
              nodes: generalNetworkResponse.data.nodes,
              edges: generalNetworkResponse.data.edges || generalNetworkResponse.data.links || []
            };
            
            setData(networkData);
            setFilteredData(networkData);
            
            // 设置基本网络信息
            setNetworkInfo({
              node_count: networkData.nodes.length,
              edge_count: networkData.edges.length,
              density: (2 * networkData.edges.length) / (networkData.nodes.length * (networkData.nodes.length - 1)),
              average_degree: (2 * networkData.edges.length) / networkData.nodes.length
            });
            
            // 设置过滤器选项
            setupFilterOptions(networkData);
            
            setLoading(false);
            return;
          }
        } catch (generalApiError) {
          console.error('无法从通用网络API获取数据:', generalApiError);
        }
        
        // 如果所有API尝试都失败，返回错误状态
        setError('无法从API获取网络数据。请确保后端服务正在运行并且有可用的网络数据。');
        setLoading(false);
      } catch (error) {
        console.error('获取网络数据出错:', error);
        setError('加载网络数据时出错，请稍后再试。');
        setLoading(false);
      }
    };
    
    const setupFilterOptions = (networkData: NetworkData) => {
      // 提取过滤器的选项
      const groups = Array.from(new Set(networkData.nodes.map(node => node.group))).sort() as number[];
      
      // 计算边权重范围
      const weights: number[] = [];
      networkData.edges.forEach((edge: any) => {
        weights.push(typeof edge.weight === 'number' ? edge.weight : 1);
      });
      const minWeight = weights.length > 0 ? Math.min(...weights) : 1;
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 1;
      
      // 计算节点度数
      const degrees: {[id: string]: number} = {};
      networkData.nodes.forEach(node => {
        degrees[node.id] = 0;
      });
      
      networkData.edges.forEach((edge: any) => {
        const source = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const target = typeof edge.target === 'string' ? edge.target : edge.target.id;
        
        if (degrees[source] !== undefined) degrees[source]++;
        if (degrees[target] !== undefined) degrees[target]++;
      });
      
      const degreeValues: number[] = [];
      Object.keys(degrees).forEach(key => {
        degreeValues.push(degrees[key]);
      });
      const minDegree = degreeValues.length > 0 ? Math.min(...degreeValues) : 0;
      const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
      
      setFilterOptions({
        groups,
        minWeight,
        maxWeight,
        minDegree,
        maxDegree
      });
      
      // 设置初始过滤器
      setFilters({
        showGroups: groups,
        minEdgeWeight: minWeight,
        minNodeDegree: null,
        maxNodeDegree: null,
        showIsolatedNodes: true
      });
    };

    fetchData();
  }, []);

  // Separate effect for fetching advanced metrics
  useEffect(() => {
    const fetchAdvancedMetrics = async () => {
      if (!data || !networkInfo || fetchingAdvancedMetrics || networkInfo.communities) return;
      
      try {
        setFetchingAdvancedMetrics(true);
        
        // 尝试从API获取数据，但不要在失败时抛出错误
        let centralityData: {
          highest_betweenness: { id: string; name: string; value: number }[];
          highest_closeness: { id: string; name: string; value: number }[];
          highest_degree: { id: string; name: string; value: number }[];
        } | null = null;
        let communitiesData: { 
          count: number; 
          distribution: number[]; 
        } | null = null;
        
        try {
          // Get the network ID from the current data
          const networkId = data.id || "current"; // Use a default if no ID is present
          
          // Get centrality for advanced metrics
          const centralityResponse = await analysisApi.getCentrality(networkId, 'all');
          centralityData = centralityResponse.data;
          
          // Get communities for advanced metrics
          const communitiesResponse = await analysisApi.getCommunities(networkId, 'louvain');
          communitiesData = communitiesResponse.data.communities;
        } catch (apiError) {
          console.log('无法从API获取高级指标，使用模拟数据', apiError);
          setError('无法从服务器获取高级分析指标，使用示例数据代替');
        }
        
        // 如果API调用失败，使用模拟数据
        if (!centralityData) {
          centralityData = {
            highest_betweenness: Array.from({length: 5}, (_, i) => ({
              id: `${i+1}`, 
              name: `节点 ${i+1}`, 
              value: 0.8 - i * 0.1
            })),
            highest_closeness: Array.from({length: 5}, (_, i) => ({
              id: `${i+5}`, 
              name: `节点 ${i+5}`, 
              value: 0.7 - i * 0.08
            })),
            highest_degree: Array.from({length: 5}, (_, i) => ({
              id: `${i+2}`, 
              name: `节点 ${i+2}`, 
              value: 10 - i
            }))
          };
        }
        
        if (!communitiesData) {
          communitiesData = {
            count: 5,
            distribution: [8, 6, 5, 4, 7]
          };
        }
        
        // Merge with existing basic metrics
        setNetworkInfo(prev => ({
          ...prev as DetailedNetworkMetrics,
          communities: communitiesData || undefined,
          centrality: centralityData || undefined
        }));
      } catch (err) {
        console.error('Failed to load advanced network metrics:', err);
      } finally {
        setFetchingAdvancedMetrics(false);
      }
    };

    fetchAdvancedMetrics();
  }, [data, networkInfo, fetchingAdvancedMetrics]);

  // Extract filter options from data
  useEffect(() => {
    if (!data) return;
    
    // Extract unique groups
    const groups = Array.from(new Set(data.nodes.map(node => node.group))).sort((a, b) => a - b);
    
    // Calculate min/max edge weights
    let minWeight = Infinity;
    let maxWeight = 0;
    data.edges.forEach(edge => {
      minWeight = Math.min(minWeight, edge.weight);
      maxWeight = Math.max(maxWeight, edge.weight);
    });
    
    // Calculate min/max node degrees
    const degreeCounts: {[key: string]: number} = {};
    data.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      degreeCounts[sourceId] = (degreeCounts[sourceId] || 0) + 1;
      degreeCounts[targetId] = (degreeCounts[targetId] || 0) + 1;
    });
    
    const degrees = Object.values(degreeCounts);
    const minDegree = degrees.length > 0 ? Math.min(...degrees) : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
    
    // Update filter options
    setFilterOptions({
      groups,
      minWeight: Math.max(1, minWeight),
      maxWeight: Math.max(1, maxWeight),
      minDegree,
      maxDegree
    });
    
    // Initialize filters with all groups
    setFilters(prev => ({
      ...prev,
      showGroups: groups
    }));
  }, [data]);
  
  // Apply filters to data
  useEffect(() => {
    if (!data) return;
    
    // Clone data to avoid modifying original
    const filtered: NetworkData = {
      id: data.id,
      nodes: [...data.nodes],
      edges: [...data.edges]
    };
    
    // Filter nodes by group
    if (filters.showGroups.length < filterOptions.groups.length) {
      filtered.nodes = filtered.nodes.filter(node => 
        filters.showGroups.includes(node.group)
      );
    }
    
    // Filter edges by weight
    filtered.edges = filtered.edges.filter(edge => 
      edge.weight >= filters.minEdgeWeight
    );
    
    // Calculate node degrees for degree filtering
    const degreeCounts: {[key: string]: number} = {};
    filtered.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      degreeCounts[sourceId] = (degreeCounts[sourceId] || 0) + 1;
      degreeCounts[targetId] = (degreeCounts[targetId] || 0) + 1;
    });
    
    // Get IDs of nodes that pass degree filters
    const validNodeIds = new Set<string>();
    
    filtered.nodes.forEach(node => {
      const degree = degreeCounts[node.id] || 0;
      
      // Skip isolated nodes if not showing them
      if (degree === 0 && !filters.showIsolatedNodes) {
        return;
      }
      
      // Check min degree filter
      if (filters.minNodeDegree !== null && degree < filters.minNodeDegree) {
        return;
      }
      
      // Check max degree filter
      if (filters.maxNodeDegree !== null && degree > filters.maxNodeDegree) {
        return;
      }
      
      validNodeIds.add(node.id);
    });
    
    // Apply node filters
    filtered.nodes = filtered.nodes.filter(node => validNodeIds.has(node.id));
    
    // Only keep edges where both source and target nodes are valid
    filtered.edges = filtered.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });
    
    setFilteredData(filtered);
  }, [data, filters, filterOptions.groups]);
  
  // Use filtered data for visualization
  const visualizationData = filteredData || data;

  // Apply visualization based on controls and data
  useEffect(() => {
    if (!visualizationData || !svgRef.current) return;

    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });

    // Apply zoom
    svg.call(zoom);
    
    // Create container group for all elements (for zoom)
    const g = svg.append("g");

    // Set initial zoom level
    svg.call(zoom.transform, d3.zoomIdentity.scale(controlsState.zoomLevel));

    // Initialize simulation based on selected layout
    let sim: d3.Simulation<any, any>;
    
    if (controlsState.layoutAlgorithm === 'force') {
      // Force-directed layout
      sim = d3.forceSimulation<any, any>()
        .force("link", d3.forceLink().id((d: any) => d.id).distance(controlsState.linkStrength * 200))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));
    } else if (controlsState.layoutAlgorithm === 'radial') {
      // Radial layout
      const radius = Math.min(width, height) / 2 - 100;
      
      sim = d3.forceSimulation<any, any>()
        .force("link", d3.forceLink().id((d: any) => d.id).distance(controlsState.linkStrength * 120))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("r", d3.forceRadial(radius, width / 2, height / 2).strength(0.8));
    } else {
      // Circular layout
      sim = d3.forceSimulation<any, any>()
        .force("link", d3.forceLink().id((d: any) => d.id).distance(controlsState.linkStrength * 100))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2));
      
      // Position nodes in a circle
      const nodes = visualizationData.nodes;
      const total = nodes.length;
      const radius = Math.min(width, height) / 3;
      
      nodes.forEach((node, i) => {
        const angle = (i / total) * 2 * Math.PI;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
        node.fx = controlsState.layoutAlgorithm === 'circular' ? node.x : null;
        node.fy = controlsState.layoutAlgorithm === 'circular' ? node.y : null;
      });
    }
    
    setSimulation(sim as any);

    // Create the links (edges)
    const links = g.append("g")
      .selectAll("line")
      .data(visualizationData.edges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.weight));

    // Create the nodes
    const nodes = g.append("g")
      .selectAll("circle")
      .data(visualizationData.nodes)
      .enter()
      .append("circle")
      .attr("r", controlsState.nodeSize * 2)
      .attr("fill", (d: Node) => controlsState.highlightCommunities 
        ? d3.schemeCategory10[d.group % 10] 
        : "#1f77b4")
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event: MouseEvent, d: Node) => {
        setSelectedNode(d);
      });

    // Add tooltips to nodes
    nodes
      .append("title")
      .text((d: Node) => d.name);

    // Add labels to nodes
    const labels = g.append("g")
      .selectAll("text")
      .data(visualizationData.nodes)
      .enter()
      .append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text((d: Node) => d.name)
      .style("font-size", "10px")
      .style("visibility", controlsState.showLabels ? "visible" : "hidden");

    // Update positions on simulation tick
    sim.nodes(visualizationData.nodes).on("tick", () => {
      links
        .attr("x1", (d: any) => (d.source as Node).x || 0)
        .attr("y1", (d: any) => (d.source as Node).y || 0)
        .attr("x2", (d: any) => (d.target as Node).x || 0)
        .attr("y2", (d: any) => (d.target as Node).y || 0);

      nodes
        .attr("cx", (d: Node) => d.x || 0)
        .attr("cy", (d: Node) => d.y || 0);

      labels
        .attr("x", (d: Node) => d.x || 0)
        .attr("y", (d: Node) => d.y || 0);
    });

    // Add the edge links to the simulation
    sim.force<d3.ForceLink<Node, Edge>>("link")?.links(visualizationData.edges);

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) sim.alphaTarget(0);
      if (controlsState.layoutAlgorithm !== 'circular') {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      sim.stop();
    };
  }, [visualizationData, controlsState]);

  // Handle controls change
  const handleControlsChange = (newControls: NetworkControlsState) => {
    setControlsState(newControls);
    // Reset selected node when layout changes
    if (newControls.layoutAlgorithm !== controlsState.layoutAlgorithm) {
      setSelectedNode(null);
    }
  };

  const handleSelectSearchNode = (node: Node) => {
    setSelectedNode(node);
    
    // Focus on the selected node in the visualization
    if (simulation && svgRef.current) {
      // Stop the simulation temporarily
      simulation.stop();
      
      // Find the node element in the DOM
      const svg = d3.select(svgRef.current);
      const nodeElement = svg.selectAll('circle').filter((d: any) => d.id === node.id);
      
      if (nodeElement.size() > 0) {
        // Highlight the node
        svg.selectAll('circle').classed('node-highlighted', false);
        nodeElement.classed('node-highlighted', true);
        
        // Get the width and height for centering
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        
        // Compute the transform to center on this node
        const scale = controlsState.zoomLevel;
        const x = width / 2 - (node.x || 0) * scale;
        const y = height / 2 - (node.y || 0) * scale;
        
        // Apply the transform with smooth transition
        svg.transition()
          .duration(750)
          .call(
            d3.zoom<SVGSVGElement, unknown>().transform as any,
            d3.zoomIdentity.translate(x, y).scale(scale)
          );
      }
    }
  };

  const handleFiltersChange = (newFilters: NetworkFiltersState) => {
    setFilters(newFilters);
  };

  const handlePredictLinks = async () => {
    try {
      setIsPredicting(true);
      setPredictionError(null);
      
      // Get the network ID from the current data
      const networkId = data?.id || "sample"; // Use a default if no ID is present
      
      try {
        // Use the updated API endpoint for link prediction
        const response = await networkApi.predictLinks(networkId);
        
        if (response.data && response.data.predictions) {
          // Make sure we have the right data structure and the values are correctly formatted
          const formattedPredictions = response.data.predictions.map((p: any) => {
            // Find the corresponding nodes in our data
            const sourceNode = data?.nodes.find(n => n.id === p.source) || {
              id: p.source,
              name: `节点 ${p.source}`,
              group: 1
            };
            
            const targetNode = data?.nodes.find(n => n.id === p.target) || {
              id: p.target,
              name: `节点 ${p.target}`,
              group: 1
            };
            
            return {
              source: p.source,
              target: p.target,
              probability: typeof p.probability === 'number' ? p.probability : Number(p.probability || 0),
              sourceNode,
              targetNode
            };
          });
          
          setPredictedLinks(formattedPredictions);
          setShowPredictions(true);
          return;
        }
      } catch (err) {
        console.error('链接预测API调用失败，使用本地生成的预测:', err);
      }
      
      // 如果API调用失败，手动生成一些可能的链接
      if (data && data.nodes.length > 0) {
        // 找出当前不存在的边
        const existingEdges = new Set();
        data.edges.forEach(edge => {
          const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
          const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
          existingEdges.add(`${sourceId}-${targetId}`);
          existingEdges.add(`${targetId}-${sourceId}`); // 考虑无向图
        });
        
        // 生成可能的新连接
        const possibleLinks: PredictionLink[] = [];
        
        // 为简单起见，我们只考虑属于相同社区(group)的节点之间可能的连接
        const nodesByGroup: {[key: number]: Node[]} = {};
        data.nodes.forEach(node => {
          if (!nodesByGroup[node.group]) nodesByGroup[node.group] = [];
          nodesByGroup[node.group].push(node);
        });
        
        // 对于每个组，找出组内不存在的连接
        Object.values(nodesByGroup).forEach(groupNodes => {
          for (let i = 0; i < groupNodes.length; i++) {
            for (let j = i + 1; j < groupNodes.length; j++) {
              const sourceId = groupNodes[i].id;
              const targetId = groupNodes[j].id;
              
              // 检查这条边是否已存在
              if (!existingEdges.has(`${sourceId}-${targetId}`)) {
                possibleLinks.push({
                  source: sourceId,
                  target: targetId,
                  probability: Number((0.5 + Math.random() * 0.4).toFixed(2)), // 生成0.5-0.9之间的概率
                  sourceNode: groupNodes[i],
                  targetNode: groupNodes[j]
                });
              }
            }
          }
        });
        
        // 按概率降序排序并只保留前10个
        possibleLinks.sort((a, b) => b.probability - a.probability);
        const topPredictions = possibleLinks.slice(0, 10);
        
        setPredictedLinks(topPredictions);
        setShowPredictions(true);
      } else {
        setPredictionError('无法生成链接预测，缺少网络数据');
      }
    } catch (err) {
      console.error('链接预测失败:', err);
      setPredictionError('链接预测计算过程中出错');
    } finally {
      setIsPredicting(false);
    }
  };
  
  const handleSelectPredictedLink = (link: PredictionLink) => {
    // Highlight the nodes in the prediction
    const svg = d3.select(svgRef.current);
    
    // Reset any previous highlights
    svg.selectAll('.node').classed('highlight', false);
    svg.selectAll('.link').classed('highlight', false);
    
    // Highlight the source and target nodes
    svg.selectAll('.node')
      .filter((d: any) => d.id === link.source || d.id === link.target)
      .classed('highlight', true);
    
    // Create a temporary "potential" link to visualize the prediction
    const sourceNode = data?.nodes.find(n => n.id === link.source);
    const targetNode = data?.nodes.find(n => n.id === link.target);
    
    if (sourceNode && targetNode) {
      // Remove any existing temporary links
      svg.selectAll('.temp-link').remove();
      
      // Add temporary link
      svg.select('.links')
        .append('line')
        .attr('class', 'temp-link')
        .attr('x1', sourceNode.x || 0)
        .attr('y1', sourceNode.y || 0)
        .attr('x2', targetNode.x || 0)
        .attr('y2', targetNode.y || 0)
        .style('stroke', '#ff6b6b')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,5')
        .style('opacity', 0.8);
    }
  };

  return (
    <div className="network-view-container">
      <div className="network-view-header">
        <h1>网络视图</h1>
        <div className="header-controls">
          {/* 
          <button 
            className={`predict-button ${isPredicting ? 'loading' : ''}`} 
            onClick={handlePredictLinks}
            disabled={isPredicting || !data}
          >
            {isPredicting ? '正在预测...' : '预测新连接'}
          </button>
          */}
          {predictedLinks.length > 0 && (
            <button 
              className="toggle-predictions-button"
              onClick={() => setShowPredictions(!showPredictions)}
            >
              {showPredictions ? '隐藏预测结果' : '查看预测结果'}
            </button>
          )}
        </div>
      </div>
      
      <div className="network-content">
        <div className="network-sidebar">
          {/* 
          <div className="sidebar-section">
            <NetworkSearch 
              nodes={data?.nodes || []} 
              onSelectNode={handleSelectSearchNode} 
            />
          </div>
          */}
          
          <div className="sidebar-section">
            <h3>网络控制</h3>
            <NetworkControls
              state={controlsState}
              onChange={handleControlsChange}
            />
          </div>
          
          <div className="sidebar-section">
            <h3>网络过滤器</h3>
            <NetworkFilters
              groups={filterOptions.groups}
              minWeight={filterOptions.minWeight}
              maxWeight={filterOptions.maxWeight}
              minDegree={filterOptions.minDegree}
              maxDegree={filterOptions.maxDegree}
              onChange={handleFiltersChange}
            />
          </div>
          
          {networkInfo && (
            <div className="sidebar-section">
              <h3>网络指标</h3>
              <NetworkMetrics metrics={networkInfo} />
            </div>
          )}
        </div>
        
        <div className="network-main">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>正在加载网络数据...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>注意: {error}</p>
            </div>
          ) : (
            <div className="visualization-container">
              <svg 
                ref={svgRef} 
                className="network-svg"
                width="100%" 
                height="100%" 
                viewBox={`0 0 800 600`}
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  minHeight: "500px", 
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff" 
                }}
              ></svg>
              {selectedNode && (
                <div className="node-detail-container">
                  <NodeDetail 
                    node={selectedNode} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {showPredictions && predictedLinks.length > 0 && (
          <div className="predictions-panel">
            <div className="panel-header">
              <h3>预测的连接</h3>
              <button 
                className="close-panel-button"
                onClick={() => setShowPredictions(false)}
              >
                关闭
              </button>
            </div>
            <PredictionResults 
              predictions={predictedLinks}
              onSelectLink={handleSelectPredictedLink}
              loading={false}
              error={null}
            />
          </div>
        )}
        
        {predictionError && (
          <div className="error-notification">
            <p>预测错误: {predictionError}</p>
            <button onClick={() => setPredictionError(null)}>关闭</button>
          </div>
        )}
      </div>
      
      <div className="network-footer">
        <div className="network-stats">
          {data && filteredData && (
            <p>
              显示 {filteredData.nodes.length} 个节点中的 {data.nodes.length} 个
              和 {filteredData.edges.length} 个连接中的 {data.edges.length} 个
            </p>
          )}
        </div>
        
        <div className="network-controls-legend">
          <div className="legend-item">
            <span className="color-circle" style={{ backgroundColor: '#1f77b4' }}></span>
            <span>社区 1</span>
          </div>
          <div className="legend-item">
            <span className="color-circle" style={{ backgroundColor: '#ff7f0e' }}></span>
            <span>社区 2</span>
          </div>
          <div className="legend-item">
            <span className="color-circle" style={{ backgroundColor: '#2ca02c' }}></span>
            <span>社区 3</span>
          </div>
          <div className="legend-item">
            <span className="color-circle" style={{ backgroundColor: '#d62728' }}></span>
            <span>社区 4</span>
          </div>
          <div className="legend-item">
            <span className="color-circle" style={{ backgroundColor: '#9467bd' }}></span>
            <span>社区 5+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkView; 