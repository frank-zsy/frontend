import { RadarChart, PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([RadarChart, PieChart, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

export { echarts };
