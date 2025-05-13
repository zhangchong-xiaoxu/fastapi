import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

interface VisualizationSettings {
  defaultNodeSize: number;
  defaultLinkStrength: number;
  showLabels: boolean;
  colorScheme: string;
}

interface AnalysisSettings {
  defaultCommunityAlgorithm: string;
  defaultCentralityMeasure: string;
  enableAdvancedMetrics: boolean;
}

interface DataSettings {
  anonymizeData: boolean;
  saveAnalysisHistory: boolean;
  autoExportResults: boolean;
}

const Settings: React.FC = () => {
  const [visualizationSettings, setVisualizationSettings] = useState<VisualizationSettings>({
    defaultNodeSize: 5,
    defaultLinkStrength: 0.5,
    showLabels: true,
    colorScheme: 'default'
  });

  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    defaultCommunityAlgorithm: 'louvain',
    defaultCentralityMeasure: 'betweenness',
    enableAdvancedMetrics: false
  });

  const [dataSettings, setDataSettings] = useState<DataSettings>({
    anonymizeData: true,
    saveAnalysisHistory: true,
    autoExportResults: false
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  // 从后端/本地存储获取设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // 实际实现时替换为真实的API端点
        // const response = await axios.get('/api/settings');
        // setVisualizationSettings(response.data.visualization);
        // setAnalysisSettings(response.data.analysis);
        // setDataSettings(response.data.data);

        // 目前，如果可用则从localStorage加载
        const savedVisualizationSettings = localStorage.getItem('visualizationSettings');
        const savedAnalysisSettings = localStorage.getItem('analysisSettings');
        const savedDataSettings = localStorage.getItem('dataSettings');

        if (savedVisualizationSettings) {
          setVisualizationSettings(JSON.parse(savedVisualizationSettings));
        }
        if (savedAnalysisSettings) {
          setAnalysisSettings(JSON.parse(savedAnalysisSettings));
        }
        if (savedDataSettings) {
          setDataSettings(JSON.parse(savedDataSettings));
        }
      } catch (error) {
        console.error('加载设置时出错:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    
    try {
      // 实际实现时替换为真实的API端点
      // await axios.post('/api/settings', {
      //   visualization: visualizationSettings,
      //   analysis: analysisSettings,
      //   data: dataSettings
      // });

      // 目前，保存到localStorage
      localStorage.setItem('visualizationSettings', JSON.stringify(visualizationSettings));
      localStorage.setItem('analysisSettings', JSON.stringify(analysisSettings));
      localStorage.setItem('dataSettings', JSON.stringify(dataSettings));
      
      setSaveSuccess(true);
      
      // 3秒后重置成功消息
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('保存设置时出错:', error);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('将所有设置重置为默认值？')) {
      setVisualizationSettings({
        defaultNodeSize: 5,
        defaultLinkStrength: 0.5,
        showLabels: true,
        colorScheme: 'default'
      });
      
      setAnalysisSettings({
        defaultCommunityAlgorithm: 'louvain',
        defaultCentralityMeasure: 'betweenness',
        enableAdvancedMetrics: false
      });
      
      setDataSettings({
        anonymizeData: true,
        saveAnalysisHistory: true,
        autoExportResults: false
      });
    }
  };

  return (
    <div className="settings-container">
      <h1>设置</h1>
      <p className="description">
        自定义应用程序设置，根据您的偏好定制网络分析体验。
      </p>

      <div className="settings-section">
        <h2>可视化设置</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="defaultNodeSize">默认节点大小</label>
            <input
              type="range"
              id="defaultNodeSize"
              min="1"
              max="10"
              step="0.5"
              value={visualizationSettings.defaultNodeSize}
              onChange={(e) => setVisualizationSettings({
                ...visualizationSettings,
                defaultNodeSize: parseFloat(e.target.value)
              })}
            />
            <span className="setting-value">{visualizationSettings.defaultNodeSize}</span>
          </div>

          <div className="setting-item">
            <label htmlFor="defaultLinkStrength">默认连接强度</label>
            <input
              type="range"
              id="defaultLinkStrength"
              min="0.1"
              max="1"
              step="0.1"
              value={visualizationSettings.defaultLinkStrength}
              onChange={(e) => setVisualizationSettings({
                ...visualizationSettings,
                defaultLinkStrength: parseFloat(e.target.value)
              })}
            />
            <span className="setting-value">{visualizationSettings.defaultLinkStrength}</span>
          </div>

          <div className="setting-item">
            <label htmlFor="showLabels">显示节点标签</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="showLabels"
                checked={visualizationSettings.showLabels}
                onChange={(e) => setVisualizationSettings({
                  ...visualizationSettings,
                  showLabels: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </div>
          </div>

          <div className="setting-item">
            <label htmlFor="colorScheme">配色方案</label>
            <select
              id="colorScheme"
              value={visualizationSettings.colorScheme}
              onChange={(e) => setVisualizationSettings({
                ...visualizationSettings,
                colorScheme: e.target.value
              })}
            >
              <option value="default">默认</option>
              <option value="pastel">柔和</option>
              <option value="vivid">鲜明</option>
              <option value="monochrome">单色</option>
              <option value="diverging">发散</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>分析设置</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="defaultCommunityAlgorithm">默认社区检测</label>
            <select
              id="defaultCommunityAlgorithm"
              value={analysisSettings.defaultCommunityAlgorithm}
              onChange={(e) => setAnalysisSettings({
                ...analysisSettings,
                defaultCommunityAlgorithm: e.target.value
              })}
            >
              <option value="louvain">洛万算法 (Louvain)</option>
              <option value="girvan_newman">基尔万-纽曼算法 (Girvan-Newman)</option>
              <option value="label_propagation">标签传播</option>
              <option value="infomap">信息图算法 (Infomap)</option>
            </select>
          </div>

          <div className="setting-item">
            <label htmlFor="defaultCentralityMeasure">默认中心性度量</label>
            <select
              id="defaultCentralityMeasure"
              value={analysisSettings.defaultCentralityMeasure}
              onChange={(e) => setAnalysisSettings({
                ...analysisSettings,
                defaultCentralityMeasure: e.target.value
              })}
            >
              <option value="degree">度中心性</option>
              <option value="betweenness">介数中心性</option>
              <option value="closeness">接近中心性</option>
              <option value="eigenvector">特征向量中心性</option>
            </select>
          </div>

          <div className="setting-item">
            <label htmlFor="enableAdvancedMetrics">启用高级指标</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="enableAdvancedMetrics"
                checked={analysisSettings.enableAdvancedMetrics}
                onChange={(e) => setAnalysisSettings({
                  ...analysisSettings,
                  enableAdvancedMetrics: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </div>
            <p className="setting-help">包括计算密集型指标，如介数中心性和路径长度</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>数据设置</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="anonymizeData">匿名化数据</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="anonymizeData"
                checked={dataSettings.anonymizeData}
                onChange={(e) => setDataSettings({
                  ...dataSettings,
                  anonymizeData: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </div>
            <p className="setting-help">在可视化和报告中替换实际用户名</p>
          </div>

          <div className="setting-item">
            <label htmlFor="saveAnalysisHistory">保存分析历史</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="saveAnalysisHistory"
                checked={dataSettings.saveAnalysisHistory}
                onChange={(e) => setDataSettings({
                  ...dataSettings,
                  saveAnalysisHistory: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </div>
            <p className="setting-help">保存分析结果的历史记录以供将来参考</p>
          </div>

          <div className="setting-item">
            <label htmlFor="autoExportResults">自动导出结果</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="autoExportResults"
                checked={dataSettings.autoExportResults}
                onChange={(e) => setDataSettings({
                  ...dataSettings,
                  autoExportResults: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </div>
            <p className="setting-help">分析完成后自动以CSV格式导出结果</p>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="reset-button"
          onClick={handleReset}
        >
          重置为默认值
        </button>
        <button 
          className="save-button"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {saveSuccess === true && (
        <div className="success-message">
          设置已成功保存！
        </div>
      )}

      {saveSuccess === false && (
        <div className="error-message">
          保存设置时出错。请稍后再试。
        </div>
      )}
    </div>
  );
};

export default Settings; 