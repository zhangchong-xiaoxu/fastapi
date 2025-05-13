import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './NetworkTimeline.css';

interface TimelineDataPoint {
  timestamp: string;
  label: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  communities: number;
}

interface NetworkTimelineProps {
  data: TimelineDataPoint[];
  onPointSelect: (index: number) => void;
  selectedIndices: [number, number] | null;
}

const NetworkTimeline: React.FC<NetworkTimelineProps> = ({
  data,
  onPointSelect,
  selectedIndices
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!data.length || !svgRef.current) return;
    
    // Clear any existing elements
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Sort data chronologically
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const svg = d3.select(svgRef.current);
    const margin = { top: 40, right: 30, bottom: 60, left: 50 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;
    
    // Create a group for the visualization with margins
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // X scale (time)
    const xScale = d3.scaleTime()
      .domain(d3.extent(sortedData, d => new Date(d.timestamp)) as [Date, Date])
      .range([0, width]);
    
    // Y scale (node count)
    const maxNodeCount = d3.max(sortedData, d => d.nodeCount) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, maxNodeCount * 1.1]) // Add 10% padding
      .range([height, 0]);
    
    // Add X axis
    const formatTime = d3.timeFormat('%b %Y');
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((domainValue: Date | d3.NumberValue, i: number) => {
        if (domainValue instanceof Date) {
          return formatTime(domainValue);
        }
        return '';
      }))
      .selectAll('text')
        .attr('transform', 'rotate(-25)')
        .style('text-anchor', 'end');
    
    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale));
    
    // Add Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Node Count');

    // Add line for nodes
    const nodeLine = d3.line<TimelineDataPoint>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.nodeCount))
      .curve(d3.curveMonotoneX);
    
    g.append('path')
      .datum(sortedData)
      .attr('class', 'line nodes-line')
      .attr('d', nodeLine);
    
    // Add points
    g.selectAll('.point')
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('class', (d, i) => {
        let className = 'timeline-point';
        if (selectedIndices && (i === selectedIndices[0] || i === selectedIndices[1])) {
          className += ' selected';
        }
        return className;
      })
      .attr('cx', d => xScale(new Date(d.timestamp)))
      .attr('cy', d => yScale(d.nodeCount))
      .attr('r', 6)
      .on('click', (event, d) => {
        const index = sortedData.indexOf(d);
        onPointSelect(index);
      })
      .append('title')
      .text(d => `${d.label}\nDate: ${new Date(d.timestamp).toLocaleDateString()}\nNodes: ${d.nodeCount}\nEdges: ${d.edgeCount}`);
    
    // Add annotations for selected points
    if (selectedIndices) {
      selectedIndices.forEach(index => {
        if (index >= 0 && index < sortedData.length) {
          const point = sortedData[index];
          
          g.append('text')
            .attr('class', 'point-label')
            .attr('x', xScale(new Date(point.timestamp)))
            .attr('y', yScale(point.nodeCount) - 15)
            .attr('text-anchor', 'middle')
            .text(point.label);
        }
      });
    }
    
    // Add background vertical lines for each point
    g.selectAll('.vertical-line')
      .data(sortedData)
      .enter()
      .append('line')
      .attr('class', 'vertical-line')
      .attr('x1', d => xScale(new Date(d.timestamp)))
      .attr('y1', height)
      .attr('x2', d => xScale(new Date(d.timestamp)))
      .attr('y2', 0)
      .style('stroke-dasharray', '3,3');
    
    // Add a title
    svg.append('text')
      .attr('x', margin.left + width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'timeline-title')
      .text('Network Evolution Over Time');
      
  }, [data, selectedIndices, onPointSelect]);
  
  return (
    <div className="network-timeline">
      <svg ref={svgRef} width="100%" height="200"></svg>
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-color nodes-color"></div>
          <div className="legend-label">Nodes</div>
        </div>
        {selectedIndices && (
          <div className="selected-info">
            {selectedIndices[0] !== selectedIndices[1] ? (
              <span>Comparing networks at {data[selectedIndices[0]]?.label} and {data[selectedIndices[1]]?.label}</span>
            ) : (
              <span>Select another point to compare networks</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkTimeline; 