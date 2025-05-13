import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import NetworkComparison from '../pages/NetworkComparison';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the NetworkVisualization component since it uses D3
jest.mock('../components/NetworkVisualization', () => {
  return function DummyNetworkVisualization(props: any) {
    return <div data-testid="network-visualization">Network Visualization Mock</div>;
  };
});

// Mock network data
const mockSnapshots = [
  { id: '1', name: 'January Network', date: '2023-01-15', nodeCount: 250, edgeCount: 620, density: 0.02, avgDegree: 4.96 },
  { id: '2', name: 'February Network', date: '2023-02-15', nodeCount: 275, edgeCount: 710, density: 0.019, avgDegree: 5.16 }
];

const mockNetworkData = {
  nodes: [
    { id: 'node1', name: 'Node 1', group: 1 },
    { id: 'node2', name: 'Node 2', group: 1 }
  ],
  edges: [
    { source: 'node1', target: 'node2', weight: 1.0 }
  ]
};

const mockComparisonData = {
  nodeGrowth: 25,
  nodeGrowthPercent: '10.0',
  edgeGrowth: 90,
  edgeGrowthPercent: '14.5',
  densityChange: '-0.001',
  avgDegreeChange: '0.20',
  newCommunities: 1,
  topGrowingCommunities: [
    { name: 'Tech', growth: '23%' },
    { name: 'Marketing', growth: '18%' }
  ],
  nodesByGroup: [
    { group: 'Group 1', before: 80, after: 90 },
    { group: 'Group 2', before: 70, after: 85 }
  ],
  structuralChanges: {
    commonNodes: 240,
    newNodes: 35,
    removedNodes: 10,
    commonEdges: 580,
    newEdges: 130,
    removedEdges: 40
  }
};

describe('NetworkComparison Component', () => {
  beforeEach(() => {
    // Reset mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    
    // Setup default responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/network/snapshots') {
        return Promise.resolve({ data: mockSnapshots });
      } else if (url.includes('/api/network/snapshot/')) {
        return Promise.resolve({ data: mockNetworkData });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    mockedAxios.post.mockImplementation((url) => {
      if (url === '/api/network/compare') {
        return Promise.resolve({ data: mockComparisonData });
      }
      return Promise.reject(new Error('Not found'));
    });
  });
  
  test('renders the component title', async () => {
    render(<NetworkComparison />);
    expect(screen.getByText('Network Comparison')).toBeInTheDocument();
  });
  
  test('loads and displays snapshots', async () => {
    render(<NetworkComparison />);
    await waitFor(() => {
      expect(screen.getByText('January Network')).toBeInTheDocument();
      expect(screen.getByText('February Network')).toBeInTheDocument();
    });
  });
  
  test('allows selecting snapshots', async () => {
    render(<NetworkComparison />);
    await waitFor(() => {
      expect(screen.getByText('January Network')).toBeInTheDocument();
    });
    
    // Click on the snapshots to select them
    fireEvent.click(screen.getByText('January Network'));
    fireEvent.click(screen.getByText('February Network'));
    
    // Check if the compare button is enabled
    const compareButton = screen.getByText('Compare Selected Networks');
    expect(compareButton).not.toBeDisabled();
  });
  
  test('displays comparison results after comparing', async () => {
    render(<NetworkComparison />);
    await waitFor(() => {
      expect(screen.getByText('January Network')).toBeInTheDocument();
    });
    
    // Select snapshots
    fireEvent.click(screen.getByText('January Network'));
    fireEvent.click(screen.getByText('February Network'));
    
    // Click compare button
    fireEvent.click(screen.getByText('Compare Selected Networks'));
    
    // Check if comparison results are displayed
    await waitFor(() => {
      expect(screen.getByText('Comparison Results')).toBeInTheDocument();
      expect(screen.getByText('Node Growth')).toBeInTheDocument();
      expect(screen.getByText('Common Edges:')).toBeInTheDocument();
    });
  });
  
  test('shows structural visualization when comparison data is available', async () => {
    render(<NetworkComparison />);
    await waitFor(() => {
      expect(screen.getByText('January Network')).toBeInTheDocument();
    });
    
    // Select snapshots and compare
    fireEvent.click(screen.getByText('January Network'));
    fireEvent.click(screen.getByText('February Network'));
    fireEvent.click(screen.getByText('Compare Selected Networks'));
    
    // Check if structural visualization is displayed
    await waitFor(() => {
      expect(screen.getByText('Structural Changes')).toBeInTheDocument();
      expect(screen.getByText('240 common nodes')).toBeInTheDocument();
    });
  });
}); 