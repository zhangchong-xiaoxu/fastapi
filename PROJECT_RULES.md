# Social Network Analysis System - Project Rules

## Code Style and Standards
1. **Code Formatting**:
   - Python: Follow PEP 8 guidelines
   - JavaScript/TypeScript: Use Prettier with default settings
   - Maximum line length: 100 characters

2. **Naming Conventions**:
   - Variables/Functions: camelCase for JavaScript/TypeScript, snake_case for Python
   - Classes: PascalCase for all languages
   - Constants: UPPER_SNAKE_CASE for all languages
   - File names: snake_case for Python, PascalCase for React components

3. **Documentation**:
   - All functions and classes must have docstrings/JSDoc comments
   - Complex algorithms must include inline comments
   - README files must be maintained for each major directory

## Git Workflow
1. Use feature branches for all new features and bug fixes
2. Branch naming: `feature/short-description` or `bugfix/short-description`
3. Commit messages should be clear and descriptive

## Project Structure
1. Follow the defined architecture separation (frontend/backend)
2. Keep related files together in appropriate directories
3. Use absolute imports where possible

## Data Privacy
1. No user identifiable information should be stored in plain text
2. All user IDs must be hashed before processing
3. Data should remain local and no external API calls unless explicitly approved

## Testing
1. Write unit tests for all significant functions
2. Integration tests for API endpoints
3. Target minimum 70% code coverage

## Dependencies
1. All dependencies must be documented in appropriate files (requirements.txt, package.json)
2. Prefer established libraries over custom implementations for standard functionalities
3. Keep dependencies to a minimum to reduce complexity

## Performance
1. Optimize database queries to avoid loading unnecessary data
2. Implement pagination for large datasets
3. Consider memory usage when processing large networks 