# AI-Based Social Network Analysis System

A locally-running system for collecting, analyzing, visualizing, and providing intelligent recommendations for social network data. This project focuses on delivering deep social network insights while ensuring data privacy and compliance.

## Features

- **Network Structure Analysis**: Identify key nodes, detect community structures, and analyze network evolution trends
- **User Behavior Understanding**: Analyze individual behavior patterns and group dynamics
- **Intelligent Prediction & Recommendation**: Predict user behavior, relationship changes, and provide personalized social suggestions
- **Privacy Protection**: Ensure data anonymization and compliant processing

## Project Structure

```
social-community/
├── backend/               # Python FastAPI backend
│   ├── analysis/          # Network analysis algorithms
│   ├── api/               # API endpoints
│   ├── data/              # Data handling
│   ├── models/            # Machine learning models
│   └── utils/             # Utility functions
├── frontend/              # React+TypeScript frontend
│   ├── public/            # Static assets
│   └── src/               # Source code
│       ├── components/    # React components
│       ├── hooks/         # Custom React hooks
│       ├── pages/         # Application pages
│       ├── services/      # API services
│       └── utils/         # Utility functions
├── data/                  # Data directory
│   ├── input/             # Input data files
│   └── output/            # Analysis outputs
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/social-community.git
cd social-community
```

2. Set up the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend
```bash
cd frontend
npm install  # or: yarn install
```

### Running the Application

1. Start the backend server

```bash
cd backend
uvicorn main:app --reload
uvicorn test_app --reload
uvicorn simplified_app --reload
uvicorn api_minimal --reload
```
cd backend ; uvicorn api_minimal:app --reload --port 8000
cd backend ; uvicorn main:app --reload --port 8000

2. Start the frontend development server
```bash
cd frontend
npm start  # or: yarn start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Place your social network data files in the `data/input` directory
2. The system will automatically detect and process new files
3. Access the analysis results through the web interface

## Documentation

For more detailed information, please refer to:
- [Project Plan](PROJECT_PLAN.md)
- [Project Rules](PROJECT_RULES.md)
- [API Documentation](docs/api.md) (coming soon)
- [User Guide](docs/user-guide.md) (coming soon)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 