import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './UserInfluenceNetwork.css';
import { UserActivityPrediction } from './UserActivityPredictions';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: number;
  activityScore?: number;
  highlighted?: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  weight: number;
}

interface NetworkData {
  nodes: Node[];
  links: Link[];
}

interface UserInfluenceNetworkProps {
  networkData: NetworkData;
  activityPredictions: UserActivityPrediction[];
  width?: number;
  height?: number;
  selectedUser?: UserActivityPrediction | null;
}

const UserInfluenceNetwork: React.FC<UserInfluenceNetworkProps> = ({
  networkData,
  activityPredictions,
  width = 600,
  height = 400,
  selectedUser
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Link> | null>(null);

  // 将活动分数应用到网络数据
  useEffect(() => {
    if (!networkData || !activityPredictions) return;

    // 为节点添加活动分数
    const nodesWithScores = networkData.nodes.map(node => {
      const prediction = activityPredictions.find(p => p.id === node.id);
      return {
        ...node,
        activityScore: prediction?.predicted_activity || 0,
        highlighted: selectedUser ? node.id === selectedUser.id : false
      };
    });

    // 创建带有分数的新网络数据对象
    const enhancedData = {
      nodes: nodesWithScores,
      links: networkData.links
    };

    renderNetworkVisualization(enhancedData);
  }, [networkData, activityPredictions, selectedUser]);

  const renderNetworkVisualization = (data: NetworkData) => {
    if (!svgRef.current) return;

    // 清除先前的可视化
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const container = svg.append("g");

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => container.attr("transform", event.transform.toString()));

    svg.call(zoom as any);

    // 初始化模拟
    const sim = d3.forceSimulation<Node, Link>()
      .force("link", d3.forceLink<Node, Link>().id((d: any) => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // 使用更鲜明的颜色渐变，从冷色调到暖色调
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 1]);

    // 根据节点的影响力大小定义连接的透明度
    const getConnectionOpacity = (d: Link) => {
      const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
      const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
      
      if (!sourceNode || !targetNode) return 0.2;
      
      // 计算平均活动分数
      const avgScore = ((sourceNode.activityScore || 0) + (targetNode.activityScore || 0)) / 2;
      // 根据平均分数和权重调整不透明度
      return 0.3 + Math.min(0.7, avgScore * d.weight);
    };

    // 先绘制连接，确保它们在节点下面
    const links = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#666")
      .attr("stroke-opacity", getConnectionOpacity)
      .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.weight) * 1.5));

    // 创建节点
    const nodes = container.append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .classed("highlighted", (d) => d.highlighted === true)
      .call(d3.drag<any, Node>()
        .on("start", dragstart)
        .on("drag", dragging)
        .on("end", dragend));

    // 创建一个辅助函数来突出显示选定用户的连接
    const isConnectedToHighlighted = (d: Link) => {
      if (!selectedUser) return false;
      
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      
      return sourceId === selectedUser.id || targetId === selectedUser.id;
    };

    // 根据连接情况更新连接样式
    if (selectedUser) {
      links.classed("connected-link", isConnectedToHighlighted)
        .attr("stroke", d => isConnectedToHighlighted(d) ? "#e74c3c" : "#666")
        .attr("stroke-opacity", d => isConnectedToHighlighted(d) ? 0.8 : 0.2)
        .attr("stroke-width", d => isConnectedToHighlighted(d) ? 
          Math.max(2, Math.sqrt(d.weight) * 2) : 
          Math.max(0.5, Math.sqrt(d.weight)));
    }

    // 为节点添加圆圈
    nodes.append("circle")
      .attr("r", (d) => 5 + (d.activityScore || 0) * 20)
      .attr("fill", (d) => colorScale(d.activityScore || 0))
      .attr("stroke", (d) => d.highlighted ? "#e74c3c" : "#fff")
      .attr("stroke-width", (d) => d.highlighted ? 3 : 1)
      .attr("opacity", (d) => selectedUser && !d.highlighted && 
        !data.links.some(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return (sourceId === selectedUser.id && targetId === d.id) || 
                 (targetId === selectedUser.id && sourceId === d.id);
        }) ? 0.5 : 1);

    // 为节点添加标签
    nodes.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text((d) => d.name)
      .style("font-size", "10px")
      .style("font-weight", (d) => d.highlighted ? "bold" : "normal")
      .style("pointer-events", "none")
      .style("opacity", (d) => {
        // 如果有选中用户，只显示相关节点的标签
        if (selectedUser) {
          if (d.highlighted) return 1;
          
          // 检查是否与选中用户有连接
          const isConnected = data.links.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === selectedUser.id && targetId === d.id) || 
                   (targetId === selectedUser.id && sourceId === d.id);
          });
          
          return isConnected ? 0.9 : 0.3;
        }
        
        // 根据活动分数调整标签透明度
        return 0.6 + (d.activityScore || 0) * 0.4;
      });

    // 为节点添加悬停详情标题
    nodes.append("title")
      .text((d) => `${d.name}\n活动分数: ${(d.activityScore || 0).toFixed(2)}`);

    // 在模拟的每个计算周期更新位置
    sim.nodes(data.nodes).on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // 添加连接到模拟
    sim.force<d3.ForceLink<Node, Link>>("link")?.links(data.links);

    setSimulation(sim);

    // 拖拽函数
    function dragstart(event: any, d: Node) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragend(event: any, d: Node) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 添加图例
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20, ${height - 80})`);

    const gradientData = Array.from({ length: 10 }, (_, i) => ({
      offset: `${i * 10}%`,
      color: colorScale(i / 9)
    }));

    // 添加线性渐变定义
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "activity-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.selectAll("stop")
      .data(gradientData)
      .enter()
      .append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    // 添加渐变条
    legend.append("rect")
      .attr("width", 150)
      .attr("height", 10)
      .style("fill", "url(#activity-gradient)")
      .style("stroke", "#666")
      .style("stroke-width", "0.5px");

    // 添加标签
    legend.append("text")
      .attr("x", 0)
      .attr("y", 25)
      .style("font-size", "8px")
      .text("低活跃度");

    legend.append("text")
      .attr("x", 150)
      .attr("y", 25)
      .style("font-size", "8px")
      .style("text-anchor", "end")
      .text("高活跃度");

    legend.append("text")
      .attr("x", 75)
      .attr("y", -10)
      .style("font-size", "10px")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .text("用户活动影响力");
  };

  return (
    <div className="user-influence-network">
      <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default UserInfluenceNetwork; 