@echo off
echo 正在启动社交网络分析系统...
echo.

REM 启动后端
echo 正在启动后端服务...
start cmd /k "cd backend && venv\Scripts\activate && python main.py"

REM 等待后端启动
echo 等待后端服务启动...
timeout /t 5 /nobreak >nul

REM 启动前端
echo 正在启动前端服务...
start cmd /k "cd frontend && npm start"

echo.
echo 服务启动中，请稍候...
echo 前端服务将自动在浏览器中打开。
echo 如果浏览器没有自动打开，请访问: http://localhost:3000
echo.
echo 按任意键退出此窗口 (服务将继续在后台运行)
pause >nul