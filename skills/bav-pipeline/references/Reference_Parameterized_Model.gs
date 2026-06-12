/**
 * ════════════════════════════════════════════════════════════════════════════
 * REFERENCE IMPLEMENTATION — Parameterized Residual Income Model Builder
 * ════════════════════════════════════════════════════════════════════════════
 * * This script uses DISCOVERY and LOOPS rather than hardcoded cell references.
 * It will work on any spreadsheet with the standard source tab structure.
 * * KEY PRINCIPLES:
 * 1. DISCOVER row numbers by searching for labels (not hardcoding)
 * 2. DISCOVER column count from the source data
 * 3. Use LOOPS to generate formulas across columns
 * 4. Use CONFIGURATION OBJECTS to store discovered values
 * * MODEL TAB STRUCTURE (Fixed Rows):
 * Rows 1-8:     MARKET DATA
 * Rows 10-17:   VALUATION ASSUMPTIONS
 * Rows 19-28:   BALANCE SHEET (Beginning)
 * Rows 30-37:   INCOME STATEMENT
 * Rows 39-51:   ABNORMAL EARNINGS & VALUATION
 * Rows 55+:     PROFESSOR'S STRATEGIC NOTES
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
  // RETURN: Complete configuration object
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
    // STRATEGIC ASSUMPTIONS — CUSTOMIZED FOR ALPHABET INC. (GOOGL)
    // ═══════════════════════════════════════════════════════════════════════
    strategic: {
      sharesOutstanding: 12447, // 2024 10-K, Note 12 (Diluted)
      
      beta: 1.05,               // Slightly higher than market due to tech volatility
      riskPremium: 0.055,       // Standard 5.5%
      riskFreeRate: 0.042,      // Current 10y Treasury (~4.2%)
      taxRate: 0.17,            // Approx 2024 effective rate (16.4%) rounded up for conservatism
      
      // Growth vector: Strong near-term via Cloud/AI, fading to GDP as Search matures
      growthVector: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06, 0.045, 0.035],
      
      // Margin vector: Fading from 2024 highs (27.6%) due to "AI Tax" and TAC pressure
      marginVector: [0.27, 0.265, 0.26, 0.255, 0.25, 0.25, 0.245, 0.24, 0.24, 0.24],
      
      // Capital intensity: Negative WC (supplier float) and Heavy Asset investment (TPUs)
      nowcRatio: -0.06,         // Negative 6% based on 2024 actuals
      nolaRatioVector: [0.68, 0.69, 0.70, 0.70, 0.70, 0.69, 0.69, 0.68, 0.68, 0.68], // Rising for AI CapEx
      
      // Professor's Notes:
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
  sheet.getRange('A55').setValue("PROFESSOR'S STRATEGIC NOTES & RATIONALE");
  
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
 * MENU
 * ════════════════════════════════════════════════════════════════════════════
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Valuation Model')
    .addItem('Create Model Tab', 'createModelTab')
    .addToUi();
}