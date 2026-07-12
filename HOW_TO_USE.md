# Modliq — AI Quality & Process Optimization Copilot User Guide

Welcome to **Modliq**, the AI Quality Engineering Copilot and Process Optimization platform. This guide explains how to use Modliq's core features to analyze manufacturing data, optimize yield settings, and validate process stability and capability.

---

## 🌟 Platform Overview
Modliq combines **AI Process Optimization** and **Classical Quality Engineering** workflows. It helps manufacturing teams find better process settings, validate process stability, and generate SOP-ready trial plans from production data.

It answers these key questions:
1. **Optimization**: What settings maximize my yield or minimize my defects?
2. **Stability**: Is my process stable over time?
3. **Capability**: Can my process consistently meet specification limits?
4. **Sampling**: How many samples should I inspect to reject/accept a batch?

---

## 🚀 1. Yield Optimizer Workflow
The Yield Optimizer allows you to upload production data, specify a goal, and get recommended machine settings.

### Step 1: Upload Data
1. Navigate to **Upload Data** in the sidebar.
2. Select your manufacturing CSV dataset (containing process parameters and output metrics like Yield or Defects).
3. The platform parses the dataset and provides a preview showing numeric/categorical columns, row count, and missing values.

### Step 2: Set Goal
1. Navigate to **Set Goal** in the sidebar.
2. Type your goal in plain English, such as:
   * *“Maximize yield above 95% while keeping temperature below 90°C.”*
3. Modliq will automatically detect:
   * Target metric (e.g., `Yield`)
   * Optimization direction (e.g., `maximize`)
   * Target threshold (e.g., `95%`)
   * Constraints (e.g., `temperature <= 90°C`)
4. Click **Optimize Settings**.

### Step 3: View Results
1. The **Results** dashboard displays recommended target settings plus a safe trial range.
   * **Recommended target**: Exact target settings your team should aim for (e.g., Temperature: 87.5°C, Pressure: 450 kPa).
   * **Recommended trial range**: A safe operating envelope for validation trials (e.g., Temperature: 86.5–88.5°C, Pressure: 440–460 kPa).
2. It shows the projected optimization improvement and estimated financial impact (e.g., Yield change from 91% to 94.8%, estimated monthly savings).
3. Review the **AI Plain-English Summary** summarizing the recommended operational updates.
4. Download the generated **Trial SOP** (a 7-batch trial plan and supervisor checklist) to validate settings.
5. Click **Open Quality Studio** to validate the stability of your baseline process before applying any settings.

---

## 🔬 2. Quality Studio
Quality Studio calculations run instantly using deterministic statistical engines. Some advanced reports may require backend processing.

### A. Quality Summary
Use this tab to get standard descriptive statistics on any process column.
* **How to use**: Select a measurement column (e.g., `Yield`) and click **Analyze Quality**.
* **Outputs**: Mean, standard deviation, variance, skewness, range, and outlier list.
* **Outliers**: Points beyond $Q1 - 1.5 \times IQR$ or $Q3 + 1.5 \times IQR$ are flagged automatically with specific reasons.

### B. Control Charts
Control charts track process stability. Choose the chart that matches your manufacturing data type:

#### 1. I-MR Chart (Individuals & Moving Range)
* **Best for**: Variable measurements (milled dimensions, weights, processing times).
* **Why**: Plots data points individually as they are completed. You do not need to group products into batches.
* **To Use**: Choose your measurement column and click **Build I-MR Chart**.

#### 2. p-Chart (Proportion Defective)
* **Best for**: Pass/Fail (attribute) checks with changing batch sizes.
* **Why**: Automatically adjusts control limits based on varying sample sizes (e.g., 20 items inspected Tuesday, 50 on Wednesday).
* **To Use**: Pick the defects column and sample size column from your dataset, or enter values manually in the table.

#### 3. c-Chart (Count of Defects)
* **Best for**: Counts of minor flaws on a single, complex product.
* **Why**: Focuses on total minor imperfections on a single item (e.g., stray stitches, surface scratches) while the item remains functional.
* **To Use**: Pick the defect count column or enter defect counts per unit manually.

*Note: Red points on control charts indicate out-of-control signals (beyond UCL or LCL) requiring process investigation.*

### C. Capability Study ($C_p$ / $C_{pk}$)
Use this study to verify if your process is capable of meeting engineering specification limits.
* **How to use**: 
  1. Select your measurement column.
  2. Input the **Lower Specification Limit (LSL)** and **Upper Specification Limit (USL)**.
  3. Click **Run Study**.
* **Outputs**:
  * **$C_p$**: Potential capability (if the process was centered perfectly).
  * **$C_{pk}$**: Current centered capability (worst-case distance to specification limits).
  * **Sigma Level**: Current statistical process performance.
* **Capability Guidelines**:
  * $C_{pk} < 1.00$: **Not Capable** (defects are likely; process spread exceeds tolerance).
  * $1.00 \le C_{pk} < 1.33$: **Marginally Capable** (close monitoring required).
  * $C_{pk} \ge 1.33$: **Capable** (consistently meets specification limits).

### D. Acceptance Sampling (AQL)
Determine how many units of a lot must be inspected to make a statistically sound Accept/Reject decision.
* **How to use**: Enter your **Lot Size**, **Acceptable Quality Limit (AQL %)**, and **Inspection Level** (Default is II).
* **Outputs**:
  * **Sample Size**: Number of units to randomly inspect.
  * **Acceptance Number ($A_c$)**: Maximum allowed defect count to pass the lot.
  * **Rejection Number ($R_e$)**: Defect threshold that triggers lot rejection.
  * Enter **Defects Found** to instantly get an **Accept** or **Reject** decision.

---

## 💰 Pricing Plans (SME Focus)

| Plan | Price | Features |
|---|---|---|
| **Starter** | Free | 1 optimization run/month, unlimited Quality Studio, CSV upload up to 1,000 rows. |
| **Studio** | ₹4,999 / month | Unlimited optimization runs, CSV uploads up to 50,000 rows, PDF reports, 3 team seats. |
| **Plant** | Starts at ₹24,999 / month | Unlimited rows, multiple optimization templates, custom SOP branding, API access, dedicated onboarding. |

---

## ❓ Frequently Asked Questions (FAQ)

### Does Modliq replace quality engineers?
No. Modliq helps quality and process teams analyze data faster and generate decision-support recommendations. Final approval should remain with responsible engineers and managers.

### Do I need coding or data science knowledge?
No. Modliq is designed for production, quality, and plant teams.

### Can I use my existing Excel/CSV data?
Yes. Upload CSV files exported from Excel, ERP, MES, or quality logs.

### Is the recommended setting guaranteed?
No. Modliq provides recommended trial settings based on uploaded data. Validate them through controlled production trials before updating official SOPs.

### Can it work offline?
Quality Studio’s lightweight statistical checks can be designed to run locally in-browser. Yield optimization may require the backend AI/ML engine.

### Is Live Mode available?
Live Mode is planned. The first version focuses on static CSV-based analysis and quality validation.

---

## 🛠 Troubleshooting & Local Run
* **Offline Execution**: Lightweight calculations in Quality Studio run locally in the browser. For complete optimization runs, the client communicates with the backend services.
* **Local ML Engine**: If you are using the Optimizer, ensure the FastAPI server is running locally:
  ```bash
  cd ml-engine
  uvicorn main:app --reload
  ```

---

> **⚠️ Safety Disclaimer**: Modliq provides decision-support recommendations based on uploaded data. All process changes should be validated through controlled production trials and approved by responsible engineering or quality personnel before implementation.
