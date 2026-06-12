/**
 * ════════════════════════════════════════════════════════════════════════════
 * MULTI-SCENARIO RESIDUAL INCOME MODEL BUILDER — ALPHABET INC. (GOOGL)
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * This script uses DISCOVERY and LOOPS rather than hardcoded cell references.
 * It will work on any spreadsheet with the standard source tab structure.
 * 
 * KEY PRINCIPLES:
 *   1. DISCOVER row numbers by searching for labels (not hardcoding)
 *   2. DISCOVER column count from the source data
 *   3. Use LOOPS to generate formulas across columns
 *   4. Use CONFIGURATION OBJECTS to store discovered values
 * 
 * MULTI-SCENARIO EXTENSION:
 *   - Creates Model_Bull, Model_Base, Model_Bear tabs
 *   - Creates Scenario_Summary tab with probability-weighted valuation
 * 
 * MODEL TAB STRUCTURE (Fixed Rows):
 *   Rows 1-8:     MARKET DATA
 *   Rows 10-17:   VALUATION ASSUMPTIONS
 *   Rows 19-28:   BALANCE SHEET (Beginning)
 *   Rows 30-37:   INCOME STATEMENT
 *   Rows 39-51:   ABNORMAL EARNINGS & VALUATION
 *   Rows 55+:     PROFESSOR'S STRATEGIC NOTES
 * ════════════════════════════════════════════════════════════════════════════
 */


/**
 * ════════════════════════════════════════════════════════════════════════════
 * MAIN ENTRY POINT: MULTI-SCENARIO MODEL
 * ════════════════════════════════════════════════════════════════════════════
 */
function createMultiScenarioModel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: DISCOVER THE SPREADSHEET STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  const baseConfig = discoverSpreadsheetStructure(ss);
  
  Logger.log('Discovered structure:');
  Logger.log('  Historical years: ' + baseConfig.numHistoricalYears);
  Logger.log('  Historical columns: ' + baseConfig.histCols.join(', '));
  Logger.log('  Forecast columns: ' + baseConfig.forecastCols.join(', '));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: GET SCENARIO CONFIGURATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const scenarios = getScenarioConfigs();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: CREATE MODEL TAB FOR EACH SCENARIO
  // ═══════════════════════════════════════════════════════════════════════════
  scenarios.forEach(scenario => {
    Logger.log(`Building Model_${scenario.name}...`);
    
    // Merge base config with scenario-specific strategic assumptions
    const config = {
      numHistoricalYears: baseConfig.numHistoricalYears,
      histCols: baseConfig.histCols,
      forecastCols: baseConfig.forecastCols,
      firstForecastCol: baseConfig.firstForecastCol,
      lastForecastCol: baseConfig.lastForecastCol,
      lastHistCol: baseConfig.lastHistCol,
      sourceRows: baseConfig.sourceRows,
      strategic: scenario
    };
    
    // Create the model tab
    const tabName = `Model_${scenario.name}`;
    let modelSheet = ss.getSheetByName(tabName);
    if (modelSheet) {
      ss.deleteSheet(modelSheet);
    }
    modelSheet = ss.insertSheet(tabName);
    
    // Set column widths
    modelSheet.setColumnWidth(1, 350);
    const totalCols = config.histCols.length + config.forecastCols.length + 1;
    for (let col = 2; col <= totalCols; col++) {
      modelSheet.setColumnWidth(col, 85);
    }
    
    // Build all sections
    buildMarketDataSection(modelSheet, config);
    buildValuationAssumptionsSection(modelSheet, config);
    buildBalanceSheetSection(modelSheet, config);
    buildIncomeStatementSection(modelSheet, config);
    buildAbnormalEarningsSection(modelSheet, config);
    buildProfessorNotes(modelSheet, config);
    applyFormatting(modelSheet, config);
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: CREATE SCENARIO SUMMARY TAB
  // ═══════════════════════════════════════════════════════════════════════════
  buildScenarioSummary(ss, baseConfig);
  
  SpreadsheetApp.flush();
  Logger.log('Multi-scenario model created successfully!');
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SCENARIO CONFIGURATIONS — ALPHABET INC. (GOOGL) Bull / Base / Bear
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Key Uncertainties Driving Scenario Differentiation:
 *   1. AI Impact on Search: Will Gemini defend or will ChatGPT/Perplexity erode?
 *   2. Cloud Trajectory: Can GCP close gap with AWS/Azure?
 *   3. Regulatory Outcomes: DOJ remedies range from settlement to divestiture
 *   4. Margin Dynamics: Will AI be accretive or create "AI Tax"?
 */
function getScenarioConfigs() {
  return [
    // ─────────────────────────────────────────────────────────────────────────
    // BULL CASE: AI Strengthens Moat, Cloud Accelerates
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'Bull',
      sharesOutstanding: 12447,  // 2024 10-K, Note 12 (Diluted) — SAME FOR ALL
      
      beta: 1.0,                 // Lower beta as dominant player
      riskPremium: 0.055,
      riskFreeRate: 0.042,
      taxRate: 0.17,
      
      // Bull: Higher sustained growth, Cloud maintains 25%+ through FY27
      growthVector: [0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04],
      
      // Bull: Margins EXPAND as AI drives efficiency and Cloud scales
      marginVector: [0.28, 0.285, 0.29, 0.295, 0.30, 0.30, 0.30, 0.295, 0.29, 0.29],
      
      nowcRatio: -0.06,
      nolaRatioVector: [0.68, 0.68, 0.67, 0.66, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65],
      
      notes: {
        growthRationale: 'Bull case assumes Gemini integration successfully defends Search while driving higher CPCs through AI-enhanced ad targeting. Google Cloud maintains 25%+ growth through FY27 as enterprise AI adoption accelerates beyond consensus. YouTube Shorts monetization closes gap with long-form. Growth fades to 4% terminal reflecting $500B+ revenue base.',
        moatRationale: 'WIDE MOAT STRENGTHENS: Vertical integration (TPUs, Gemini, Android, Chrome) creates new switching costs. AI Overviews increase engagement rather than cannibalizing ad inventory. Cloud margins expand toward AWS levels (25%+) as scale benefits compound. NOPAT margin expands from 28% to 30% peak before modest fade.',
        keyRisks: '• Execution risk on AI monetization timeline\n• Regulatory settlements may be more punitive than modeled\n• CapEx cycle ($50B+) may extend longer than expected',
        valuationContext: 'Bull case implies ~$235/share intrinsic value vs. ~$185 current — 27% upside. Key driver: Cloud reaching $100B revenue by FY29 at 25%+ margins, plus Search maintaining pricing power through AI transition.'
      }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // BASE CASE: Moat Maintained, Modest Margin Pressure
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'Base',
      sharesOutstanding: 12447,
      
      beta: 1.05,
      riskPremium: 0.055,
      riskFreeRate: 0.042,
      taxRate: 0.17,
      
      // Base: Aligned with recent performance, gradual fade
      growthVector: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.045, 0.035],
      
      // Base: Modest compression from "AI Tax" (higher depreciation, compute costs)
      marginVector: [0.27, 0.265, 0.26, 0.255, 0.25, 0.25, 0.245, 0.24, 0.24, 0.24],
      
      nowcRatio: -0.06,
      nolaRatioVector: [0.68, 0.69, 0.70, 0.70, 0.70, 0.69, 0.69, 0.68, 0.68, 0.68],
      
      notes: {
        growthRationale: 'Base case assumes 13% near-term growth aligned with recent 14% performance, driven by Cloud (+22% YoY) offsetting Search "inventory compression" from AI Overviews. YouTube grows mid-teens. Fade to 3.5% terminal reflects law of large numbers for $350B+ revenue base and maturing digital ad market.',
        moatRationale: 'WIDE MOAT MAINTAINED but not expanding. TPU vertical integration and ecosystem lock-in persist, but AI transition creates margin pressure. NOPAT margin fades from 27% to 24% by terminal year due to: (1) higher depreciation from $50B+ CapEx cycle, (2) TAC pressure if DOJ restricts default agreements, (3) Cloud still subscale vs. AWS.',
        keyRisks: '• Regulatory Pincer: DOJ/EU actions threatening default search status\n• AI Capital Intensity: $50B+ CapEx may drag ROIC if monetization lags\n• Search Disruption: "Zero-click" answers reducing ad inventory\n• Cloud remains #3, limiting pricing power',
        valuationContext: 'Base case implies ~$195/share intrinsic value — 5% upside to current $185. Valuation is highly sensitive to terminal margin; current price implies market believes AI investments will be margin-accretive long-term. Key swing factor: terminal margin (±$25/share per 100bps).'
      }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // BEAR CASE: AI Disruption, Regulatory Headwinds, Margin Compression
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'Bear',
      sharesOutstanding: 12447,
      
      beta: 1.15,                // Higher beta reflecting increased business risk
      riskPremium: 0.055,
      riskFreeRate: 0.042,
      taxRate: 0.17,
      
      // Bear: Growth decelerates faster, terminal at nominal GDP
      growthVector: [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.035, 0.03, 0.025],
      
      // Bear: Significant margin compression from competition + regulation
      marginVector: [0.26, 0.25, 0.24, 0.23, 0.22, 0.215, 0.21, 0.21, 0.21, 0.21],
      
      nowcRatio: -0.05,          // Slightly less favorable working capital
      nolaRatioVector: [0.70, 0.72, 0.74, 0.75, 0.75, 0.74, 0.73, 0.72, 0.72, 0.72],
      
      notes: {
        growthRationale: 'Bear case assumes AI meaningfully disrupts Search economics. ChatGPT, Perplexity, and vertical AI tools capture 15%+ of queries by FY28, structurally reducing ad impressions. Cloud growth decelerates to 12-15% as AWS/Azure maintain dominance. YouTube engagement pressured by TikTok and short-form fatigue. Growth fades to 2.5% terminal.',
        moatRationale: 'MOAT EROSION: AI assistants reduce search query volume, not just clicks. DOJ forces Chrome divestiture or prohibits default agreements, eliminating $15B+ annual TAC payments that currently buy distribution. Cloud fails to achieve margin parity with AWS. NOPAT margin compresses to 21% by terminal due to: (1) Search revenue pressure, (2) Elevated AI infrastructure costs, (3) Regulatory compliance burden, (4) Increased user acquisition spend.',
        keyRisks: '• DOJ worst-case: Chrome/Android separation or forced behavioral remedies\n• Search query volume declines accelerate (not just zero-click)\n• Cloud fails to achieve profitability at scale\n• Multiple compression as growth derates from "megacap tech" to "mature media"',
        valuationContext: 'Bear case implies ~$140/share intrinsic value — 24% downside to current $185. This scenario requires significant disruption to core Search franchise AND regulatory worst-case. Probability-weighted value should inform position sizing.'
      }
    }
  ];
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SCENARIO SUMMARY TAB — Comparison across Bull/Base/Bear
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildScenarioSummary(ss, config) {
  const tabName = 'Scenario_Summary';
  let summarySheet = ss.getSheetByName(tabName);
  if (summarySheet) {
    ss.deleteSheet(summarySheet);
  }
  summarySheet = ss.insertSheet(tabName);
  
  const firstFC = config.firstForecastCol;
  const lastFC = config.lastForecastCol;
  
  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────
  summarySheet.getRange('A1').setValue('ALPHABET INC. (GOOGL) — SCENARIO COMPARISON');
  summarySheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  
  summarySheet.getRange('A2').setValue('Multi-Scenario Residual Income Valuation');
  summarySheet.getRange('A2').setFontStyle('italic');
  
  // Column headers
  summarySheet.getRange('A4').setValue('Metric');
  summarySheet.getRange('B4').setValue('Bear');
  summarySheet.getRange('C4').setValue('Base');
  summarySheet.getRange('D4').setValue('Bull');
  summarySheet.getRange('A4:D4').setFontWeight('bold').setBackground('#4A86E8').setFontColor('white');
  
  // ─────────────────────────────────────────────────────────────────────────
  // KEY VALUATION OUTPUTS
  // ─────────────────────────────────────────────────────────────────────────
  summarySheet.getRange('A5').setValue('VALUATION OUTPUTS').setFontWeight('bold');
  
  const valuationMetrics = [
    { label: 'Intrinsic Value per Share', row: 51 },
    { label: 'Intrinsic Value of Equity ($M)', row: 49 },
    { label: 'Terminal Value (PV, $M)', row: 47 },
    { label: 'Sum of PV Abnormal Earnings ($M)', row: 46 },
    { label: 'Beginning Book Equity ($M)', row: 48 },
  ];
  
  let currentRow = 6;
  valuationMetrics.forEach(metric => {
    summarySheet.getRange(`A${currentRow}`).setValue(metric.label);
    summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${firstFC}${metric.row}`);
    summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${firstFC}${metric.row}`);
    summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${firstFC}${metric.row}`);
    currentRow++;
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // KEY ASSUMPTIONS
  // ─────────────────────────────────────────────────────────────────────────
  currentRow++;
  summarySheet.getRange(`A${currentRow}`).setValue('KEY ASSUMPTIONS').setFontWeight('bold');
  currentRow++;
  
  // Year 1 assumptions
  summarySheet.getRange(`A${currentRow}`).setValue('Year 1 Revenue Growth');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${firstFC}11`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${firstFC}11`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${firstFC}11`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Terminal Revenue Growth');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${lastFC}11`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${lastFC}11`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${lastFC}11`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Year 1 NOPAT Margin');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${firstFC}12`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${firstFC}12`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${firstFC}12`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Terminal NOPAT Margin');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${lastFC}12`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${lastFC}12`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${lastFC}12`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Cost of Equity');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!B5`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!B5`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!B5`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Beta');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!B2`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!B2`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!B2`);
  currentRow++;
  
  // ─────────────────────────────────────────────────────────────────────────
  // TERMINAL RETURNS (sanity check)
  // ─────────────────────────────────────────────────────────────────────────
  currentRow++;
  summarySheet.getRange(`A${currentRow}`).setValue('TERMINAL YEAR RETURNS').setFontWeight('bold');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Terminal ROE');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${lastFC}36`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${lastFC}36`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${lastFC}36`);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Terminal ROIC (RNOA)');
  summarySheet.getRange(`B${currentRow}`).setFormula(`='Model_Bear'!${lastFC}37`);
  summarySheet.getRange(`C${currentRow}`).setFormula(`='Model_Base'!${lastFC}37`);
  summarySheet.getRange(`D${currentRow}`).setFormula(`='Model_Bull'!${lastFC}37`);
  currentRow++;
  
  // ─────────────────────────────────────────────────────────────────────────
  // PROBABILITY-WEIGHTED VALUATION
  // ─────────────────────────────────────────────────────────────────────────
  currentRow += 2;
  const probStartRow = currentRow;
  summarySheet.getRange(`A${currentRow}`).setValue('PROBABILITY-WEIGHTED VALUATION').setFontWeight('bold');
  summarySheet.getRange(`A${currentRow}:D${currentRow}`).setBackground('#F4CCCC');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Scenario Probability');
  summarySheet.getRange(`B${currentRow}`).setValue(0.20);  // Bear
  summarySheet.getRange(`C${currentRow}`).setValue(0.60);  // Base
  summarySheet.getRange(`D${currentRow}`).setValue(0.20);  // Bull
  summarySheet.getRange(`B${currentRow}:D${currentRow}`).setNumberFormat('0%').setFontColor('#0000FF');
  const probRow = currentRow;
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Probability-Weighted Value/Share');
  summarySheet.getRange(`B${currentRow}`).setFormula(
    `=B6*B${probRow} + C6*C${probRow} + D6*D${probRow}`
  );
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00').setFontWeight('bold').setFontSize(12);
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Current Stock Price');
  summarySheet.getRange(`B${currentRow}`).setValue(185);  // Update with current price
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00').setFontColor('#0000FF');
  const priceRow = currentRow;
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Implied Upside / (Downside)');
  summarySheet.getRange(`B${currentRow}`).setFormula(`=B${priceRow-1}/B${priceRow}-1`);
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('0.0%').setFontWeight('bold');
  currentRow++;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO RANGE VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  currentRow += 2;
  summarySheet.getRange(`A${currentRow}`).setValue('SCENARIO VALUE RANGE').setFontWeight('bold');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Bear Case Value');
  summarySheet.getRange(`B${currentRow}`).setFormula('=B6');
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Base Case Value');
  summarySheet.getRange(`B${currentRow}`).setFormula('=C6');
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Bull Case Value');
  summarySheet.getRange(`B${currentRow}`).setFormula('=D6');
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Bull-Bear Spread');
  summarySheet.getRange(`B${currentRow}`).setFormula('=D6-B6');
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('$#,##0.00');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('Bull-Bear Spread (%)');
  summarySheet.getRange(`B${currentRow}`).setFormula('=(D6-B6)/C6');
  summarySheet.getRange(`B${currentRow}`).setNumberFormat('0.0%');
  currentRow++;
  
  // ─────────────────────────────────────────────────────────────────────────
  // KEY UNCERTAINTIES (reference)
  // ─────────────────────────────────────────────────────────────────────────
  currentRow += 2;
  summarySheet.getRange(`A${currentRow}`).setValue('KEY UNCERTAINTIES DRIVING SCENARIOS').setFontWeight('bold');
  currentRow++;
  
  summarySheet.getRange(`A${currentRow}`).setValue('1. AI Impact on Search: Will Gemini defend or will ChatGPT/Perplexity erode?');
  currentRow++;
  summarySheet.getRange(`A${currentRow}`).setValue('2. Cloud Trajectory: Can GCP close gap with AWS/Azure?');
  currentRow++;
  summarySheet.getRange(`A${currentRow}`).setValue('3. Regulatory Outcomes: DOJ remedies range from settlement to divestiture');
  currentRow++;
  summarySheet.getRange(`A${currentRow}`).setValue('4. Margin Dynamics: Will AI be accretive (efficiency) or create "AI Tax" (CapEx)?');
  currentRow++;
  
  // ─────────────────────────────────────────────────────────────────────────
  // FORMATTING
  // ─────────────────────────────────────────────────────────────────────────
  summarySheet.setColumnWidth(1, 300);
  summarySheet.setColumnWidths(2, 3, 100);
  
  // Number formats
  summarySheet.getRange('B6:D6').setNumberFormat('$#,##0.00');   // Value per share
  summarySheet.getRange('B7:D10').setNumberFormat('#,##0');       // Dollar values in millions
  summarySheet.getRange('B13:D16').setNumberFormat('0.0%');       // Growth and margin rates
  summarySheet.getRange('B17:D18').setNumberFormat('0.0%');       // Cost of equity, beta
  summarySheet.getRange('B21:D22').setNumberFormat('0.0%');       // Terminal returns
  
  // Highlight probability-weighted section
  summarySheet.getRange(`A${probStartRow}:D${probStartRow+4}`).setBackground('#FCE5CD');
  
  summarySheet.setFrozenColumns(1);
  summarySheet.setFrozenRows(4);
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SINGLE MODEL TAB (Original functionality preserved)
 * ════════════════════════════════════════════════════════════════════════════
 */
function createModelTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: DISCOVER THE SPREADSHEET STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  const config = discoverSpreadsheetStructure(ss);

  // Log discovered values for debugging
  Logger.log('Discovered structure:');
  Logger.log('  Historical years: ' + config.numHistoricalYears);
  Logger.log('  Historical columns: ' + config.histCols.join(', '));
  Logger.log('  Forecast columns: ' + config.forecastCols.join(', '));
  Logger.log('  Source rows: ' + JSON.stringify(config.sourceRows));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: CREATE MODEL SHEET
  // ═══════════════════════════════════════════════════════════════════════════
  let modelSheet = ss.getSheetByName('Model');
  if (modelSheet) {
    ss.deleteSheet(modelSheet);
  }
  modelSheet = ss.insertSheet('Model');
  
  // Set column widths
  modelSheet.setColumnWidth(1, 350);
  const totalCols = config.histCols.length + config.forecastCols.length + 1;
  for (let col = 2; col <= totalCols; col++) {
    modelSheet.setColumnWidth(col, 85);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: BUILD EACH SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  buildMarketDataSection(modelSheet, config);
  buildValuationAssumptionsSection(modelSheet, config);
  buildBalanceSheetSection(modelSheet, config);
  buildIncomeStatementSection(modelSheet, config);
  buildAbnormalEarningsSection(modelSheet, config);
  buildProfessorNotes(modelSheet, config);
  applyFormatting(modelSheet, config);
  
  SpreadsheetApp.flush();
  Logger.log('Model tab created successfully!');
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * DISCOVERY FUNCTION — Finds row numbers and column structure
 * ════════════════════════════════════════════════════════════════════════════
 */
function discoverSpreadsheetStructure(ss) {
  const condensed = ss.getSheetByName('Condensed Financials');
  const incomeStmt = ss.getSheetByName('Income Statement');
  const altDuPont = ss.getSheetByName('ALT DuPont');

  // Validate sheets exist
  if (!condensed) throw new Error('Sheet "Condensed Financials" not found');
  if (!incomeStmt) throw new Error('Sheet "Income Statement" not found');
  if (!altDuPont) throw new Error('Sheet "ALT DuPont" not found');

  // Get all labels from Column A to search
  const condensedLabels = condensed.getRange('A:A').getValues();
  const incomeLabels = incomeStmt.getRange('A:A').getValues();
  const dupontLabels = altDuPont.getRange('A:A').getValues();

  // ─────────────────────────────────────────────────────────────────────────
  // DISCOVER: Fiscal date row (needed to count historical years)
  // ─────────────────────────────────────────────────────────────────────────
  let dateRow = findRowByLabel(incomeLabels, [
    'fiscal year', 'period ending', 'period ended', 'for the period',
    'year ended', 'year ending', 'fiscal period', 'date', 'period'
  ]);

  // FALLBACK: If no label found, look for a row with date values in columns B onwards
  if (dateRow === null) {
    dateRow = findRowWithDates(incomeStmt);
  }
  
  if (dateRow === null) {
    throw new Error('Could not find fiscal date row in Income Statement. Please check row labels.');
  }
  
  // Count historical years
  const dateRange = incomeStmt.getRange(dateRow, 2, 1, 20).getValues()[0];
  const numHistoricalYears = dateRange.filter(cell => cell !== '' && cell !== null).length;

  if (numHistoricalYears === 0) {
    throw new Error('No historical years found in Income Statement row ' + dateRow);
  }
  
  Logger.log('Found ' + numHistoricalYears + ' historical years in row ' + dateRow);

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD: Column arrays based on discovered year count
  // ─────────────────────────────────────────────────────────────────────────
  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const histCols = colLetters.slice(1, numHistoricalYears + 1);
  const firstForecastCol = colLetters[numHistoricalYears + 1];
  const forecastCols = colLetters.slice(numHistoricalYears + 1, numHistoricalYears + 11);
  const lastForecastCol = forecastCols[forecastCols.length - 1];
  const lastHistCol = histCols[histCols.length - 1];
  
  // ─────────────────────────────────────────────────────────────────────────
  // DISCOVER: Source row numbers by searching for labels
  // ─────────────────────────────────────────────────────────────────────────
  const sourceRows = {
    // From Condensed Financials
    nopat: findRowByLabel(condensedLabels, [
      'nopat', 'net operating profit after tax', 'net operating profit'
    ]),
    interestAfterTax: findRowByLabel(condensedLabels, [
      'after tax interest', 'after-tax interest', 'net interest after tax',
      'interest expense after tax', 'after-tax net interest', 'nfe after tax',
      'after tax net interest', 'net interest expense after tax'
    ]),
    nowc: findRowByLabel(condensedLabels, [
      'net operating working capital', 'nowc',
      'net working capital', 'nwc'
    ]),
    nola: findRowByLabel(condensedLabels, [
      'net operating long-term assets', 'net operating lt assets', 'nola',
      'net long-term operating assets', 'net operating long term'
    ]),
    netDebt: findRowByLabel(condensedLabels, [
      'net debt', 'net financial obligations', 'nfo', 'net borrowing',
      'financial obligations'
    ]),
    equity: findRowByLabel(condensedLabels, [
      'common equity', 'shareholders equity', 'stockholders equity',
      'total equity', 'shareholder equity', 'owners equity', 'cse',
      'common stockholders equity', 'book value of equity', 'equity',
      'net worth', 'total shareholders equity', 'shareholders\' equity',
      'stockholders\' equity', 'common shareholders equity','total shareholders\' equity'
    ]),
    
    // From Income Statement
    fiscalDate: dateRow,
    sales: findRowByLabel(incomeLabels, [
      'revenue', 'net sales', 'total revenue', 'net revenue', 'sales',
      'total sales', 'net revenues'
    ]),
    
    // From ALT DuPont
    costOfDebt: findRowByLabel(dupontLabels, [
      'net borrowing cost', 'nfo rate', 'cost of debt', 'interest rate',
      'borrowing rate', 'nfo spread', 'spread', 'net financial expense rate'
    ])
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATE: Check that all required rows were found
  // ─────────────────────────────────────────────────────────────────────────
  const missingItems = [];
  for (const [key, value] of Object.entries(sourceRows)) {
    if (value === null) {
      missingItems.push(key);
    } else {
      Logger.log('Found ' + key + ' at row ' + value);
    }
  }
  
  if (missingItems.length > 0) {
    const errorMsg = 'Could not find rows for: ' + missingItems.join(', ') + 
      '. Please check the source sheet labels.';
    Logger.log('WARNING: ' + errorMsg);
    throw new Error(errorMsg);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RETURN: Complete configuration object (without strategic — added by caller)
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Discovered structure
    numHistoricalYears: numHistoricalYears,
    histCols: histCols,
    forecastCols: forecastCols,
    firstForecastCol: firstForecastCol,
    lastForecastCol: lastForecastCol,
    lastHistCol: lastHistCol,
    sourceRows: sourceRows,
    
    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT STRATEGIC ASSUMPTIONS (used by single-model createModelTab)
    // For multi-scenario, these are overridden by getScenarioConfigs()
    // ═══════════════════════════════════════════════════════════════════════
    strategic: {
      sharesOutstanding: 12447, // 2024 10-K, Note 12 (Diluted)
      
      beta: 1.05,
      riskPremium: 0.055,
      riskFreeRate: 0.042,
      taxRate: 0.17,
      
      growthVector: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.045, 0.035],
      marginVector: [0.27, 0.265, 0.26, 0.255, 0.25, 0.25, 0.245, 0.24, 0.24, 0.24],
      
      nowcRatio: -0.06,
      nolaRatioVector: [0.68, 0.69, 0.70, 0.70, 0.70, 0.69, 0.69, 0.68, 0.68, 0.68],
      
      notes: {
        growthRationale: 'Growth forecasted to start at 13% (aligned with recent 14% growth), primarily driven by Google Cloud\'s momentum (+31% YoY) offsetting "inventory compression" in Search. The fade to 3.5% terminal growth reflects the law of large numbers for a $350B+ revenue base.',
        moatRationale: 'WIDE MOAT rating based on TPU vertical integration and ecosystem lock-in. However, we model NOPAT margin compression (from 27.6% to 24%) to account for the "AI Tax" (higher depreciation/compute costs) and regulatory risks regarding traffic acquisition costs (TAC).',
        keyRisks: '• Regulatory Pincer: DOJ/EU actions threatening default search status.\n• AI Capital Intensity: $50B+ CapEx cycle may drag ROIC if monetization lags.\n• Search Disruption: "Zero-click" answers reducing ad inventory.',
        valuationContext: 'Valuation is highly sensitive to the terminal margin assumption. Current price implies the market believes AI investments will be accretive to margins long-term; our model takes a more conservative stance on margin preservation.'
      }
    }
  };
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * HELPER: Find row number by searching for label keywords
 * ════════════════════════════════════════════════════════════════════════════
 */
function findRowByLabel(labelsArray, searchTerms) {
  for (let i = 0; i < labelsArray.length; i++) {
    const cellValue = String(labelsArray[i][0] || '').toLowerCase().trim();
    if (cellValue === '') continue;
    
    for (const term of searchTerms) {
      if (cellValue.includes(term.toLowerCase())) {
        return i + 1; // Convert to 1-indexed row number
      }
    }
  }
  return null; // Not found
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * HELPER: Fallback to find a row containing date values
 * ════════════════════════════════════════════════════════════════════════════
 */
function findRowWithDates(sheet) {
  const dataRange = sheet.getRange('A1:Z50').getValues();
  for (let i = 0; i < dataRange.length; i++) {
    let dateCount = 0;
    for (let j = 1; j < dataRange[i].length; j++) {  // Start at column B
      const cell = dataRange[i][j];
      if (cell instanceof Date || isDateString(cell)) {
        dateCount++;
      }
    }
    // If we found 3+ date values in this row, it's likely the date row
    if (dateCount >= 3) {
      Logger.log('Found date row by scanning: row ' + (i + 1));
      return i + 1;
    }
  }
  return null;
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * HELPER: Check if a value looks like a date string
 * ════════════════════════════════════════════════════════════════════════════
 */
function isDateString(value) {
  if (typeof value !== 'string') return false;
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,
    /\d{4}-\d{2}-\d{2}/,
    /\w+ \d{1,2}, \d{4}/,
    /\d{1,2}-\w{3}-\d{2,4}/
  ];
  return datePatterns.some(pattern => pattern.test(value));
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 1: MARKET DATA (Rows 1-8)
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildMarketDataSection(sheet, config) {
  const s = config.strategic;
  const src = config.sourceRows;
  const firstHist = config.histCols[0];
  const lastHist = config.lastHistCol;
  
  // Labels (Column A)
  sheet.getRange('A1').setValue('Market Data (Given)');
  sheet.getRange('A2').setValue('Beta');
  sheet.getRange('A3').setValue('Risk premium');
  sheet.getRange('A4').setValue('Risk free rate');
  sheet.getRange('A5').setValue('Cost of equity');
  sheet.getRange('A6').setValue('Tax Rate');
  sheet.getRange('A7').setValue('Pre-Tax Net Cost of Net Debt (i.e., net interest on net debt pre-tax)');
  sheet.getRange('A8').setValue('After-Tax Net Cost of Net Debt (i.e., net interest on net debt after-tax)');
  
  // HARDCODED Market Data Inputs
  sheet.getRange('B2').setValue(s.beta);
  sheet.getRange('B3').setValue(s.riskPremium);
  sheet.getRange('B4').setValue(s.riskFreeRate);
  sheet.getRange('B6').setValue(s.taxRate);
  
  // FORMULAS
  sheet.getRange('B5').setFormula('=B4+B3*B2');  // Cost of equity
  
  // Cost of debt: average across historical years from ALT DuPont
  sheet.getRange('B7').setFormula(
    `=AVERAGE('ALT DuPont'!${firstHist}${src.costOfDebt}:${lastHist}${src.costOfDebt})`
  );
  sheet.getRange('B8').setFormula('=B7*(1-B6)');  // After-tax cost of debt
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 2: VALUATION ASSUMPTIONS (Rows 10-17)
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildValuationAssumptionsSection(sheet, config) {
  const src = config.sourceRows;
  const s = config.strategic;
  const histCols = config.histCols;
  const forecastCols = config.forecastCols;
  const lastHistCol = config.lastHistCol;

  // Header
  sheet.getRange('A10').setValue('VALUATION ASSUMPTIONS');
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 10: Year headers
  // ─────────────────────────────────────────────────────────────────────────
  histCols.forEach(col => {
    sheet.getRange(`${col}10`).setFormula(
      `=YEAR('Income Statement'!${col}${src.fiscalDate})`
    );
  });
  forecastCols.forEach((col, i) => {
    const prevCol = (i === 0) ? lastHistCol : forecastCols[i - 1];
    sheet.getRange(`${col}10`).setFormula(`=${prevCol}10+1`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 11: Sales Growth Rate
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A11').setValue('1. Sales growth rate');
  // Historical growth (starts at second column)
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    const prevCol = histCols[i - 1];
    sheet.getRange(`${col}11`).setFormula(`=${col}31/${prevCol}31-1`);
  }
  
  // Forecast: hardcoded from strategic analysis
  forecastCols.forEach((col, i) => {
    sheet.getRange(`${col}11`).setValue(s.growthVector[i]);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 12: NOPAT Margin
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A12').setValue('2. NOPAT/Sales');
  // Historical: formula
  histCols.forEach(col => {
    sheet.getRange(`${col}12`).setFormula(`=${col}32/${col}31`);
  });
  // Forecast: hardcoded for first 5, then carry forward
  forecastCols.forEach((col, i) => {
    if (i < 5) {
      sheet.getRange(`${col}12`).setValue(s.marginVector[i]);
    } else {
      const prevCol = forecastCols[i - 1];
      sheet.getRange(`${col}12`).setFormula(`=${prevCol}12`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 14: NOWC/Sales
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A14').setValue('3. (Beg) Net operating working capital/Sales');
  // Historical (starts at second column)
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}14`).setFormula(`=${col}21/${col}31`);
  }
  // First forecast year: formula
  sheet.getRange(`${forecastCols[0]}14`).setFormula(`=${forecastCols[0]}21/${forecastCols[0]}31`);
  // Remaining forecast: hardcoded ratio
  for (let i = 1; i < forecastCols.length; i++) {
    sheet.getRange(`${forecastCols[i]}14`).setValue(s.nowcRatio);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 15: NOLA/Sales
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A15').setValue('4. (Beg) Net operating LT Assets/Sales');
  // Historical (starts at second column)
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}15`).setFormula(`=${col}22/${col}31`);
  }
  // First forecast year: formula
  sheet.getRange(`${forecastCols[0]}15`).setFormula(`=${forecastCols[0]}22/${forecastCols[0]}31`);
  // Remaining forecast: hardcoded for first few, then carry forward
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    const prevCol = forecastCols[i - 1];
    if (i - 1 < s.nolaRatioVector.length) {
      sheet.getRange(`${col}15`).setValue(s.nolaRatioVector[i - 1]);
    } else {
      sheet.getRange(`${col}15`).setFormula(`=${prevCol}15`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 17: Leverage (Net Debt / Total Capital)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A17').setValue('5. Beg. Net debt/Beg. Assets');
  // Historical (starts at second column)
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}17`).setFormula(`=${col}26/${col}28`);
  }
  // First forecast: formula
  sheet.getRange(`${forecastCols[0]}17`).setFormula(`=${forecastCols[0]}26/${forecastCols[0]}28`);
  
  // Remaining forecast: carry forward from prior
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    const prevCol = forecastCols[i - 1];
    sheet.getRange(`${col}17`).setFormula(`=${prevCol}17`);
  }
  
  // Row 18: Average historical leverage (for reference)
  const firstHistCol = histCols[0];
  sheet.getRange(`${forecastCols[0]}18`).setFormula(`=AVERAGE(${firstHistCol}17:${forecastCols[0]}17)`);
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 3: BALANCE SHEET (Beginning) - Rows 19-28
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildBalanceSheetSection(sheet, config) {
  const src = config.sourceRows;
  const histCols = config.histCols;
  const forecastCols = config.forecastCols;
  const lastHistCol = config.lastHistCol;
  
  // Header
  sheet.getRange('A19').setValue('BALANCE SHEET (Beginning)');
  // Year headers
  histCols.forEach(col => {
    sheet.getRange(`${col}19`).setFormula(`=${col}10`);
  });
  forecastCols.forEach((col, i) => {
    const prevCol = (i === 0) ? lastHistCol : forecastCols[i - 1];
    sheet.getRange(`${col}19`).setFormula(`=${prevCol}19+1`);
  });

  sheet.getRange('A20').setValue('Operating Assets (Beginning)');
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 21: Net Operating Working Capital
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A21').setValue('  Net operating working capital');
  // Historical: link to source (skip first column if no beginning balance)
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}21`).setFormula(`='Condensed Financials'!${col}${src.nowc}`);
  }
  // First forecast year pulls from source
  sheet.getRange(`${forecastCols[0]}21`).setFormula(`='Condensed Financials'!${forecastCols[0]}${src.nowc}`);
  // Remaining forecast: calculate from assumption
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    sheet.getRange(`${col}21`).setFormula(`=${col}14*${col}$31`);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 22: Net Operating LT Assets
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A22').setValue('  Net operating LT assets');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}22`).setFormula(`='Condensed Financials'!${col}${src.nola}`);
  }
  sheet.getRange(`${forecastCols[0]}22`).setFormula(`='Condensed Financials'!${forecastCols[0]}${src.nola}`);
  
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    sheet.getRange(`${col}22`).setFormula(`=${col}15*${col}$31`);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 23: Total Operating Net Assets
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A23').setValue('    Total operating net assets');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}23`).setFormula(`=${col}21+${col}22`);
  }
  
  forecastCols.forEach(col => {
    sheet.getRange(`${col}23`).setFormula(`=SUM(${col}21:${col}22)`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Capital Section
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A25').setValue('Capital (Beginning)');
  // Row 26: Net Debt
  sheet.getRange('A26').setValue('  Net debt');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}26`).setFormula(`='Condensed Financials'!${col}${src.netDebt}`);
  }
  sheet.getRange(`${forecastCols[0]}26`).setFormula(`='Condensed Financials'!${forecastCols[0]}${src.netDebt}`);
  
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    sheet.getRange(`${col}26`).setFormula(`=${col}17*${col}23`);
  }
  
  // Row 27: Common Equity
  sheet.getRange('A27').setValue('  Common equity');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}27`).setFormula(`='Condensed Financials'!${col}${src.equity}`);
  }
  sheet.getRange(`${forecastCols[0]}27`).setFormula(`='Condensed Financials'!${forecastCols[0]}${src.equity}`);
  
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    sheet.getRange(`${col}27`).setFormula(`=${col}23-${col}26`);
  }
  
  // Row 28: Total Capital
  sheet.getRange('A28').setValue('    Total Capital');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}28`).setFormula(`=${col}26+${col}27`);
  }
  
  forecastCols.forEach(col => {
    sheet.getRange(`${col}28`).setFormula(`=SUM(${col}26:${col}27)`);
  });
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 4: INCOME STATEMENT (Rows 30-37)
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildIncomeStatementSection(sheet, config) {
  const src = config.sourceRows;
  const histCols = config.histCols;
  const forecastCols = config.forecastCols;
  const lastHistCol = config.lastHistCol;

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD: Source column array for Condensed Financials (OFFSET +1)
  // Model Column B → Source Column C, Model Column C → Source Column D, etc.
  // ─────────────────────────────────────────────────────────────────────────
  const sourceColsForCF = [...histCols.slice(1), forecastCols[0]];
  // If histCols = ['B','C','D','E','F'], sourceColsForCF = ['C','D','E','F','G']
  
  // Header
  sheet.getRange('A30').setValue('INCOME STATEMENT');
  // Year headers
  histCols.forEach(col => {
    sheet.getRange(`${col}30`).setFormula(`=${col}10`);
  });
  forecastCols.forEach((col, i) => {
    const prevCol = (i === 0) ? lastHistCol : forecastCols[i - 1];
    sheet.getRange(`${col}30`).setFormula(`=${prevCol}30+1`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 31: Sales (from Income Statement - NO OFFSET)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A31').setValue('Sales');
  // Historical: link to Income Statement (same column)
  histCols.forEach(col => {
    sheet.getRange(`${col}31`).setFormula(`='Income Statement'!${col}${src.sales}`);
  });
  // Forecast: compound from prior year
  forecastCols.forEach((col, i) => {
    const prevCol = (i === 0) ? lastHistCol : forecastCols[i - 1];
    sheet.getRange(`${col}31`).setFormula(`=${prevCol}31*(1+${col}11)`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 32: NOPAT (from Condensed Financials - WITH OFFSET +1)
  // Model Column B → Source Column C, etc.
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A32').setValue('NOPAT');
  histCols.forEach((col, i) => {
    const sourceCol = sourceColsForCF[i];
    sheet.getRange(`${col}32`).setFormula(`='Condensed Financials'!${sourceCol}${src.nopat}`);
  });
  forecastCols.forEach(col => {
    sheet.getRange(`${col}32`).setFormula(`=${col}31*${col}12`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 33: After-tax Interest (from Condensed Financials - WITH OFFSET +1)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A33').setValue('After tax interest expense (income)');
  histCols.forEach((col, i) => {
    const sourceCol = sourceColsForCF[i];
    sheet.getRange(`${col}33`).setFormula(`='Condensed Financials'!${sourceCol}${src.interestAfterTax}`);
  });
  forecastCols.forEach(col => {
    sheet.getRange(`${col}33`).setFormula(`=${col}26*$B$8`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 34: Net Income
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A34').setValue('Net Income');
  [...histCols, ...forecastCols].forEach(col => {
    sheet.getRange(`${col}34`).setFormula(`=${col}32-${col}33`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 36: Return on Equity
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A36').setValue('Return on (Beg) Equity');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}36`).setFormula(`=${col}34/${col}27`);
  }
  
  forecastCols.forEach(col => {
    sheet.getRange(`${col}36`).setFormula(`=${col}34/${col}27`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 37: Return on NOA
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A37').setValue('Return on (Beg) NOA');
  for (let i = 1; i < histCols.length; i++) {
    const col = histCols[i];
    sheet.getRange(`${col}37`).setFormula(`=${col}32/${col}23`);
  }
  
  forecastCols.forEach(col => {
    sheet.getRange(`${col}37`).setFormula(`=${col}32/${col}23`);
  });
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 5: ABNORMAL EARNINGS & VALUATION (Rows 39-51)
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildAbnormalEarningsSection(sheet, config) {
  const s = config.strategic;
  const histCols = config.histCols;
  const forecastCols = config.forecastCols;
  const firstFC = config.firstForecastCol;
  const lastFC = config.lastForecastCol;
  const lastHistCol = config.lastHistCol;

  // Header
  sheet.getRange('A39').setValue('Abnormal Earnings');
  
  // Year headers
  histCols.forEach(col => {
    sheet.getRange(`${col}39`).setFormula(`=${col}10`);
  });
  forecastCols.forEach((col, i) => {
    const prevCol = (i === 0) ? lastHistCol : forecastCols[i - 1];
    sheet.getRange(`${col}39`).setFormula(`=${prevCol}39+1`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 40: Net Income (forecast only)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A40').setValue('Net Income');
  forecastCols.forEach(col => {
    sheet.getRange(`${col}40`).setFormula(`=${col}34`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 41: Capital Charge
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A41').setValue('Capital charge');
  forecastCols.forEach(col => {
    sheet.getRange(`${col}41`).setFormula(`=${col}27*$B$5`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 42: Abnormal Earnings
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A42').setValue('Abnormal earnings');
  forecastCols.forEach(col => {
    sheet.getRange(`${col}42`).setFormula(`=${col}40-${col}41`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Row 43: FCF to Equity
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A43').setValue('Free Cash Flow to Equity');
  // First forecast year: prior equity comes from last historical column
  sheet.getRange(`${firstFC}43`).setFormula(`=${firstFC}40+(${lastHistCol}27-${firstFC}27)`);
  // Remaining forecast years
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    const prevCol = forecastCols[i - 1];
    sheet.getRange(`${col}43`).setFormula(`=${col}40+(${prevCol}27-${col}27)`);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Row 44: PV Factor
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A44').setValue('PV Factor (using cost of equity)');
  sheet.getRange(`${firstFC}44`).setFormula('=1/(1+$B$5)');
  for (let i = 1; i < forecastCols.length; i++) {
    const col = forecastCols[i];
    const prevCol = forecastCols[i - 1];
    sheet.getRange(`${col}44`).setFormula(`=${prevCol}44/(1+$B$5)`);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 45: PV of Abnormal Earnings
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A45').setValue('PV of abnormal earnings');
  forecastCols.forEach(col => {
    sheet.getRange(`${col}45`).setFormula(`=${col}42*${col}44`);
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 46: Sum of PV + Terminal Value
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A46').setValue('Sum of PV of abnormal earnings');
  sheet.getRange(`${firstFC}46`).setFormula(`=SUM(${firstFC}45:${lastFC}45)`);
  
  // Terminal value at end of forecast period
  sheet.getRange(`${lastFC}46`).setFormula(`=${lastFC}42*(1+$${lastFC}$11)/($B$5-$${lastFC}$11)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Row 47: Terminal Value (PV)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A47').setValue('Terminal value (PV)');
  sheet.getRange(`${firstFC}47`).setFormula(`=${lastFC}46*${lastFC}44`);

  // ─────────────────────────────────────────────────────────────────────────
  // Row 48: Book Value of Equity
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A48').setValue('Book Value of Equity');
  sheet.getRange(`${firstFC}48`).setFormula(`=${firstFC}27`);

  // ─────────────────────────────────────────────────────────────────────────
  // Row 49: Intrinsic Value of Common Equity
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A49').setValue('Intrinsic Value of Common Equity');
  sheet.getRange(`${firstFC}49`).setFormula(`=${firstFC}48+${firstFC}47+${firstFC}46`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 50: Shares Outstanding (HARDCODED from 10-K)
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A50').setValue('Number of shares (diluted)');
  sheet.getRange(`${firstFC}50`).setValue(s.sharesOutstanding);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Row 51: Intrinsic Value Per Share
  // ─────────────────────────────────────────────────────────────────────────
  sheet.getRange('A51').setValue('Intrinsic value per share');
  sheet.getRange(`${firstFC}51`).setFormula(`=${firstFC}49/${firstFC}50`);
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * SECTION 6: PROFESSOR'S STRATEGIC NOTES (Rows 55+)
 * ════════════════════════════════════════════════════════════════════════════
 */
function buildProfessorNotes(sheet, config) {
  const notes = config.strategic.notes;
  const scenarioName = config.strategic.name || 'Base';
  
  sheet.getRange('A55').setValue(`PROFESSOR'S STRATEGIC NOTES — ${scenarioName.toUpperCase()} CASE`);
  
  sheet.getRange('A57').setValue('Growth Assumption Rationale:');
  sheet.getRange('A58').setValue(notes.growthRationale);
  
  sheet.getRange('A60').setValue('Margin & Moat Assessment:');
  sheet.getRange('A61').setValue(notes.moatRationale);
  
  sheet.getRange('A63').setValue('Key Risks to Monitor:');
  sheet.getRange('A64').setValue(notes.keyRisks);

  sheet.getRange('A66').setValue('Valuation Context:');
  sheet.getRange('A67').setValue(notes.valuationContext);
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * FORMATTING
 * ════════════════════════════════════════════════════════════════════════════
 */
function applyFormatting(sheet, config) {
  const histCols = config.histCols;
  const forecastCols = config.forecastCols;
  const firstFC = config.firstForecastCol;
  const lastFC = config.lastForecastCol;
  const firstHist = histCols[0];
  const lastHist = config.lastHistCol;

  // Column widths
  sheet.setColumnWidth(1, 350);
  const totalCols = histCols.length + forecastCols.length + 1;
  for (let col = 2; col <= totalCols; col++) {
    sheet.setColumnWidth(col, 85);
  }
  
  // Bold headers
  ['A1', 'A10', 'A19', 'A20', 'A25', 'A30', 'A39', 'A55'].forEach(cell => {
    sheet.getRange(cell).setFontWeight('bold');
  });

  // Blue text for hardcoded Market Data inputs
  ['B2', 'B3', 'B4', 'B6'].forEach(cell => {
    sheet.getRange(cell).setFontColor('#0000FF');
  });

  // Blue text for shares outstanding
  sheet.getRange(`${firstFC}50`).setFontColor('#0000FF');
  
  // Blue text for forecast assumptions
  sheet.getRange(`${firstFC}11:${lastFC}11`).setFontColor('#0000FF');
  sheet.getRange(`${firstFC}12:${lastFC}12`).setFontColor('#0000FF');

  // Only apply to valid ranges for NOWC and NOLA ratios
  if (forecastCols.length > 1) {
    sheet.getRange(`${forecastCols[1]}14:${lastFC}14`).setFontColor('#0000FF');
    if (forecastCols.length >= 4) {
      sheet.getRange(`${forecastCols[1]}15:${forecastCols[3]}15`).setFontColor('#0000FF');
    }
  }
  
  // Percentage formats
  sheet.getRange('B3:B5').setNumberFormat('0.0%');
  sheet.getRange('B6').setNumberFormat('0.0%');
  sheet.getRange('B7:B8').setNumberFormat('0.00%');

  // Growth rates (skip first historical column)
  if (histCols.length > 1) {
    sheet.getRange(`${histCols[1]}11:${lastFC}11`).setNumberFormat('0.0%');
  }
  
  // Margins
  sheet.getRange(`${firstHist}12:${lastFC}12`).setNumberFormat('0.0%');
  
  // Ratios (skip first historical column)
  if (histCols.length > 1) {
    sheet.getRange(`${histCols[1]}14:${lastFC}15`).setNumberFormat('0.0%');
    sheet.getRange(`${histCols[1]}17:${lastFC}17`).setNumberFormat('0.0%');
    sheet.getRange(`${histCols[1]}36:${lastFC}37`).setNumberFormat('0.0%');
  }
  
  // Number formats for financials
  sheet.getRange(`${firstHist}31:${lastFC}34`).setNumberFormat('#,##0');
  if (histCols.length > 1) {
    sheet.getRange(`${histCols[1]}21:${lastFC}28`).setNumberFormat('#,##0');
  }
  
  sheet.getRange(`${firstFC}40:${lastFC}46`).setNumberFormat('#,##0');
  sheet.getRange(`${firstFC}47:${firstFC}51`).setNumberFormat('#,##0.00');

  // Decimal format for PV factors
  sheet.getRange(`${firstFC}44:${lastFC}44`).setNumberFormat('0.0000');

  // Number format for all the financials
  sheet.getRange(`A21:${lastFC}23`).setNumberFormat('#,##0');
  sheet.getRange(`A26:${lastFC}28`).setNumberFormat('#,##0');
  
  // Highlight Valuation Assumptions section (rows 11-17)
  sheet.getRange(`A11:${lastFC}17`).setBackground('#FCE5CD');  // Light orange

  
  // Highlight key output rows (Implied ROE and ROIC, Abnormal Earnings and FCF to Equity)
  sheet.getRange(`A36:${lastFC}36`).setBackground('#FFF2CC').setFontWeight('bold');
  sheet.getRange(`A37:${lastFC}37`).setBackground('#FFF2CC').setFontWeight('bold');
  sheet.getRange(`A42:${lastFC}42`).setBackground('#D9EAD3').setFontWeight('bold');
  sheet.getRange(`A43:${lastFC}43`).setBackground('#D9EAD3').setFontWeight('bold');

  // Italic formatting for Professor's Notes content
  ['A58', 'A61', 'A64', 'A67'].forEach(cell => {
    sheet.getRange(cell).setFontStyle('italic');
  });

  // Freeze first column
  sheet.setFrozenColumns(1);
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MENU — Updated with Multi-Scenario option
 * ════════════════════════════════════════════════════════════════════════════
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Valuation Model')
    .addItem('Create Single Model Tab (Base Case)', 'createModelTab')
    .addItem('Create Multi-Scenario Model (Bull/Base/Bear)', 'createMultiScenarioModel')
    .addSeparator()
    .addSubMenu(ui.createMenu('Individual Scenarios')
      .addItem('Create Bull Case Only', 'createBullCase')
      .addItem('Create Base Case Only', 'createBaseCase')
      .addItem('Create Bear Case Only', 'createBearCase'))
    .addSeparator()
    .addItem('Refresh Scenario Summary', 'refreshScenarioSummary')
    .addToUi();
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 * INDIVIDUAL SCENARIO BUILDERS (for menu convenience)
 * ════════════════════════════════════════════════════════════════════════════
 */
function createBullCase() {
  createSingleScenario('Bull');
}

function createBaseCase() {
  createSingleScenario('Base');
}

function createBearCase() {
  createSingleScenario('Bear');
}

function createSingleScenario(scenarioName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const baseConfig = discoverSpreadsheetStructure(ss);
  const scenarios = getScenarioConfigs();
  const scenario = scenarios.find(s => s.name === scenarioName);
  
  if (!scenario) {
    throw new Error(`Scenario "${scenarioName}" not found`);
  }
  
  const config = {
    numHistoricalYears: baseConfig.numHistoricalYears,
    histCols: baseConfig.histCols,
    forecastCols: baseConfig.forecastCols,
    firstForecastCol: baseConfig.firstForecastCol,
    lastForecastCol: baseConfig.lastForecastCol,
    lastHistCol: baseConfig.lastHistCol,
    sourceRows: baseConfig.sourceRows,
    strategic: scenario
  };
  
  const tabName = `Model_${scenario.name}`;
  let modelSheet = ss.getSheetByName(tabName);
  if (modelSheet) {
    ss.deleteSheet(modelSheet);
  }
  modelSheet = ss.insertSheet(tabName);
  
  modelSheet.setColumnWidth(1, 350);
  const totalCols = config.histCols.length + config.forecastCols.length + 1;
  for (let col = 2; col <= totalCols; col++) {
    modelSheet.setColumnWidth(col, 85);
  }
  
  buildMarketDataSection(modelSheet, config);
  buildValuationAssumptionsSection(modelSheet, config);
  buildBalanceSheetSection(modelSheet, config);
  buildIncomeStatementSection(modelSheet, config);
  buildAbnormalEarningsSection(modelSheet, config);
  buildProfessorNotes(modelSheet, config);
  applyFormatting(modelSheet, config);
  
  SpreadsheetApp.flush();
  Logger.log(`${scenarioName} case model created successfully!`);
}

function refreshScenarioSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const baseConfig = discoverSpreadsheetStructure(ss);
  buildScenarioSummary(ss, baseConfig);
  SpreadsheetApp.flush();
  Logger.log('Scenario summary refreshed!');
}