import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NetworkControlsState } from './NetworkControls';

export interface Node {
  id: string;
  name: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  highlight?: 'new' | 'removed' | 'common' | null;
}

export interface Edge {
  source: string | Node;
  target: string | Node;
  weight: number;
}

export interface NetworkData {
  nodes: Node[];
  edges: Edge[];
}

interface NetworkVisualizationProps {
  data: NetworkData;
  controls: NetworkControlsState;
  onSimulationInit?: (simulation: d3.Simulation<Node, Edge>) => void;
  onNodeClick?: (node: Node) => void;
  onControlsChange?: (controls: NetworkControlsState) => void;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ 
  data, 
  controls, 
  onSimulationInit,
  onNodeClick,
  onControlsChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Edge> | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

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
    svg.call(zoom.transform, d3.zoomIdentity.scale(controls.zoomLevel));

    // Initialize simulation based on selected layout
    let sim: d3.Simulation<Node, Edge>;
    
    if (controls.layoutAlgorithm === 'force') {
      // Force-directed layout
      sim = d3.forceSimulation<Node, Edge>()
        .force("link", d3.forceLink<Node, Edge>().id((d: any) => d.id).distance(controls.linkStrength * 200))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));
    } else if (controls.layoutAlgorithm === 'radial') {
      // Radial layout
      const radius = Math.min(width, height) / 2 - 50;
      
      sim = d3.forceSimulation<Node, Edge>()
        .force("link", d3.forceLink<Node, Edge>().id((d: any) => d.id).distance(controls.linkStrength * 120))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("r", d3.forceRadial(radius, width / 2, height / 2).strength(0.8));
    } else {
      // Circular layout
      sim = d3.forceSimulation<Node, Edge>()
        .force("link", d3.forceLink<Node, Edge>().id((d: any) => d.id).distance(controls.linkStrength * 100))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2));
      
      // Position nodes in a circle
      const nodes = data.nodes;
      const total = nodes.length;
      const radius = Math.min(width, height) / 3;
      
      nodes.forEach((node, i) => {
        const angle = (i / total) * 2 * Math.PI;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
        node.fx = controls.layoutAlgorithm === 'circular' ? node.x : null;
        node.fy = controls.layoutAlgorithm === 'circular' ? node.y : null;
      });
    }
    
    simulationRef.current = sim;
    
    // Notify parent component about the simulation if callback provided
    if (onSimulationInit) {
      onSimulationInit(sim);
    }

    // Create the links (edges)
    const links = g.append("g")
      .selectAll("line")
      .data(data.edges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.weight));

    // Create the nodes
    const nodes = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.highlight === 'new' || d.highlight === 'removed' ? controls.nodeSize * 2.5 : controls.nodeSize * 2)
      .attr("fill", (d: Node) => {
        // Prioritize highlight colors if present
        if (d.highlight === 'new') {
          return '#4CAF50'; // Green for new nodes
        } else if (d.highlight === 'removed') {
          return '#F44336'; // Red for removed nodes
        } else if (d.highlight === 'common') {
          return '#2196F3'; // Blue for common nodes
        } else if (controls.highlightCommunities) {
          return d3.schemeCategory10[d.group % 10];
        } else {
          return "#1f77b4";
        }
      })
      .attr("stroke", (d: Node) => {
        // Add a stroke for highlighted nodes
        if (d.highlight === 'new' || d.highlight === 'removed') {
          return '#000';
        }
        return 'none';
      })
      .attr("stroke-width", (d: Node) => {
        return d.highlight === 'new' || d.highlight === 'removed' ? 1.5 : 0;
      })
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add click handler if provided
    if (onNodeClick) {
      nodes.on("click", (event: MouseEvent, d: Node) => {
        onNodeClick(d);
      });
    }

    // Add tooltips to nodes
    nodes
      .append("title")
      .text((d: Node) => {
        let tooltip = d.name;
        if (d.highlight === 'new') {
          tooltip += ' (New)';
        } else if (d.highlight === 'removed') {
          tooltip += ' (Removed)';
        }
        return tooltip;
      });

    // Add labels to nodes if enabled
    if (controls.showLabels) {
      const labels = g.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter()
        .append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text((d: Node) => d.name)
        .style("font-size", "10px")
        .style("font-weight", (d: Node) => (d.highlight === 'new' || d.highlight === 'removed') ? 'bold' : 'normal');

      // Update label positions on simulation tick
      sim.on("tick", () => {
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
    } else {
      // Update positions without labels
      sim.on("tick", () => {
        links
          .attr("x1", (d: any) => (d.source as Node).x || 0)
          .attr("y1", (d: any) => (d.source as Node).y || 0)
          .attr("x2", (d: any) => (d.target as Node).x || 0)
          .attr("y2", (d: any) => (d.target as Node).y || 0);

        nodes
          .attr("cx", (d: Node) => d.x || 0)
          .attr("cy", (d: Node) => d.y || 0);
      });
    }

    // Add the edge links to the simulation
    sim.force<d3.ForceLink<Node, Edge>>("link")?.links(data.edges);

    // Start the simulation
    sim.nodes(data.nodes);

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
      if (controls.layoutAlgorithm !== 'circular') {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data, controls, onNodeClick, onSimulationInit, onControlsChange]);

  // 监听控件状态变化并调用 onControlsChange 回调
  useEffect(() => {
    if (onControlsChange) {
      onControlsChange(controls);
    }
  }, [controls, onControlsChange]);

  return (
    <svg ref={svgRef} className="network-svg"></svg>
  );
};

export default NetworkVisualization; 