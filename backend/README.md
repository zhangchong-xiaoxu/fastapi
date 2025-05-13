# 社交网络分析系统 - 后端

## 环境兼容性说明

本项目后端使用Python，但请注意以下兼容性提示：

- **Python版本**：项目目前适配了Python 3.13，但部分科学计算库（如原始requirements.txt中的numpy、pandas、scikit-learn和PyTorch等）与Python 3.13尚未完全兼容。

- **已移除的依赖**：为确保项目可运行，已从requirements.txt中移除了以下依赖：
  - numpy
  - pandas
  - scikit-learn
  - torch及其相关库（torch-geometric、torch-sparse、torch-scatter）

- **如需使用这些库**：请考虑以下选项：
  1. 使用Python 3.10/3.11版本代替Python 3.13
  2. 等待这些库更新以兼容Python 3.13
  3. 尝试使用conda代替pip进行安装

## 项目设置

1. 确保您已创建并激活虚拟环境
2. 安装依赖：
```
pip install -r requirements.txt
```
3. 启动服务器：
```
uvicorn main:app --reload
```

## 注意

如果您的应用程序逻辑依赖于已移除的科学计算库，请考虑降级到Python 3.10/3.11，或查找替代方案。 