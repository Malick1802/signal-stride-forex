
import { MarketAnalysis, MarketDataItem } from './types.ts';

export async function generateSignalFromAnalysis(
  pair: string, 
  marketData: MarketDataItem, 
  analysis: MarketAnalysis, 
  supabase: any
) {
  try {
    // Create detailed chart data
    const chartData = [];
    const baseTime = Date.now() - (30 * 60 * 1000);
    const entryPrice = analysis.entryPrice || parseFloat(marketData.current_price.toString());
    
    for (let i = 0; i < 30; i++) {
      const timePoint = baseTime + (i * 60 * 1000);
      const variation = (Math.sin(i * 0.2) + Math.random() * 0.2 - 0.1) * (entryPrice * 0.0002);
      chartData.push({
        time: timePoint,
        price: parseFloat((entryPrice + variation).toFixed(5))
      });
    }

    const signal = {
      symbol: pair,
      type: analysis.direction,
      price: parseFloat(entryPrice.toFixed(5)),
      stop_loss: parseFloat(analysis.stopLoss.toFixed(5)),
      take_profits: analysis.takeProfits.map((tp: number) => parseFloat(tp.toFixed(5))),
      confidence: analysis.confidence,
      status: 'active',
      is_centralized: true,
      user_id: null,
      analysis_text: `AI-Generated Signal: ${analysis.analysis}`,
      chart_data: chartData,
      pips: Math.floor(Math.abs(entryPrice - analysis.stopLoss) * 10000),
      created_at: new Date().toISOString()
    };

    const { data: insertedSignal, error } = await supabase
      .from('trading_signals')
      .insert(signal)
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting automated signal:', error);
      return null;
    }

    // Create detailed AI analysis record
    await supabase
      .from('ai_analysis')
      .insert({
        signal_id: insertedSignal.id,
        analysis_text: analysis.analysis,
        confidence_score: analysis.confidence,
        market_conditions: {
          riskLevel: analysis.riskLevel,
          generatedAt: new Date().toISOString(),
          symbol: pair,
          automated: true
        }
      });

    console.log(`✅ Generated automated signal for ${pair}: ${analysis.direction} at ${entryPrice}`);
    return insertedSignal;
  } catch (error) {
    console.error('Error generating signal from analysis:', error);
    return null;
  }
}
